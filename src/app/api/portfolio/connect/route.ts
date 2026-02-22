import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { snaptradeConnections, brokerageAccounts, holdings } from '@/db/schema'
import { getSnaptradeClient } from '@/lib/snaptrade'
import { encrypt, decrypt } from '@/lib/encrypt'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const snaptrade = getSnaptradeClient()

  // Get or create SnapTrade registration
  let [conn] = await db
    .select()
    .from(snaptradeConnections)
    .where(eq(snaptradeConnections.userId, userId))

  let userSecret: string

  if (!conn) {
    const regRes = await snaptrade.authentication.registerSnapTradeUser({ userId })
    userSecret = (regRes.data as { userSecret: string }).userSecret
    await db.insert(snaptradeConnections).values({
      userId,
      snaptradeUserSecret: encrypt(userSecret),
      createdAt: new Date(),
    })
  } else {
    userSecret = decrypt(conn.snaptradeUserSecret)
  }

  const loginRes = await snaptrade.authentication.loginSnapTradeUser({
    userId,
    userSecret,
  })
  const redirectURI = (loginRes.data as { redirectURI: string }).redirectURI

  return NextResponse.json({ redirectURI })
}

export async function DELETE(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const snaptrade = getSnaptradeClient()

  const [conn] = await db
    .select()
    .from(snaptradeConnections)
    .where(eq(snaptradeConnections.userId, userId))

  if (conn) {
    // Best-effort remote deletion
    try {
      await snaptrade.authentication.deleteSnapTradeUser({ userId })
    } catch {
      // Ignore remote errors — clean up local data regardless
    }
  }

  // Delete in FK order: holdings → accounts → connection
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
