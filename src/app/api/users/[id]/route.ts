import { db } from '@/db'
import { profiles } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  console.log('[PATCH /api/users/:id] received body:', JSON.stringify(body))

  const { name, email, dateOfBirth, zipCode, filingStatus, sex, spouseDateOfBirth, spouseSex,
    goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
    collectingSS,
    enrolledPartA, enrolledPartB, spouseEnrolledPartA, spouseEnrolledPartB,
    medicarePlanType, spouseMedicarePlanType, pdpTier, spousePdpTier } = body

  // Build a partial update — only include fields that were actually sent in the body.
  // This allows Medicare/enrollment components to PATCH a subset of fields without
  // accidentally nulling out unrelated profile data (name, DOB, etc.).
  const updates: Partial<typeof profiles.$inferInsert> = {}

  if (name !== undefined)                    updates.name = name
  if (email !== undefined)                   updates.email = email
  if (dateOfBirth !== undefined)             updates.dateOfBirth = dateOfBirth
  if (zipCode !== undefined)                 updates.zipCode = zipCode
  if (filingStatus !== undefined)            updates.filingStatus = filingStatus
  if (sex !== undefined)                     updates.sex = sex || null
  if (spouseDateOfBirth !== undefined)       updates.spouseDateOfBirth = spouseDateOfBirth || null
  if (spouseSex !== undefined)               updates.spouseSex = spouseSex || null
  if (goalCatastrophicRisk !== undefined)    updates.goalCatastrophicRisk = goalCatastrophicRisk
  if (goalDoctorFreedom !== undefined)       updates.goalDoctorFreedom = goalDoctorFreedom
  if (goalMinPremium !== undefined)          updates.goalMinPremium = goalMinPremium
  if (goalMinTotalCost !== undefined)        updates.goalMinTotalCost = goalMinTotalCost
  if (goalTravelCoverage !== undefined)      updates.goalTravelCoverage = goalTravelCoverage
  if (collectingSS !== undefined)            updates.collectingSS = collectingSS
  if (enrolledPartA !== undefined)           updates.enrolledPartA = enrolledPartA
  if (enrolledPartB !== undefined)           updates.enrolledPartB = enrolledPartB
  if (spouseEnrolledPartA !== undefined)     updates.spouseEnrolledPartA = spouseEnrolledPartA
  if (spouseEnrolledPartB !== undefined)     updates.spouseEnrolledPartB = spouseEnrolledPartB
  if (medicarePlanType !== undefined)        updates.medicarePlanType = medicarePlanType
  if (spouseMedicarePlanType !== undefined)  updates.spouseMedicarePlanType = spouseMedicarePlanType
  if (pdpTier !== undefined)                 updates.pdpTier = pdpTier
  if (spousePdpTier !== undefined)           updates.spousePdpTier = spousePdpTier

  console.log('[PATCH /api/users/:id] spouseDateOfBirth:', spouseDateOfBirth, '| id:', id, '| userId:', session.user.id)

  try {
    const [profile] = await db
      .update(profiles)
      .set(updates)
      .where(and(eq(profiles.id, parseInt(id)), eq(profiles.userId, session.user.id)))
      .returning()

    console.log('[PATCH /api/users/:id] returning row:', JSON.stringify(profile))

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    return NextResponse.json(profile)
  } catch (err) {
    console.error('[PATCH /api/users/:id] DB error:', err)
    return NextResponse.json({ error: 'Database error', details: String(err) }, { status: 500 })
  }
}
