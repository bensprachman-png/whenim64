import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { snaptradeConnections, brokerageAccounts, holdings } from '@/db/schema'
import { requireAdmin } from '@/lib/admin'
import { getSnaptradeClient } from '@/lib/snaptrade'
import { decrypt } from '@/lib/encrypt'

// DELETE — remove a user's SnapTrade connection and all brokerage data
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId } = await params
  const snaptrade = getSnaptradeClient()

  const [conn] = await db
    .select()
    .from(snaptradeConnections)
    .where(eq(snaptradeConnections.userId, userId))

  if (!conn) {
    return NextResponse.json({ error: 'No brokerage connection found for this user' }, { status: 404 })
  }

  // Best-effort: remove from SnapTrade (deletes all their authorizations/slots)
  try {
    const userSecret = decrypt(conn.snaptradeUserSecret)
    await snaptrade.authentication.deleteSnapTradeUser({ userId })
  } catch {
    // If SnapTrade deletion fails (e.g. user already gone), still clean up locally
  }

  // Delete local data in FK order: holdings → accounts → connection
  const accounts = await db
    .select({ id: brokerageAccounts.id })
    .from(brokerageAccounts)
    .where(eq(brokerageAccounts.userId, userId))

  for (const acct of accounts) {
    await db.delete(holdings).where(eq(holdings.accountId, acct.id))
  }
  await db.delete(brokerageAccounts).where(eq(brokerageAccounts.userId, userId))
  await db.delete(snaptradeConnections).where(eq(snaptradeConnections.userId, userId))

  return NextResponse.json({ success: true })
}
