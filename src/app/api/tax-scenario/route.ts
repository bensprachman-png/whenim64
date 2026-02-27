import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { taxScenarios } from '@/db/schema'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json(null, { status: 401 })

  const [row] = await db
    .select()
    .from(taxScenarios)
    .where(eq(taxScenarios.userId, session.user.id))

  return NextResponse.json(row ?? null)
}

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    w2Income, interestIncome, dividendIncome, capGainsDist,
    stcg, ltcg, otherIncome, iraBalance, qcds, rothBalance, taxableBalance, otherAssets, realEstateValue, annualLivingExpenses,
    portfolioGrowthPct, retirementYear, ssStartYear,
    ssPaymentsPerYear, spouseSsStartYear, spouseSsPaymentsPerYear,
    inflationPct, medicareEnrollees, medicareStartYear, irmaaTargetTier, conversionWindow, showConversions,
    planToAge, spousePlanToAge,
    annualDeferredContrib, annualRothContrib, employerMatchPct,
    spouseAnnualDeferredContrib, spouseAnnualRothContrib, spouseEmployerMatchPct,
  } = body

  const now = new Date()

  const values = {
    w2Income: w2Income ?? 0,
    interestIncome: interestIncome ?? 0,
    dividendIncome: dividendIncome ?? 0,
    capGainsDist: capGainsDist ?? 0,
    stcg: stcg ?? 0,
    ltcg: ltcg ?? 0,
    otherIncome: otherIncome ?? 0,
    iraBalance: iraBalance ?? 0,
    qcds: qcds ?? 0,
    rothBalance: rothBalance ?? 0,
    taxableBalance: taxableBalance ?? 0,
    otherAssets: otherAssets ?? 0,
    realEstateValue: realEstateValue ?? 0,
    annualLivingExpenses: annualLivingExpenses ?? 0,
    portfolioGrowthPct: portfolioGrowthPct ?? 5,
    retirementYear: retirementYear ?? null,
    ssStartYear: ssStartYear ?? null,
    ssPaymentsPerYear: ssPaymentsPerYear ?? 0,
    spouseSsStartYear: spouseSsStartYear ?? null,
    spouseSsPaymentsPerYear: spouseSsPaymentsPerYear ?? 0,
    inflationPct: inflationPct ?? 2.5,
    medicareEnrollees: medicareEnrollees ?? 1,
    medicareStartYear: medicareStartYear ?? 0,
    irmaaTargetTier: irmaaTargetTier ?? 0,
    conversionWindow: conversionWindow ?? 'always',
    showConversions: showConversions ?? true,
    planToAge: planToAge ?? null,
    spousePlanToAge: spousePlanToAge ?? null,
    annualDeferredContrib: annualDeferredContrib ?? 0,
    annualRothContrib: annualRothContrib ?? 0,
    employerMatchPct: employerMatchPct ?? 0,
    spouseAnnualDeferredContrib: spouseAnnualDeferredContrib ?? 0,
    spouseAnnualRothContrib: spouseAnnualRothContrib ?? 0,
    spouseEmployerMatchPct: spouseEmployerMatchPct ?? 0,
    updatedAt: now,
  }

  await db
    .insert(taxScenarios)
    .values({ userId: session.user.id, ...values })
    .onConflictDoUpdate({ target: taxScenarios.userId, set: values })

  return NextResponse.json({ ok: true })
}
