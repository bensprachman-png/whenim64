'use client'

import { getPlansForState, getProvidersForPlan, Goals, PlanSummary } from '@/lib/plans'
import { zipToState, getStateName, isNonStandardMedigapState } from '@/lib/zip-to-state'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  age?: number | null
  zipCode?: string | null
  goals: Goals
  birthYear?: number | null
  year: number
}

function Check({ yes }: { yes: boolean }) {
  return (
    <span className={yes ? 'text-green-600 font-bold' : 'text-muted-foreground/40'}>
      {yes ? '✓' : '✗'}
    </span>
  )
}

function StateNotice({ state }: { state: string }) {
  const name = getStateName(state)

  if (state === 'MA') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm mb-4">
        <p className="font-semibold text-amber-800 dark:text-amber-400">
          ⚠ Massachusetts uses non-standard Medigap plans
        </p>
        <p className="text-amber-700 dark:text-amber-300 mt-1">
          {name} does not use the standard federal plan letters (A–N). Instead, MA has three state-specific plans:
          <strong> Core</strong>, <strong>Supplement 1A</strong> (available to all enrollees), and{' '}
          <strong>Supplement 1</strong> (available only if you were eligible for Medicare before January 1, 2020).
          Supplement 1A is most comparable to federal Plan G.
        </p>
      </div>
    )
  }

  if (state === 'MN') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm mb-4">
        <p className="font-semibold text-amber-800 dark:text-amber-400">
          ⚠ Minnesota uses non-standard Medigap plans
        </p>
        <p className="text-amber-700 dark:text-amber-300 mt-1">
          {name} does not use federal plan letters. MN has a <strong>Basic Plan</strong> and an{' '}
          <strong>Extended Basic Plan</strong> (which adds Part A/B deductible coverage). Optional riders
          are available. Note: UCare exited the MN Medigap market effective December 31, 2025.
        </p>
      </div>
    )
  }

  if (state === 'WI') {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm mb-4">
        <p className="font-semibold text-amber-800 dark:text-amber-400">
          ⚠ Wisconsin uses non-standard Medigap plans
        </p>
        <p className="text-amber-700 dark:text-amber-300 mt-1">
          {name} does not use federal plan letters. WI has a mandatory <strong>Basic Plan</strong> with
          optional add-on riders for deductibles, foreign travel, and excess charges. Contact insurers
          for the current rider menu and combined premiums.
        </p>
      </div>
    )
  }

  return null
}

export default function PlanFinder({ age, zipCode, goals, birthYear, year }: Props) {
  const state = zipCode ? zipToState(zipCode) : null
  const stateName = state ? getStateName(state) : null
  const effectiveAge = age ?? 65

  const plans = getPlansForState(goals, effectiveAge, state, birthYear ?? undefined, year)
  const hasGoals = Object.values(goals).some(Boolean)
  const topScore = plans[0].score
  const topPlan = plans[0]
  const providers = getProvidersForPlan(topPlan.id, state)

  return (
    <div className="space-y-5">

      {/* Context bar */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {age && (
          <span className="rounded-md bg-muted px-3 py-1 text-xs">Age {age}</span>
        )}
        {zipCode && state && (
          <span className="rounded-md bg-muted px-3 py-1 text-xs">
            ZIP {zipCode} → <strong>{stateName}</strong>
          </span>
        )}
        {zipCode && !state && (
          <span className="rounded-md border border-dashed px-3 py-1 text-xs text-muted-foreground">
            Could not determine state from ZIP {zipCode}
          </span>
        )}
        {!zipCode && (
          <span className="rounded-md border border-dashed px-3 py-1 text-xs text-muted-foreground">
            Add your ZIP code in Account for state-specific plans
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
        {!hasGoals && (
          <span className="text-xs text-muted-foreground border border-dashed rounded px-3 py-1">
            Set priorities in Account for a personalized recommendation
          </span>
        )}
      </div>

      {/* Special state notice */}
      {state && isNonStandardMedigapState(state) && <StateNotice state={state} />}

      {/* Plan comparison table */}
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
            {plans.map((plan: PlanSummary) => {
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
                      {isTop && <Badge className="ml-1 text-xs">Recommended</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{plan.type}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{plan.premiumRange}</td>
                  <td className="px-4 py-3 text-xs">{plan.maxAnnualOOP}</td>
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
        * Premium estimates are approximate for a 65-year-old. Actual premiums vary by age, gender,
        state, tobacco use, and insurer. Medigap plan benefits are federally standardized per plan
        letter — identical across insurers. Contact providers directly for exact quotes.
      </p>

      {/* Providers for top plan */}
      <div>
        <h3 className="font-semibold mb-1">
          {hasGoals
            ? `Top Providers for ${topPlan.name} in ${stateName ?? 'Your State'}`
            : `Popular ${topPlan.name} Providers`}
        </h3>

        {topPlan.id === 'advantage' && (
          <p className="text-xs text-muted-foreground mb-3">
            Medicare Advantage plans vary significantly by ZIP code. Use the{' '}
            <a href="https://www.medicare.gov/plan-compare" target="_blank" rel="noopener noreferrer" className="underline text-primary">
              Medicare Plan Finder
            </a>{' '}
            to see exact plans available in {zipCode ? `ZIP ${zipCode}` : 'your area'}.
          </p>
        )}

        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Contact your state insurance commissioner or{' '}
            <a href="https://www.medicare.gov/plan-compare" target="_blank" rel="noopener noreferrer" className="underline text-primary">
              medicare.gov
            </a>{' '}
            for providers available in {stateName ?? 'your area'}.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {providers.map((p) => (
              <div
                key={`${p.name}-${p.planLabel}`}
                className={cn(
                  'rounded-lg border bg-card p-4 flex flex-col gap-1',
                  p.note ? 'border-amber-300' : '',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className="text-xs bg-muted rounded px-2 py-0.5">{p.planLabel}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {p.premiumRange} <span className="text-xs">(est.)</span>
                </span>
                {p.note && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">⚠ {p.note}</p>
                )}
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
        )}
      </div>
    </div>
  )
}
