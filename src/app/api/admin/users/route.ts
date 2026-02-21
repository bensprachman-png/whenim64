import { NextResponse } from 'next/server'
import { eq, count, max, sql } from 'drizzle-orm'
import { db } from '@/db'
import { user as userTable, session as sessionTable, account as accountTable, auditLog } from '@/db/schema'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const [users, sessionStats, failedStats, credentialAccounts] = await Promise.all([
    db.select().from(userTable),

    db
      .select({
        userId: sessionTable.userId,
        loginCount: count(sessionTable.id),
        lastLogin: max(sessionTable.createdAt),
      })
      .from(sessionTable)
      .groupBy(sessionTable.userId),

    db
      .select({
        userId: auditLog.userId,
        failedCount: count(auditLog.id),
      })
      .from(auditLog)
      .where(
        sql`${auditLog.event} = 'login_failure' AND ${auditLog.createdAt} >= ${Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)}`
      )
      .groupBy(auditLog.userId),

    db
      .select({ userId: accountTable.userId })
      .from(accountTable)
      .where(eq(accountTable.providerId, 'credential')),
  ])

  const sessionMap = new Map(sessionStats.map((s) => [s.userId, s]))
  const failedMap = new Map(failedStats.map((f) => [f.userId, f]))
  const passwordSet = new Set(credentialAccounts.map((a) => a.userId))

  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    twoFactorEnabled: u.twoFactorEnabled,
    hasPassword: passwordSet.has(u.id),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : new Date((u.createdAt as number) * 1000).toISOString(),
    loginCount: sessionMap.get(u.id)?.loginCount ?? 0,
    lastLogin: (() => {
      const v = sessionMap.get(u.id)?.lastLogin
      if (!v) return null
      return v instanceof Date ? v.toISOString() : new Date((v as number) * 1000).toISOString()
    })(),
    failedAttempts24h: failedMap.get(u.id)?.failedCount ?? 0,
  }))

  return NextResponse.json(result)
}
