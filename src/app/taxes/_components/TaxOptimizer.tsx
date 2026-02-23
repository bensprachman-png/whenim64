'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  XAxis,
  YAxis,
  Bar,
  Line,
  ReferenceLine,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { projectTaxes, computeProjectionYears, type ScenarioRow, type IrmaaTargetTier, type Sex } from '@/lib/tax-engine'
import type { FilingStatus } from '@/lib/tax-engine'
import type { taxScenarios } from '@/db/schema'

interface Props {
  initialScenario: typeof taxScenarios.$inferSelect | null
  birthYear: number | null
  defaultFilingStatus: string
  defaultSsStartYear: number
  sex: Sex | null
  spouseBirthYear: number | null
  spouseSex: Sex | null
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + n.toFixed(0)
}

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function numVal(s: string): number {
  const v = parseFloat(s)
  return isNaN(v) ? 0 : v
}

// Returns empty string for zero/null so the input shows a placeholder instead of "0"
function nz(val: number | null | undefined): string {
  return val ? String(val) : ''
}

interface FormState {
  w2Income: string
  interestIncome: string
  dividendIncome: string
  capGainsDist: string
  stcg: string
  ltcg: string
  otherIncome: string
  iraBalance: string
  iraWithdrawals: string
  qcds: string
  rothBalance: string
  portfolioGrowthPct: string
  retirementYear: string
  ssStartYear: string
  ssPaymentsPerYear: string
  inflationPct: string
  medicareEnrollees: '1' | '2'
  spouseSsStartYear: string
  spouseSsPaymentsPerYear: string
  spouseBirthYearOverride: string  // local-only fallback when profile lacks spouse DOB
}

function initForm(
  scenario: typeof taxScenarios.$inferSelect | null,
  defaultFilingStatus: string,
  defaultSsStartYear: number,
): FormState {
  const isJoint = defaultFilingStatus === 'married_jointly' || defaultFilingStatus === 'joint'
  const currentYear = new Date().getFullYear()
  return {
    w2Income: nz(scenario?.w2Income),
    interestIncome: nz(scenario?.interestIncome),
    dividendIncome: nz(scenario?.dividendIncome),
    capGainsDist: nz(scenario?.capGainsDist),
    stcg: nz(scenario?.stcg),
    ltcg: nz(scenario?.ltcg),
    otherIncome: nz(scenario?.otherIncome),
    iraBalance: nz(scenario?.iraBalance),
    iraWithdrawals: nz(scenario?.iraWithdrawals),
    qcds: nz(scenario?.qcds),
    rothBalance: nz(scenario?.rothBalance),
    portfolioGrowthPct: String(scenario?.portfolioGrowthPct ?? 5),
    retirementYear: String(scenario?.retirementYear ?? currentYear + 5),
    ssStartYear: String(scenario?.ssStartYear ?? defaultSsStartYear),
    ssPaymentsPerYear: nz(scenario?.ssPaymentsPerYear),
    inflationPct: String(scenario?.inflationPct ?? 2.5),
    medicareEnrollees: (scenario?.medicareEnrollees != null ? String(scenario.medicareEnrollees) : (isJoint ? '2' : '1')) as '1' | '2',
    spouseSsStartYear: nz(scenario?.spouseSsStartYear),
    spouseSsPaymentsPerYear: nz(scenario?.spouseSsPaymentsPerYear),
    spouseBirthYearOverride: '',
  }
}

interface NumberInputProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  step?: string
  prefix?: string
  suffix?: string
  min?: string
}

