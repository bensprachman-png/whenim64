'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { HeartPulse, Landmark, Receipt, BookOpen, CalendarCheck } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionCategory = 'medicare' | 'ss' | 'taxes' | 'planning'

interface Action {
  id: string
  category: ActionCategory
  title: string
  description: string
  dueLabel: string | null   // e.g. "Due April 15"
  urgency: 'high' | 'medium' | 'low'
  link?: string
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
  hasSupplement: boolean         // primary has Medigap / MA plan selected
  spouseHasSupplement: boolean
  quarterlyTaxTotal: number      // estimated quarterly tax $ (0 if no scenario)
  stateCode: string | null
  statePayUrl: string | null
  hasScenario: boolean
}

// ─── Action generation ────────────────────────────────────────────────────────

function generateActions(props: DashboardActionsProps, today: Date): Action[] {
  const {
    dateOfBirth, spouseDateOfBirth,
    ssStartYear, spouseSsStartYear,
    retirementYear,
    enrolledPartA, enrolledPartB,
    spouseEnrolledPartA, spouseEnrolledPartB,
    hasSupplement, spouseHasSupplement,
    quarterlyTaxTotal, stateCode, statePayUrl,
  } = props

  const actions: Action[] = []
  const year = today.getFullYear()

  const inWindow = (start: Date, end: Date) => today >= start && today <= end

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const urgency = (due: Date): 'high' | 'medium' | 'low' => {
    const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
    if (days <= 14) return 'high'
    if (days <= 30) return 'medium'
    return 'low'
  }

  // ── Medicare ──────────────────────────────────────────────────────────────
  const medicarePersons: Array<{
    dob: string; enrolledAB: boolean; hasSup: boolean; suffix: string; label: string
  }> = []
  if (dateOfBirth) medicarePersons.push({
    dob: dateOfBirth, enrolledAB: enrolledPartA && enrolledPartB,
    hasSup: hasSupplement, suffix: '', label: '',
  })
  if (spouseDateOfBirth) medicarePersons.push({
    dob: spouseDateOfBirth, enrolledAB: spouseEnrolledPartA && spouseEnrolledPartB,
    hasSup: spouseHasSupplement, suffix: '-spouse', label: 'Spouse — ',
  })

  for (const { dob, enrolledAB, hasSup, suffix, label } of medicarePersons) {
    const birth = new Date(dob + 'T00:00:00')
    const bYear = birth.getFullYear()
    const age65 = new Date(bYear + 65, birth.getMonth(), birth.getDate())

    // Part A & B: 3 months before 65th birthday through 3 months after
    if (!enrolledAB) {
      const start = new Date(age65); start.setMonth(start.getMonth() - 3)
      const end   = new Date(age65); end.setMonth(end.getMonth() + 3)
      if (inWindow(start, end)) {
        const due = age65 > today ? age65 : end
        actions.push({
          id: `medicare-ab-${bYear + 65}${suffix}`,
          category: 'medicare',
          title: `${label}Apply for Medicare Part A & B`,
          description: 'Your Initial Enrollment Period is open. Apply at ssa.gov, call 1-800-772-1213, or visit your local Social Security office.',
          dueLabel: age65 > today ? `Before ${fmtDate(age65)}` : `Window closes ${fmtDate(end)}`,
          urgency: urgency(due),
          link: 'https://www.ssa.gov/medicare/sign-up',
        })
      }
    }

    // Medigap / Part D: 30 days before 65th birthday through 6 months after
    // (open enrollment / guaranteed issue window for supplement)
    if (!hasSup) {
      const start = new Date(age65); start.setDate(start.getDate() - 30)
      const end   = new Date(age65); end.setMonth(end.getMonth() + 6)
      if (inWindow(start, end)) {
        actions.push({
          id: `medicare-supp-${bYear + 65}${suffix}`,
          category: 'medicare',
          title: `${label}Enroll in Medigap & Part D`,
          description: 'After Part B starts you have 6 months of guaranteed-issue Medigap enrollment — no medical underwriting. Also choose a Part D prescription drug plan.',
          dueLabel: `Window closes ${fmtDate(end)}`,
          urgency: urgency(end),
          link: 'https://www.medicare.gov/find-a-plan/questions/home.aspx',
        })
      }
    }
  }

  // ── Social Security ───────────────────────────────────────────────────────
  const ssPersons: Array<{ startYear: number; suffix: string; label: string }> = []
  if (ssStartYear) ssPersons.push({ startYear: ssStartYear, suffix: '', label: '' })
  if (spouseSsStartYear) ssPersons.push({ startYear: spouseSsStartYear, suffix: '-spouse', label: 'Spouse — ' })

  for (const { startYear, suffix, label } of ssPersons) {
    // Show from October of prior year through January 31 of SS start year
    // (SSA recommends applying ~4 months before benefits begin)
    const windowStart = new Date(startYear - 1, 9, 1)   // Oct 1 of prior year
    const windowEnd   = new Date(startYear, 0, 31)       // Jan 31 of start year
    if (inWindow(windowStart, windowEnd)) {
      const due = new Date(startYear, 0, 1)
      actions.push({
        id: `ss-apply-${startYear}${suffix}`,
        category: 'ss',
        title: `${label}Begin Social Security application`,
        description: `You've planned to start SS benefits in ${startYear}. SSA recommends applying 4 months in advance. Apply at ssa.gov or call 1-800-772-1213.`,
        dueLabel: today < due ? `Apply by ${fmtDate(due)}` : `Start year: ${startYear}`,
        urgency: urgency(windowEnd),
        link: 'https://www.ssa.gov/benefits/retirement/apply.html',
      })
    }
  }

  // ── Quarterly Estimated Taxes ─────────────────────────────────────────────
  // Only show when retired (retirementYear <= current year)
  const isRetired = retirementYear !== null && retirementYear <= year
  if (isRetired) {
    const taxAmt = quarterlyTaxTotal > 0
      ? ` (~$${Math.round(quarterlyTaxTotal).toLocaleString('en-US')} estimated)`
      : ''
    const payNote = statePayUrl
      ? ` Pay federal at irs.gov/payments${stateCode ? ` and ${stateCode} at your state portal.` : '.'}`
      : ' Pay at irs.gov/payments.'

    const quarters: Array<{ q: number; start: Date; due: Date; label: string }> = [
      { q: 1, start: new Date(year, 3,  1), due: new Date(year, 3, 15), label: 'Q1' },
      { q: 2, start: new Date(year, 5,  1), due: new Date(year, 5, 15), label: 'Q2' },
      { q: 3, start: new Date(year, 8,  1), due: new Date(year, 8, 15), label: 'Q3' },
      { q: 4, start: new Date(year, 11, 1), due: new Date(year + 1, 0, 15), label: 'Q4' },
    ]
    for (const { q, start, due, label } of quarters) {
      if (inWindow(start, due)) {
        actions.push({
          id: `est-tax-${label.toLowerCase()}-${year}`,
          category: 'taxes',
          title: `Pay ${label} estimated federal taxes`,
          description: `${label} estimated tax payment${taxAmt} due ${fmtDate(due)}.${payNote}`,
          dueLabel: `Due ${fmtDate(due)}`,
          urgency: urgency(due),
          link: 'https://www.irs.gov/payments',
        })
      }
    }
  }

  // ── Year-end Planning ─────────────────────────────────────────────────────
  const yearEndStart = new Date(year, 10, 15)   // Nov 15
  const yearEndEnd   = new Date(year, 11, 31)   // Dec 31
  if (inWindow(yearEndStart, yearEndEnd)) {
    actions.push({
      id: `year-end-${year}`,
      category: 'planning',
      title: 'Year-end tax planning',
      description: 'Review your investment portfolio, harvest capital losses to offset gains, and finalize Roth conversion amounts — all changes must settle before December 31.',
      dueLabel: 'Before Dec 31',
      urgency: urgency(yearEndEnd),
    })
  }

  // ── Quarterly Plan Review ─────────────────────────────────────────────────
  // Show during first 14 days of each quarter
  const quarter = Math.floor(today.getMonth() / 3) + 1
  const qStart = new Date(year, (quarter - 1) * 3, 1)
  const qReviewEnd = new Date(year, (quarter - 1) * 3, 14)
  if (inWindow(qStart, qReviewEnd)) {
    actions.push({
      id: `quarterly-review-q${quarter}-${year}`,
      category: 'planning',
      title: 'Quarterly retirement plan review',
      description: 'Review your income projections, spending assumptions, Social Security timing, and investment allocation to stay on track.',
      dueLabel: null,
      urgency: 'low',
    })
  }

  return actions
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ActionCategory, {
  icon: React.ElementType
  iconClass: string
  badgeClass: string
}> = {
  medicare: {
    icon: HeartPulse,
    iconClass: 'text-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
  },
  ss: {
    icon: Landmark,
    iconClass: 'text-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  },
  taxes: {
    icon: Receipt,
    iconClass: 'text-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  },
  planning: {
    icon: BookOpen,
    iconClass: 'text-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
}

const URGENCY_CLASS: Record<'high' | 'medium' | 'low', string> = {
  high:   'text-rose-600 dark:text-rose-400 font-medium',
  medium: 'text-amber-600 dark:text-amber-400',
  low:    'text-muted-foreground',
}

// ─── Component ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'wi64-action-checks'

export default function DashboardActions(props: DashboardActionsProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setChecked(JSON.parse(saved))
    } catch {}
    setMounted(true)
  }, [])

  const actions = useMemo(() => generateActions(props, new Date()), [props])

  if (!mounted || actions.length === 0) return null

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  const pending   = actions.filter(a => !checked[a.id])
  const done      = actions.filter(a =>  checked[a.id])
  const sortedPending = [...pending].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.urgency] - order[b.urgency]
  })

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="size-4 text-primary" />
          Action Items
          {pending.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold size-5">
              {pending.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Pending actions */}
        {sortedPending.map(action => (
          <ActionRow key={action.id} action={action} checked={false} onToggle={toggle} />
        ))}

        {/* Completed actions */}
        {done.length > 0 && (
          <div className="space-y-2">
            {pending.length > 0 && <div className="border-t my-1" />}
            {done.map(action => (
              <ActionRow key={action.id} action={action} checked={true} onToggle={toggle} />
            ))}
            <button
              onClick={() => {
                const next = { ...checked }
                done.forEach(a => delete next[a.id])
                setChecked(next)
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
            >
              Clear completed
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActionRow({
  action, checked, onToggle,
}: {
  action: Action
  checked: boolean
  onToggle: (id: string) => void
}) {
  const { icon: Icon, iconClass, badgeClass } = CATEGORY_CONFIG[action.category]

  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        checked ? 'opacity-50' : 'bg-muted/30 hover:bg-muted/50'
      }`}
    >
      <Checkbox
        id={action.id}
        checked={checked}
        onCheckedChange={() => onToggle(action.id)}
        className="mt-0.5 shrink-0"
      />
      <Icon className={`size-4 mt-0.5 shrink-0 ${iconClass} ${checked ? 'opacity-60' : ''}`} />
      <label htmlFor={action.id} className="flex-1 cursor-pointer space-y-0.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm font-medium text-foreground ${checked ? 'line-through' : ''}`}>
            {action.title}
          </span>
          {action.dueLabel && (
            <span className={`text-xs ${checked ? 'text-muted-foreground' : URGENCY_CLASS[action.urgency]}`}>
              {action.dueLabel}
            </span>
          )}
        </div>
        <p className={`text-xs leading-snug ${checked ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
          {action.description}
          {action.link && !checked && (
            <> <a href={action.link} target="_blank" rel="noopener noreferrer"
              className="text-primary underline hover:no-underline" onClick={e => e.stopPropagation()}>
              Learn more →
            </a></>
          )}
        </p>
      </label>
    </div>
  )
}
