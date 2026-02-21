import { count, eq, max, sql } from 'drizzle-orm'
import { db } from '@/db'
import { user as userTable, session as sessionTable, account as accountTable, auditLog } from '@/db/schema'
import { requireAdminPage } from '@/lib/admin'
import AdminUsersClient from './_components/AdminUsersClient'

export default async function AdminPage() {
  const { role, userId } = await requireAdminPage()

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

  const userData = users.map((u) => ({
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin — Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {userData.length} user{userData.length !== 1 ? 's' : ''}
        </p>
      </div>
      <AdminUsersClient
        initialUsers={userData}
        callerRole={role}
        callerId={userId}
      />
    </main>
  )
}
