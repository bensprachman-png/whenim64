import { db } from '@/db'
import { users } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  const [user] = await db.select().from(users).orderBy(desc(users.id)).limit(1)
  if (!user) return NextResponse.json(null)
  return NextResponse.json(user)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, dateOfBirth, zipCode, filingStatus,
    goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage } = body

  const [user] = await db
    .insert(users)
    .values({
      name, dateOfBirth, zipCode, filingStatus,
      goalCatastrophicRisk, goalDoctorFreedom, goalMinPremium, goalMinTotalCost, goalTravelCoverage,
      createdAt: new Date().toISOString(),
    })
    .returning()

  return NextResponse.json(user, { status: 201 })
}
