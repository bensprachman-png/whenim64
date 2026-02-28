import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { stripe, getPeriodEnd } from '@/lib/stripe'

/**
 * POST /api/stripe/sync
 * Directly fetches the user's Stripe subscription and writes it to the DB.
 * Called after checkout success as a reliable alternative to waiting for webhooks.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)

  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ synced: false, reason: 'no_customer' })
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: profile.stripeCustomerId,
    limit: 5,
    expand: ['data.items.data'],
  })

  if (subscriptions.data.length === 0) {
    return NextResponse.json({ synced: false, reason: 'no_subscriptions' })
  }

  // Most recent subscription first (Stripe returns newest first)
  const sub = subscriptions.data[0]
  const isPaid = sub.status === 'active' || sub.status === 'trialing'
  const plan = sub.metadata?.plan ?? null

  await db.update(profiles).set({
    stripeSubscriptionId: sub.id,
    subscriptionStatus: sub.status,
    subscriptionPlan: plan,
    currentPeriodEnd: getPeriodEnd(sub),
    isPaid,
  }).where(eq(profiles.userId, userId))

  return NextResponse.json({ synced: true, isPaid, status: sub.status, plan })
}
