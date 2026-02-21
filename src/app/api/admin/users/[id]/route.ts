import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/db'
import { user as userTable, account as accountTable } from '@/db/schema'
import { requireAdmin, writeAuditLog, SUPERUSER_EMAIL, type UserRole } from '@/lib/admin'
import { auth } from '@/lib/auth'

// PATCH — change a user's role
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session, role } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const newRole = body?.role as UserRole | undefined

  if (!newRole || !['user', 'admin', 'superuser'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Fetch target user
  const [target] = await db.select().from(userTable).where(eq(userTable.id, id))
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Superuser is immutable
  if (target.email === SUPERUSER_EMAIL) {
    return NextResponse.json({ error: 'Cannot modify superuser' }, { status: 403 })
  }

  // No self-demotion
  if (target.id === session!.user.id) {
    return NextResponse.json({ error: 'Cannot change own role' }, { status: 403 })
  }

  // Regular admins cannot promote to superuser
  if (role === 'admin' && newRole === 'superuser') {
    return NextResponse.json({ error: 'Only superusers can assign the superuser role' }, { status: 403 })
  }

  await db.update(userTable).set({ role: newRole }).where(eq(userTable.id, id))

  await writeAuditLog({
    userId: session!.user.id,
    event: 'role_changed',
    metadata: { targetId: id, targetEmail: target.email, newRole },
  })

  return NextResponse.json({ success: true })
}

// DELETE — remove a user
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const { id } = await params

  const [target] = await db.select().from(userTable).where(eq(userTable.id, id))
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Superuser is immutable
  if (target.email === SUPERUSER_EMAIL) {
    return NextResponse.json({ error: 'Cannot delete superuser' }, { status: 403 })
  }

  // No self-deletion
  if (target.id === session!.user.id) {
    return NextResponse.json({ error: 'Cannot delete own account' }, { status: 403 })
  }

  // Only regular users can be deleted via this route
  if (target.role === 'admin' || target.role === 'superuser') {
    return NextResponse.json({ error: 'Cannot delete admin/superuser accounts' }, { status: 403 })
  }

  await writeAuditLog({
    userId: session!.user.id,
    event: 'user_deleted',
    metadata: { targetId: id, targetEmail: target.email },
  })

  await db.delete(userTable).where(eq(userTable.id, id))

  return NextResponse.json({ success: true })
}

// POST — send password reset email
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params

  const [target] = await db.select().from(userTable).where(eq(userTable.id, id))
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Only makes sense for password accounts
  const [credAccount] = await db
    .select({ id: accountTable.id })
    .from(accountTable)
    .where(and(eq(accountTable.userId, id), eq(accountTable.providerId, 'credential')))

  if (!credAccount) {
    return NextResponse.json({ error: 'User does not have a password account' }, { status: 400 })
  }

  await auth.api.requestPasswordReset({
    body: { email: target.email, redirectTo: '/reset-password' },
  })

  return NextResponse.json({ success: true })
}
