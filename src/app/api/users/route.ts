import { db } from '@/db'
import { profiles, account } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json(null, { status: 401 })

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1)

  const [credentialAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'credential')))
    .limit(1)

  const hasPassword = !!credentialAccount

  if (!profile) return NextResponse.json({ hasPassword })
  return NextResponse.json({ ...profile, hasPassword })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, dateOfBirth, zipCode, filingStatus,
    goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
    enrolledMedicare, collectingSS } = body

  const [profile] = await db
    .insert(profiles)
    .values({
      userId: session.user.id,
      name, dateOfBirth, zipCode, filingStatus,
      goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
      enrolledMedicare, collectingSS,
      createdAt: new Date().toISOString(),
    })
    .returning()

  return NextResponse.json(profile, { status: 201 })
}
