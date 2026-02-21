import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { method } = await request.json() as { method: 'totp' | 'email' | null }

  await db
    .update(profiles)
    .set({ twoFactorMethod: method })
    .where(eq(profiles.userId, session.user.id))

  return NextResponse.json({ ok: true })
}
