'use client'

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Props {
  profileId: number
  userAge: number | null
  hasSpouse: boolean
  spouseAge: number | null   // null = spouse exists but DOB not entered
  partBPremium: number
  initial: {
    enrolledPartA: boolean
    enrolledPartB: boolean
    spouseEnrolledPartA: boolean
    spouseEnrolledPartB: boolean
  }
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function MedicareEnrollmentCard({ profileId, userAge, hasSpouse, spouseAge, partBPremium, initial }: Props) {
  const [enrolledPartA, setEnrolledPartA] = useState(initial.enrolledPartA)
  const [enrolledPartB, setEnrolledPartB] = useState(initial.enrolledPartB)
  const [spouseEnrolledPartA, setSpouseEnrolledPartA] = useState(initial.spouseEnrolledPartA)
  const [spouseEnrolledPartB, setSpouseEnrolledPartB] = useState(initial.spouseEnrolledPartB)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback((vals: {
    enrolledPartA: boolean
    enrolledPartB: boolean
    spouseEnrolledPartA: boolean
    spouseEnrolledPartB: boolean
  }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const res = await fetch(`/api/users/${profileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vals),
        })
        setSaveState(res.ok ? 'saved' : 'error')
        if (res.ok) setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('error')
      }
    }, 1000)
  }, [profileId])

  function handleChange(
    field: 'enrolledPartA' | 'enrolledPartB' | 'spouseEnrolledPartA' | 'spouseEnrolledPartB',
    val: boolean,
  ) {
    const next = { enrolledPartA, enrolledPartB, spouseEnrolledPartA, spouseEnrolledPartB, [field]: val }
    if (field === 'enrolledPartA') setEnrolledPartA(val)
    if (field === 'enrolledPartB') setEnrolledPartB(val)
    if (field === 'spouseEnrolledPartA') setSpouseEnrolledPartA(val)
    if (field === 'spouseEnrolledPartB') setSpouseEnrolledPartB(val)
    save(next)
  }

  const userEligible = userAge !== null && userAge >= 65
  const spouseEligible = spouseAge !== null && spouseAge >= 65

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Medicare Enrollment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {userEligible && !(enrolledPartA && enrolledPartB) && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300 text-sm">
            You&apos;re eligible for Medicare — apply for Part A &amp; B unless keeping employer coverage.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-24"></th>
                <th className="text-left py-2 pr-8 font-medium">
                  <div>Part A</div>
                  <div className="text-xs text-muted-foreground font-normal">Hospital — usually free</div>
                </th>
                <th className="text-left py-2 font-medium">
                  <div>Part B</div>
                  <div className="text-xs text-muted-foreground font-normal">Medical — ${partBPremium.toFixed(2)} + IRMAA/mo</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className={hasSpouse ? 'border-b' : ''}>
                <td className="py-3 pr-4 font-medium">You</td>
                <td className="py-3 pr-8">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="enrolledPartA"
                      checked={enrolledPartA}
                      onCheckedChange={(v) => handleChange('enrolledPartA', v)}
                    />
                    <Label htmlFor="enrolledPartA" className="text-xs text-muted-foreground">
                      {enrolledPartA ? 'Enrolled' : 'Not enrolled'}
                    </Label>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="enrolledPartB"
                      checked={enrolledPartB}
                      onCheckedChange={(v) => handleChange('enrolledPartB', v)}
                    />
                    <Label htmlFor="enrolledPartB" className="text-xs text-muted-foreground">
                      {enrolledPartB ? 'Enrolled' : 'Not enrolled'}
                    </Label>
                  </div>
                </td>
              </tr>

              {hasSpouse && (
                <>
                  <tr>
                    <td className="py-3 pr-4 font-medium">Spouse</td>
                    <td className="py-3 pr-8">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="spouseEnrolledPartA"
                          checked={spouseEnrolledPartA}
                          onCheckedChange={(v) => handleChange('spouseEnrolledPartA', v)}
                        />
                        <Label htmlFor="spouseEnrolledPartA" className="text-xs text-muted-foreground">
                          {spouseEnrolledPartA ? 'Enrolled' : 'Not enrolled'}
                        </Label>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="spouseEnrolledPartB"
                          checked={spouseEnrolledPartB}
                          onCheckedChange={(v) => handleChange('spouseEnrolledPartB', v)}
                        />
                        <Label htmlFor="spouseEnrolledPartB" className="text-xs text-muted-foreground">
                          {spouseEnrolledPartB ? 'Enrolled' : 'Not enrolled'}
                        </Label>
                      </div>
                    </td>
                  </tr>
                  {spouseEligible && !(spouseEnrolledPartA && spouseEnrolledPartB) && (
                    <tr>
                      <td colSpan={3} className="pb-3">
                        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300 text-sm">
                          Spouse is eligible for Medicare — apply for Part A &amp; B unless keeping employer coverage.
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {saveState === 'saving' && <span>Saving…</span>}
        {saveState === 'saved' && <span className="text-green-600">Saved</span>}
        {saveState === 'error' && <span className="text-destructive">Error saving</span>}
      </CardFooter>
    </Card>
  )
}
