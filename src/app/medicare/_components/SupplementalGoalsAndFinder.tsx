'use client'

import { useRef, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import PlanFinder from '@/components/plan-finder'
import type { Goals } from '@/lib/plans'

const GOAL_LABELS: { key: keyof Goals; label: string }[] = [
  { key: 'catastrophicRisk', label: 'Protect against catastrophic medical costs' },
  { key: 'doctorFreedom',    label: 'Freedom to choose any doctor or hospital' },
  { key: 'minPremium',       label: 'Keep monthly premiums as low as possible' },
  { key: 'minTotalCost',     label: 'Minimize total annual out-of-pocket costs' },
  { key: 'travelCoverage',   label: 'Coverage when traveling internationally' },
]

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  profileId: number | undefined
  initialGoals: Goals
  age: number | null
  zipCode: string | null | undefined
  birthYear: number | null
  year: number
  filingStatus: string | null
}

export default function SupplementalGoalsAndFinder({ profileId, initialGoals, age, zipCode, birthYear, year, filingStatus }: Props) {
  const [goals, setGoals] = useState<Goals>(initialGoals)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(key: keyof Goals, checked: boolean) {
    const next = { ...goals, [key]: checked }
    setGoals(next)

    if (!profileId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const res = await fetch(`/api/users/${profileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goalCatastrophicRisk: next.catastrophicRisk,
            goalDoctorFreedom:    next.doctorFreedom,
            goalMinPremium:       next.minPremium,
            goalMinTotalCost:     next.minTotalCost,
            goalTravelCoverage:   next.travelCoverage,
          }),
        })
        setSaveState(res.ok ? 'saved' : 'error')
        if (res.ok) setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('error')
      }
    }, 600)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Your Priorities</p>
          {saveState === 'saving' && <span className="text-xs text-muted-foreground">Saving…</span>}
          {saveState === 'saved'  && <span className="text-xs text-green-600">Saved</span>}
          {saveState === 'error'  && <span className="text-xs text-destructive">Save failed</span>}
        </div>
        <p className="text-xs text-muted-foreground">Select what matters most to tailor the plan recommendations below.</p>
        <div className="rounded-lg border p-4 space-y-3">
          {GOAL_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={goals[key]}
                onCheckedChange={(checked) => handleChange(key, checked === true)}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <PlanFinder age={age} zipCode={zipCode} goals={goals} birthYear={birthYear} year={year} filingStatus={filingStatus} />
    </div>
  )
}
