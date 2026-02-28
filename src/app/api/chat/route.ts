import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { profiles, taxScenarios, brokerageAccounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getFullRetirementAge, fraToString, calculateMilestones } from '@/lib/milestones'
import { auth } from '@/lib/auth'
import { SUPPORTED_YEARS, resolveYear, getYearData } from '@/lib/retirement-data'
import { projectTaxes, computeProjectionYears, type IrmaaTargetTier, type Sex } from '@/lib/tax-engine'
import { categorizeAccountType } from '@/lib/snaptrade'
import { getStateTaxRate } from '@/lib/state-tax'

const SYSTEM_PROMPT = `You are a knowledgeable, friendly retirement planning assistant for WhenIm64. You help users understand:

- Medicare: Parts A, B, C (Advantage), D; enrollment windows; Medigap supplements (Plans A–N); state-specific plans (MA, MN, WI); late-enrollment penalties; IEP, SEP, GEP
- Social Security: claiming ages (62–70); Full Retirement Age by birth year; delayed credits (8%/yr); spousal/survivor/divorce benefits; earnings test; taxation of benefits
- RMDs: Required Minimum Distributions from 401(k)/IRA; SECURE 2.0 start age is 73 (born 1951–1959) or 75 (born 1960+); calculation; QCDs; penalties for missing
- Tax planning: IRMAA Medicare surcharges; taxation of SS benefits (0/50/85%); Roth conversions; bracket management; capital gains in retirement
- General retirement: 4% rule; sequence-of-returns risk; healthcare costs; long-term care; inflation
- App usage: explaining what the Planning, Dashboard, Medicare, Social Security, and Portfolio pages show; interpreting projection results, charts, and summary cards

When the user's planning scenario is provided below, use those exact numbers to give specific, personalised answers about their projections, Roth conversion strategy, break-even analysis, and tax trajectory. Never give generic examples when their actual data is available.

Keep answers clear, accurate, and actionable. When relevant, refer users to official sources (ssa.gov, medicare.gov). Do not give personalized investment advice — recommend they consult a financial advisor for specific investment decisions. Keep responses concise unless the question requires depth.

Formatting rules:
- Use plain text only — no markdown headers (##), no bold (**text**), no italic (*text*)
- Use bullet points (- item) or numbered lists for multiple items
- Use a blank line between sections if the answer has more than one part`

function buildYearDataPrompt(): string {
  const calendarYear = new Date().getFullYear()
  const defaultYear = resolveYear(undefined)

  const sections = SUPPORTED_YEARS.map((year) => {
    const d = getYearData(year)
    const tag = year === calendarYear ? ' (current year)' : ''

    function fmtBracket(floor: number, ceiling: number | null): string {
      const lo = `$${floor.toLocaleString('en-US')}`
      const hi = ceiling ? `$${ceiling.toLocaleString('en-US')}` : 'no limit'
      return `${lo}–${hi}`
    }

    const singleRows = d.irmaaSingle.map((b) =>
      `  ${fmtBracket(b.incomeFloor, b.incomeCeiling)}: Part B $${b.partBPremium.toFixed(2)}/mo` +
      (b.partDSurcharge > 0 ? ` | Part D +$${b.partDSurcharge.toFixed(2)}/mo` : '')
    ).join('\n')

    const jointRows = d.irmaaJoint.map((b) =>
      `  ${fmtBracket(b.incomeFloor, b.incomeCeiling)}: Part B $${b.partBPremium.toFixed(2)}/mo` +
      (b.partDSurcharge > 0 ? ` | Part D +$${b.partDSurcharge.toFixed(2)}/mo` : '')
    ).join('\n')

    return `${year} Medicare figures${tag}:
- Part B base premium: $${d.partBPremium.toFixed(2)}/mo
- Part B deductible: $${d.partBDeductible}/yr
- Medicare Advantage in-network OOP max: $${d.medicareAdvantageOOPMax.toLocaleString('en-US')}/yr
- Medigap Plan K OOP cap: $${d.medigapKOOPMax.toLocaleString('en-US')}/yr
- QCD limit: $${d.qcdLimit.toLocaleString('en-US')}/yr
- IRMAA look-back year: ${d.irmaaBaseYear} (CMS uses ${d.irmaaBaseYear} MAGI to set ${year} surcharges)
IRMAA ${year} — Single filers (${d.irmaaBaseYear} MAGI):
${singleRows}
IRMAA ${year} — Married filing jointly (${d.irmaaBaseYear} MAGI):
${jointRows}`
  }).join('\n\n')

  return `\n\n---\nVerified Medicare financial data — use these numbers, not your training data:\nDefault year for questions without a specified year: ${defaultYear}\n\n${sections}`
}

