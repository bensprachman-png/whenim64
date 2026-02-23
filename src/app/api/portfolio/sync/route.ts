import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { snaptradeConnections, brokerageAccounts, holdings } from '@/db/schema'
import { getSnaptradeClient } from '@/lib/snaptrade'
import { decrypt } from '@/lib/encrypt'
import type { Account } from 'snaptrade-typescript-sdk'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const snaptrade = getSnaptradeClient()

  const [conn] = await db
    .select()
    .from(snaptradeConnections)
    .where(eq(snaptradeConnections.userId, userId))

  if (!conn) return NextResponse.json({ error: 'Not connected' }, { status: 400 })

  const userSecret = decrypt(conn.snaptradeUserSecret)

  try {
    // Fetch all accounts
    const accountsRes = await snaptrade.accountInformation.listUserAccounts({
      userId,
      userSecret,
    })
    const accounts: Account[] = accountsRes.data ?? []

    const now = new Date()
    const errors: string[] = []
    let holdingsPending = 0

    // Save all accounts to DB first, then fetch holdings only for accounts
    // where SnapTrade has completed its initial sync. On first connect with
    // brokerages like Fidelity this can take several minutes.
    for (const account of accounts) {
      await db
        .insert(brokerageAccounts)
        .values({
          id: account.id,
          userId,
          brokerageName: account.institution_name,
          accountName: account.name ?? null,
          accountType: account.raw_type ?? null,
          accountNumber: account.number ?? null,
          totalValue: account.balance?.total?.amount ?? null,
          currency: account.balance?.total?.currency ?? null,
          syncedAt: now,
        })
        .onConflictDoUpdate({
          target: brokerageAccounts.id,
          set: {
            brokerageName: account.institution_name,
            accountName: account.name ?? null,
            accountType: account.raw_type ?? null,
            accountNumber: account.number ?? null,
            totalValue: account.balance?.total?.amount ?? null,
            currency: account.balance?.total?.currency ?? null,
            syncedAt: now,
          },
        })

      const initialSyncDone = account.sync_status?.holdings?.initial_sync_completed ?? false
      if (!initialSyncDone) {
        holdingsPending++
        continue
      }

      // Holdings are ready — fetch and upsert
      try {
        const holdingsRes = await snaptrade.accountInformation.getUserHoldings({
          accountId: account.id,
          userId,
          userSecret,
        })
        const positions = holdingsRes.data?.positions ?? []

        await db.delete(holdings).where(eq(holdings.accountId, account.id))

        if (positions.length > 0) {
          await db.insert(holdings).values(
            positions.map((pos) => ({
              accountId: account.id,
              userId,
              symbol: pos.symbol?.symbol?.symbol ?? null,
              description: pos.symbol?.symbol?.description ?? null,
              units: pos.units ?? null,
              price: pos.price ?? null,
              marketValue: (pos.units ?? 0) * (pos.price ?? 0),
              costBasis: (pos.units ?? 0) * (pos.average_purchase_price ?? 0),
              averagePurchasePrice: pos.average_purchase_price ?? null,
              currency: pos.symbol?.symbol?.currency?.code ?? null,
              securityType: pos.symbol?.symbol?.type?.description ?? null,
              syncedAt: now,
            }))
          )
        }
      } catch (err) {
        errors.push(`${account.institution_name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      success: true,
      accountCount: accounts.length,
      holdingsPending,
      ...(errors.length > 0 ? { errors } : {}),
    })
  } catch (err) {
    console.error('[portfolio/sync]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
