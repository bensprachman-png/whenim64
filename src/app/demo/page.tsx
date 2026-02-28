import { Suspense } from 'react'
import MilestoneTimeline from '@/components/milestone-timeline'
import YearSelector from '@/components/year-selector'
import IrmaaTable from '@/components/irmaa-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { resolveYear, getYearData } from '@/lib/retirement-data'
import { computeProjectionYears } from '@/lib/tax-engine'
import { getStateInfo } from '@/lib/state-tax'
import type { Metadata } from 'next'
import TaxOptimizer from '@/app/planning/_components/TaxOptimizer'
import AdBanner from '@/components/AdBanner'

export const metadata: Metadata = {
  title: 'Retirement Planning Demo',
  description: 'See how WhenIm64 models Roth conversions, RMDs, Social Security timing, and tax-efficient withdrawal strategies across your full retirement horizon.',
  openGraph: {
    title: 'Retirement Planning Demo | WhenIm64',
    description: 'See how WhenIm64 models Roth conversions, RMDs, and Social Security timing across your full retirement horizon.',
  },
}

// Fictional demo profile — James & Linda Morrison, Austin TX
const DEMO_DOB = '1961-06-15'          // James, age 64
const DEMO_SPOUSE_DOB = '1962-09-22'   // Linda, age 63
const DEMO_BIRTH_YEAR = 1961
const DEMO_SPOUSE_BIRTH_YEAR = 1962
const DEMO_FILING_STATUS = 'married_jointly'
const DEMO_SEX = 'male' as const
const DEMO_SPOUSE_SEX = 'female' as const
const DEMO_ZIP = '78701' // Austin, TX

