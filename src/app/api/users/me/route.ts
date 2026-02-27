import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user as userTable, profiles, taxScenarios, snaptradeConnections, brokerageAccounts, holdings } from '@/db/schema'
import { getSnaptradeClient } from '@/lib/snaptrade'
import { decrypt } from '@/lib/encrypt'

// DELETE — scope: 'data' clears profile/planning/brokerage data but keeps the account
//          scope: 'account' does the same then removes the user row (cascades sessions etc.)
export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scope } = await request.json() as { scope: 'data' | 'account' }
  if (scope !== 'data' && scope !== 'account') {
    return NextResponse.json({ error: 'scope must be "data" or "account"' }, { status: 400 })
  }

  const userId = session.user.id

  // 1. Remove SnapTrade connection (best-effort: delete from SnapTrade then local)
  const [conn] = await db
    .select()
    .from(snaptradeConnections)
    .where(eq(snaptradeConnections.userId, userId))

  if (conn) {
    try {
      const snaptrade = getSnaptradeClient()
      const userSecret = decrypt(conn.snaptradeUserSecret)
      await snaptrade.authentication.deleteSnapTradeUser({ userId })
    } catch {
      // If SnapTrade deletion fails, still clean up locally
    }
    const accts = await db
      .select({ id: brokerageAccounts.id })
      .from(brokerageAccounts)
      .where(eq(brokerageAccounts.userId, userId))
    for (const acct of accts) {
      await db.delete(holdings).where(eq(holdings.accountId, acct.id))
    }
    await db.delete(brokerageAccounts).where(eq(brokerageAccounts.userId, userId))
    await db.delete(snaptradeConnections).where(eq(snaptradeConnections.userId, userId))
  }

  // 2. Delete planning scenarios and profile
  await db.delete(taxScenarios).where(eq(taxScenarios.userId, userId))
  await db.delete(profiles).where(eq(profiles.userId, userId))

  if (scope === 'account') {
    // 3. Delete the user row — cascades sessions, auth accounts, twoFactor
    await db.delete(userTable).where(eq(userTable.id, userId))
  }

  return NextResponse.json({ success: true })
}
