import { Snaptrade } from 'snaptrade-typescript-sdk'

let _client: Snaptrade | null = null

export function getSnaptradeClient(): Snaptrade {
  if (!_client) {
    _client = new Snaptrade({
      clientId: process.env.SNAPTRADE_CLIENT_ID!,
      consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
    })
  }
  return _client
}

export type TaxTreatment = 'tax-free' | 'tax-deferred' | 'taxable'

export function categorizeAccountType(rawType?: string | null): TaxTreatment {
  if (!rawType) return 'taxable'
  const t = rawType.toUpperCase()
  // ROTH must be checked before IRA — "ROTH_IRA" should be tax-free
  if (['ROTH', 'HSA', 'TFSA'].some((k) => t.includes(k))) return 'tax-free'
  if (['IRA', '401K', '403B', '457', 'PENSION', 'SEP', 'SIMPLE', 'RRSP', 'RRIF'].some((k) => t.includes(k))) return 'tax-deferred'
  return 'taxable'
}
