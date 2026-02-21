import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user as userTable, account as accountTable, auditLog } from '@/db/schema'

export const SUPERUSER_EMAIL = 'bensprachman@gmail.com'
export type UserRole = 'user' | 'admin' | 'superuser'

// Returns true if the user authenticated via OAuth (Google, etc.)
// OAuth providers handle their own strong auth, so TOTP is not required.
async function isOAuthUser(userId: string): Promise<boolean> {
  const accounts = await db
    .select({ providerId: accountTable.providerId })
    .from(accountTable)
    .where(eq(accountTable.userId, userId))
  return accounts.some((a) => a.providerId !== 'credential')
}

// ── API route guard ──────────────────────────────────────────────────────────

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null, role: null }
  }

  const [dbUser] = await db
    .select({ role: userTable.role, twoFactorEnabled: userTable.twoFactorEnabled })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))

  const role = dbUser?.role as UserRole | undefined

  if (role !== 'admin' && role !== 'superuser') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session, role }
  }

  // 2FA only required for email/password users — OAuth providers handle their own auth
  if (!dbUser?.twoFactorEnabled && !(await isOAuthUser(session.user.id))) {
    return { error: NextResponse.json({ error: 'Two-factor authentication required' }, { status: 403 }), session, role }
  }

  return { error: null, session, role }
}

// ── Server component guard ───────────────────────────────────────────────────

export async function requireAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/login')
  }

  const [dbUser] = await db
    .select({ role: userTable.role, twoFactorEnabled: userTable.twoFactorEnabled })
    .from(userTable)
    .where(eq(userTable.id, session.user.id))

  // Superuser bootstrap — idempotent
  if (session.user.email === SUPERUSER_EMAIL) {
    if (dbUser?.role !== 'superuser') {
      await db
        .update(userTable)
        .set({ role: 'superuser' })
        .where(eq(userTable.id, session.user.id))
    }

    // Only redirect to MFA setup if they're not an OAuth user
    if (!dbUser?.twoFactorEnabled && !(await isOAuthUser(session.user.id))) {
      redirect('/mfa/setup?required=admin')
    }

    return { session, role: 'superuser' as UserRole, userId: session.user.id }
  }

  const role = dbUser?.role as UserRole | undefined

  if (role !== 'admin' && role !== 'superuser') {
    redirect('/')
  }

  if (!dbUser?.twoFactorEnabled && !(await isOAuthUser(session.user.id))) {
    redirect('/mfa/setup?required=admin')
  }

  return { session, role: role as UserRole, userId: session.user.id }
}

// ── Audit log helper ─────────────────────────────────────────────────────────

export async function writeAuditLog(entry: {
  userId?: string | null
  event: string
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}) {
  await db.insert(auditLog).values({
    userId: entry.userId ?? null,
    event: entry.event,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    createdAt: new Date(),
  })
}
