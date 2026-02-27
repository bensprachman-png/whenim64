import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { requireAdmin } from '@/lib/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId } = await params
  const { isPaid } = await request.json()

  if (typeof isPaid !== 'boolean') {
    return NextResponse.json({ error: 'isPaid must be a boolean' }, { status: 400 })
  }

  const [updated] = await db
    .update(profiles)
    .set({ isPaid })
    .where(eq(profiles.userId, userId))
    .returning({ isPaid: profiles.isPaid })

  if (!updated) {
    return NextResponse.json({ error: 'Profile not found for this user' }, { status: 404 })
  }

  return NextResponse.json({ isPaid: updated.isPaid })
}
