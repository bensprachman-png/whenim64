import { Suspense } from 'react'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import MilestoneTimeline from '@/components/milestone-timeline'
import YearSelector from '@/components/year-selector'
import IrmaaTable from '@/components/irmaa-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { resolveYear, getYearData } from '@/lib/retirement-data'

export const dynamic = 'force-dynamic'

export default async function TaxesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  const [user] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
  const dob = user?.dateOfBirth ?? null

  let rmdYear: number | null = null
  if (dob) {
    const birthYear = new Date(dob + 'T00:00:00').getFullYear()
    rmdYear = birthYear + 73
  }

  const params = await searchParams
  const year = resolveYear(params.year)
  const yd = getYearData(year)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <MilestoneTimeline dateOfBirth={dob} highlight={['rmd']} />

      <h1 className="text-3xl font-bold mb-2">Taxes in Retirement</h1>
      <div className="flex items-start justify-between gap-4 mb-6">
        <p className="text-muted-foreground">
          Strategic tax planning — especially around Required Minimum Distributions — can save you tens of thousands of dollars. The window between retirement and age 73 is your best opportunity to act.
        </p>
        <Suspense fallback={null}>
          <YearSelector />
        </Suspense>
      </div>

      {rmdYear && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-primary">Your RMD Start Year</p>
          <p className="text-sm text-muted-foreground mt-1">
            You must begin taking Required Minimum Distributions by{' '}
            <strong className="text-foreground">April 1, {rmdYear + 1}</strong>{' '}
            (for the {rmdYear} tax year). Taking your first RMD late pushes two RMDs into one year — a potential tax spike.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What Are RMDs?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The IRS requires withdrawals from tax-deferred accounts (traditional 401k, 403b, traditional IRA) starting at age <strong className="text-foreground">73</strong> under the SECURE 2.0 Act (for those born after 1950).
            </p>
            <p>
              <strong className="text-foreground">Amount:</strong> Your prior year-end account balance ÷ your IRS life expectancy factor (IRS Publication 590-B, Uniform Lifetime Table). The factor decreases each year, so the percentage you must withdraw rises.
            </p>
            <p>
              <strong className="text-foreground">Penalty:</strong> Failing to take your full RMD triggers a <strong className="text-foreground">25% excise tax</strong> on the shortfall (reduced to 10% if corrected within 2 years). Roth 401k accounts are now also exempt from RMDs during the owner's lifetime (SECURE 2.0).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Roth Conversions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The years between retirement and age 73 are often a <strong className="text-foreground">"tax valley"</strong> — income is lower, but RMDs haven't started yet. Converting traditional IRA/401k funds to a Roth IRA during this window is one of the most powerful strategies available.
            </p>
            <p>
              <strong className="text-foreground">Benefits:</strong> Reduces your future RMD balance (and therefore taxable RMD amounts), Roth grows tax-free, no RMDs required on Roth IRAs, and tax-free inheritance for heirs.
            </p>
            <p>
              Convert just enough each year to <strong className="text-foreground">fill up your current tax bracket</strong> without pushing into the next one. A tax advisor can calculate the optimal annual amount.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Qualified Charitable Distributions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              If you're 70½ or older and charitably inclined, a <strong className="text-foreground">QCD</strong> lets you transfer up to{' '}
              <strong className="text-foreground">${yd.qcdLimit.toLocaleString('en-US')}/year</strong>{' '}
              ({year}, indexed for inflation) directly from your IRA to a qualified charity.
            </p>
            <p>
              The transfer <strong className="text-foreground">counts toward your RMD</strong> but is excluded from your taxable income entirely — better than a deduction because it reduces your AGI, which affects Medicare premiums (IRMAA), Social Security taxation, and other phase-outs.
            </p>
            <p className="text-xs">
              QCDs must go directly from your IRA custodian to the charity — you cannot withdraw the funds first. Donor-Advised Funds and private foundations do not qualify.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">More Tax-Reduction Strategies</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">Early withdrawals:</strong> Taking distributions from traditional accounts before 73 — even if you don't need them — reduces the balance subject to future RMDs and can keep you in lower brackets.
            </p>
            <p>
              <strong className="text-foreground">Bracket management:</strong> Each year, model your total income (SS, pension, investment income, RMDs) and harvest just enough capital gains or do Roth conversions to stay below the next bracket threshold.
            </p>
            <p>
              <strong className="text-foreground">State taxes:</strong> Many states exempt Social Security and pension income. Some (e.g., Florida, Texas, Nevada) have no income tax at all — a consideration for relocation planning.
            </p>
            <p>
              <strong className="text-foreground">Social Security taxation:</strong> Up to 85% of SS benefits become taxable once combined income exceeds $44,000 (married filing jointly). Reducing your AGI via QCDs or Roth conversions helps keep more of your SS benefit tax-free.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* IRMAA section */}
      <h2 className="text-2xl font-bold mt-10 mb-2">IRMAA — Income-Related Medicare Adjustment</h2>
      <p className="text-muted-foreground mb-6">
        High-income retirees pay additional surcharges on Medicare Part B and Part D premiums. IRMAA is determined by your Modified Adjusted Gross Income (MAGI) from{' '}
        <strong className="text-foreground">{yd.irmaaBaseYear}</strong> — two years prior to the premium year. Roth conversions and QCDs that reduce your {yd.irmaaBaseYear} MAGI can lower or eliminate these surcharges.
      </p>
      <IrmaaTable yearData={yd} />
    </main>
  )
}
