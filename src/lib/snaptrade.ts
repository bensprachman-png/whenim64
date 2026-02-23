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

// Brokerage-specific raw_type codes that don't contain the keyword we'd expect.
// Fidelity uses short codes like IRRL (IRA Rollover), IRAL (IRA), IRSE (SEP-IRA), etc.
const RAW_TYPE_TAX_FREE: string[] = ['ROTHIRA', 'RIRA', 'TFSA_ROTH']
const RAW_TYPE_TAX_DEFERRED: string[] = [
  'IRRL',  // Fidelity: IRA Rollover
  'IRAL',  // Fidelity: Traditional IRA
  'IRSE',  // Fidelity: SEP IRA
  'IRSM',  // Fidelity: SIMPLE IRA
  'IRSI',  // Fidelity: Inherited IRA
]

export function categorizeAccountType(rawType?: string | null, accountName?: string | null): TaxTreatment {
  const t = (rawType ?? '').toUpperCase()
  const n = (accountName ?? '').toUpperCase()

  // Check exact-match overrides first (brokerage-specific codes)
  if (RAW_TYPE_TAX_FREE.includes(t)) return 'tax-free'
  if (RAW_TYPE_TAX_DEFERRED.includes(t)) return 'tax-deferred'

  // ROTH must be checked before IRA — "ROTH_IRA" should be tax-free
  const taxFreeKeywords = ['ROTH', 'HSA', 'TFSA']
  if (taxFreeKeywords.some((k) => t.includes(k) || n.includes(k))) return 'tax-free'

  const taxDeferredKeywords = ['IRA', '401K', '403B', '457', 'PENSION', 'SEP', 'SIMPLE', 'RRSP', 'RRIF']
  if (taxDeferredKeywords.some((k) => t.includes(k) || n.includes(k))) return 'tax-deferred'

  return 'taxable'
}
