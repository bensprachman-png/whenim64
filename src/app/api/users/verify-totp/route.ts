import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { twoFactor as twoFactorTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { verifySync } from 'otplib'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await request.json() as { code: string }

  const [record] = await db
    .select({ secret: twoFactorTable.secret })
    .from(twoFactorTable)
    .where(eq(twoFactorTable.userId, session.user.id))
    .limit(1)

  if (!record?.secret) {
    return NextResponse.json({ error: 'No 2FA configured' }, { status: 401 })
  }

  const result = verifySync({ token: code, secret: record.secret })
  const isValid = result.valid
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
