import { db } from '@/db'
import { users } from '@/db/schema'
import { desc } from 'drizzle-orm'
import MilestoneTimeline from '@/components/milestone-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

export default async function MedicarePage() {
  const [user] = await db.select().from(users).orderBy(desc(users.id)).limit(1)
  const dob = user?.dateOfBirth ?? null
  const iep = dob ? getIEP(dob) : null

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <MilestoneTimeline dateOfBirth={dob} highlight={['medicare']} />

      <h1 className="text-3xl font-bold mb-2">Medicare</h1>
      <p className="text-muted-foreground mb-6">
        Medicare is federal health insurance for people 65 and older. Understanding when and how to enroll can save you from permanent premium penalties.
      </p>

      {iep && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-primary">Your Initial Enrollment Period (IEP)</p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{iep.start} – {iep.end}</span>
            <span className="text-xs ml-2">(your 65th birthday: {iep.birthday})</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Enroll in the first 3 months for coverage to begin on your birthday. Waiting until months 4–7 may delay your start date by 1–3 months.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">When to Sign Up</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              Your <strong className="text-foreground">7-month IEP</strong> opens 3 months before your 65th birthday and closes 3 months after. Missing it means waiting for the General Enrollment Period (Jan–Mar each year) with coverage starting July 1.
            </p>
            <p>
              Still working with <strong className="text-foreground">employer health coverage</strong>? You qualify for a Special Enrollment Period (SEP) — 8 months after that coverage ends. No late penalty applies.
            </p>
            <p>
              If you're already receiving Social Security at 65, you'll be <strong className="text-foreground">enrolled automatically</strong> in Parts A and B — no action needed.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What's Covered</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>
              <span className="font-semibold text-foreground">Part A</span> — Hospital insurance.{' '}
              Free for most people with 40+ work credits (10 years). Covers inpatient hospital stays, skilled nursing, hospice, and some home health care.
            </div>
            <div>
              <span className="font-semibold text-foreground">Part B</span> — Medical insurance.{' '}
              ~$185/month premium (2025, income-based IRMAA surcharges may apply). Covers doctor visits, outpatient care, lab work, and preventive services.
            </div>
            <div>
              <span className="font-semibold text-foreground">Part D</span> — Prescription drugs.{' '}
              Purchased separately or bundled into a Medicare Advantage (Part C) plan.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Late Enrollment Penalties</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">Part B:</strong> For each 12-month period you were eligible but didn't enroll, your premium increases by <strong className="text-foreground">10% permanently</strong>. A 2-year delay means a 20% higher premium for life.
            </p>
            <p>
              <strong className="text-foreground">Part D:</strong> 1% of the national base premium (~$37 in 2025) per month without creditable drug coverage. Also permanent.
            </p>
            <p className="text-xs">
              Creditable coverage (e.g., employer plans, TRICARE, VA) protects you from penalties as long as you enroll within 63 days of losing it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to Enroll</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Online at <strong className="text-foreground">ssa.gov/medicare</strong></p>
            <p>• Call <strong className="text-foreground">1-800-MEDICARE</strong> (1-800-633-4227)</p>
            <p>• Visit your local <strong className="text-foreground">Social Security office</strong></p>
            <p>• Through your <strong className="text-foreground">employer's HR department</strong> if coordinating with group coverage</p>
            <p className="pt-2 text-xs">
              Compare Original Medicare (Parts A + B + D) vs. Medicare Advantage (Part C) carefully — Advantage plans may have lower premiums but restricted networks.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
