import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { stripe, PLANS, getPeriodEnd } from '@/lib/stripe'

/**
 * POST /api/stripe/upgrade
 * Switches an active monthly subscription to yearly in-place.
 * Stripe prorates the remaining monthly time toward the annual price.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1)

  if (!profile?.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription found.' }, { status: 400 })
  }

  if (profile.subscriptionPlan === 'yearly') {
    return NextResponse.json({ error: 'Already on the yearly plan.' }, { status: 400 })
  }

  const yearlyPriceId = PLANS.yearly
  if (!yearlyPriceId) {
    return NextResponse.json({ error: 'Yearly price not configured.' }, { status: 500 })
  }

  // Retrieve current subscription to get the item ID
  const subscription = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId, {
    expand: ['items.data'],
  })

  const itemId = subscription.items.data[0]?.id
  if (!itemId) {
    return NextResponse.json({ error: 'Could not find subscription item.' }, { status: 500 })
  }

  // Update the subscription to the yearly price — Stripe prorates automatically
  const updated = await stripe.subscriptions.update(profile.stripeSubscriptionId, {
    items: [{ id: itemId, price: yearlyPriceId }],
    metadata: { userId: session.user.id, plan: 'yearly' },
    proration_behavior: 'create_prorations',
  })

  await db.update(profiles).set({
    subscriptionPlan: 'yearly',
    subscriptionStatus: updated.status,
    currentPeriodEnd: getPeriodEnd(updated),
    isPaid: updated.status === 'active' || updated.status === 'trialing',
  }).where(eq(profiles.userId, session.user.id))

  return NextResponse.json({ success: true })
}
