import { db } from '@/db'
import { profiles, account, user as userTable } from '@/db/schema'
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

  const [[credentialAccount], [userRecord]] = await Promise.all([
    db.select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'credential')))
      .limit(1),
    db.select({ role: userTable.role })
      .from(userTable)
      .where(eq(userTable.id, session.user.id))
      .limit(1),
  ])

  const hasPassword = !!credentialAccount
  const role = userRecord?.role ?? 'user'

  if (!profile) return NextResponse.json({ hasPassword, role })
  return NextResponse.json({ ...profile, hasPassword, role })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, email, dateOfBirth, zipCode, filingStatus, sex, spouseDateOfBirth, spouseSex,
    goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
    enrolledMedicare, collectingSS,
    enrolledPartA, enrolledPartB, spouseEnrolledPartA, spouseEnrolledPartB,
    medicarePlanType, spouseMedicarePlanType, pdpTier, spousePdpTier } = body

  const [profile] = await db
    .insert(profiles)
    .values({
      userId: session.user.id,
      name, email, dateOfBirth, zipCode, filingStatus, sex: sex || null,
      spouseDateOfBirth: spouseDateOfBirth || null, spouseSex: spouseSex || null,
      goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
      enrolledMedicare, collectingSS,
      enrolledPartA: enrolledPartA ?? false,
      enrolledPartB: enrolledPartB ?? false,
      spouseEnrolledPartA: spouseEnrolledPartA ?? false,
      spouseEnrolledPartB: spouseEnrolledPartB ?? false,
      medicarePlanType: medicarePlanType ?? null,
      spouseMedicarePlanType: spouseMedicarePlanType ?? null,
      pdpTier: pdpTier ?? null,
      spousePdpTier: spousePdpTier ?? null,
      createdAt: new Date().toISOString(),
    })
    .returning()

  return NextResponse.json(profile, { status: 201 })
}
