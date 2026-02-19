import { db } from '@/db'
import { users } from '@/db/schema'
import { desc } from 'drizzle-orm'
import MilestoneTimeline from '@/components/milestone-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getFullRetirementAge, fraToString } from '@/lib/milestones'

export default async function SocialSecurityPage() {
  const [user] = await db.select().from(users).orderBy(desc(users.id)).limit(1)
  const dob = user?.dateOfBirth ?? null

  let fraInfo = null
  if (dob) {
    const birthYear = new Date(dob + 'T00:00:00').getFullYear()
    const fra = getFullRetirementAge(birthYear)
    const fraYear = birthYear + fra.years
    const earlyYear = birthYear + 62
    const maxYear = birthYear + 70
    fraInfo = { fra, fraYear, earlyYear, maxYear, birthYear }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <MilestoneTimeline dateOfBirth={dob} highlight={['ss-early', 'ss-fra', 'ss-max']} />

      <h1 className="text-3xl font-bold mb-2">Social Security</h1>
      <p className="text-muted-foreground mb-6">
        When you claim Social Security is one of the most consequential retirement decisions you'll make. Waiting can permanently increase your monthly benefit by tens of thousands of dollars over your lifetime.
      </p>

      {fraInfo && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-primary">Your Key Social Security Ages</p>
          <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
            <div>
              <p className="font-semibold text-foreground">{fraInfo.earlyYear}</p>
              <p className="text-xs text-muted-foreground">Earliest claim (age 62) — reduced benefits</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{fraInfo.fraYear}</p>
              <p className="text-xs text-muted-foreground">Full Retirement Age ({fraToString(fraInfo.fra)}) — 100% benefit</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{fraInfo.maxYear}</p>
              <p className="text-xs text-muted-foreground">Maximum benefit (age 70) — 124–132%</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Claiming Early vs. Late</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">Claim at 62:</strong> You receive benefits sooner, but they're permanently reduced by up to <strong className="text-foreground">30%</strong> (for those born 1960+) compared to your Full Retirement Age benefit.
            </p>
            <p>
              <strong className="text-foreground">Claim at FRA:</strong> You receive 100% of your earned benefit. You also become eligible for full spousal and divorce benefits.
            </p>
            <p>
              <strong className="text-foreground">Delay to 70:</strong> Every year past FRA increases your benefit by <strong className="text-foreground">8% per year</strong> — guaranteed, risk-free. At 70, your benefit can be 24–32% higher than at FRA.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">When Should You Claim?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">Delay if:</strong> You're in good health, have longevity in your family, have other income sources, or are the higher earner in a married couple (maximizes survivor benefits).
            </p>
            <p>
              <strong className="text-foreground">Claim early if:</strong> You have significant health issues, need the income, have a shorter life expectancy, or are in a lower-earning spouse situation.
            </p>
            <p>
              <strong className="text-foreground">Break-even:</strong> Delaying from 62 to 70 typically breaks even around <strong className="text-foreground">age 80–82</strong>. If you expect to live past that, waiting pays off substantially.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spousal & Survivor Benefits</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              <strong className="text-foreground">Spousal benefit:</strong> Up to 50% of your spouse's FRA benefit, even if you never worked. You must be at least 62 and your spouse must be collecting.
            </p>
            <p>
              <strong className="text-foreground">Survivor benefit:</strong> A widow/widower can receive up to 100% of the deceased spouse's benefit. The higher earner delaying to 70 maximizes the surviving spouse's income for life.
            </p>
            <p>
              <strong className="text-foreground">Divorced spouses</strong> may also qualify if the marriage lasted 10+ years.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to Apply</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Apply <strong className="text-foreground">up to 4 months before</strong> you want benefits to begin — your first payment arrives about a month after your elected start date.</p>
            <p>• Online at <strong className="text-foreground">ssa.gov/benefits/retirement</strong></p>
            <p>• Call <strong className="text-foreground">1-800-772-1213</strong></p>
            <p>• Visit your local <strong className="text-foreground">Social Security office</strong></p>
            <p className="pt-2 text-xs">
              Create a My Social Security account at ssa.gov to see your personalized benefit estimates at 62, FRA, and 70 based on your actual earnings history.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