// ─── Planning context helpers ──────────────────────────────────────────────────

function fmtD(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function fmtK(n: number): string {
  if (n === 0) return '$0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${Math.round(abs)}`
}

async function buildPlanningContext(
  userId: string,
  user: typeof profiles.$inferSelect | undefined,
): Promise<string> {
  const [ts] = await db
    .select()
    .from(taxScenarios)
    .where(eq(taxScenarios.userId, userId))
    .limit(1)

  if (!ts) return ''  // user hasn't set up a planning scenario yet

  const accounts = await db
    .select()
    .from(brokerageAccounts)
    .where(eq(brokerageAccounts.userId, userId))

  const brokerageIra = accounts
    .filter(a => categorizeAccountType(a.accountType, a.accountName) === 'tax-deferred')
    .reduce((s, a) => s + (a.totalValue ?? 0), 0)
  const brokerageRoth = accounts
    .filter(a => categorizeAccountType(a.accountType, a.accountName) === 'tax-free')
    .reduce((s, a) => s + (a.totalValue ?? 0), 0)

  const totalIra = brokerageIra + (ts.iraBalance ?? 0)
  const totalRoth = brokerageRoth + (ts.rothBalance ?? 0)

  const lines: string[] = [
    '\n\n---',
    "This is the user's current retirement planning scenario as entered in the app. Use these exact numbers when answering questions about their projections, Roth conversions, tax trajectory, or any modeled results.",
    '',
    'Account balances:',
    `- Traditional IRA / 401(k): ${fmtD(totalIra)}`,
    `- Roth IRA: ${fmtD(totalRoth)}`,
    `- Taxable brokerage: ${fmtD(ts.taxableBalance ?? 0)}`,
  ]

  if (ts.annualLivingExpenses) lines.push(`- Annual living expenses: ${fmtD(ts.annualLivingExpenses)}`)

  const incomeItems: string[] = []
  if (ts.w2Income)       incomeItems.push(`W-2: ${fmtD(ts.w2Income)}`)
  if (ts.otherIncome)    incomeItems.push(`other: ${fmtD(ts.otherIncome)}`)
  if (ts.interestIncome) incomeItems.push(`interest: ${fmtD(ts.interestIncome)}`)
  if (ts.dividendIncome) incomeItems.push(`dividends: ${fmtD(ts.dividendIncome)}`)
  if ((ts.ltcg ?? 0) + (ts.stcg ?? 0) > 0) incomeItems.push(`cap gains: ${fmtD((ts.ltcg ?? 0) + (ts.stcg ?? 0))}`)
  if (incomeItems.length) lines.push(`- Current-year income: ${incomeItems.join(', ')}`)
  if (ts.retirementYear) lines.push(`- Retirement year: ${ts.retirementYear}`)

  const dob = user?.dateOfBirth ? new Date(user.dateOfBirth + 'T00:00:00') : null
  const birthYear = dob?.getFullYear() ?? 0

  if (ts.ssStartYear) {
    const ssAge = birthYear ? ts.ssStartYear - birthYear : null
    lines.push(`- Social Security: starts ${ts.ssStartYear}${ssAge ? ` (age ${ssAge})` : ''}, ${fmtD(ts.ssPaymentsPerYear ?? 0)}/yr`)
  }
  if (ts.spouseSsStartYear) {
    lines.push(`- Spouse SS: starts ${ts.spouseSsStartYear}, ${fmtD(ts.spouseSsPaymentsPerYear ?? 0)}/yr`)
  }

  const windowDesc =
    ts.conversionWindow === 'before-ss'  ? 'stop when SS begins' :
    ts.conversionWindow === 'before-rmd' ? 'stop when RMDs begin' :
    'convert indefinitely'
  const irmaaDesc =
    (ts.irmaaTargetTier ?? 0) === 0 ? 'conservative — stay in base IRMAA tier' :
    (ts.irmaaTargetTier ?? 0) === 1 ? 'moderate — allow tier 1 IRMAA surcharge' :
    'aggressive — allow up to tier 2 IRMAA surcharge'

  lines.push('')
  lines.push('Roth conversion strategy:')
  lines.push(`- Window: ${windowDesc}`)
  lines.push(`- IRMAA tier target: ${ts.irmaaTargetTier ?? 0} (${irmaaDesc})`)
  if (ts.qcds) lines.push(`- QCDs: ${ts.qcds}% of RMDs donated as Qualified Charitable Distributions`)
  lines.push(`- Portfolio growth assumption: ${ts.portfolioGrowthPct ?? 5}%  |  Inflation: ${ts.inflationPct ?? 2.5}%`)
  if (ts.planToAge)       lines.push(`- Planning to age: ${ts.planToAge} (primary)`)
  if (ts.spousePlanToAge) lines.push(`- Planning to age: ${ts.spousePlanToAge} (spouse)`)

  // Run projection only if we have a birth year
  if (!birthYear) return lines.join('\n')

  const spouseDob = user?.spouseDateOfBirth ? new Date(user.spouseDateOfBirth + 'T00:00:00') : null
  const spouseBirthYear = spouseDob?.getFullYear() ?? 0
  const filing = (user?.filingStatus === 'married_jointly') ? 'joint' : 'single' as const
  const sex: Sex | null = (user?.sex === 'male' || user?.sex === 'female') ? user.sex as Sex : null
  const spouseSex: Sex | null = (user?.spouseSex === 'male' || user?.spouseSex === 'female') ? user.spouseSex as Sex : null
  const stateTaxRate = user?.zipCode ? getStateTaxRate(user.zipCode) : 0

  const startYear = new Date().getFullYear()
  const ssStart = ts.ssStartYear ?? 0
  const rmdStart = birthYear + 73
  const convStop =
    ts.conversionWindow === 'before-ss'  ? (ssStart || 9999) :
    ts.conversionWindow === 'before-rmd' ? rmdStart :
    9999

  try {
    const projectionYears = computeProjectionYears(
      birthYear,
      spouseBirthYear || null,
      startYear,
      sex,
      spouseSex,
      ts.planToAge ?? 0,
      ts.spousePlanToAge ?? 0,
    )

    const { baselineRows, optimizedRows, summary } = projectTaxes({
      w2Income:              ts.w2Income ?? 0,
      interestIncome:        ts.interestIncome ?? 0,
      dividendIncome:        ts.dividendIncome ?? 0,
      capGainsDist:          ts.capGainsDist ?? 0,
      stcg:                  ts.stcg ?? 0,
      ltcg:                  ts.ltcg ?? 0,
      otherIncome:           ts.otherIncome ?? 0,
      iraBalance:            totalIra,
      iraWithdrawals:        0,
      qcdPct:                ts.qcds ?? 0,
      rothBalance:           totalRoth,
      portfolioGrowthPct:    ts.portfolioGrowthPct ?? 5,
      retirementYear:        ts.retirementYear ?? 0,
      ssStartYear:           ssStart,
      ssPaymentsPerYear:     ts.ssPaymentsPerYear ?? 0,
      inflationPct:          ts.inflationPct ?? 2.5,
      medicareEnrollees:     ts.medicareEnrollees === 2 ? 2 : 1,
      medicareStartYear:     ts.medicareStartYear ?? 0,
      filing,
      birthYear,
      startYear,
      projectionYears,
      irmaaTargetTier:       (ts.irmaaTargetTier ?? 0) as IrmaaTargetTier,
      conversionStopYear:    convStop,
      sex,
      spouseBirthYear:       spouseBirthYear || 0,
      spouseSsStartYear:     ts.spouseSsStartYear ?? 0,
      spouseSsPaymentsPerYear: ts.spouseSsPaymentsPerYear ?? 0,
      spouseSex,
      stateTaxRate,
      planToAge:             ts.planToAge ?? 0,
      spousePlanToAge:       ts.spousePlanToAge ?? 0,
      annualDeferredContrib: ts.annualDeferredContrib ?? 0,
      annualRothContrib:     ts.annualRothContrib ?? 0,
      annualEmployerMatch:   (ts.w2Income ?? 0) * (ts.employerMatchPct ?? 0) / 100,
      spouseAnnualDeferredContrib: ts.spouseAnnualDeferredContrib ?? 0,
      spouseAnnualRothContrib:     ts.spouseAnnualRothContrib ?? 0,
      spouseAnnualEmployerMatch:   (ts.w2Income ?? 0) * (ts.spouseEmployerMatchPct ?? 0) / 100,
    })

    // Compute cumulative savings trajectory and break-even
    let cumBase = 0, cumOpt = 0, breakevenYear: number | null = null
    const cumSavings: number[] = []
    for (const [i, opt] of optimizedRows.entries()) {
      cumBase += baselineRows[i].totalCost
      cumOpt  += opt.totalCost
      const cumSav = Math.round(cumBase - cumOpt)
      cumSavings.push(cumSav)
      if (!breakevenYear && cumSav > 0) breakevenYear = opt.year
    }

    const endYear = startYear + projectionYears - 1
    lines.push('')
    lines.push(`Tax projection summary (${startYear}–${endYear}, ${projectionYears} years):`)
    lines.push(`- Lifetime taxes + IRMAA WITHOUT conversions: ${fmtD(summary.baselineTotalCost)}`)
    lines.push(`- Lifetime taxes + IRMAA WITH conversions:    ${fmtD(summary.optimizedTotalCost)}`)
    const savings = summary.lifetimeSavings
    if (savings >= 0) {
      lines.push(`- Net lifetime savings from Roth strategy: ${fmtD(savings)} (conversions help)`)
    } else {
      lines.push(`- Net lifetime COST of Roth strategy: ${fmtD(-savings)} (conversions hurt in this scenario)`)
    }
    lines.push(`- Total Roth converted over projection: ${fmtD(summary.totalRothConverted)}`)
    if (summary.totalQcds > 0) lines.push(`- Total QCDs donated: ${fmtD(summary.totalQcds)}`)
    lines.push(`- Final IRA balance:  baseline ${fmtD(summary.baselineFinalIraBalance)}  |  with conversions ${fmtD(summary.optimizedFinalIraBalance)}`)
    lines.push(`- Final Roth balance: baseline ${fmtD(summary.baselineFinalRothBalance)}  |  with conversions ${fmtD(summary.optimizedFinalRothBalance)}`)
    lines.push(`- Heir inherited IRA annual RMD: baseline ${fmtD(summary.heirAnnualIraRmdBaseline)}/yr  |  with conversions ${fmtD(summary.heirAnnualIraRmdOptimized)}/yr`)
    if (summary.firstSpouseDeathYear) lines.push(`- Filing status switches to single: ${summary.firstSpouseDeathYear}`)
    lines.push(breakevenYear
      ? `- Break-even year: ${breakevenYear} (cumulative savings first exceed upfront conversion taxes)`
      : `- Break-even: NOT reached within the ${projectionYears}-year projection (cumulative conversion taxes exceed lifetime savings)`)

    // Compact year-by-year table (capped at 20 rows to limit input tokens)
    const MAX_TABLE_ROWS = 20
    const tableRows = optimizedRows.slice(0, MAX_TABLE_ROWS)
    lines.push('')
    lines.push(`Year-by-year projection (with Roth conversions, first ${tableRows.length} of ${optimizedRows.length} years shown). Columns: Year, Age, Filing, RMD, Conversion, ConvTax, FedTax, IRMAA, TotalCost, BaselineCost, CumulativeSavings`)
    lines.push('Year  Age  Fil   RMD      Conv     ConvTax  FedTax   IRMAA    Total    Base     CumSav')
    for (const [i, opt] of tableRows.entries()) {
      const base = baselineRows[i]
      const fil = opt.filing === 'joint' ? 'jnt' : 'sgl'
      lines.push([
        String(opt.year).padEnd(6),
        String(opt.age).padEnd(5),
        fil.padEnd(6),
        fmtK(opt.rmd).padStart(8),
        fmtK(opt.rothConversion).padStart(8),
        fmtK(opt.conversionTax).padStart(8),
        fmtK(opt.federalTax).padStart(8),
        fmtK(opt.irmaaAnnual).padStart(8),
        fmtK(opt.totalCost).padStart(8),
        fmtK(base.totalCost).padStart(8),
        fmtK(cumSavings[i]).padStart(8),
      ].join(' '))
    }
    if (optimizedRows.length > MAX_TABLE_ROWS) {
      lines.push(`(... ${optimizedRows.length - MAX_TABLE_ROWS} more years — refer to lifetime summary figures above for end-of-projection balances)`)
    }
  } catch {
    lines.push('\n(Tax projection could not be computed — scenario inputs shown above.)')
  }

  return lines.join('\n')
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your-api-key-here') {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 }
    )
  }

  const { messages } = await request.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  const session = await auth.api.getSession({ headers: await headers() })
  const [user] = session
    ? await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
    : []
  let systemPrompt = SYSTEM_PROMPT + buildYearDataPrompt()

  if (user) {
    const dob = user.dateOfBirth ? new Date(user.dateOfBirth + 'T00:00:00') : null
    const birthYear = dob?.getFullYear() ?? null
    const today = new Date()
    const currentYear = today.getFullYear()
    const age = dob
      ? Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const fra = birthYear ? getFullRetirementAge(birthYear) : null
    const fraStr = fra ? fraToString(fra) : null
    const fraYear = birthYear && fra ? birthYear + fra.years : null

    const milestones = calculateMilestones(user.dateOfBirth)
    const futureMilestones = milestones.filter((m) => m.year && m.year > currentYear)

    const goals: string[] = []
    if (user.goalMinPremium)       goals.push('minimize monthly premium')
    if (user.goalMinTotalCost)     goals.push('minimize total out-of-pocket cost')
    if (user.goalCatastrophicRisk) goals.push('protect against catastrophic risk')
    if (user.goalDoctorFreedom)    goals.push('keep freedom to choose any doctor')
    if (user.goalTravelCoverage)   goals.push('maintain coverage while traveling')

    const lines: string[] = [
      `\n\n---`,
      `This is the profile of the person you are speaking with. Always tailor your answer to their specific situation. Open with their name when it helps personalise the response. Reference their exact ages, years, and deadlines — never give generic answers when their data makes a specific answer possible.`,
      `- Name: ${user.name}`,
    ]

    if (age !== null && user.dateOfBirth) lines.push(`- Date of birth: ${user.dateOfBirth} (age ${age})`)
    if (user.zipCode)             lines.push(`- ZIP code: ${user.zipCode}`)
    if (user.filingStatus)        lines.push(`- Tax filing status: ${user.filingStatus.replace(/_/g, ' ')}`)
    lines.push(`- Enrolled in Medicare: ${user.enrolledMedicare ? 'Yes' : 'No'}`)
    lines.push(`- Collecting Social Security: ${user.collectingSS ? 'Yes' : 'No'}`)
    if (fraStr && fraYear)        lines.push(`- Full Retirement Age (FRA): ${fraStr} (year ${fraYear})`)
    if (goals.length)             lines.push(`- Supplemental insurance priorities: ${goals.join(', ')}`)

    if (futureMilestones.length) {
      lines.push(`- Upcoming milestones:`)
      for (const m of futureMilestones) {
        const yearsAway = m.year! - currentYear
        lines.push(`  • ${m.label} at age ${m.age} (${m.year}, ${yearsAway} yr${yearsAway !== 1 ? 's' : ''} away)`)
      }
    }

    systemPrompt += lines.join('\n')
  }

  // Add planning scenario context (tax projection, Roth analysis, year-by-year table)
  if (session) {
    try {
      systemPrompt += await buildPlanningContext(session.user.id, user)
    } catch {
      // Non-fatal — chat still works without planning context
    }
  }

  const client = new Anthropic({ apiKey })

  // Cap conversation history at 10 messages (5 turns) to control input token cost.
  // The system prompt already contains the full planning context, so older turns
  // are rarely needed to answer the current question.
  const MAX_HISTORY = 10
  const trimmedMessages = messages.slice(-MAX_HISTORY)

  let stream: Awaited<ReturnType<typeof client.messages.stream>>
  try {
    stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: trimmedMessages,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect to Anthropic API.'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`\n\n[Error: ${message}]`))
      } finally {
        controller.close()
      }
    },
    cancel() {
      stream.controller.abort()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
