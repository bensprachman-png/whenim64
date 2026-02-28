import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { stripe, getPeriodEnd } from '@/lib/stripe'
import { db } from '@/db'
import { profiles } from '@/db/schema'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[stripe/webhook] received:', event.type, event.id)

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['items.data'],
        })
        const userId = subscription.metadata?.userId ?? null
        const plan = subscription.metadata?.plan ?? 'monthly'
        const periodEnd = getPeriodEnd(subscription)
        const status = subscription.status
        const isPaid = status === 'active' || status === 'trialing'

        console.log('[stripe/webhook] checkout.session.completed — userId:', userId, 'customerId:', customerId, 'status:', status)

        const updates = {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: status,
          subscriptionPlan: plan,
          currentPeriodEnd: periodEnd,
          isPaid,
        }

        if (userId) {
          const result = await db.update(profiles).set(updates).where(eq(profiles.userId, userId))
          console.log('[stripe/webhook] updated by userId — rows affected:', JSON.stringify(result))
        } else {
          console.warn('[stripe/webhook] no userId in metadata, falling back to customerId:', customerId)
          const result = await db.update(profiles).set(updates).where(eq(profiles.stripeCustomerId, customerId))
          console.log('[stripe/webhook] updated by customerId — rows affected:', JSON.stringify(result))
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('[stripe/webhook]', event.type, '— customerId:', subscription.customer, 'status:', subscription.status)
        await db.update(profiles)
          .set({
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionPlan: subscription.metadata?.plan ?? null,
            currentPeriodEnd: getPeriodEnd(subscription),
            isPaid: subscription.status === 'active' || subscription.status === 'trialing',
          })
          .where(eq(profiles.stripeCustomerId, subscription.customer as string))
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string }
        if (!invoice.subscription) break
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription, {
          expand: ['items.data'],
        })
        console.log('[stripe/webhook] invoice.payment_succeeded — customerId:', invoice.customer)
        await db.update(profiles)
          .set({
            subscriptionStatus: subscription.status,
            currentPeriodEnd: getPeriodEnd(subscription),
            isPaid: subscription.status === 'active' || subscription.status === 'trialing',
          })
          .where(eq(profiles.stripeCustomerId, invoice.customer as string))
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('[stripe/webhook] invoice.payment_failed — customerId:', invoice.customer)
        await db.update(profiles)
          .set({ subscriptionStatus: 'past_due', isPaid: false })
          .where(eq(profiles.stripeCustomerId, invoice.customer as string))
        break
      }

    }
  } catch (err) {
    console.error('[stripe/webhook] handler error for', event.type, ':', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
