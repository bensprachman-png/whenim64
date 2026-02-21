import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user as userTable, profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await request.json() as { password: string }

  // Verify password by attempting sign-in (twoFactorEnabled=false so it's a clean response)
  const signInResult = await auth.api.signInEmail({
    body: { email: session.user.email, password },
    asResponse: true,
  })

  // 401 means invalid password; 200 or twoFactorRedirect (302/200 with redirect) means valid
  if (signInResult.status === 401 || signInResult.status === 403) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // Enable twoFactor on the user record
  await db
    .update(userTable)
    .set({ twoFactorEnabled: true })
    .where(eq(userTable.id, session.user.id))

  // Record the method in profiles
  await db
    .update(profiles)
    .set({ twoFactorMethod: 'email' })
    .where(eq(profiles.userId, session.user.id))

  return NextResponse.json({ ok: true })
}
