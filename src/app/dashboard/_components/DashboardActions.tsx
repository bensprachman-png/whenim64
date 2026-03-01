'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { HeartPulse, Landmark, Receipt, BookOpen, CalendarCheck, FlaskConical, TrendingUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionCategory = 'medicare' | 'ss' | 'taxes' | 'planning'

interface Action {
  id: string
  category: ActionCategory
  title: string
  description: string
  dueLabel: string | null
  urgency: 'high' | 'medium' | 'low'
  link?: string
  forced?: boolean
}

export interface DashboardActionsProps {
  dateOfBirth: string | null
  spouseDateOfBirth: string | null
  ssStartYear: number | null
  spouseSsStartYear: number | null
  retirementYear: number | null
  enrolledPartA: boolean
  enrolledPartB: boolean
  spouseEnrolledPartA: boolean
  spouseEnrolledPartB: boolean
  hasSupplement: boolean
  spouseHasSupplement: boolean
  quarterlyFedTaxTotal: number
  quarterlyStateTaxTotal: number
  stateCode: string | null
  statePayUrl: string | null
  hasScenario: boolean
  planFundingPct: number | null     // 100 = fully funded; 0–99 = % of retirement years covered; null = not computable
  annualLivingExpenses: number
  canTest: boolean
}

// ─── Action generation ────────────────────────────────────────────────────────

type TestForces = Set<string>

