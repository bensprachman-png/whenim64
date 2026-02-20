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
  const { name, email, dateOfBirth, zipCode, filingStatus,
    goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
    enrolledMedicare, collectingSS } = body

  const [profile] = await db
    .update(profiles)
    .set({ name, email, dateOfBirth, zipCode, filingStatus,
      goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
      enrolledMedicare, collectingSS })
    .where(and(eq(profiles.id, parseInt(id)), eq(profiles.userId, session.user.id)))
    .returning()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json(profile)
}
