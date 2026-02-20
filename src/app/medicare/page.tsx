import { Suspense } from 'react'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import MilestoneTimeline from '@/components/milestone-timeline'
import PlanFinder from '@/components/plan-finder'
import YearSelector from '@/components/year-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { resolveYear, getYearData } from '@/lib/retirement-data'

export const dynamic = 'force-dynamic'

function getIEP(dob: string) {
  const dobDate = new Date(dob + 'T00:00:00')
  const bday65 = new Date(dobDate)
  bday65.setFullYear(dobDate.getFullYear() + 65)

  const start = new Date(bday65)
  start.setMonth(bday65.getMonth() - 3)

  const end = new Date(bday65)
  end.setMonth(bday65.getMonth() + 3)

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const fmtFull = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return { start: fmt(start), end: fmt(end), birthday: fmtFull(bday65) }
}

export default async function MedicarePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')
  const [user] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
  const dob = user?.dateOfBirth ?? null
  const iep = dob ? getIEP(dob) : null
  const enrolledMedicare = user?.enrolledMedicare ?? false
  const collectingSS = user?.collectingSS ?? false

  const age = dob
    ? Math.floor((Date.now() - new Date(dob + 'T00:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const birthYear = dob ? new Date(dob + 'T00:00:00').getFullYear() : null

  const goals = {
    catastrophicRisk: user?.goalCatastrophicRisk ?? false,
    doctorFreedom: user?.goalDoctorFreedom ?? false,
    minPremium: user?.goalMinPremium ?? false,
    minTotalCost: user?.goalMinTotalCost ?? false,
    travelCoverage: user?.goalTravelCoverage ?? false,
  }

  const params = await searchParams
  const year = resolveYear(params.year)
  const yd = getYearData(year)

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <MilestoneTimeline dateOfBirth={dob} highlight={['medicare']} />

      <h1 className="text-3xl font-bold mb-2">Medicare</h1>
      <div className="flex items-start justify-between gap-4 mb-6">
        <p className="text-muted-foreground">
          Medicare is federal health insurance for people 65 and older. Understanding when and how to enroll — and which supplemental coverage to add — can save you thousands per year.
        </p>
        <Suspense fallback={null}>
          <YearSelector />
        </Suspense>
      </div>

      {enrolledMedicare ? (
        <div className="rounded-lg border border-green-400 bg-green-50 dark:bg-green-950/20 px-5 py-4 mb-8">
          <p className="text-sm font-semibold text-green-800 dark:text-green-400">✓ You are enrolled in Medicare</p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Focus on choosing the right supplemental coverage below. During your Medigap Open Enrollment window
            (first 6 months of Part B), insurers cannot deny coverage or charge more based on health.
            {collectingSS && ' Since you\u2019re collecting Social Security, you were auto-enrolled in Parts A and B.'}
          </p>
        </div>
      ) : iep ? (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-5 py-4 mb-8">
          <p className="text-sm font-semibold text-primary">Your Initial Enrollment Period (IEP)</p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{iep.start} – {iep.end}</span>
            <span className="text-xs ml-2">(your 65th birthday: {iep.birthday})</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Enroll in the first 3 months for coverage to begin on your birthday. Waiting until months 4–7 may delay your start date.
          </p>
        </div>
      ) : null}

      {/* Enrollment basics */}
      <div className="grid gap-6 md:grid-cols-2 mb-10">
        <Card>
          <CardHeader><CardTitle className="text-lg">When to Sign Up</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>Your <strong className="text-foreground">7-month IEP</strong> opens 3 months before your 65th birthday. Missing it means waiting for the General Enrollment Period (Jan–Mar) with coverage starting July 1.</p>
            <p>Still on <strong className="text-foreground">employer coverage</strong>? A Special Enrollment Period (8 months after it ends) applies — no late penalty.</p>
            <p>Already receiving Social Security at 65? You're <strong className="text-foreground">auto-enrolled</strong> in Parts A and B.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">What's Covered</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <div><strong className="text-foreground">Part A</strong> — Hospital. Free for most (40+ work quarters). Inpatient, SNF, hospice.</div>
            <div><strong className="text-foreground">Part B</strong> — Medical. ~${yd.partBPremium.toFixed(2)}/mo ({year}). Doctor visits, outpatient, preventive care.</div>
            <div><strong className="text-foreground">Part D</strong> — Rx drugs. Purchased separately or via Medicare Advantage.</div>
            <p className="pt-1 text-xs">Original Medicare (A + B) covers 80% of approved costs. The remaining 20% — plus deductibles — is where supplemental insurance matters.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Late Enrollment Penalties</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong className="text-foreground">Part B:</strong> +10% per year missed. Permanent.</p>
            <p><strong className="text-foreground">Part D:</strong> +1% per month without creditable drug coverage. Permanent.</p>
            <p className="text-xs">Employer/union/TRICARE/VA coverage counts as creditable coverage — enroll within 63 days of losing it to avoid penalties.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">How to Enroll</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>• Online at <strong className="text-foreground">ssa.gov/medicare</strong></p>
            <p>• Call <strong className="text-foreground">1-800-MEDICARE</strong> (1-800-633-4227)</p>
            <p>• Local <strong className="text-foreground">Social Security office</strong></p>
          </CardContent>
        </Card>
      </div>

      {/* Medigap vs Medicare Advantage */}
      <h2 className="text-2xl font-bold mb-2">Supplemental Coverage: Medigap vs. Medicare Advantage</h2>
      <p className="text-muted-foreground mb-6">
        Original Medicare leaves significant gaps. Most retirees choose one of two paths to fill them.
      </p>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg">Medigap (Medicare Supplement)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>Private insurance that works <strong className="text-foreground">alongside Original Medicare</strong> to cover its cost-sharing gaps. Plans are standardized by federal law (Plan A, B, C, D, F, G, K, L, M, N) — the same letter plan has identical benefits regardless of insurer.</p>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Advantages</p>
              <p>✓ Use <strong className="text-foreground">any doctor or hospital</strong> that accepts Medicare nationwide</p>
              <p>✓ <strong className="text-foreground">No referrals</strong> needed for specialists</p>
              <p>✓ Predictable, low out-of-pocket costs (especially Plan G)</p>
              <p>✓ Most plans include <strong className="text-foreground">foreign travel emergency</strong> coverage (80%)</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Disadvantages</p>
              <p>✗ Higher monthly premiums than Advantage</p>
              <p>✗ No prescription drug coverage — need a separate Part D plan</p>
              <p>✗ Medical underwriting applies outside Open Enrollment (can be denied or charged more based on health)</p>
            </div>
            <p className="text-xs"><strong className="text-foreground">Best for:</strong> People who want maximum flexibility, travel, or have ongoing healthcare needs.</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg">Medicare Advantage (Part C)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>An <strong className="text-foreground">all-in-one alternative</strong> to Original Medicare offered by private insurers. Includes Parts A and B coverage, usually Part D, and often dental, vision, and hearing.</p>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Advantages</p>
              <p>✓ Often <strong className="text-foreground">$0 monthly premium</strong></p>
              <p>✓ May include dental, vision, hearing, fitness benefits</p>
              <p>✓ Prescription drugs bundled (MAPD plans)</p>
              <p>✓ Annual out-of-pocket cap (≤${yd.medicareAdvantageOOPMax.toLocaleString('en-US')} in-network, {year})</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Disadvantages</p>
              <p>✗ <strong className="text-foreground">Network restrictions</strong> — HMO/PPO with in-network requirements</p>
              <p>✗ <strong className="text-foreground">Prior authorization</strong> often required for procedures</p>
              <p>✗ Coverage limited when traveling — out-of-network costs can be high</p>
              <p>✗ Plans change annually — benefits, networks, and costs may shift</p>
            </div>
            <p className="text-xs"><strong className="text-foreground">Best for:</strong> People who want low premiums, are generally healthy, and stay in a defined geographic area.</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Finder */}
      <h2 className="text-2xl font-bold mb-2">Plan Finder</h2>
      <p className="text-muted-foreground mb-4">
        Recommendations based on your age, ZIP code, and supplemental insurance priorities from your account.
      </p>
      <PlanFinder age={age} zipCode={user?.zipCode} goals={goals} birthYear={birthYear} year={year} />

    </main>
  )
}