const DEMO_SCENARIO = {
  userId: 'demo',
  w2Income: 150000,
  interestIncome: 1200,
  dividendIncome: 800,
  capGainsDist: 0,
  stcg: 0,
  ltcg: 0,
  otherIncome: 0,
  iraBalance: 650000,
  iraWithdrawals: 0,
  qcds: 0,
  rothBalance: 10000,
  taxableBalance: 50000,
  otherAssets: 0,
  realEstateValue: 425000,
  annualLivingExpenses: 75000,
  portfolioGrowthPct: 5,
  retirementYear: 2027,
  ssStartYear: 2031,
  ssPaymentsPerYear: 36000,
  ssMonthlyFraBenefit: null,
  spouseSsStartYear: 2032,
  spouseSsPaymentsPerYear: 24000,
  spouseSsMonthlyFraBenefit: null,
  inflationPct: 2.5,
  medicareEnrollees: 2,
  medicareStartYear: 0,
  irmaaTargetTier: 0 as 0,
  conversionWindow: 'always' as const,
  showConversions: true,
  planToAge: null,
  spousePlanToAge: null,
  annualDeferredContrib: 0,
  annualRothContrib: 0,
  employerMatchPct: 0,
  spouseAnnualDeferredContrib: 0,
  spouseAnnualRothContrib: 0,
  spouseEmployerMatchPct: 0,
  filingStatus: DEMO_FILING_STATUS,
  updatedAt: new Date(),
}

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const rmdYear = DEMO_BIRTH_YEAR + 73
  const defaultSsStartYear = DEMO_BIRTH_YEAR + 70
  const stateInfo = getStateInfo(DEMO_ZIP)

  const planEndsYear = new Date().getFullYear() + computeProjectionYears(
    DEMO_BIRTH_YEAR,
    DEMO_SPOUSE_BIRTH_YEAR,
    new Date().getFullYear(),
    DEMO_SEX,
    DEMO_SPOUSE_SEX,
    0,
    0,
  )

  const params = await searchParams
  const year = resolveYear(params.year)
  const yd = getYearData(year)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 rounded-md border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 text-sm text-amber-800 dark:text-amber-400">
        This is a demo using a fictional profile. <a href="/signup" className="underline font-medium">Create a free account</a> to model your own retirement.
      </div>

      <MilestoneTimeline dateOfBirth={DEMO_DOB} highlight={['rmd']} planEndsYear={planEndsYear} planToAge={null} />

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-3xl font-bold">Retirement Planning</h1>
        <Suspense fallback={null}>
          <YearSelector />
        </Suspense>
      </div>
      <p className="text-muted-foreground mb-6">
        A comprehensive plan covering four pillars: funding your lifestyle, minimizing costs, building a legacy, and charitable giving. Use the optimizer at the bottom to model your specific situation.
      </p>

      <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_PLANNING ?? 'planning'} className="mb-10" />

      {/* ── Planning Pillars ─────────────────────────────────────────────── */}
      <Accordion type="single" defaultValue="pillar-1" collapsible className="mb-12 rounded-lg border overflow-hidden divide-y">

        {/* 1. Fund Your Retirement Lifestyle */}
        <AccordionItem value="pillar-1" className="border-0">
          <AccordionTrigger className="px-5 py-4 bg-muted/30 hover:no-underline hover:bg-muted/60 items-center data-[state=open]:border-b">
            <div className="flex items-center gap-3">
              <span className="flex-none w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">1</span>
              <span className="text-base font-semibold">Fund Your Retirement Lifestyle</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
          <div className="px-5 py-4 text-sm text-muted-foreground space-y-3">
            <p>
              Ensure you have sufficient resources to cover your family&apos;s living expenses throughout the entire plan period — not just the early, healthy years, but all the way to the end of the projection.
            </p>
            <ul className="space-y-1.5 list-none pl-2">
              <li><span className="font-medium text-foreground">Taxable savings</span> are your primary drawdown account. They grow at your portfolio rate and are supplemented by after-tax RMD income each year.</li>
              <li><span className="font-medium text-foreground">COLA adjustment</span> — living expenses increase with inflation each year, so a budget that works today may fall short in 15 years without planning.</li>
              <li><span className="font-medium text-foreground">Roth IRA backup</span> — once taxable accounts are depleted, your Roth IRA provides tax-free coverage with no forced withdrawals.</li>
              <li><span className="font-medium text-foreground">Social Security</span> provides inflation-adjusted income for life — delaying to age 70 maximizes your monthly benefit and reduces longevity risk.</li>
            </ul>
            <p className="text-xs border-t pt-2 mt-2">
              Enter your annual living expenses, account balances, and Social Security estimates in the optimizer below to project your coverage over the full plan period.
            </p>
          </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Minimize Taxes & Medicare Costs */}
        <AccordionItem value="pillar-2" className="border-0">
          <AccordionTrigger className="px-5 py-4 bg-muted/30 hover:no-underline hover:bg-muted/60 items-center data-[state=open]:border-b">
            <div className="flex items-center gap-3">
              <span className="flex-none w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">2</span>
              <span className="text-base font-semibold">Minimize Taxes &amp; Medicare Costs</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
          <div className="px-5 py-4 text-sm text-muted-foreground space-y-6">
            <p>
              Strategic tax planning — especially around Required Minimum Distributions and Roth conversions — can save you tens of thousands of dollars over a lifetime. The window between retirement and age 73 is your best opportunity to act.
            </p>

            <div className="rounded-lg border bg-card px-4 py-3 space-y-2">
              <p>
                <strong className="text-foreground">IRA &amp; Roth IRA contributions require earned income.</strong>{' '}
                You can only contribute in years when you (or your spouse, if filing jointly) have wages or self-employment income. The {year} annual limit is <strong className="text-foreground">${yd.iraContributionLimit.toLocaleString('en-US')}</strong> per person (<strong className="text-foreground">${yd.iraCatchUpLimit.toLocaleString('en-US')}</strong> if age 50+).
              </p>
              <p>
                <strong className="text-foreground">Still working? Prioritize Roth contributions.</strong>{' '}
                Roth accounts are never subject to RMDs during your lifetime. Every dollar converted or contributed to a Roth now is a dollar that compounds tax-free and will never force a taxable withdrawal at 73.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <a href="https://www.irs.gov/payments/your-online-account" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                IRS Online Account →
              </a>
              <a href="https://www.irs.gov/retirement-plans/plan-participant-employee/required-minimum-distributions-rmds" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                IRS RMD Resources →
              </a>
            </div>

            <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
              <p className="font-semibold text-foreground">Your RMD Start Year</p>
              <p className="mt-1">
                You must begin taking Required Minimum Distributions by{' '}
                <strong className="text-foreground">April 1, {rmdYear + 1}</strong>{' '}
                (for the {rmdYear} tax year). Taking your first RMD late pushes two RMDs into one year — a potential tax spike.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">What Are RMDs?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    The IRS requires withdrawals from tax-deferred accounts (traditional 401k, 403b, IRA) starting at age <strong className="text-foreground">73</strong> under the SECURE 2.0 Act.
                  </p>
                  <p>
                    <strong className="text-foreground">Amount:</strong> Prior year-end balance ÷ IRS life expectancy factor (Publication 590-B). The factor decreases each year, so the required percentage rises.
                  </p>
                  <p>
                    <strong className="text-foreground">Penalty:</strong> Missing your RMD triggers a <strong className="text-foreground">25% excise tax</strong> on the shortfall (10% if corrected within 2 years). Roth 401k accounts are now also exempt from RMDs during the owner&apos;s lifetime.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Roth Conversions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    The years between retirement and age 73 are often a <strong className="text-foreground">&ldquo;tax valley&rdquo;</strong> — income is lower, but RMDs haven&apos;t started. Converting traditional IRA/401k funds to Roth during this window is one of the most powerful strategies available.
                  </p>
                  <p>
                    <strong className="text-foreground">Benefits:</strong> Reduces future RMD balances, Roth grows tax-free, no RMDs on Roth IRAs, and tax-free inheritance for heirs.
                  </p>
                  <p>
                    Convert just enough each year to <strong className="text-foreground">fill your current bracket</strong> without pushing into the next one.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">More Tax-Reduction Strategies</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong className="text-foreground">Early withdrawals:</strong> Taking IRA distributions before 73 — even if unneeded — reduces the balance subject to future RMDs.
                  </p>
                  <p>
                    <strong className="text-foreground">Bracket management:</strong> Model total income each year (SS, pensions, RMDs) and harvest capital gains or convert Roth to stay below the next bracket.
                  </p>
                  <p>
                    <strong className="text-foreground">Social Security:</strong> Up to 85% of SS becomes taxable once combined income exceeds $44,000 (MFJ). QCDs and Roth conversions reduce AGI and keep more SS tax-free.
                  </p>
                  <p>
                    <strong className="text-foreground">State taxes:</strong> Many states exempt SS and pension income. FL, TX, NV, and others have no income tax — a consideration for relocation planning.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">IRMAA — Medicare Surcharges</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    High-income retirees pay additional surcharges on Medicare Part B and Part D premiums. IRMAA is based on your MAGI from <strong className="text-foreground">{yd.irmaaBaseYear}</strong> — two years prior.
                  </p>
                  <p>
                    Roth conversions and QCDs that reduce your {yd.irmaaBaseYear} MAGI can lower or eliminate these surcharges. Joint filers often pay IRMAA twice.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">{year} IRMAA Brackets</h3>
              <IrmaaTable yearData={yd} filingStatus={DEMO_FILING_STATUS} />
            </div>
          </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Pass Wealth to Your Heirs */}
        <AccordionItem value="pillar-3" className="border-0">
          <AccordionTrigger className="px-5 py-4 bg-muted/30 hover:no-underline hover:bg-muted/60 items-center data-[state=open]:border-b">
            <div className="flex items-center gap-3">
              <span className="flex-none w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">3</span>
              <span className="text-base font-semibold">Pass Wealth to Your Heirs</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
          <div className="px-5 py-4 text-sm text-muted-foreground space-y-3">
            <p>
              The account types you leave behind have a profound impact on your heirs&apos; tax burden. Shifting wealth from taxable IRA balances toward Roth is one of the most effective gifts you can make.
            </p>
            <ul className="space-y-1.5 list-none pl-2">
              <li><span className="font-medium text-foreground">Inherited IRA</span> — heirs must withdraw within 10 years (SECURE 2.0) and pay ordinary income tax on every distribution. Large balances mean large annual tax bills for your beneficiaries.</li>
              <li><span className="font-medium text-foreground">Inherited Roth IRA</span> — completely tax-free to heirs, with no income tax on qualified distributions. The most valuable account type to pass on.</li>
              <li><span className="font-medium text-foreground">Inherited taxable accounts</span> — receive a step-up in cost basis at death, eliminating embedded capital gains. Relatively tax-efficient for heirs.</li>
              <li><span className="font-medium text-foreground">Roth conversions during your lifetime</span> — reduce future RMD balances and shift pre-tax IRA wealth into tax-free Roth, benefiting both you and your heirs simultaneously.</li>
            </ul>
            <p className="text-xs border-t pt-2 mt-2">
              The Wealth &amp; Legacy section of the optimizer below shows your projected final balances in each account type and estimates your heirs&apos; annual inherited IRA withdrawals.
            </p>
          </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Charitable Giving */}
        <AccordionItem value="pillar-4" className="border-0">
          <AccordionTrigger className="px-5 py-4 bg-muted/30 hover:no-underline hover:bg-muted/60 items-center data-[state=open]:border-b">
            <div className="flex items-center gap-3">
              <span className="flex-none w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">4</span>
              <span className="text-base font-semibold">Fund Charities &amp; Causes You Care About</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
          <div className="px-5 py-4 text-sm text-muted-foreground space-y-3">
            <p>
              Retirement provides powerful tax-advantaged tools for charitable giving. Giving strategically can reduce your taxes, satisfy your RMD, and maximize the impact of every dollar you donate.
            </p>
            <ul className="space-y-1.5 list-none pl-2">
              <li>
                <span className="font-medium text-foreground">Qualified Charitable Distributions (QCDs)</span> — if you&apos;re 70½ or older, you can transfer up to <strong className="text-foreground">${yd.qcdLimit.toLocaleString('en-US')}/year</strong> ({year}) directly from your IRA to a qualified charity. The amount counts toward your RMD but is excluded from taxable income entirely — reducing AGI, Medicare IRMAA, and Social Security taxation.
              </li>
              <li>
                <span className="font-medium text-foreground">Donor-Advised Funds (DAFs)</span> — contribute appreciated securities or cash, claim an immediate charitable deduction, and distribute grants to charities on your own timeline. Effective for bunching deductions into a single high-income year.
              </li>
              <li>
                <span className="font-medium text-foreground">Appreciated securities</span> — donating stocks or funds held over a year avoids capital gains tax entirely and delivers a deduction for the full fair-market value.
              </li>
            </ul>
            <p className="text-xs border-t pt-2 mt-2">
              QCDs must go directly from your IRA custodian to the charity — you cannot withdraw funds first. Donor-Advised Funds and private foundations do not qualify for QCD treatment. Set your QCD percentage in the optimizer below.
            </p>
          </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* ── Interactive Optimizer ─────────────────────────────────────────── */}
      <section>
        <TaxOptimizer
          initialScenario={DEMO_SCENARIO}
          birthYear={DEMO_BIRTH_YEAR}
          defaultFilingStatus={DEMO_FILING_STATUS}
          defaultSsStartYear={defaultSsStartYear}
          sex={DEMO_SEX}
          spouseBirthYear={DEMO_SPOUSE_BIRTH_YEAR}
          spouseSex={DEMO_SPOUSE_SEX}
          brokerageIraAccounts={[]}
          brokerageRothAccounts={[]}
          brokerageTaxableAccounts={[]}
          stateInfo={stateInfo}
          isPaid={false}
        />
      </section>

      <AdBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_PLANNING ?? 'planning'} className="mt-6" />
    </main>
  )
}
