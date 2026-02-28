import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { stripe } from '@/lib/stripe'

const BASE_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile] = await db
    .select({ stripeCustomerId: profiles.stripeCustomerId })
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1)

  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${BASE_URL}/account`,
  })

  return NextResponse.json({ url: portalSession.url })
}
