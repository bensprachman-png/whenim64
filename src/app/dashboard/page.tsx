import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { profiles, taxScenarios } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AdBanner from '@/components/AdBanner'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your personalized retirement snapshot — Medicare enrollment status, Social Security timing, RMD projections, quarterly estimated taxes, and Roth conversion strategy.',
  openGraph: {
    title: 'Dashboard | WhenIm64',
    description: 'Your personalized retirement snapshot — Medicare, Social Security, RMDs, and tax planning in one place.',
  },
}
import MilestoneTimeline from '@/components/milestone-timeline'
import { getFullRetirementAge, fraToString } from '@/lib/milestones'
import { computeProjectionYears, projectTaxes, type Sex, type TaxInputs, type IrmaaTargetTier, type FilingStatus } from '@/lib/tax-engine'
import { getStateInfo } from '@/lib/state-tax'

export const dynamic = 'force-dynamic'

function fmtK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + n.toFixed(0)
}

function fmtDollars(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

// State online payment portal URLs (for quarterly estimated tax payments)
const STATE_PAYMENT_URLS: Record<string, string> = {
  AL: 'https://myalabamataxes.alabama.gov/',
  AR: 'https://atap.arkansas.gov/',
  AZ: 'https://aztaxes.gov/',
  CA: 'https://www.ftb.ca.gov/pay/',
  CO: 'https://tax.colorado.gov/',
  CT: 'https://myconnect.ct.gov/',
  DC: 'https://otr.cfo.dc.gov/',
  DE: 'https://dorweb.revenue.delaware.gov/',
  GA: 'https://gtc.dor.ga.gov/',
  HI: 'https://hitax.hawaii.gov/',
  ID: 'https://tax.idaho.gov/',
  IN: 'https://www.in.gov/dor/',
  KS: 'https://www.ksrevenue.gov/',
  KY: 'https://klp.ky.gov/',
  LA: 'https://revenue.louisiana.gov/',
  MA: 'https://masstaxconnect.dor.state.ma.us/',
  MD: 'https://interactive.marylandtaxes.gov/',
  ME: 'https://portal.maine.gov/taxes/',
  MI: 'https://www.michigan.gov/taxes/',
  MN: 'https://www.revenue.state.mn.us/',
  MO: 'https://mytax.mo.gov/',
  MT: 'https://tap.dor.mt.gov/',
  NC: 'https://www.ncdor.gov/pay',
  ND: 'https://apps.nd.gov/tax/',
  NE: 'https://portal.nebraska.gov/nebraskataxes/',
  NJ: 'https://www.njportal.com/taxation/',
  NM: 'https://tap.state.nm.us/',
  NY: 'https://www.tax.ny.gov/pay/ind/',
  OH: 'https://tax.ohio.gov/',
  OK: 'https://oktap.tax.ok.gov/',
  OR: 'https://oregontax.oregon.gov/',
  RI: 'https://taxportal.ri.gov/',
  SC: 'https://dor.sc.gov/pay',
  UT: 'https://tap.utah.gov/',
  VA: 'https://www.tax.virginia.gov/payments',
  VT: 'https://myvermont.vermont.gov/',
  WI: 'https://ww2.revenue.wi.gov/',
  WV: 'https://mytaxes.wvtax.gov/',
}

function nextBusinessDay(d: Date): Date {
  const r = new Date(d)
  if (r.getDay() === 6) r.setDate(r.getDate() + 2) // Sat → Mon
  if (r.getDay() === 0) r.setDate(r.getDate() + 1) // Sun → Mon
  return r
}

const conversionWindowLabels: Record<string, string> = {
  always: 'Drain IRA (full projection)',
  'before-ss': 'Before SS starts',
  'before-rmd': 'Before RMDs (age 73)',
}

const irmaaLabels = ['Conservative — no surcharge', 'Moderate — Tier 1 IRMAA', 'Aggressive — Tier 2 IRMAA']

const planTypeLabels: Record<string, string> = {
  advantage: 'Medicare Advantage',
  'medigap-g': 'Medigap Plan G',
  'medigap-n': 'Medigap Plan N',
  'medigap-k': 'Medigap Plan K',
  'medigap-other': 'Other Medigap',
  // State-specific plans
  'ma-core': 'MA Core Plan',
  'ma-supplement1a': 'MA Supplement 1A',
  'ma-supplement1': 'MA Supplement 1',
  'mn-basic': 'MN Basic Plan',
  'mn-extended': 'MN Extended Basic',
  'wi-basic': 'WI Basic Plan',
}
const pdpTierLabels: Record<string, string> = {
  low: 'Low-Premium PDP',
  mid: 'Mid-Premium PDP',
  high: 'High-Premium PDP',
}

function NoPlan({ page, label }: { page: string; label: string }) {
  return (
    <div className="rounded-md border border-dashed border-muted-foreground/30 px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">No plan configured yet.</p>
      <Button asChild size="sm" variant="outline">
        <Link href={page}>{label} →</Link>
      </Button>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
  const isPaid = profile?.isPaid ?? false
  const [scenario] = await db.select().from(taxScenarios).where(eq(taxScenarios.userId, session.user.id)).limit(1)

  const dob = profile?.dateOfBirth ?? null
  const birthYear = dob ? new Date(dob + 'T00:00:00').getFullYear() : null
  const currentYear = new Date().getFullYear()
  const currentAge = birthYear ? currentYear - birthYear : null
  const rmdYear = birthYear ? birthYear + 73 : null
  const medicareYear = birthYear ? birthYear + 65 : null
  const fra = birthYear ? getFullRetirementAge(birthYear) : null
  const fraAge = fra ? fraToString(fra) : '67'

  const sex = (profile?.sex ?? null) as Sex | null
  const spouseDob = profile?.spouseDateOfBirth ?? null
  const spouseBirthYear = spouseDob ? new Date(spouseDob + 'T00:00:00').getFullYear() : null
  const spouseSex = (profile?.spouseSex ?? null) as Sex | null

  const enrolledPartA = profile?.enrolledPartA ?? false
  const enrolledPartB = profile?.enrolledPartB ?? false
  const spouseEnrolledPartA = profile?.spouseEnrolledPartA ?? false
  const spouseEnrolledPartB = profile?.spouseEnrolledPartB ?? false
  const medicarePlanType = profile?.medicarePlanType ?? null
  const spouseMedicarePlanType = profile?.spouseMedicarePlanType ?? null
  const pdpTier = profile?.pdpTier ?? null
  const spousePdpTier = profile?.spousePdpTier ?? null

  const spouseBirthYear2 = spouseDob ? new Date(spouseDob + 'T00:00:00').getFullYear() : null
  const spouseCurrentAge = spouseBirthYear2 ? currentYear - spouseBirthYear2 : null
  const spouseMedicareYear = spouseBirthYear2 ? spouseBirthYear2 + 65 : null
  const hasSpouseSection = spouseCurrentAge !== null || profile?.filingStatus === 'married_jointly'
  const planToAge = scenario?.planToAge ?? 0
  const spousePlanToAge = scenario?.spousePlanToAge ?? 0
  const planEndsYear = birthYear
    ? currentYear + computeProjectionYears(birthYear, spouseBirthYear, currentYear, sex, spouseSex, planToAge, spousePlanToAge)
    : undefined

  // ── Quarterly estimated tax calculation ───────────────────────────────────
  const stateInfo = getStateInfo(profile?.zipCode ?? '')
  const statePayUrl = stateInfo ? (STATE_PAYMENT_URLS[stateInfo.code] ?? null) : null

  let quarterlyFederal = 0, quarterlyState = 0, quarterlyTotal = 0
  let annualFederal = 0, annualState = 0, annualTotal = 0, estimatedMagi = 0
  let annualConversionAmount = 0, annualConversionTax = 0

  if (scenario && birthYear) {
    const filing: FilingStatus = profile?.filingStatus === 'married_jointly' ? 'joint' : 'single'
    const convWindow = scenario.conversionWindow ?? 'always'
    const conversionStopYear =
      convWindow === 'before-ss' ? (scenario.ssStartYear ?? 9999)
      : convWindow === 'before-rmd' ? (birthYear + 73)
      : 9999

    const taxInputs: TaxInputs = {
      w2Income: scenario.w2Income,
      interestIncome: scenario.interestIncome,
      dividendIncome: scenario.dividendIncome,
      capGainsDist: scenario.capGainsDist,
      stcg: scenario.stcg,
      ltcg: scenario.ltcg,
      otherIncome: scenario.otherIncome,
      iraBalance: scenario.iraBalance,
      iraWithdrawals: 0,
      qcdPct: scenario.qcds,
      rothBalance: scenario.rothBalance,
      portfolioGrowthPct: scenario.portfolioGrowthPct,
      retirementYear: scenario.retirementYear ?? currentYear - 1,
      ssStartYear: scenario.ssStartYear ?? currentYear + 20,
      ssPaymentsPerYear: scenario.ssPaymentsPerYear,
      filing,
      birthYear,
      startYear: currentYear,
      projectionYears: 1,
      irmaaTargetTier: (scenario.irmaaTargetTier ?? 0) as IrmaaTargetTier,
      inflationPct: scenario.inflationPct,
      conversionStopYear,
      medicareEnrollees: (scenario.medicareEnrollees ?? 1) as 1 | 2,
      medicareStartYear: scenario.medicareStartYear ?? 0,
      sex,
      spouseBirthYear: spouseBirthYear ?? 0,
      spouseSsStartYear: scenario.spouseSsStartYear ?? 0,
      spouseSsPaymentsPerYear: scenario.spouseSsPaymentsPerYear ?? 0,
      spouseSex,
      stateTaxRate: stateInfo?.rate ?? 0,
      planToAge,
      spousePlanToAge,
      annualDeferredContrib: scenario.annualDeferredContrib ?? 0,
      annualRothContrib: scenario.annualRothContrib ?? 0,
      annualEmployerMatch: (scenario.w2Income ?? 0) * (scenario.employerMatchPct ?? 0) / 100,
      spouseAnnualDeferredContrib: scenario.spouseAnnualDeferredContrib ?? 0,
      spouseAnnualRothContrib: scenario.spouseAnnualRothContrib ?? 0,
      spouseAnnualEmployerMatch: (scenario.w2Income ?? 0) * (scenario.spouseEmployerMatchPct ?? 0) / 100,
    }

    const { optimizedRows } = projectTaxes(taxInputs)
    // Always use the optimized (with-conversions) row — showConversions is a chart
    // display toggle, not a statement that the user won't execute conversions.
    // Planned Roth conversions are taxable income and must be reflected in quarterly estimates.
    const row = optimizedRows[0]
    if (row) {
      annualFederal = row.federalTax + row.ltcgTax
      annualState = row.stateTax
      annualTotal = row.totalTax
      estimatedMagi = row.magi
      annualConversionAmount = row.rothConversion
      annualConversionTax = row.conversionTax
      quarterlyFederal = annualFederal / 4
      quarterlyState = annualState / 4
      quarterlyTotal = annualTotal / 4
    }
  }

  // Due dates for the current tax year (Q4 falls in Jan of the following year)
  const today = new Date()
  const dueDates = [
    { quarter: 'Q1', label: 'Jan – Mar', date: nextBusinessDay(new Date(currentYear, 3, 15)) },
    { quarter: 'Q2', label: 'Apr – May', date: nextBusinessDay(new Date(currentYear, 5, 15)) },
    { quarter: 'Q3', label: 'Jun – Aug', date: nextBusinessDay(new Date(currentYear, 8, 15)) },
    { quarter: 'Q4', label: 'Sep – Dec', date: nextBusinessDay(new Date(currentYear + 1, 0, 15)) },
  ].map(d => ({ ...d, isPast: d.date < today }))

  const firstName = session.user.name?.split(' ')[0] ?? 'there'
  const hasScenario = !!scenario

  // Determine which sections have meaningful plan data
  const hasSS = hasScenario && (scenario.ssPaymentsPerYear > 0 || (scenario.ssStartYear ?? 0) > 0)
  const hasIRA = hasScenario && (scenario.iraBalance > 0 || scenario.rothBalance > 0)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">

      {!isPaid && <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD ?? 'dashboard'} />}

      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {firstName}</h1>
        {currentAge && (
          <p className="text-muted-foreground mt-1">
            Age {currentAge} · {currentYear}
            {rmdYear && currentAge < 73 && (
              <span> · RMD begins in {rmdYear} ({rmdYear - currentYear} years)</span>
            )}
          </p>
        )}
      </div>

      {/* Milestone Timeline — highlighted to current age */}
      <MilestoneTimeline dateOfBirth={dob} planEndsYear={planEndsYear} planToAge={planToAge || null} />

      {/* Section grid */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Medicare */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Medicare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Medicare becomes available at <strong className="text-foreground">age 65</strong>.
              Part A covers hospital care (usually premium-free), Part B covers outpatient services,
              and Part D covers prescription drugs. Higher earners pay IRMAA surcharges based on
              income from two years prior.
            </p>

            {/* Zone 1 — enrollment info (two-column table) */}
            {birthYear && (
              <div className="space-y-2">
                {/* Amber alerts */}
                {currentAge && currentAge >= 65 && !(enrolledPartA && enrolledPartB) && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 px-3 py-2 text-amber-800 dark:text-amber-300 text-xs leading-snug">
                    Apply for Part A &amp; B — unless keeping employer coverage.{' '}
                    <Link href="/medicare" className="underline font-medium">Medicare page →</Link>
                  </div>
                )}
                {spouseCurrentAge !== null && spouseCurrentAge >= 65 && !(spouseEnrolledPartA && spouseEnrolledPartB) && (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 px-3 py-2 text-amber-800 dark:text-amber-300 text-xs leading-snug">
                    Spouse eligible for Medicare — apply for Part A &amp; B unless keeping employer coverage.
                  </div>
                )}

                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 pr-2 font-normal text-muted-foreground w-[40%]"></th>
                      <th className="text-left py-1 pr-2 font-semibold text-foreground">You</th>
                      {hasSpouseSection && <th className="text-left py-1 font-semibold text-foreground">Spouse</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(medicareYear || spouseMedicareYear) && (
                      <tr>
                        <td className="py-0.5 pr-2 text-muted-foreground">Eligible</td>
                        <td className="py-0.5 pr-2">
                          {medicareYear
                            ? `${medicareYear}${currentAge && currentAge >= 65 ? '' : currentAge ? ` (in ${medicareYear - currentYear} yr${medicareYear - currentYear !== 1 ? 's' : ''})` : ''}`
                            : '—'}
                        </td>
                        {hasSpouseSection && (
                          <td className="py-0.5">
                            {spouseMedicareYear
                              ? `${spouseMedicareYear}${spouseCurrentAge && spouseCurrentAge >= 65 ? '' : spouseCurrentAge ? ` (in ${spouseMedicareYear - currentYear} yr${spouseMedicareYear - currentYear !== 1 ? 's' : ''})` : ''}`
                              : '—'}
                          </td>
                        )}
                      </tr>
                    )}
                    <tr>
                      <td className="py-0.5 pr-2 text-muted-foreground">Part A</td>
                      <td className="py-0.5 pr-2">{enrolledPartA ? '✓ Enrolled' : 'Not enrolled'}</td>
                      {hasSpouseSection && <td className="py-0.5">{spouseEnrolledPartA ? '✓ Enrolled' : 'Not enrolled'}</td>}
                    </tr>
                    <tr>
                      <td className="py-0.5 pr-2 text-muted-foreground">Part B</td>
                      <td className="py-0.5 pr-2">{enrolledPartB ? '✓ Enrolled' : 'Not enrolled'}</td>
                      {hasSpouseSection && <td className="py-0.5">{spouseEnrolledPartB ? '✓ Enrolled' : 'Not enrolled'}</td>}
                    </tr>
                    {(medicarePlanType || (hasSpouseSection && spouseMedicarePlanType)) && (
                      <tr>
                        <td className="py-0.5 pr-2 text-muted-foreground">Supplemental Plan</td>
                        <td className="py-0.5 pr-2">{medicarePlanType ? (planTypeLabels[medicarePlanType] ?? medicarePlanType) : '—'}</td>
                        {hasSpouseSection && <td className="py-0.5">{spouseMedicarePlanType ? (planTypeLabels[spouseMedicarePlanType] ?? spouseMedicarePlanType) : '—'}</td>}
                      </tr>
                    )}
                    {(pdpTier || (hasSpouseSection && spousePdpTier)) && (
                      <tr>
                        <td className="py-0.5 pr-2 text-muted-foreground">PDP</td>
                        <td className="py-0.5 pr-2">{pdpTier && medicarePlanType !== 'advantage' ? (pdpTierLabels[pdpTier] ?? pdpTier) : '—'}</td>
                        {hasSpouseSection && <td className="py-0.5">{spousePdpTier && spouseMedicarePlanType !== 'advantage' ? (pdpTierLabels[spousePdpTier] ?? spousePdpTier) : '—'}</td>}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Zone 2 — IRMAA strategy */}
            <div className="border-t pt-3 mt-3">
              {hasScenario ? (
                <ul className="space-y-1 text-sm">
                  <li><span className="text-foreground font-medium">IRMAA strategy:</span> {irmaaLabels[scenario.irmaaTargetTier ?? 0]}</li>
                </ul>
              ) : (
                <NoPlan page="/planning" label="Set up in Planning" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Social Security */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Social Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Benefits can begin as early as <strong className="text-foreground">age 62</strong> (reduced)
              or be delayed to <strong className="text-foreground">age 70</strong> (maximum — ~8% more per year past FRA).
              Your Full Retirement Age is <strong className="text-foreground">{fraAge}</strong>.
              Delaying SS is one of the most impactful retirement decisions you can make.
            </p>
            <div className="border-t pt-3">
              {hasSS ? (
                <ul className="space-y-1 text-sm">
                  {(scenario.ssStartYear ?? 0) > 0 && (
                    <li>
                      <span className="text-foreground font-medium">Your SS starts:</span>{' '}
                      {scenario.ssStartYear}{birthYear ? ` (age ${scenario.ssStartYear! - birthYear})` : ''}
                    </li>
                  )}
                  {scenario.ssPaymentsPerYear > 0 && (
                    <li><span className="text-foreground font-medium">Estimated benefit:</span> {fmtK(scenario.ssPaymentsPerYear)}/yr</li>
                  )}
                  {(scenario.spouseSsPaymentsPerYear ?? 0) > 0 && (
                    <li><span className="text-foreground font-medium">Spouse SS:</span> {fmtK(scenario.spouseSsPaymentsPerYear!)} /yr starting {scenario.spouseSsStartYear}</li>
                  )}
                </ul>
              ) : (
                <NoPlan page="/planning" label="Add SS to Planning" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* RMDs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">RMDs — Required Minimum Distributions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              RMDs begin at <strong className="text-foreground">age 73</strong> from traditional 401k and IRA accounts.
              The amount is your prior year-end balance divided by an IRS life expectancy factor — rising each year.
              Failure to take the full RMD triggers a <strong className="text-foreground">25% excise tax</strong> on the shortfall.
              Qualified Charitable Distributions (QCDs) from age 70½ count toward RMDs tax-free.
            </p>
            <div className="border-t pt-3">
              {hasIRA ? (
                <ul className="space-y-1 text-sm">
                  {scenario.iraBalance > 0 && (
                    <li><span className="text-foreground font-medium">IRA / 401k balance:</span> {fmtK(scenario.iraBalance)}</li>
                  )}
                  {scenario.rothBalance > 0 && (
                    <li><span className="text-foreground font-medium">Roth IRA balance:</span> {fmtK(scenario.rothBalance)}</li>
                  )}
                  {rmdYear && (
                    <li><span className="text-foreground font-medium">RMD begins:</span> {rmdYear}{currentAge && currentAge < 73 ? ` (${rmdYear - currentYear} yrs away)` : ''}</li>
                  )}
                  {(scenario.qcds ?? 0) > 0 && (
                    <li><span className="text-foreground font-medium">QCD plan:</span> {scenario.qcds}% of RMD donated to charity</li>
                  )}
                </ul>
              ) : (
                <NoPlan page="/planning" label="Add IRA to Planning" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legacy & Tax Plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Legacy &amp; Tax Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Under SECURE 2.0, heirs who inherit a traditional IRA must withdraw everything within{' '}
              <strong className="text-foreground">10 years</strong>, paying income tax on each withdrawal.
              Inherited Roth IRAs pass <strong className="text-foreground">tax-free</strong>.
              Roth conversions now reduce both your future RMDs and your heirs&apos; taxable inheritance.
            </p>
            <div className="border-t pt-3">
              {hasScenario ? (
                <ul className="space-y-1 text-sm">
                  <li>
                    <span className="text-foreground font-medium">Conversion strategy:</span>{' '}
                    {conversionWindowLabels[scenario.conversionWindow ?? 'always']}
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Aggressiveness:</span>{' '}
                    {irmaaLabels[scenario.irmaaTargetTier ?? 0]}
                  </li>
                  {scenario.iraBalance > 0 && (
                    <li>
                      <span className="text-foreground font-medium">Est. heir IRA RMD (baseline):</span>{' '}
                      {fmtK(scenario.iraBalance / 10)}/yr <span className="text-xs">(÷10 rough estimate)</span>
                    </li>
                  )}
                  {scenario.rothBalance > 0 && (
                    <li><span className="text-foreground font-medium">Roth (tax-free to heirs):</span> {fmtK(scenario.rothBalance)}</li>
                  )}
                  <li>
                    <Button asChild size="sm" variant="link" className="p-0 h-auto text-primary">
                      <Link href="/planning">View full projection →</Link>
                    </Button>
                  </li>
                </ul>
              ) : (
                <NoPlan page="/planning" label="Create Plan" />
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Quarterly Estimated Taxes — full width */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quarterly Estimated Taxes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            In retirement your taxes are no longer withheld from a paycheck, so the IRS requires you to
            pay <strong className="text-foreground">estimated taxes four times a year</strong>. Missing or
            underpaying a quarter can trigger a penalty. The amounts below are estimated from the income
            and Roth conversion plan you entered in the{' '}
            <Link href="/planning" className="text-primary underline hover:no-underline">Planning optimizer</Link>.
          </p>

          {hasScenario && birthYear ? (
            <>
              <div className="border-t pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Estimated {currentYear} tax liability — MAGI: <strong className="text-foreground">{fmtDollars(estimatedMagi)}</strong>
                  {annualConversionAmount > 0 && (
                    <> · Roth conversion: <strong className="text-foreground">{fmtDollars(annualConversionAmount)}</strong>
                    {' '}(+<strong className="text-foreground">{fmtDollars(annualConversionTax)}</strong> tax)</>
                  )}
                  {' · '}Federal: <strong className="text-foreground">{fmtDollars(annualFederal)}</strong>
                  {annualState > 0 && <>{' · '}{stateInfo?.name ?? 'State'}: <strong className="text-foreground">{fmtDollars(annualState)}</strong></>}
                  {' · '}Total: <strong className="text-foreground">{fmtDollars(annualTotal)}</strong>
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 pr-4 font-semibold text-foreground">Quarter</th>
                        <th className="text-left py-1.5 pr-4 font-semibold text-foreground">Income Period</th>
                        <th className="text-left py-1.5 pr-4 font-semibold text-foreground">Due Date</th>
                        <th className="text-right py-1.5 pr-4 font-semibold text-foreground">Federal</th>
                        {annualState > 0 && <th className="text-right py-1.5 pr-4 font-semibold text-foreground">{stateInfo?.name ?? 'State'}</th>}
                        <th className="text-right py-1.5 font-semibold text-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dueDates.map(({ quarter, label, date, isPast }) => (
                        <tr
                          key={quarter}
                          className={`border-b border-border/50 ${isPast ? 'opacity-40' : ''}`}
                        >
                          <td className="py-1.5 pr-4 font-medium text-foreground">{quarter}</td>
                          <td className="py-1.5 pr-4">{label}</td>
                          <td className="py-1.5 pr-4">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {isPast && <span className="ml-1 text-[10px] italic">past</span>}
                          </td>
                          <td className="py-1.5 pr-4 text-right tabular-nums">{fmtDollars(quarterlyFederal)}</td>
                          {annualState > 0 && <td className="py-1.5 pr-4 text-right tabular-nums">{fmtDollars(quarterlyState)}</td>}
                          <td className="py-1.5 text-right tabular-nums font-medium text-foreground">{fmtDollars(quarterlyTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
                  <a
                    href="https://directpay.irs.gov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline text-xs"
                  >
                    Pay Federal — IRS Direct Pay →
                  </a>
                  {statePayUrl && annualState > 0 && (
                    <a
                      href={statePayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:no-underline text-xs"
                    >
                      Pay {stateInfo?.name} State Taxes →
                    </a>
                  )}
                  <a
                    href="https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline text-xs"
                  >
                    IRS Estimated Tax Guide →
                  </a>
                </div>

                <p className="text-[11px] text-muted-foreground/60 border-t pt-2">
                  Estimates are based on your plan inputs and may differ from your actual liability. The IRS safe harbor
                  rule lets you avoid underpayment penalties by paying at least 100% of last year&apos;s tax (or 110%
                  if your prior-year AGI exceeded $150,000) — or 90% of this year&apos;s estimated tax, whichever is
                  less. Consult a tax advisor for your precise amounts.
                </p>
              </div>
            </>
          ) : (
            <NoPlan page="/planning" label="Set up in Planning" />
          )}
        </CardContent>
      </Card>

      {!hasScenario && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Set up your retirement plan</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visit the Retirement Optimizer to enter your IRA balances, SS details, and conversion strategy — then return here for your personalized summary.
            </p>
          </div>
          <Button asChild>
            <Link href="/planning">Get Started</Link>
          </Button>
        </div>
      )}

      {!isPaid && <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD ?? 'dashboard'} />}

    </main>
  )
}