function generateActions(props: DashboardActionsProps, today: Date, testForces: TestForces): Action[] {
  const {
    dateOfBirth, spouseDateOfBirth,
    ssStartYear, spouseSsStartYear,
    retirementYear,
    enrolledPartA, enrolledPartB,
    spouseEnrolledPartA, spouseEnrolledPartB,
    hasSupplement, spouseHasSupplement,
    quarterlyFedTaxTotal, quarterlyStateTaxTotal,
    stateCode, statePayUrl,
    hasScenario, annualLivingExpenses,
  } = props

  const actions: Action[] = []
  const year = today.getFullYear()
  const inWindow = (start: Date, end: Date) => today >= start && today <= end
  const forcing  = (key: string) => testForces.has(key)

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const urgency = (due: Date): 'high' | 'medium' | 'low' => {
    const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
    if (days <= 14) return 'high'
    if (days <= 30) return 'medium'
    return 'low'
  }

  // ── Set up living expenses (always shown when missing) ────────────────────
  if (hasScenario && annualLivingExpenses === 0) {
    actions.push({
      id: 'setup-expenses',
      category: 'planning',
      title: 'Add annual living expenses to your plan',
      description: 'Enter your estimated annual retirement spending in Planning to enable the funding status check and see if your plan is on track.',
      dueLabel: null,
      urgency: 'medium',
      link: '/planning',
    })
  }

  // ── Medicare ──────────────────────────────────────────────────────────────
  const medicarePersons = [
    { dob: dateOfBirth,       enrolledAB: enrolledPartA && enrolledPartB, hasSup: hasSupplement,       suffix: '',        label: '',         forceAB: 'medicare-ab',        forceSupp: 'medicare-supp'        },
    { dob: spouseDateOfBirth, enrolledAB: spouseEnrolledPartA && spouseEnrolledPartB, hasSup: spouseHasSupplement, suffix: '-spouse', label: 'Spouse — ', forceAB: 'medicare-ab-spouse', forceSupp: 'medicare-supp-spouse' },
  ]
  for (const { dob, enrolledAB, hasSup, suffix, label, forceAB, forceSupp } of medicarePersons) {
    if (!dob) continue
    const birth  = new Date(dob + 'T00:00:00')
    const bYear  = birth.getFullYear()
    const age65  = new Date(bYear + 65, birth.getMonth(), birth.getDate())
    const suppEnd = new Date(age65); suppEnd.setMonth(suppEnd.getMonth() + 6)

    // Part A & B — 3 months before 65th birthday through 3 months after
    if (!enrolledAB) {
      const start = new Date(age65); start.setMonth(start.getMonth() - 3)
      const end   = new Date(age65); end.setMonth(end.getMonth() + 3)
      const active = inWindow(start, end)
      if (active || forcing(forceAB)) {
        const due = age65 > today ? age65 : end
        actions.push({
          id: `medicare-ab-${bYear + 65}${suffix}`,
          category: 'medicare',
          title: `${label}Apply for Medicare Part A & B`,
          description: 'Your Initial Enrollment Period is open. Apply at ssa.gov, call 1-800-772-1213, or visit your local Social Security office. Enrolling late can result in permanent premium penalties.',
          dueLabel: age65 > today ? `Before ${fmtDate(age65)}` : `Window closes ${fmtDate(end)}`,
          urgency: active ? urgency(due) : 'low',
          link: 'https://www.ssa.gov/medicare/sign-up',
          forced: !active,
        })
      }
    }

    // Supplement coverage — window opens 30 days before 65th birthday through 6 months after
    // Medicare Advantage OR Medigap + standalone Part D
    if (!hasSup) {
      const start = new Date(age65); start.setDate(start.getDate() - 30)
      const active = inWindow(start, suppEnd)
      if (active || forcing(forceSupp)) {
        actions.push({
          id: `medicare-supp-${bYear + 65}${suffix}`,
          category: 'medicare',
          title: `${label}Choose Medicare Advantage or Medigap coverage`,
          description:
            'You have two paths: (1) Medicare Advantage (Part C) — an all-in-one plan from a private insurer that bundles Parts A, B, and usually D; or (2) Original Medicare with a Medigap supplement (Plan G is most comprehensive) plus a separate Part D drug plan. ' +
            'This is your guaranteed-issue window — Medigap plans cannot deny coverage based on health history.',
          dueLabel: `Window closes ${fmtDate(suppEnd)}`,
          urgency: active ? urgency(suppEnd) : 'low',
          link: 'https://www.medicare.gov/find-a-plan/questions/home.aspx',
          forced: !active,
        })
      }
    }
  }

  // ── Social Security ───────────────────────────────────────────────────────
  const ssPersons = [
    { startYear: ssStartYear,       suffix: '',        label: '',          forceKey: 'ss-apply'        },
    { startYear: spouseSsStartYear, suffix: '-spouse', label: 'Spouse — ', forceKey: 'ss-apply-spouse' },
  ]
  for (const { startYear, suffix, label, forceKey } of ssPersons) {
    if (!startYear) continue
    const windowStart = new Date(startYear - 1, 9, 1)   // Oct 1 of prior year
    const windowEnd   = new Date(startYear, 0, 31)       // Jan 31 of start year
    const active = inWindow(windowStart, windowEnd)
    if (active || forcing(forceKey)) {
      const due = new Date(startYear, 0, 1)
      actions.push({
        id: `ss-apply-${startYear}${suffix}`,
        category: 'ss',
        title: `${label}Begin Social Security application`,
        description: `You've planned to start SS benefits in ${startYear}. SSA recommends applying 4 months in advance — benefits cannot start retroactively in most cases. Apply at ssa.gov or call 1-800-772-1213.`,
        dueLabel: today < due ? `Apply by ${fmtDate(due)}` : `Start year: ${startYear}`,
        urgency: active ? urgency(windowEnd) : 'low',
        link: 'https://www.ssa.gov/benefits/retirement/apply.html',
        forced: !active,
      })
    }
  }

  // ── Quarterly Estimated Taxes ─────────────────────────────────────────────
  const isRetired = retirementYear !== null && retirementYear <= year
  const forcesTax = forcing('est-taxes')
  const quarters: Array<{ q: number; start: Date; due: Date; label: string }> = [
    { q: 1, start: new Date(year, 3,  1), due: new Date(year, 3, 15), label: 'Q1' },
    { q: 2, start: new Date(year, 5,  1), due: new Date(year, 5, 15), label: 'Q2' },
    { q: 3, start: new Date(year, 8,  1), due: new Date(year, 8, 15), label: 'Q3' },
    { q: 4, start: new Date(year, 11, 1), due: new Date(year + 1, 0, 15), label: 'Q4' },
  ]
  if (isRetired || forcesTax) {
    const fedAmt = quarterlyFedTaxTotal > 0
      ? ` (~$${Math.round(quarterlyFedTaxTotal).toLocaleString('en-US')} estimated)` : ''
    for (const { q, start, due, label } of quarters) {
      const active = inWindow(start, due)
      if (active || forcesTax) {
        actions.push({
          id: `est-tax-fed-${label.toLowerCase()}-${year}`,
          category: 'taxes',
          title: `Pay ${label} federal estimated taxes`,
          description: `${label} IRS estimated tax payment${fedAmt} due ${fmtDate(due)}. Pay online at IRS Direct Pay — no account required.`,
          dueLabel: `Due ${fmtDate(due)}`,
          urgency: active ? urgency(due) : 'low',
          link: 'https://www.irs.gov/payments',
          forced: !active,
        })
      }
    }
  }

  // State estimated taxes — separate action when state has income tax
  if ((statePayUrl && (quarterlyStateTaxTotal > 0 || forcesTax)) && (isRetired || forcesTax)) {
    const stateAmt = quarterlyStateTaxTotal > 0
      ? ` (~$${Math.round(quarterlyStateTaxTotal).toLocaleString('en-US')} estimated)` : ''
    for (const { q, start, due, label } of quarters) {
      const active = inWindow(start, due)
      if (active || forcesTax) {
        actions.push({
          id: `est-tax-state-${label.toLowerCase()}-${year}`,
          category: 'taxes',
          title: `Pay ${label} ${stateCode} state estimated taxes`,
          description: `${label} ${stateCode} estimated state tax payment${stateAmt} due ${fmtDate(due)}.`,
          dueLabel: `Due ${fmtDate(due)}`,
          urgency: active ? urgency(due) : 'low',
          link: statePayUrl ?? undefined,
          forced: !active,
        })
      }
    }
  }

  // ── Year-end Planning ─────────────────────────────────────────────────────
  const yearEndStart = new Date(year, 10, 15)
  const yearEndEnd   = new Date(year, 11, 31)
  const yearEndActive = inWindow(yearEndStart, yearEndEnd)
  if (yearEndActive || forcing('year-end')) {
    actions.push({
      id: `year-end-${year}`,
      category: 'planning',
      title: 'Year-end tax planning',
      description: 'Review investment portfolio for tax-loss harvesting opportunities, finalize Roth conversion amounts, and verify estimated tax payments. All trades must settle and conversions complete before December 31.',
      dueLabel: 'Before Dec 31',
      urgency: yearEndActive ? urgency(yearEndEnd) : 'low',
      forced: !yearEndActive,
    })
  }

  // ── Quarterly Plan Review ─────────────────────────────────────────────────
  const quarter    = Math.floor(today.getMonth() / 3) + 1
  const qStart     = new Date(year, (quarter - 1) * 3, 1)
  const qReviewEnd = new Date(year, (quarter - 1) * 3, 14)
  const reviewActive = inWindow(qStart, qReviewEnd)
  if (reviewActive || forcing('quarterly-review')) {
    actions.push({
      id: `quarterly-review-q${quarter}-${year}`,
      category: 'planning',
      title: 'Quarterly retirement plan review',
      description: 'Review income projections, spending assumptions, Social Security timing, and investment allocation. Adjust for any major life changes since your last review.',
      dueLabel: null,
      urgency: 'low',
      forced: !reviewActive,
    })
  }

  return actions
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ActionCategory, { icon: React.ElementType; iconClass: string }> = {
  medicare: { icon: HeartPulse, iconClass: 'text-rose-500' },
  ss:       { icon: Landmark,   iconClass: 'text-blue-500' },
  taxes:    { icon: Receipt,    iconClass: 'text-amber-500' },
  planning: { icon: BookOpen,   iconClass: 'text-emerald-500' },
}

const URGENCY_CLASS: Record<'high' | 'medium' | 'low', string> = {
  high:   'text-rose-600 dark:text-rose-400 font-medium',
  medium: 'text-amber-600 dark:text-amber-400',
  low:    'text-muted-foreground',
}

// ─── Funding status ───────────────────────────────────────────────────────────

function PlanFundingStatus({ pct, hasExpenses, hasScenario }: {
  pct: number | null
  hasExpenses: boolean
  hasScenario: boolean
}) {
  if (!hasScenario) return null

  // Prompt to set up expenses
  if (!hasExpenses) return null  // handled by action item

  if (pct === null) return null

  const isFunded = pct >= 100
  const isWarning = pct >= 80 && pct < 100
  const isDanger  = pct < 80

  const colorClass = isFunded
    ? 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800'
    : isWarning
      ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800'
      : 'border-rose-300 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800'

  const dotClass = isFunded ? 'bg-green-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'
  const textClass = isFunded ? 'text-green-800 dark:text-green-300' : isWarning ? 'text-amber-800 dark:text-amber-300' : 'text-rose-800 dark:text-rose-300'
  const mutedClass = isFunded ? 'text-green-700/80 dark:text-green-400/80' : isWarning ? 'text-amber-700/80 dark:text-amber-400/80' : 'text-rose-700/80 dark:text-rose-400/80'

  const title = isFunded
    ? 'Plan is on track'
    : isWarning
      ? `Plan covers ~${pct}% of projected retirement`
      : `Plan covers ~${pct}% of projected retirement — action needed`

  const description = isFunded
    ? 'Your projected income and savings are on track to cover your planned expenses through retirement.'
    : 'Based on your current income, savings, and expenses, your plan may fall short. Consider the steps below.'

  const suggestions = isFunded ? [] : isDanger
    ? [
        'Delay Social Security start date to maximize monthly benefit',
        'Reduce planned retirement expenses or update to realistic figures',
        'Increase pre-tax (IRA/401k/403b) and Roth contributions now',
        'Consider working 2–3 additional years to continue building savings',
        'Fine-tune Roth conversions in Planning to reduce lifetime tax drag',
      ]
    : [
        'Delay Social Security start date to increase monthly benefit',
        'Increase IRA/401k/403b or Roth contributions before retirement',
        'Fine-tune Roth conversions in Planning to reduce lifetime tax drag',
        'Review expense assumptions for accuracy in Planning',
      ]

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${colorClass}`}>
      <div className="flex items-center gap-2">
        <div className={`size-2 rounded-full shrink-0 ${dotClass}`} />
        <TrendingUp className={`size-3.5 ${textClass}`} />
        <span className={`text-sm font-medium ${textClass}`}>{title}</span>
      </div>
      <p className={`text-xs mt-1 leading-snug ${mutedClass}`}>{description}</p>
      {suggestions.length > 0 && (
        <ul className={`mt-1.5 text-xs space-y-0.5 ${mutedClass}`}>
          {suggestions.map((s, i) => (
            <li key={i} className="flex gap-1.5"><span>•</span><span>{s}</span></li>
          ))}
        </ul>
      )}
      {!isFunded && (
        <a href="/planning" className={`text-xs underline hover:no-underline mt-1.5 inline-block font-medium ${textClass}`}>
          Open Planning →
        </a>
      )}
    </div>
  )
}

// ─── Test panel config ────────────────────────────────────────────────────────

interface TestToggle {
  key: string; label: string
  requiresProp?: keyof DashboardActionsProps; requiresNote?: string
}
const TEST_TOGGLES: TestToggle[] = [
  { key: 'medicare-ab',          label: 'Medicare Part A & B (primary)',   requiresProp: 'dateOfBirth',       requiresNote: 'Requires date of birth in Account' },
  { key: 'medicare-supp',        label: 'Medicare Advantage / Medigap (primary)', requiresProp: 'dateOfBirth', requiresNote: 'Requires date of birth in Account' },
  { key: 'medicare-ab-spouse',   label: 'Medicare Part A & B (spouse)',    requiresProp: 'spouseDateOfBirth', requiresNote: 'Requires spouse date of birth' },
  { key: 'medicare-supp-spouse', label: 'Medicare Advantage / Medigap (spouse)', requiresProp: 'spouseDateOfBirth', requiresNote: 'Requires spouse date of birth' },
  { key: 'ss-apply',             label: 'SS Application (primary)',        requiresProp: 'ssStartYear',       requiresNote: 'Requires SS start year in Planning' },
  { key: 'ss-apply-spouse',      label: 'SS Application (spouse)',         requiresProp: 'spouseSsStartYear', requiresNote: 'Requires spouse SS start year' },
  { key: 'est-taxes',            label: 'Estimated Taxes — federal & state (all 4 quarters)' },
  { key: 'year-end',             label: 'Year-end Tax Planning' },
  { key: 'quarterly-review',     label: 'Quarterly Plan Review' },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECKS_KEY = 'wi64-action-checks'
const FORCES_KEY = 'wi64-test-forces'

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardActions(props: DashboardActionsProps) {
  const { canTest, planFundingPct, annualLivingExpenses, hasScenario } = props

  const [checked,    setChecked]    = useState<Record<string, boolean>>({})
  const [testForces, setTestForces] = useState<Set<string>>(new Set())
  const [showTest,   setShowTest]   = useState(false)
  const [mounted,    setMounted]    = useState(false)

  useEffect(() => {
    try {
      const c = localStorage.getItem(CHECKS_KEY)
      const f = localStorage.getItem(FORCES_KEY)
      if (c) setChecked(JSON.parse(c))
      if (f) setTestForces(new Set(JSON.parse(f)))
    } catch {}
    setMounted(true)
  }, [])

  const actions = useMemo(() => generateActions(props, new Date(), testForces), [props, testForces])

  if (!mounted) return null

  const hasFundingStatus = hasScenario && (planFundingPct !== null || annualLivingExpenses === 0)
  if (actions.length === 0 && !hasFundingStatus && !canTest) return null

  const pending = actions.filter(a => !checked[a.id])
  const done    = actions.filter(a =>  checked[a.id])
  const sorted  = [...pending].sort((a, b) => {
    if (a.forced !== b.forced) return a.forced ? 1 : -1
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.urgency] - order[b.urgency]
  })

  const realPendingCount = pending.filter(a => !a.forced && a.id !== 'setup-expenses').length

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    try { localStorage.setItem(CHECKS_KEY, JSON.stringify(next)) } catch {}
  }

  const toggleForce = (key: string) => {
    const next = new Set(testForces)
    next.has(key) ? next.delete(key) : next.add(key)
    setTestForces(next)
    try { localStorage.setItem(FORCES_KEY, JSON.stringify([...next])) } catch {}
  }

  const clearAllForces = () => {
    setTestForces(new Set())
    try { localStorage.removeItem(FORCES_KEY) } catch {}
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="size-4 text-primary" />
          Action Items
          {realPendingCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold size-5">
              {realPendingCount}
            </span>
          )}
          {canTest && (
            <button
              onClick={() => setShowTest(v => !v)}
              title="Developer: force test actions"
              className={`ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${
                testForces.size > 0
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'border-dashed border-muted-foreground/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <FlaskConical className="size-3" />
              {testForces.size > 0 ? `${testForces.size} forced` : 'Test'}
            </button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">

        {/* Plan funding status banner — always at top */}
        <PlanFundingStatus
          pct={planFundingPct}
          hasExpenses={annualLivingExpenses > 0}
          hasScenario={hasScenario}
        />

        {/* No natural actions */}
        {actions.length === 0 && hasFundingStatus && (
          <p className="text-sm text-muted-foreground">
            No time-sensitive actions right now — check back closer to key dates.
          </p>
        )}

        {/* Pending actions */}
        {sorted.map(action => (
          <ActionRow key={action.id} action={action} checked={false} onToggle={toggle} />
        ))}

        {/* Completed actions */}
        {done.length > 0 && (
          <div className="space-y-2">
            {(pending.length > 0 || hasFundingStatus) && <div className="border-t my-1" />}
            {done.map(action => (
              <ActionRow key={action.id} action={action} checked={true} onToggle={toggle} />
            ))}
            <button
              onClick={() => {
                const next = { ...checked }
                done.forEach(a => delete next[a.id])
                setChecked(next)
                try { localStorage.setItem(CHECKS_KEY, JSON.stringify(next)) } catch {}
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
            >
              Clear completed
            </button>
          </div>
        )}

        {/* Developer test panel */}
        {canTest && showTest && (
          <div className="mt-3 border-t border-dashed border-amber-300 dark:border-amber-700 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                <FlaskConical className="size-3.5" />
                Developer — Force actions
              </span>
              {testForces.size > 0 && (
                <button onClick={clearAllForces} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Clear all
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Check a box to force that action regardless of date window. Forced actions show with a dashed outline. State persists in localStorage.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {TEST_TOGGLES.map(({ key, label, requiresProp, requiresNote }) => {
                const disabled = !!requiresProp && !props[requiresProp]
                return (
                  <div key={key} className={`flex items-start gap-2 ${disabled ? 'opacity-40' : ''}`} title={disabled ? requiresNote : ''}>
                    <Checkbox
                      id={`force-${key}`}
                      checked={testForces.has(key)}
                      onCheckedChange={() => !disabled && toggleForce(key)}
                      disabled={disabled}
                      className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <label htmlFor={`force-${key}`} className={`text-xs leading-snug ${disabled ? '' : 'cursor-pointer'}`}>
                      {label}
                      {disabled && <span className="block text-muted-foreground">{requiresNote}</span>}
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

// ─── Action row ───────────────────────────────────────────────────────────────

function ActionRow({ action, checked, onToggle }: {
  action: Action; checked: boolean; onToggle: (id: string) => void
}) {
  const { icon: Icon, iconClass } = CATEGORY_CONFIG[action.category]
  return (
    <div className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
      checked
        ? 'opacity-50'
        : action.forced
          ? 'border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/10'
          : 'bg-muted/30 hover:bg-muted/50'
    }`}>
      <Checkbox id={action.id} checked={checked} onCheckedChange={() => onToggle(action.id)} className="mt-0.5 shrink-0" />
      <Icon className={`size-4 mt-0.5 shrink-0 ${iconClass} ${checked ? 'opacity-60' : ''}`} />
      <label htmlFor={action.id} className="flex-1 cursor-pointer space-y-0.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm font-medium text-foreground ${checked ? 'line-through' : ''}`}>
            {action.title}
          </span>
          {action.forced && !checked && (
            <span className="text-xs text-amber-600 dark:text-amber-400">[test]</span>
          )}
          {action.dueLabel && (
            <span className={`text-xs ${checked || action.forced ? 'text-muted-foreground' : URGENCY_CLASS[action.urgency]}`}>
              {action.dueLabel}
            </span>
          )}
        </div>
        <p className={`text-xs leading-snug ${checked ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
          {action.description}
          {action.link && !checked && (
            <> <a href={action.link} target="_blank" rel="noopener noreferrer"
              className="text-primary underline hover:no-underline" onClick={e => e.stopPropagation()}>
              {action.link.startsWith('/') ? 'Go →' : 'Learn more →'}
            </a></>
          )}
        </p>
      </label>
    </div>
  )
}
