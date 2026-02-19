'use client'

import { cn } from '@/lib/utils'
import { calculateMilestones, MilestoneId } from '@/lib/milestones'

interface Props {
  dateOfBirth?: string | null
  highlight: MilestoneId[]
}

export default function MilestoneTimeline({ dateOfBirth, highlight }: Props) {
  const milestones = calculateMilestones(dateOfBirth)
  const currentYear = new Date().getFullYear()

  return (
    <div className="w-full rounded-xl border bg-card p-6 mb-8 overflow-x-auto">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
        Your Retirement Milestones
      </p>
      <div className="min-w-[540px]">

        {/* Age labels row */}
        <div className="flex mb-2">
          {milestones.map((m) => (
            <div key={m.id} className="flex-1 flex justify-center">
              <span className={cn(
                'text-xs font-bold',
                highlight.includes(m.id) ? 'text-primary' : 'text-muted-foreground/50',
              )}>
                Age {m.age}
              </span>
            </div>
          ))}
        </div>

        {/* Line + dots row */}
        <div className="relative flex items-center">
          <div className="absolute left-[10%] right-[10%] h-px bg-border" />
          {milestones.map((m) => {
            const isHighlighted = highlight.includes(m.id)
            const isPast = m.year != null && m.year < currentYear
            return (
              <div key={m.id} className="flex-1 flex justify-center relative z-10">
                <div className={cn(
                  'rounded-full border-2 transition-all duration-200',
                  isHighlighted
                    ? 'w-5 h-5 bg-primary border-primary shadow-lg shadow-primary/40'
                    : isPast
                    ? 'w-3 h-3 bg-muted border-muted-foreground/30'
                    : 'w-3 h-3 bg-background border-muted-foreground/40',
                )} />
              </div>
            )
          })}
        </div>

        {/* Labels row */}
        <div className="flex mt-3">
          {milestones.map((m) => {
            const isHighlighted = highlight.includes(m.id)
            const isPast = m.year != null && m.year < currentYear
            return (
              <div key={m.id} className="flex-1 flex flex-col items-center gap-0.5 px-1">
                <span className={cn(
                  'text-[11px] font-semibold text-center leading-tight',
                  isHighlighted ? 'text-primary' : isPast ? 'text-muted-foreground/40' : 'text-muted-foreground/70',
                )}>
                  {m.label}
                </span>
                <span className={cn(
                  'text-[10px] text-center leading-tight',
                  isHighlighted ? 'text-primary/70' : 'text-muted-foreground/50',
                )}>
                  {m.sublabel}
                </span>
                {m.year && (
                  <span className={cn(
                    'text-[10px] font-mono tabular-nums mt-0.5',
                    isHighlighted ? 'text-primary font-bold' : 'text-muted-foreground/40',
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
