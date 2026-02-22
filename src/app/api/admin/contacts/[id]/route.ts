import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { contacts } from '@/db/schema'
import { requireAdmin } from '@/lib/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const { isRead } = (await req.json()) as { isRead: boolean }

  await db.update(contacts).set({ isRead }).where(eq(contacts.id, Number(id)))

  return NextResponse.json({ success: true })
}
