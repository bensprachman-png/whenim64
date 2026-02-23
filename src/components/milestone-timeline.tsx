'use client'

import { cn } from '@/lib/utils'
import { calculateMilestones, MilestoneId, Milestone } from '@/lib/milestones'

interface Props {
  dateOfBirth?: string | null
  highlight?: MilestoneId[]
  planEndsYear?: number
}

export default function MilestoneTimeline({ dateOfBirth, highlight = [], planEndsYear }: Props) {
  const baseMilestones = calculateMilestones(dateOfBirth)
  const currentYear = new Date().getFullYear()

  const birthYear = dateOfBirth ? new Date(dateOfBirth + 'T00:00:00').getFullYear() : null
  const currentAge = birthYear != null ? currentYear - birthYear : null

  // Append Plan Ends milestone if we have enough data
  const milestones: Milestone[] = [...baseMilestones]
  if (planEndsYear && birthYear) {
    milestones.push({
      id: 'plan-ends',
      label: 'Plan Ends',
      sublabel: 'Life expectancy',
      age: planEndsYear - birthYear,
      year: planEndsYear,
    })
  }

  const n = milestones.length

  // Interpolated "now" position along the line.
  // Each milestone dot is centred in its flex-1 column → centre of slot i = (i + 0.5) / n * 100%
  let nowLeftPct: number | null = null
  if (currentAge !== null && n > 0) {
    let slotIdx = -1
    for (let i = 0; i < n - 1; i++) {
      if (currentAge >= milestones[i].age && currentAge < milestones[i + 1].age) {
        slotIdx = i
        break
      }
    }
    if (slotIdx >= 0) {
      const frac = (currentAge - milestones[slotIdx].age) / (milestones[slotIdx + 1].age - milestones[slotIdx].age)
      nowLeftPct = (slotIdx + 0.5 + frac) / n * 100
    } else if (currentAge < milestones[0].age) {
      nowLeftPct = 0.5 / n * 100
    } else {
      // Past the last milestone — clamp
      nowLeftPct = (n - 0.5) / n * 100
    }
  }

  return (
    <div className="w-full rounded-xl border bg-card p-6 mb-8 overflow-x-auto">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
        Your Retirement Milestones
      </p>
      <div className="min-w-[540px]">

        {/* Age labels row */}
        <div className="flex mb-2">
          {milestones.map((m) => {
            const isPast = m.year != null ? m.year < currentYear : false
            return (
              <div key={m.id} className="flex-1 flex justify-center">
                <span className={cn(
                  'text-xs font-bold',
                  isPast ? 'text-muted-foreground/40' : 'text-blue-500',
                )}>
                  Age {m.age}
                </span>
              </div>
            )
          })}
        </div>

        {/* Line + dots + "now" marker row */}
        <div className="relative flex items-center h-5">
          <div className="absolute left-[10%] right-[10%] h-px bg-border" />

          {/* Blue line segment from "now" to Plan Ends */}
          {nowLeftPct !== null && planEndsYear && n > 0 && (
            <div
              className="absolute h-px bg-blue-400 z-[1]"
              style={{
                left: `${nowLeftPct}%`,
                width: `${(n - 0.5) / n * 100 - nowLeftPct}%`,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
          )}

          {/* "Now" — filled blue circle at the current age position */}
          {nowLeftPct !== null && (
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-blue-500 z-20"
              style={{ left: `${nowLeftPct}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
              title={`Age ${currentAge} — now`}
            />
          )}

          {/* Milestone dots — always hollow */}
          {milestones.map((m) => {
            const isPast = m.year != null ? m.year < currentYear : false
            const isHighlighted = highlight.includes(m.id)
            return (
              <div key={m.id} className="flex-1 flex justify-center relative z-10">
                <div className={cn(
                  'w-3 h-3 rounded-full border-2 bg-background transition-all duration-200',
                  isPast
                    ? 'border-muted-foreground/30'
                    : isHighlighted
                    ? 'border-blue-500'
                    : 'border-blue-400',
                )} />
              </div>
            )
          })}
        </div>

        {/* Labels row */}
        <div className="flex mt-3">
          {milestones.map((m) => {
            const isPast = m.year != null ? m.year < currentYear : false
            const isHighlighted = highlight.includes(m.id)
            return (
              <div key={m.id} className="flex-1 flex flex-col items-center gap-0.5 px-1">
                <span className={cn(
                  'text-[11px] font-semibold text-center leading-tight',
                  isPast ? 'text-muted-foreground/40' : isHighlighted ? 'text-primary' : 'text-blue-500',
                )}>
                  {m.label}
                </span>
                <span className={cn(
                  'text-[10px] text-center leading-tight',
                  isPast ? 'text-muted-foreground/30' : isHighlighted ? 'text-primary/70' : 'text-blue-400',
                )}>
                  {m.sublabel}
                </span>
                {m.year && (
                  <span className={cn(
                    'text-[10px] font-mono tabular-nums mt-0.5',
                    isPast ? 'text-muted-foreground/40' : isHighlighted ? 'text-primary font-bold' : 'text-blue-400',
                  )}>
                    {m.year}
                  </span>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
