import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const { name, email, dateOfBirth, zipCode, filingStatus,
    goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
    enrolledMedicare, collectingSS } = body

  const [user] = await db
    .update(users)
    .set({ name, email, dateOfBirth, zipCode, filingStatus,
      goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
      enrolledMedicare, collectingSS })
    .where(eq(users.id, parseInt(id)))
    .returning()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json(user)
}
