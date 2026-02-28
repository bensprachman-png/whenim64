import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

export const PLANS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.STRIPE_YEARLY_PRICE_ID!,
} as const

export type Plan = keyof typeof PLANS

/** Extract current_period_end from first subscription item (Stripe clover API) */
export function getPeriodEnd(sub: Stripe.Subscription): number | null {
  return sub.items?.data?.[0]?.current_period_end ?? null
}