function NumberInput({ id, label, value, onChange, step = '100', prefix = '$', suffix, min = '0' }: NumberInputProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-2.5 text-sm text-muted-foreground pointer-events-none">{prefix}</span>
        )}
        <Input
          id={id}
          type="number"
          min={min}
          step={step}
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          className={prefix ? 'pl-6' : ''}
        />
        {suffix && (
          <span className="absolute right-2.5 text-sm text-muted-foreground pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  )
}

const TIER_SUBTITLES: Record<IrmaaTargetTier, string> = {
  0: 'Conservative — staying below the first IRMAA tier',
  1: 'Moderate — accepting Tier 1 IRMAA in conversion years',
  2: 'Aggressive — accepting Tier 2 IRMAA in conversion years',
}

export default function TaxOptimizer({ initialScenario, birthYear, defaultFilingStatus, defaultSsStartYear, sex, spouseBirthYear, spouseSex }: Props) {
  const isJoint = defaultFilingStatus === 'married_jointly' || defaultFilingStatus === 'joint'
  const taxFiling: FilingStatus = isJoint ? 'joint' : 'single'
  const [form, setForm] = useState<FormState>(() =>
    initForm(initialScenario, defaultFilingStatus, defaultSsStartYear)
  )
  const [saveMsg, setSaveMsg] = useState('')
  const [saveError, setSaveError] = useState('')
  const [showTable, setShowTable] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const [irmaaTargetTier, setIrmaaTargetTier] = useState<IrmaaTargetTier>((initialScenario?.irmaaTargetTier ?? 0) as IrmaaTargetTier)
  const [showConversions, setShowConversions] = useState<boolean>(initialScenario?.showConversions ?? true)
  const [conversionWindow, setConversionWindow] = useState<'always' | 'before-ss' | 'before-rmd'>((initialScenario?.conversionWindow ?? 'always') as 'always' | 'before-ss' | 'before-rmd')

  function set(field: keyof FormState) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }))
  }

  const startYear = new Date().getFullYear()

  // Expensive projection — memoised on inputs only (not on showConversions)
  const { baselineRows, optimizedRows, summary, projectionYears } = useMemo(() => {
    const ssStart = numVal(form.ssStartYear)
    const rmdStart = (birthYear ?? 0) > 0 ? (birthYear! + 73) : 9999
    const convStop =
      conversionWindow === 'before-ss'  ? (ssStart || 9999) :
      conversionWindow === 'before-rmd' ? rmdStart :
      9999
    const overrideBY = numVal(form.spouseBirthYearOverride)
    const effectiveSpouseBirthYear = spouseBirthYear ?? (overrideBY > 0 ? overrideBY : null)
    const projectionYears = computeProjectionYears(
      birthYear ?? 0,
      effectiveSpouseBirthYear,
      startYear,
      sex,
      spouseSex,
    )
    const result = projectTaxes({
      w2Income: numVal(form.w2Income),
      interestIncome: numVal(form.interestIncome),
      dividendIncome: numVal(form.dividendIncome),
      capGainsDist: numVal(form.capGainsDist),
      stcg: numVal(form.stcg),
      ltcg: numVal(form.ltcg),
      otherIncome: numVal(form.otherIncome),
      iraBalance: numVal(form.iraBalance),
      iraWithdrawals: numVal(form.iraWithdrawals),
      qcdPct: numVal(form.qcds),
      rothBalance: numVal(form.rothBalance),
      portfolioGrowthPct: numVal(form.portfolioGrowthPct),
      retirementYear: numVal(form.retirementYear),
      ssStartYear: ssStart,
      ssPaymentsPerYear: numVal(form.ssPaymentsPerYear),
      inflationPct: numVal(form.inflationPct),
      medicareEnrollees: form.medicareEnrollees === '2' ? 2 : 1,
      filing: taxFiling,
      birthYear: birthYear ?? 0,
      startYear,
      projectionYears,
      irmaaTargetTier,
      conversionStopYear: convStop,
      sex,
      spouseBirthYear: effectiveSpouseBirthYear ?? 0,
      spouseSsStartYear: numVal(form.spouseSsStartYear),
      spouseSsPaymentsPerYear: numVal(form.spouseSsPaymentsPerYear),
      spouseSex,
    })
    return { ...result, projectionYears }
  }, [form, birthYear, startYear, irmaaTargetTier, conversionWindow, taxFiling, sex, spouseBirthYear, spouseSex])

  // Cheap derivation — switches instantly when the toggle changes
  const activeRows = showConversions ? optimizedRows : baselineRows

  // Running cumulative savings (baseline cost − optimised cost); negative = still in the hole
  let _cumSav = 0
  const chartData = activeRows.map((row, i) => {
    if (showConversions) _cumSav += (baselineRows[i]?.totalCost ?? 0) - optimizedRows[i].totalCost
    return {
      year: row.year,
      age: row.age,
      federalTax: row.totalTax - row.conversionTax,
      conversionTax: row.conversionTax,
      irmaa: row.irmaaAnnual,
      baselineCost: showConversions ? (baselineRows[i]?.totalCost ?? 0) : undefined,
      effectiveRate: row.effectiveRatePct,
      rothConversion: row.rothConversion,
      cumSavings: showConversions ? _cumSav : undefined,
    }
  })

  // First year where cumulative savings turns non-negative (break-even)
  const breakevenYear: number | null = (() => {
    let running = 0
    for (let i = 0; i < optimizedRows.length; i++) {
      running += (baselineRows[i]?.totalCost ?? 0) - optimizedRows[i].totalCost
      if (running >= 0) return optimizedRows[i].year
    }
    return null
  })()

  // First year the active scenario's IRA balance reaches zero
  const iraZeroYear: number | null = (() => {
    for (const r of activeRows) {
      if (r.iraBalanceEnd <= 0) return r.year
    }
    return null
  })()

  const rothRows = optimizedRows.filter((r) => r.rothConversion > 0)

  const balanceChartData = baselineRows.map((bRow, i) => {
    const oRow = optimizedRows[i]
    return {
      year: bRow.year,
      age: bRow.age,
      baselineIra: bRow.iraBalanceEnd,
      optimizedIra: oRow?.iraBalanceEnd ?? 0,
      baselineRoth: bRow.rothBalanceEnd,
      optimizedRoth: oRow?.rothBalanceEnd ?? 0,
    }
  })

  useEffect(() => {
    // Skip the initial render — don't auto-save stale/default values on mount
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveMsg('Saving…')
    setSaveError('')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/tax-scenario', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            w2Income: numVal(form.w2Income),
            interestIncome: numVal(form.interestIncome),
            dividendIncome: numVal(form.dividendIncome),
            capGainsDist: numVal(form.capGainsDist),
            stcg: numVal(form.stcg),
            ltcg: numVal(form.ltcg),
            otherIncome: numVal(form.otherIncome),
            iraBalance: numVal(form.iraBalance),
            iraWithdrawals: numVal(form.iraWithdrawals),
            qcds: numVal(form.qcds),
            rothBalance: numVal(form.rothBalance),
            portfolioGrowthPct: numVal(form.portfolioGrowthPct),
            retirementYear: numVal(form.retirementYear),
            ssStartYear: numVal(form.ssStartYear),
            ssPaymentsPerYear: numVal(form.ssPaymentsPerYear),
            spouseSsStartYear: numVal(form.spouseSsStartYear) || null,
            spouseSsPaymentsPerYear: numVal(form.spouseSsPaymentsPerYear),
            inflationPct: numVal(form.inflationPct),
            medicareEnrollees: form.medicareEnrollees === '2' ? 2 : 1,
            irmaaTargetTier,
            conversionWindow,
            showConversions,
          }),
        })
        if (!res.ok) {
          setSaveError('Failed to save')
          setSaveMsg('')
        } else {
          setSaveMsg('Saved')
          setTimeout(() => setSaveMsg(''), 2000)
        }
      } catch {
        setSaveError('Network error')
        setSaveMsg('')
      }
    }, 1000)
  }, [form, irmaaTargetTier, showConversions, conversionWindow])

  function CustomTooltip({ active, payload, label }: {
    active?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any[]
    label?: number
  }) {
    if (!active || !payload?.length) return null
    const optRow = activeRows.find((r) => r.year === label)
    const baseRow = showConversions ? baselineRows.find((r) => r.year === label) : undefined
    if (!optRow) return null
    const federalTax = optRow.totalTax - optRow.conversionTax
    const totalFederal = optRow.totalTax
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md space-y-1 min-w-[240px]">
        <p className="font-semibold text-sm">
          Year {optRow.year}{optRow.age > 0 ? ` · Age ${optRow.age}` : ''}
          {isJoint && optRow.filing === 'single' && (
            <span className="ml-2 text-rose-500 font-normal">Single (survivor)</span>
          )}
        </p>

        {/* Income section */}
        <div className="border-t pt-1">
          <p className="text-muted-foreground font-medium uppercase tracking-wide" style={{ fontSize: 10 }}>Income</p>
          {optRow.ss > 0 && (
            <p className="text-muted-foreground">Total SS: <span className="font-medium text-foreground">{fmtCurrency(optRow.ss)}</span> <span className="text-xs">(taxable: {fmtCurrency(optRow.taxableSS)})</span></p>
          )}
          {optRow.iraWithdrawal > 0 && optRow.rmd === 0 && (
            <p className="text-muted-foreground">IRA Withdrawal: <span className="font-medium text-foreground">{fmtCurrency(optRow.iraWithdrawal)}</span></p>
          )}
          {(optRow.rmd > 0 || (baseRow && (baseRow.rmd ?? 0) > 0)) && (
            <p className="text-muted-foreground">
              RMD:{' '}
              <span className="font-medium text-foreground">{fmtCurrency(optRow.rmd)}</span>
              {showConversions && baseRow && baseRow.rmd !== optRow.rmd && (
                <span className="text-xs text-muted-foreground ml-1">(baseline: {fmtCurrency(baseRow.rmd)})</span>
              )}
            </p>
          )}
          {optRow.qcdsActual > 0 && (
            <p className="text-green-600">
              QCD: <span className="font-medium">{fmtCurrency(optRow.qcdsActual)}</span>
              <span className="text-muted-foreground ml-1">(taxable RMD: {fmtCurrency(optRow.iraWithdrawal)})</span>
            </p>
          )}
          <p>Base MAGI: <span className="font-medium">{fmtCurrency(optRow.magi - optRow.rothConversion)}</span></p>
          {optRow.rothConversion > 0 && (
            <p className="text-violet-700">+ Roth conversion: <span className="font-medium">{fmtCurrency(optRow.rothConversion)}</span></p>
          )}
          {optRow.rothConversion > 0 && (
            <p>MAGI with conversion: <span className="font-medium">{fmtCurrency(optRow.magi)}</span></p>
          )}
        </div>

        {/* Tax section */}
        <div className="border-t pt-1">
          <p className="text-muted-foreground font-medium uppercase tracking-wide" style={{ fontSize: 10 }}>Federal Tax</p>
          <p>
            <span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />
            Tax on income: <span className="font-medium">{fmtCurrency(federalTax)}</span>
          </p>
          {optRow.conversionTax > 0 && (
            <p>
              <span className="inline-block w-2 h-2 rounded-sm bg-violet-500 mr-1" />
              Extra from conversion: <span className="font-medium text-violet-600">+{fmtCurrency(optRow.conversionTax)}</span>
            </p>
          )}
          <p className="font-semibold">Total federal tax: {fmtCurrency(totalFederal)}</p>
          {baseRow && (
            <p className="text-muted-foreground">Without conversion: {fmtCurrency(baseRow.totalTax)}</p>
          )}
        </div>

        {/* Medicare / other */}
        {optRow.irmaaAnnual > 0 && (
          <div className="border-t pt-1">
            <p>
              <span className="inline-block w-2 h-2 rounded-sm bg-amber-500 mr-1" />
              IRMAA surcharge: <span className="font-medium text-amber-600">{fmtCurrency(optRow.irmaaAnnual)}</span>
            </p>
          </div>
        )}

        <div className="border-t pt-1">
          <p>Effective rate: <span className="font-medium text-green-600">{optRow.effectiveRatePct.toFixed(1)}%</span></p>
          {showConversions && (() => {
            const cd = chartData.find((d) => d.year === label)
            if (cd?.cumSavings === undefined) return null
            const cs = cd.cumSavings
            return (
              <p className={cs >= 0 ? 'text-green-600 font-semibold' : 'text-amber-600'}>
                Cumul. savings: {cs >= 0 ? '+' : ''}{fmtCurrency(cs)}
                {cs < 0 ? ' — conversion tax not yet recovered' : ' — break-even reached!'}
              </p>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold">Tax and Legacy Optimizer</h2>
        <div className="flex items-center gap-2 text-sm">
          {saveError
            ? <span className="text-destructive">{saveError}</span>
            : saveMsg
              ? <span className={saveMsg === 'Saving…' ? 'text-muted-foreground' : 'text-green-600 font-medium'}>{saveMsg}</span>
              : null
          }
        </div>
      </div>

      {/* No-DOB warning */}
      {birthYear === null && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
          Add your date of birth in your profile to see age-based calculations (RMD, IRMAA).
        </div>
      )}

      {/* Input card */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Current Income */}
          <div>
            <p className="text-sm font-semibold mb-3 pb-1 border-b">Current Income</p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <NumberInput id="w2Income" label="W2 / Salary Income" value={form.w2Income} onChange={set('w2Income')} />
              <NumberInput id="otherIncome" label="Other Income (pension, rental…)" value={form.otherIncome} onChange={set('otherIncome')} />
              <NumberInput id="interestIncome" label="Interest Income" value={form.interestIncome} onChange={set('interestIncome')} />
              <NumberInput id="dividendIncome" label="Qualified Dividends" value={form.dividendIncome} onChange={set('dividendIncome')} />
              <NumberInput id="capGainsDist" label="Cap Gains Distributions" value={form.capGainsDist} onChange={set('capGainsDist')} />
              <NumberInput id="stcg" label="Short-Term Cap Gains (STCG)" value={form.stcg} onChange={set('stcg')} />
              <NumberInput id="ltcg" label="Long-Term Cap Gains (LTCG)" value={form.ltcg} onChange={set('ltcg')} />
            </div>
          </div>

          {/* Retirement Accounts */}
          <div>
            <p className="text-sm font-semibold mb-3 pb-1 border-b">Retirement Accounts</p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <NumberInput id="iraBalance" label="IRA / 401k Balance" value={form.iraBalance} onChange={set('iraBalance')} step="1000" />
              <NumberInput id="rothBalance" label="Roth IRA Balance" value={form.rothBalance} onChange={set('rothBalance')} step="1000" />
              <NumberInput id="iraWithdrawals" label="IRA Withdrawals (pre-73)" value={form.iraWithdrawals} onChange={set('iraWithdrawals')} />
              <NumberInput id="qcds" label="QCDs (% of RMD, age 73+)" value={form.qcds} onChange={set('qcds')} step="1" prefix="" suffix="%" min="0" />
            </div>
          </div>

          {/* Projection Settings */}
          <div>
            <div className="flex items-baseline justify-between gap-4 mb-3 pb-1 border-b">
              <p className="text-sm font-semibold">Projection Settings</p>
              <p className="text-xs text-muted-foreground">
                Filing status: <strong className="text-foreground">{isJoint ? 'Married Filing Jointly' : 'Single'}</strong>
                {' '}— <a href="/account" className="text-primary underline hover:no-underline">change in Account</a>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <NumberInput id="portfolioGrowthPct" label="Portfolio Growth %" value={form.portfolioGrowthPct} onChange={set('portfolioGrowthPct')} step="0.1" prefix="" suffix="%" />
              <NumberInput id="inflationPct" label="Inflation / SS COLA %" value={form.inflationPct} onChange={set('inflationPct')} step="0.1" prefix="" suffix="%" />
              <div className="space-y-1">
                <Label htmlFor="medicareEnrollees" className="text-xs text-muted-foreground">Medicare Enrollees</Label>
                <Select
                  value={form.medicareEnrollees}
                  onValueChange={(v) => setForm((f) => ({ ...f, medicareEnrollees: v as '1' | '2' }))}
                >
                  <SelectTrigger id="medicareEnrollees" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 — single or one spouse on Medicare</SelectItem>
                    <SelectItem value="2">2 — both spouses on Medicare</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">IRMAA is paid per person — joint filers often pay it twice.</p>
              </div>
              <NumberInput id="retirementYear" label="Retirement Year" value={form.retirementYear} onChange={set('retirementYear')} step="1" prefix="" min="2020" />
              <NumberInput id="ssStartYear" label="Your SS Start Year" value={form.ssStartYear} onChange={set('ssStartYear')} step="1" prefix="" min="2020" />
              <NumberInput id="ssPaymentsPerYear" label="Your SS Amount / Year" value={form.ssPaymentsPerYear} onChange={set('ssPaymentsPerYear')} />
              {isJoint && (
                <>
                  <NumberInput id="spouseSsStartYear" label="Spouse SS Start Year" value={form.spouseSsStartYear} onChange={set('spouseSsStartYear')} step="1" prefix="" min="2020" />
                  <NumberInput id="spouseSsPaymentsPerYear" label="Spouse SS Amount / Year" value={form.spouseSsPaymentsPerYear} onChange={set('spouseSsPaymentsPerYear')} />
                  {!spouseBirthYear && (
                    <div className="space-y-1 sm:col-span-2 md:col-span-3">
                      <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <p className="text-xs text-amber-800 dark:text-amber-400 flex-1 min-w-0">
                          <strong>Spouse birth year missing</strong> — needed to model the first-death transition and joint life expectancy.{' '}
                          <a href="/account" className="underline hover:no-underline">Save it in Account</a> or enter below for this session only.
                        </p>
                        <div className="w-36 shrink-0">
                          <NumberInput id="spouseBirthYearOverride" label="Spouse Birth Year" value={form.spouseBirthYearOverride} onChange={set('spouseBirthYearOverride')} step="1" prefix="" min="1930" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <Label htmlFor="irmaaTargetTier" className="text-xs text-muted-foreground">Conversion Aggressiveness</Label>
                <Select
                  value={String(irmaaTargetTier)}
                  onValueChange={(v) => setIrmaaTargetTier(Number(v) as IrmaaTargetTier)}
                >
                  <SelectTrigger id="irmaaTargetTier" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Conservative — no IRMAA surcharge</SelectItem>
                    <SelectItem value="1">Moderate — allow Tier 1 IRMAA</SelectItem>
                    <SelectItem value="2">Aggressive — allow Tier 2 IRMAA</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Higher tiers convert more now, paying more upfront but reducing future RMDs and IRMAA.
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <Label htmlFor="conversionWindow" className="text-xs text-muted-foreground">Conversion Window</Label>
                <Select
                  value={conversionWindow}
                  onValueChange={(v) => setConversionWindow(v as 'always' | 'before-ss' | 'before-rmd')}
                >
                  <SelectTrigger id="conversionWindow" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Drain IRA</SelectItem>
                    <SelectItem value="before-ss">Tax valley — before SS starts</SelectItem>
                    <SelectItem value="before-rmd">Before RMDs (age 73)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Limit conversions to the low-income window before SS or RMDs raise your bracket.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lifetime Summary card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">Tax and IRMAA Cost over Lifetime ({projectionYears} Years)</CardTitle>
            <p className="text-xs text-muted-foreground">
              {birthYear && birthYear > 0
                ? `Projecting to ${startYear + projectionYears - 1} based on ${
                    isJoint && (spouseBirthYear ?? numVal(form.spouseBirthYearOverride) > 0)
                      ? 'joint life expectancy'
                      : 'your life expectancy'
                  } (SSA tables)`
                : `Add your date of birth for life-expectancy-based projection`
              }
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Baseline {projectionYears}-yr Cost</p>
              <p className="text-xl font-bold tabular-nums">{fmtK(summary.baselineTotalCost)}</p>
              <p className="text-xs text-muted-foreground">
                Tax {fmtK(summary.baselineTotalTax)} · IRMAA {fmtK(summary.baselineTotalIrmaa)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Plan Cost</p>
              <p className="text-xl font-bold tabular-nums">{fmtK(summary.optimizedTotalCost)}</p>
              <p className="text-xs text-muted-foreground">
                Tax {fmtK(summary.optimizedTotalTax)} · IRMAA {fmtK(summary.optimizedTotalIrmaa)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{summary.lifetimeSavings >= 0 ? 'Net Savings' : 'Net Cost'}</p>
              <p className={`text-xl font-bold tabular-nums ${summary.lifetimeSavings >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {fmtK(Math.abs(summary.lifetimeSavings))} {summary.lifetimeSavings >= 0 ? 'less' : 'more'}
              </p>
              <p className="text-xs text-muted-foreground">vs no-conversion baseline</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Total Roth Converted</p>
              <p className="text-xl font-bold tabular-nums">{fmtK(summary.totalRothConverted)}</p>
              <p className="text-xs text-muted-foreground">across {projectionYears} yrs</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Break-Even Year</p>
              {breakevenYear !== null ? (
                <>
                  <p className="text-xl font-bold tabular-nums text-green-600">{breakevenYear}</p>
                  <p className="text-xs text-muted-foreground">conversions pay off by then</p>
                </>
              ) : (
                <p className="text-xl font-bold tabular-nums text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wealth & Legacy card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Wealth &amp; Legacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Charitable Giving</p>
              <p className="text-xl font-bold tabular-nums">{fmtK(summary.totalQcds)}</p>
              <p className="text-xs text-muted-foreground">via QCDs, age 73+</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Final IRA (Baseline)</p>
              <p className="text-xl font-bold tabular-nums">{fmtK(summary.baselineFinalIraBalance)}</p>
              <p className="text-xs text-muted-foreground">heir annual RMD: {fmtK(summary.heirAnnualIraRmdBaseline)}/yr</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Final IRA (Plan)</p>
              <p className="text-xl font-bold tabular-nums">{fmtK(summary.optimizedFinalIraBalance)}</p>
              <p className="text-xs text-muted-foreground">
                heir annual RMD: {fmtK(summary.heirAnnualIraRmdOptimized)}/yr
                {summary.optimizedFinalIraBalance < summary.baselineFinalIraBalance && (
                  <span className="ml-1 text-green-600 font-medium">
                    ({fmtK(summary.optimizedFinalIraBalance - summary.baselineFinalIraBalance)})
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Final Roth (Baseline)</p>
              <p className="text-xl font-bold tabular-nums">{fmtK(summary.baselineFinalRothBalance)}</p>
              <p className="text-xs text-muted-foreground">tax-free to heirs</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Final Roth (Plan)</p>
              <p className="text-xl font-bold tabular-nums">{fmtK(summary.optimizedFinalRothBalance)}</p>
              <p className="text-xs text-muted-foreground">
                tax-free to heirs
                {summary.optimizedFinalRothBalance > summary.baselineFinalRothBalance && (
                  <span className="ml-1 text-green-600 font-medium">
                    (+{fmtK(summary.optimizedFinalRothBalance - summary.baselineFinalRothBalance)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            Inherited IRA: heirs must withdraw within 10 years (SECURE 2.0), paying income tax on each withdrawal. Inherited Roth: tax-free. Heir Annual IRA RMD = final IRA balance ÷ 10 (equal-spread estimate).
          </p>
        </CardContent>
      </Card>

      {/* IRA & Roth Balance Trajectory chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">IRA &amp; Roth Balance Trajectory</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={balanceChartData} margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} width={60} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const d = balanceChartData.find((r) => r.year === label)
                  if (!d) return null
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md space-y-1 min-w-[200px]">
                      <p className="font-semibold text-sm">Year {d.year}{d.age > 0 ? ` · Age ${d.age}` : ''}</p>
                      <p className="text-slate-400">IRA (Baseline): <span className="font-medium text-foreground">{fmtK(d.baselineIra)}</span></p>
                      <p className="text-blue-500">IRA (Plan): <span className="font-medium text-foreground">{fmtK(d.optimizedIra)}</span></p>
                      <p className="text-green-300">Roth (Baseline): <span className="font-medium text-foreground">{fmtK(d.baselineRoth)}</span></p>
                      <p className="text-green-500">Roth (Plan): <span className="font-medium text-foreground">{fmtK(d.optimizedRoth)}</span></p>
                    </div>
                  )
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
              <Line type="monotone" dataKey="baselineIra" stroke="#94a3b8" strokeDasharray="4 2" name="IRA (Baseline)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="optimizedIra" stroke="#3b82f6" name="IRA (Plan)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="baselineRoth" stroke="#86efac" strokeDasharray="4 2" name="Roth (Baseline)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="optimizedRoth" stroke="#22c55e" name="Roth (Plan)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-3">
            Solid lines = optimized (with conversions). Dashed = baseline. Roth is tax-free to heirs; IRA is taxable under the 10-year inherited RMD rule.
          </p>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {showConversions ? 'Tax & IRMAA Projection — Plan vs Baseline' : 'Tax & IRMAA Projection — Baseline (no conversions)'}
          </CardTitle>
          <Select value={showConversions ? 'optimized' : 'baseline'} onValueChange={(v) => setShowConversions(v === 'optimized')}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="optimized">With Roth conversions</SelectItem>
              <SelectItem value="baseline">Baseline only</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 60, bottom: 0, left: 20 }}>
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tickFormatter={(v: number) => fmtK(v)}
                tick={{ fontSize: 11 }}
                width={60}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v: number) => showConversions ? fmtK(v) : v.toFixed(1) + '%'}
                tick={{ fontSize: 11 }}
                width={55}
              />
              <Bar yAxisId="left" stackId="cost" dataKey="federalTax" fill="#3b82f6" name="Federal Tax (on income)" />
              <Bar yAxisId="left" stackId="cost" dataKey="conversionTax" fill="#8b5cf6" name="Roth Conv Tax (extra)" />
              <Bar yAxisId="left" stackId="cost" dataKey="irmaa" fill="#f59e0b" name="IRMAA" />
              {showConversions && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="baselineCost"
                  stroke="#94a3b8"
                  strokeDasharray="4 2"
                  name="Baseline Cost"
                  dot={false}
                  strokeWidth={2}
                />
              )}
              {showConversions ? (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumSavings"
                  stroke="#22c55e"
                  name="Cumul. Savings"
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray="6 2"
                />
              ) : (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="effectiveRate"
                  stroke="#22c55e"
                  name="Eff. Rate %"
                  dot={false}
                  strokeWidth={2}
                />
              )}
              {isJoint && summary.firstSpouseDeathYear !== null && (
                <ReferenceLine
                  x={summary.firstSpouseDeathYear}
                  yAxisId="left"
                  stroke="#f43f5e"
                  strokeDasharray="4 2"
                  strokeWidth={2}
                  label={{ value: '† First death', position: 'insideTopRight', fontSize: 10, fill: '#f43f5e' }}
                />
              )}
              {iraZeroYear !== null && (
                <ReferenceLine
                  x={iraZeroYear}
                  yAxisId="left"
                  stroke="#a855f7"
                  strokeDasharray="4 2"
                  strokeWidth={2}
                  label={(props: { viewBox?: { x?: number; y?: number; height?: number } }) => {
                    const x = (props.viewBox?.x ?? 0) - 6
                    const y = (props.viewBox?.y ?? 0) + (props.viewBox?.height ?? 280) - 20
                    return (
                      <g>
                        <rect x={x - 28} y={y - 1} width={32} height={14} rx={3} fill="#a855f7" />
                        <text x={x - 12} y={y + 10} fill="white" fontSize={9} textAnchor="middle" fontWeight="600">IRA $0</text>
                      </g>
                    )
                  }}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-3">
            {showConversions
              ? 'Bars = optimized cost (with conversions). Grey dashed = baseline. Green line = cumulative savings — negative means conversion tax paid so far exceeds savings (not yet recovered), positive means break-even reached and you are saving money.'
              : 'Bars = baseline scenario — no Roth conversions. Switch to "With Roth conversions" to see the optimized strategy.'}
          </p>
        </CardContent>
      </Card>

      {/* Detail table toggle */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => setShowTable((s) => !s)} className="text-muted-foreground">
          {showTable ? 'Hide' : 'Show'} Detail Table
        </Button>
        {showTable && (
          <div className="mt-3 overflow-x-auto rounded-md border">
            <table className="w-full text-xs min-w-[820px]">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-3 py-2 text-left font-semibold">Year</th>
                  <th className="px-3 py-2 text-right font-semibold">Age</th>
                  <th className="px-3 py-2 text-right font-semibold">SS (Total)</th>
                  <th className="px-3 py-2 text-right font-semibold">Base MAGI</th>
                  <th className="px-3 py-2 text-right font-semibold">RMD</th>
                  <th className="px-3 py-2 text-right font-semibold">QCD</th>
                  <th className="px-3 py-2 text-right font-semibold">Federal Tax</th>
                  <th className="px-3 py-2 text-right font-semibold">Conv Tax</th>
                  <th className="px-3 py-2 text-right font-semibold">IRMAA</th>
                  <th className="px-3 py-2 text-right font-semibold">Eff. Rate</th>
                  <th className="px-3 py-2 text-right font-semibold">Roth Conv</th>
                  <th className="px-3 py-2 text-right font-semibold">IRA Bal (End)</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((r, i) => {
                  const prevRow = activeRows[i - 1]
                  const isTransition = isJoint && prevRow && prevRow.filing === 'joint' && r.filing === 'single'
                  return (
                    <React.Fragment key={r.year}>
                      {isTransition && (
                        <tr key={`transition-${r.year}`} className="bg-rose-50 dark:bg-rose-950/20">
                          <td colSpan={12} className="px-3 py-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                            † {r.year - 1} — First spouse death · Filing switches to Single
                          </td>
                        </tr>
                      )}
                      <tr className={`border-b last:border-0 hover:bg-muted/20 ${r.filing === 'single' && isJoint ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}`}>
                        <td className="px-3 py-1.5 tabular-nums">{r.year}</td>
                        <td className="px-3 py-1.5 tabular-nums text-right">{r.age > 0 ? r.age : '—'}</td>
                        <td className="px-3 py-1.5 tabular-nums text-right">{r.ss > 0 ? fmtK(r.ss) : '—'}</td>
                    <td className="px-3 py-1.5 tabular-nums text-right">{fmtK(r.magi - r.rothConversion)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-right">{r.rmd > 0 ? fmtK(r.rmd) : '—'}</td>
                    <td className="px-3 py-1.5 tabular-nums text-right">
                      {r.qcdsActual > 0 ? <span className="text-green-600">{fmtK(r.qcdsActual)}</span> : '—'}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-right">{fmtK(r.totalTax - r.conversionTax)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-right">
                      {r.conversionTax > 0 ? <span className="text-violet-600">{fmtK(r.conversionTax)}</span> : '—'}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-right">
                      {r.irmaaAnnual > 0 ? <span className="text-amber-600">{fmtK(r.irmaaAnnual)}</span> : '—'}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-right">{r.effectiveRatePct.toFixed(1)}%</td>
                    <td className="px-3 py-1.5 tabular-nums text-right">
                      {r.rothConversion > 0 ? <span className="text-violet-700 font-medium">{fmtK(r.rothConversion)}</span> : '—'}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-right">{fmtK(r.iraBalanceEnd)}</td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roth conversion plan */}
      {showConversions && rothRows.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-400">Roth Conversion Plan</h3>
            <p className="text-sm text-amber-800 dark:text-amber-500 mt-1">
              {TIER_SUBTITLES[irmaaTargetTier]}
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border border-amber-200 dark:border-amber-900">
            <table className="w-full text-xs min-w-[620px] bg-white dark:bg-transparent">
              <thead>
                <tr className="border-b border-amber-200 dark:border-amber-900 bg-amber-100/60 dark:bg-amber-950/40">
                  <th className="px-3 py-2 text-left font-semibold text-amber-900 dark:text-amber-400">Year</th>
                  <th className="px-3 py-2 text-right font-semibold text-amber-900 dark:text-amber-400">Age</th>
                  <th className="px-3 py-2 text-right font-semibold text-amber-900 dark:text-amber-400">Conversion</th>
                  <th className="px-3 py-2 text-right font-semibold text-amber-900 dark:text-amber-400">Tax on Conv</th>
                  <th className="px-3 py-2 text-right font-semibold text-amber-900 dark:text-amber-400">MAGI After</th>
                  <th className="px-3 py-2 text-right font-semibold text-amber-900 dark:text-amber-400">IRMAA Δ vs Baseline</th>
                </tr>
              </thead>
              <tbody>
                {rothRows.map((r) => {
                  const baseRow = baselineRows.find((b) => b.year === r.year)
                  const irmaaDelta = r.irmaaAnnual - (baseRow?.irmaaAnnual ?? 0)
                  return (
                    <tr key={r.year} className="border-b border-amber-100 dark:border-amber-900/50 last:border-0">
                      <td className="px-3 py-1.5 tabular-nums text-amber-900 dark:text-amber-300">{r.year}</td>
                      <td className="px-3 py-1.5 tabular-nums text-right text-amber-900 dark:text-amber-300">{r.age > 0 ? r.age : '—'}</td>
                      <td className="px-3 py-1.5 tabular-nums text-right font-medium text-amber-900 dark:text-amber-300">{fmtCurrency(r.rothConversion)}</td>
                      <td className="px-3 py-1.5 tabular-nums text-right text-amber-900 dark:text-amber-300">{fmtCurrency(r.conversionTax)}</td>
                      <td className="px-3 py-1.5 tabular-nums text-right text-amber-900 dark:text-amber-300">{fmtCurrency(r.magi)}</td>
                      <td className="px-3 py-1.5 tabular-nums text-right">
                        {irmaaDelta === 0 ? (
                          <span className="text-amber-900 dark:text-amber-300">—</span>
                        ) : irmaaDelta > 0 ? (
                          <span className="text-amber-600 font-medium">+{fmtCurrency(irmaaDelta)}</span>
                        ) : (
                          <span className="text-green-600 font-medium">{fmtCurrency(irmaaDelta)}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-600 italic">
            Estimates only — consult a tax advisor before converting.
          </p>
        </div>
      )}
    </div>
  )
}
