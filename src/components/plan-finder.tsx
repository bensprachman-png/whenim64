'use client'

import { scorePlans, PROVIDERS, Goals, PlanSummary } from '@/lib/plans'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  age?: number | null
  zipCode?: string | null
  goals: Goals
}

function Check({ yes }: { yes: boolean }) {
  return (
    <span className={yes ? 'text-green-600 font-bold' : 'text-muted-foreground/40'}>
      {yes ? '✓' : '✗'}
    </span>
  )
}

function ScoreBadge({ plan, topScore }: { plan: PlanSummary; topScore: number }) {
  if (topScore === 0) return null
  const isTop = plan.score === topScore
  if (!isTop) return null
  return <Badge className="ml-2 text-xs">Recommended</Badge>
}

export default function PlanFinder({ age, zipCode, goals }: Props) {
  const effectiveAge = age ?? 65
  const plans = scorePlans(goals, effectiveAge)
  const topScore = plans[0].score

  const hasGoals = Object.values(goals).some(Boolean)

  return (
    <div className="space-y-6">

      {/* Context bar */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {age && zipCode ? (
          <>
            <span className="rounded-md bg-muted px-3 py-1">Age {age}</span>
            <span className="rounded-md bg-muted px-3 py-1">ZIP {zipCode}</span>
            {!hasGoals && (
              <span className="rounded-md border border-dashed px-3 py-1 text-xs">
                Add supplemental insurance goals in your Account to get a personalized recommendation
              </span>
            )}
          </>
        ) : (
          <span className="rounded-md border border-dashed px-3 py-1 text-xs">
            Complete your profile (Account page) to see personalized plan recommendations
          </span>
        )}
        {hasGoals && (
          <div className="flex flex-wrap gap-1">
            {goals.catastrophicRisk && <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">Catastrophic risk</span>}
            {goals.doctorFreedom && <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">Doctor freedom</span>}
            {goals.minPremium && <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">Low premiums</span>}
            {goals.minTotalCost && <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">Min total cost</span>}
            {goals.travelCoverage && <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">Travel coverage</span>}
          </div>
        )}
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-4 py-3 font-semibold">Plan</th>
              <th className="text-left px-4 py-3 font-semibold">Est. Monthly Premium</th>
              <th className="text-left px-4 py-3 font-semibold">Max Annual OOP</th>
              <th className="text-center px-3 py-3 font-semibold">Any Doctor</th>
              <th className="text-center px-3 py-3 font-semibold">Travel</th>
              <th className="text-center px-3 py-3 font-semibold">Rx Bundled</th>
              <th className="text-left px-4 py-3 font-semibold">Best For</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const isTop = hasGoals && plan.score === topScore && topScore > 0
              return (
                <tr
                  key={plan.id}
                  className={cn(
                    'border-b last:border-0 transition-colors',
                    isTop ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : 'hover:bg-muted/20',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-semibold">{plan.name}</span>
                      <ScoreBadge plan={plan} topScore={topScore} />
                    </div>
                    <span className="text-xs text-muted-foreground">{plan.type}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{plan.premiumRange}</td>
                  <td className="px-4 py-3">{plan.maxAnnualOOP}</td>
                  <td className="text-center px-3 py-3"><Check yes={plan.anyDoctor} /></td>
                  <td className="text-center px-3 py-3"><Check yes={plan.foreignTravel} /></td>
                  <td className="text-center px-3 py-3"><Check yes={plan.rxIncluded} /></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{plan.bestFor}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        * Premium estimates are for a 65-year-old in average-cost states. Actual premiums vary by age, gender, state, tobacco use, and insurer. Medigap plans are standardized by federal law — benefits are identical across insurers for the same plan letter. Contact providers for exact quotes based on ZIP {zipCode ?? 'code'}.
      </p>

      {/* Provider cards for top plan */}
      {(() => {
        const topPlanId = plans[0].id
        const providers = PROVIDERS.filter((p) => p.planId === topPlanId)
        const topPlan = plans[0]
        return (
          <div>
            <h3 className="font-semibold mb-1">
              {hasGoals ? `Top Providers for ${topPlan.name}` : `Popular ${topPlan.name} Providers`}
            </h3>
            {topPlanId === 'advantage' && (
              <p className="text-xs text-muted-foreground mb-3">
                Medicare Advantage plans vary significantly by ZIP code. Use the{' '}
                <a href="https://www.medicare.gov/plan-compare" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                  Medicare Plan Finder
                </a>{' '}
                to see exact plans available in ZIP {zipCode ?? 'your area'}.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {providers.map((p) => (
                <div key={p.name} className="rounded-lg border bg-card p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{p.name}</span>
                    <span className="text-xs bg-muted rounded px-2 py-0.5">{p.planLabel}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{p.premiumRange} <span className="text-xs">(est.)</span></span>
                  <div className="flex gap-3 mt-1 text-xs">
                    <a
                      href={p.quoteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:no-underline"
                    >
                      Get a quote →
                    </a>
                    <span className="text-muted-foreground">{p.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
