import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { stripe, PLANS, type Plan } from '@/lib/stripe'

const BASE_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await request.json() as { plan: Plan }
  if (plan !== 'monthly' && plan !== 'yearly') {
    return NextResponse.json({ error: 'plan must be "monthly" or "yearly"' }, { status: 400 })
  }

  const priceId = PLANS[plan]
  if (!priceId) {
    return NextResponse.json({ error: `Price ID for "${plan}" plan is not configured` }, { status: 500 })
  }

  const userId = session.user.id
  const email = session.user.email

  // Get or create Stripe customer
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

  // Block checkout if already on an active subscription
  if (profile?.isPaid) {
    return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 400 })
  }

  let customerId = profile?.stripeCustomerId ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    })
    customerId = customer.id
    if (profile) {
      await db.update(profiles).set({ stripeCustomerId: customerId }).where(eq(profiles.userId, userId))
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${BASE_URL}/account?checkout=success`,
    cancel_url: `${BASE_URL}/account`,
    subscription_data: {
      metadata: { userId, plan },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  })

  return NextResponse.json({ url: checkoutSession.url })
}
