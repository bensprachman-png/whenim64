import { NextResponse } from 'next/server'
import { stripe, PLANS } from '@/lib/stripe'

// Cache price info for 1 hour — prices rarely change
let cache: { monthly: PriceInfo; yearly: PriceInfo; fetchedAt: number } | null = null

interface PriceInfo {
  priceId: string
  amount: number        // in cents
  currency: string
  interval: string
  formatted: string     // e.g. "$4.99/month"
}

async function fetchPrice(priceId: string): Promise<PriceInfo> {
  const price = await stripe.prices.retrieve(priceId)
  const amount = price.unit_amount ?? 0
  const currency = price.currency.toUpperCase()
  const interval = (price.recurring?.interval ?? 'month')
  const formatted = `$${(amount / 100).toFixed(2)}/${interval}`
  return { priceId, amount, currency, interval, formatted }
}

export async function GET() {
  if (!process.env.STRIPE_MONTHLY_PRICE_ID || !process.env.STRIPE_YEARLY_PRICE_ID) {
    return NextResponse.json({ error: 'Stripe price IDs not configured' }, { status: 500 })
  }

  const now = Date.now()
  if (cache && now - cache.fetchedAt < 60 * 60 * 1000) {
    return NextResponse.json(cache)
  }

  try {
    const [monthly, yearly] = await Promise.all([
      fetchPrice(PLANS.monthly),
      fetchPrice(PLANS.yearly),
    ])
    cache = { monthly, yearly, fetchedAt: now }
    return NextResponse.json({ monthly, yearly })
  } catch (err) {
    console.error('[stripe/prices]', err)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
