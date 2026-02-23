'use client'

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// Sentinel used instead of '' because Radix Select treats empty string as "no value"
const NONE = '_none'

const PDP_OPTIONS = [
  { value: NONE,   label: 'None / not selected' },
  { value: 'low',  label: 'Low-Premium (~$0–$15/mo)' },
  { value: 'mid',  label: 'Mid-Premium (~$35/mo)' },
  { value: 'high', label: 'High-Premium (~$150/mo)' },
]

export interface PlanOption {
  value: string   // PlanId from lib/plans, e.g. 'advantage' | 'medigap-g' | 'ma-supplement1a'
  label: string
}

interface Props {
  profileId: number
  hasSpouse: boolean
  planOptions: PlanOption[]   // computed server-side from getPlansForState()
  initial: {
    medicarePlanType: string | null
    spouseMedicarePlanType: string | null
    pdpTier: string | null
    spousePdpTier: string | null
  }
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function toState(val: string | null) { return val ?? NONE }
function fromState(val: string) { return val === NONE ? null : val }

export default function MedicarePlanElectionsCard({ profileId, hasSpouse, planOptions, initial }: Props) {
  const [medicarePlanType, setMedicarePlanType]             = useState(toState(initial.medicarePlanType))
  const [spouseMedicarePlanType, setSpouseMedicarePlanType] = useState(toState(initial.spouseMedicarePlanType))
  const [pdpTier, setPdpTier]                               = useState(toState(initial.pdpTier))
  const [spousePdpTier, setSpousePdpTier]                   = useState(toState(initial.spousePdpTier))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allPlanOptions: PlanOption[] = [{ value: NONE, label: 'Not yet chosen' }, ...planOptions]

  const save = useCallback((vals: {
    medicarePlanType: string
    spouseMedicarePlanType: string
    pdpTier: string
    spousePdpTier: string
  }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const res = await fetch(`/api/users/${profileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicarePlanType:       fromState(vals.medicarePlanType),
            spouseMedicarePlanType: fromState(vals.spouseMedicarePlanType),
            pdpTier:                fromState(vals.pdpTier),
            spousePdpTier:          fromState(vals.spousePdpTier),
          }),
        })
        setSaveState(res.ok ? 'saved' : 'error')
        if (res.ok) setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('error')
      }
    }, 1000)
  }, [profileId])

  function handleChange(
    field: 'medicarePlanType' | 'spouseMedicarePlanType' | 'pdpTier' | 'spousePdpTier',
    val: string,
  ) {
    const next = { medicarePlanType, spouseMedicarePlanType, pdpTier, spousePdpTier, [field]: val }

    if (field === 'medicarePlanType') {
      setMedicarePlanType(val)
      if (val === 'advantage') { next.pdpTier = NONE; setPdpTier(NONE) }
    }
    if (field === 'spouseMedicarePlanType') {
      setSpouseMedicarePlanType(val)
      if (val === 'advantage') { next.spousePdpTier = NONE; setSpousePdpTier(NONE) }
    }
    if (field === 'pdpTier') setPdpTier(val)
    if (field === 'spousePdpTier') setSpousePdpTier(val)

    save(next)
  }

  const showUserPdp   = medicarePlanType !== 'advantage'
  const showSpousePdp = spouseMedicarePlanType !== 'advantage'
  const noPlanChosen  = medicarePlanType === NONE && (!hasSpouse || spouseMedicarePlanType === NONE)

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Your Coverage Elections</CardTitle>
      </CardHeader>
      <CardContent>
        {noPlanChosen && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700 px-4 py-3 text-amber-800 dark:text-amber-300 text-sm mb-4">
            Once you have applied and received Part B coverage, consider supplemental and prescription drug plans using the finders provided below.
          </div>
        )}
        <div className={`grid gap-6 ${hasSpouse ? 'md:grid-cols-2' : 'max-w-sm'}`}>

          {/* You */}
          <div className="space-y-4">
            <p className="text-sm font-semibold">You</p>
            <div className="space-y-2">
              <Label htmlFor="medicarePlanType" className="text-sm">Supplemental plan type</Label>
              <Select value={medicarePlanType} onValueChange={(v) => handleChange('medicarePlanType', v)}>
                <SelectTrigger id="medicarePlanType">
                  <SelectValue placeholder="Not yet chosen" />
                </SelectTrigger>
                <SelectContent>
                  {allPlanOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showUserPdp && (
              <div className="space-y-2">
                <Label htmlFor="pdpTier" className="text-sm">Part D (PDP) tier</Label>
                <Select value={pdpTier} onValueChange={(v) => handleChange('pdpTier', v)}>
                  <SelectTrigger id="pdpTier">
                    <SelectValue placeholder="None / not selected" />
                  </SelectTrigger>
                  <SelectContent>
                    {PDP_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Spouse */}
          {hasSpouse && (
            <div className="space-y-4">
              <p className="text-sm font-semibold">Spouse</p>
              <div className="space-y-2">
                <Label htmlFor="spouseMedicarePlanType" className="text-sm">Supplemental plan type</Label>
                <Select value={spouseMedicarePlanType} onValueChange={(v) => handleChange('spouseMedicarePlanType', v)}>
                  <SelectTrigger id="spouseMedicarePlanType">
                    <SelectValue placeholder="Not yet chosen" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlanOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showSpousePdp && (
                <div className="space-y-2">
                  <Label htmlFor="spousePdpTier" className="text-sm">Part D (PDP) tier</Label>
                  <Select value={spousePdpTier} onValueChange={(v) => handleChange('spousePdpTier', v)}>
                    <SelectTrigger id="spousePdpTier">
                      <SelectValue placeholder="None / not selected" />
                    </SelectTrigger>
                    <SelectContent>
                      {PDP_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4">Selections are reflected on your Dashboard.</p>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        {saveState === 'saving' && <span>Saving…</span>}
        {saveState === 'saved' && <span className="text-green-600">Saved</span>}
        {saveState === 'error' && <span className="text-destructive">Error saving</span>}
      </CardFooter>
    </Card>
  )
}
