import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { snaptradeConnections, brokerageAccounts, holdings, profiles } from '@/db/schema'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'View your synced brokerage holdings, track unrealized gains and losses, and see tax treatment across IRA, Roth, and taxable accounts.',
  openGraph: {
    title: 'Portfolio | WhenIm64',
    description: 'View your synced brokerage holdings and track tax treatment across IRA, Roth, and taxable accounts.',
  },
}
import { categorizeAccountType, type TaxTreatment } from '@/lib/snaptrade'
import PortfolioClient from './_components/PortfolioClient'

export interface AccountRow {
  id: string
  brokerageName: string
  accountName: string | null
  accountType: string | null
  accountNumber: string | null
  totalValue: number | null
  currency: string | null
  syncedAt: string
  taxTreatment: TaxTreatment
}

export interface HoldingRow {
  id: number
  accountId: string
  brokerageName: string
  accountName: string | null
  accountType: string | null
  taxTreatment: TaxTreatment
  symbol: string | null
  description: string | null
  units: number | null
  price: number | null
  marketValue: number | null
  costBasis: number | null
  averagePurchasePrice: number | null
  currency: string | null
  securityType: string | null
  syncedAt: string
}

export default async function PortfolioPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const userId = session.user.id

  const [[conn], [profileRow]] = await Promise.all([
    db.select().from(snaptradeConnections).where(eq(snaptradeConnections.userId, userId)),
    db.select({ isPaid: profiles.isPaid }).from(profiles).where(eq(profiles.userId, userId)).limit(1),
  ])
  const isPaid = profileRow?.isPaid ?? false

  if (!conn) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <PortfolioClient
          isConnected={false}
          accounts={[]}
          holdings={[]}
          isDev={process.env.NODE_ENV === 'development'}
          isPaid={isPaid}
        />
      </main>
    )
  }

  const [accountRows, holdingRows] = await Promise.all([
    db
      .select()
      .from(brokerageAccounts)
      .where(eq(brokerageAccounts.userId, userId)),
    db
      .select({
        id: holdings.id,
        accountId: holdings.accountId,
        brokerageName: brokerageAccounts.brokerageName,
        accountName: brokerageAccounts.accountName,
        accountType: brokerageAccounts.accountType,
        symbol: holdings.symbol,
        description: holdings.description,
        units: holdings.units,
        price: holdings.price,
        marketValue: holdings.marketValue,
        costBasis: holdings.costBasis,
        averagePurchasePrice: holdings.averagePurchasePrice,
        currency: holdings.currency,
        securityType: holdings.securityType,
        syncedAt: holdings.syncedAt,
      })
      .from(holdings)
      .innerJoin(brokerageAccounts, eq(holdings.accountId, brokerageAccounts.id))
      .where(eq(holdings.userId, userId)),
  ])

  const toIso = (v: Date | number) =>
    v instanceof Date ? v.toISOString() : new Date((v as number) * 1000).toISOString()

  const accounts: AccountRow[] = accountRows.map((a) => ({
    id: a.id,
    brokerageName: a.brokerageName,
    accountName: a.accountName ?? null,
    accountType: a.accountType ?? null,
    accountNumber: a.accountNumber ?? null,
    totalValue: a.totalValue ?? null,
    currency: a.currency ?? null,
    syncedAt: toIso(a.syncedAt),
    taxTreatment: categorizeAccountType(a.accountType, a.accountName),
  }))

  const holdingsData: HoldingRow[] = holdingRows.map((h) => ({
    id: h.id,
    accountId: h.accountId,
    brokerageName: h.brokerageName,
    accountName: h.accountName ?? null,
    accountType: h.accountType ?? null,
    taxTreatment: categorizeAccountType(h.accountType, h.accountName),
    symbol: h.symbol ?? null,
    description: h.description ?? null,
    units: h.units ?? null,
    price: h.price ?? null,
    marketValue: h.marketValue ?? null,
    costBasis: h.costBasis ?? null,
    averagePurchasePrice: h.averagePurchasePrice ?? null,
    currency: h.currency ?? null,
    securityType: h.securityType ?? null,
    syncedAt: toIso(h.syncedAt),
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PortfolioClient
        isConnected={true}
        accounts={accounts}
        holdings={holdingsData}
        isDev={process.env.NODE_ENV === 'development'}
        isPaid={isPaid}
      />
    </main>
  )
}
