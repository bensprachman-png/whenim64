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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { projectTaxes, computeProjectionYears, ssaExpectedAge, type ScenarioRow, type IrmaaTargetTier, type Sex } from '@/lib/tax-engine'
import type { FilingStatus } from '@/lib/tax-engine'
import type { taxScenarios } from '@/db/schema'

interface BrokerageAccountInfo {
  name: string
  balance: number | null
}

interface StateInfo { code: string; name: string; rate: number }

interface Props {
  initialScenario: typeof taxScenarios.$inferSelect | null
  birthYear: number | null
  defaultFilingStatus: string
  defaultSsStartYear: number
  sex: Sex | null
  spouseBirthYear: number | null
  spouseSex: Sex | null
  brokerageIraAccounts: BrokerageAccountInfo[]
  brokerageRothAccounts: BrokerageAccountInfo[]
  brokerageTaxableAccounts: BrokerageAccountInfo[]
  stateInfo: StateInfo | null
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
  qcds: string
  rothBalance: string
  taxableBalance: string
  otherAssets: string
  realEstateValue: string
  annualLivingExpenses: string
  portfolioGrowthPct: string
  retirementYear: string
  ssStartYear: string
  ssPaymentsPerYear: string
  inflationPct: string
  medicareEnrollees: '1' | '2'
  medicareStartYear: string   // 0 = auto (max of retirementYear and birthYear+65)
  spouseSsStartYear: string
  spouseSsPaymentsPerYear: string
  spouseBirthYearOverride: string  // local-only fallback when profile lacks spouse DOB
  planToAge: string          // override SSA life expectancy for primary ('' = SSA default)
  spousePlanToAge: string    // override SSA life expectancy for spouse
  annualDeferredContrib: string
  annualRothContrib: string
  employerMatchPct: string
  spouseAnnualDeferredContrib: string
  spouseAnnualRothContrib: string
  spouseEmployerMatchPct: string
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
    qcds: nz(scenario?.qcds),
    rothBalance: nz(scenario?.rothBalance),
    taxableBalance: nz(scenario?.taxableBalance),
    otherAssets: nz(scenario?.otherAssets),
    realEstateValue: nz(scenario?.realEstateValue),
    annualLivingExpenses: nz(scenario?.annualLivingExpenses),
    portfolioGrowthPct: String(scenario?.portfolioGrowthPct ?? 5),
    retirementYear: String(scenario?.retirementYear ?? currentYear + 5),
    ssStartYear: String(scenario?.ssStartYear ?? defaultSsStartYear),
    ssPaymentsPerYear: nz(scenario?.ssPaymentsPerYear),
    inflationPct: String(scenario?.inflationPct ?? 2.5),
    medicareEnrollees: (scenario?.medicareEnrollees != null ? String(scenario.medicareEnrollees) : (isJoint ? '2' : '1')) as '1' | '2',
    medicareStartYear: scenario?.medicareStartYear ? String(scenario.medicareStartYear) : '0',
    spouseSsStartYear: nz(scenario?.spouseSsStartYear),
    spouseSsPaymentsPerYear: nz(scenario?.spouseSsPaymentsPerYear),
    spouseBirthYearOverride: '',
    planToAge: scenario?.planToAge ? String(scenario.planToAge) : '',
    spousePlanToAge: scenario?.spousePlanToAge ? String(scenario.spousePlanToAge) : '',
    annualDeferredContrib: nz(scenario?.annualDeferredContrib),
    annualRothContrib: nz(scenario?.annualRothContrib),
    employerMatchPct: nz(scenario?.employerMatchPct),
    spouseAnnualDeferredContrib: nz(scenario?.spouseAnnualDeferredContrib),
    spouseAnnualRothContrib: nz(scenario?.spouseAnnualRothContrib),
    spouseEmployerMatchPct: nz(scenario?.spouseEmployerMatchPct),
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
  highlight?: boolean
}

function NeedsInputBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 leading-none shrink-0">
      needed
    </span>
  )
}

function ReviewBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400 leading-none shrink-0">
      review
    </span>
  )
}

function NumberInput({ id, label, value, onChange, step = '100', prefix = '$', suffix, min = '0', highlight = false }: NumberInputProps) {
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
          className={[prefix ? 'pl-6' : '', highlight ? 'border-amber-400 ring-1 ring-amber-300/60' : ''].filter(Boolean).join(' ')}
        />
        {suffix && (
          <span className="absolute right-2.5 text-sm text-muted-foreground pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  )
}


export default function TaxOptimizer({ initialScenario, birthYear, defaultFilingStatus, defaultSsStartYear, sex, spouseBirthYear, spouseSex, brokerageIraAccounts, brokerageRothAccounts, brokerageTaxableAccounts, stateInfo }: Props) {
  const isJoint = defaultFilingStatus === 'married_jointly' || defaultFilingStatus === 'joint'
  const taxFiling: FilingStatus = isJoint ? 'joint' : 'single'

  const brokerageIraTotal = brokerageIraAccounts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const brokerageRothTotal = brokerageRothAccounts.reduce((s, a) => s + (a.balance ?? 0), 0)
  const brokerageTaxableTotal = brokerageTaxableAccounts.reduce((s, a) => s + (a.balance ?? 0), 0)
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

  // Highlight indicators — show badges on triggers when key fields are missing
  const assetsNeedInput = brokerageIraTotal === 0 && brokerageRothTotal === 0 && brokerageTaxableTotal === 0
    && numVal(form.iraBalance) === 0 && numVal(form.rothBalance) === 0 && numVal(form.taxableBalance) === 0
  const ssNeedsInput = numVal(form.ssPaymentsPerYear) === 0
  const expensesNeedInput = numVal(form.annualLivingExpenses) === 0
  const inputsNeedAttention = assetsNeedInput || ssNeedsInput || expensesNeedInput
  const projectionNeedsReview = initialScenario?.retirementYear == null

  // Computed outside memo so UI can reference it for the plan-age dropdowns
  const effectiveSpouseBirthYear = spouseBirthYear ?? (numVal(form.spouseBirthYearOverride) > 0 ? numVal(form.spouseBirthYearOverride) : null)

  // Expensive projection — memoised on inputs only (not on showConversions)
  const { baselineRows, optimizedRows, summary, projectionYears } = useMemo(() => {
    const ssStart = numVal(form.ssStartYear)
    const rmdStart = (birthYear ?? 0) > 0 ? (birthYear! + 73) : 9999
    const convStop =
      conversionWindow === 'before-ss'  ? (ssStart || 9999) :
      conversionWindow === 'before-rmd' ? rmdStart :
      9999
    const projectionYears = computeProjectionYears(
      birthYear ?? 0,
      effectiveSpouseBirthYear,
      startYear,
      sex,
      spouseSex,
      numVal(form.planToAge),
      numVal(form.spousePlanToAge),
    )
    const result = projectTaxes({
      w2Income: numVal(form.w2Income),
      interestIncome: numVal(form.interestIncome),
      dividendIncome: numVal(form.dividendIncome),
      capGainsDist: numVal(form.capGainsDist),
      stcg: numVal(form.stcg),
      ltcg: numVal(form.ltcg),
      otherIncome: numVal(form.otherIncome),
      iraBalance: brokerageIraTotal + numVal(form.iraBalance),
      iraWithdrawals: 0,
      qcdPct: numVal(form.qcds),
      rothBalance: brokerageRothTotal + numVal(form.rothBalance),
      portfolioGrowthPct: numVal(form.portfolioGrowthPct),
      retirementYear: numVal(form.retirementYear),
      ssStartYear: ssStart,
      ssPaymentsPerYear: numVal(form.ssPaymentsPerYear),
      inflationPct: numVal(form.inflationPct),
      medicareEnrollees: form.medicareEnrollees === '2' ? 2 : 1,
      medicareStartYear: numVal(form.medicareStartYear),
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
      stateTaxRate: stateInfo?.rate ?? 0,
      planToAge: numVal(form.planToAge),
      spousePlanToAge: numVal(form.spousePlanToAge),
      annualDeferredContrib: numVal(form.annualDeferredContrib),
      annualRothContrib: numVal(form.annualRothContrib),
      annualEmployerMatch: numVal(form.w2Income) * numVal(form.employerMatchPct) / 100,
      spouseAnnualDeferredContrib: numVal(form.spouseAnnualDeferredContrib),
      spouseAnnualRothContrib: numVal(form.spouseAnnualRothContrib),
      spouseAnnualEmployerMatch: numVal(form.w2Income) * numVal(form.spouseEmployerMatchPct) / 100,
    })
    return { ...result, projectionYears }
  }, [form, birthYear, startYear, irmaaTargetTier, conversionWindow, taxFiling, sex, spouseBirthYear, spouseSex, brokerageIraTotal, brokerageRothTotal, stateInfo, effectiveSpouseBirthYear])

  // Cheap derivation — switches instantly when the toggle changes
  const activeRows = showConversions ? optimizedRows : baselineRows

  // Running cumulative savings (baseline cost − optimised cost); negative = still in the hole
  let _cumSav = 0
  const chartData = activeRows.map((row, i) => {
    if (showConversions) _cumSav += (baselineRows[i]?.totalCost ?? 0) - optimizedRows[i].totalCost
    // taxOnIncome = base tax without any conversion (always >= 0)
    // conversionTax = extra tax caused by the conversion (optTotal - baseTotal, already includes state)
    const baseTotal = baselineRows[i]?.totalTax ?? row.totalTax
    return {
      year: row.year,
      age: row.age,
      taxOnIncome: baseTotal,
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

  // Funding projection: tracks all three account types year-by-year with priority drawdown.
  // Taxable absorbs after-tax RMDs and funds expenses first; Roth is drawn last.
  // IRA balance comes from the tax engine (depleted by RMDs and Roth conversions).
  const fundingProjection = useMemo(() => {
    const totalTaxableStart = brokerageTaxableTotal + numVal(form.taxableBalance)
    const totalRothStart = brokerageRothTotal + numVal(form.rothBalance)
    const totalIraStart = brokerageIraTotal + numVal(form.iraBalance)
    const growthRate = numVal(form.portfolioGrowthPct) / 100
    const inflation = numVal(form.inflationPct) / 100
    const baseExpenses = numVal(form.annualLivingExpenses)
    let taxable = totalTaxableStart
    // Track only the cumulative Roth withdrawals taken to cover expense shortfalls;
    // the engine's rothBalanceEnd already accounts for portfolio growth + conversions.
    let rothExpenseDrawdown = 0
    let depletionYear: number | null = null
    const data: Array<{ year: number; age: number; taxable: number; ira: number; roth: number; expenses: number; taxes: number; irmaa: number; rothConversion: number; ss: number; rmd: number; qcds: number }> = []
    for (const row of activeRows) {
      const yearsElapsed = row.year - startYear
      const expenses = baseExpenses > 0 ? baseExpenses * Math.pow(1 + inflation, yearsElapsed) : 0
      const afterTaxRate = Math.max(0, 1 - row.effectiveRatePct / 100)
      // row.iraWithdrawal = rmd − qcdsActual: gross IRA cash that lands in the taxable account.
      // QCDs go directly from IRA to charity and are already excluded here.
      const afterTaxRmd = row.iraWithdrawal > 0 ? row.iraWithdrawal * afterTaxRate : 0
      // SS payments deposit into the taxable account; after-tax portion net of effective rate.
      const afterTaxSS  = row.ss > 0 ? row.ss * afterTaxRate : 0
      // Taxable: grows at portfolio rate, gains after-tax RMDs and SS, funds expenses
      taxable = taxable * (1 + growthRate) + afterTaxRmd + afterTaxSS - expenses
      // IRA + Roth balances come directly from the engine, which applies portfolio
      // growth, RMDs, and Roth conversions authoritatively each year.
      const ira = Math.max(0, row.iraBalanceEnd)
      const rothFromEngine = Math.max(0, row.rothBalanceEnd)
      // When taxable can't cover expenses, draw from Roth last
      if (taxable < 0) {
        const shortfall = -taxable
        const rothAvail = Math.max(0, rothFromEngine - rothExpenseDrawdown)
        const withdrawal = Math.min(shortfall, rothAvail)
        rothExpenseDrawdown += withdrawal
        taxable = 0
      }
      const roth = Math.max(0, rothFromEngine - rothExpenseDrawdown)
      if (taxable === 0 && ira === 0 && roth === 0 && depletionYear === null) {
        depletionYear = row.year
      }
      data.push({
        year: row.year, age: row.age,
        taxable: Math.round(taxable), ira: Math.round(ira), roth: Math.round(roth),
        expenses: Math.round(expenses), taxes: Math.round(row.totalTax), irmaa: Math.round(row.irmaaAnnual),
        rothConversion: Math.round(row.rothConversion),
        ss: Math.round(row.ss), rmd: Math.round(row.rmd), qcds: Math.round(row.qcdsActual ?? 0),
      })
    }
    const lastRow = data[data.length - 1]
    return {
      data,
      startTaxable: totalTaxableStart, startIra: totalIraStart, startRoth: totalRothStart,
      endTaxable: lastRow?.taxable ?? 0, endIra: lastRow?.ira ?? 0, endRoth: lastRow?.roth ?? 0,
      depletionYear,
    }
  }, [activeRows, brokerageIraTotal, brokerageRothTotal, brokerageTaxableTotal, form.iraBalance, form.rothBalance, form.taxableBalance, form.annualLivingExpenses, form.portfolioGrowthPct, form.inflationPct, startYear])
  // Note: totalRothStart is used only for the startRoth stat; the Roth bars come from row.rothBalanceEnd

  // Roth balances adjusted for expense drawdowns after taxable is depleted — computed for both scenarios
  const rothAdjustedTrajectory = useMemo(() => {
    function computeRothBalances(rows: ScenarioRow[]): number[] {
      const growthRate = numVal(form.portfolioGrowthPct) / 100
      const inflation = numVal(form.inflationPct) / 100
      const baseExpenses = numVal(form.annualLivingExpenses)
      let taxable = brokerageTaxableTotal + numVal(form.taxableBalance)
      let roth = brokerageRothTotal + numVal(form.rothBalance)
      const out: number[] = []
      for (const row of rows) {
        const yearsElapsed = row.year - startYear
        const expenses = baseExpenses > 0 ? baseExpenses * Math.pow(1 + inflation, yearsElapsed) : 0
        const afterTaxRmd = row.rmd > 0
          ? (row.rmd - (row.qcdsActual ?? 0)) * Math.max(0, 1 - row.effectiveRatePct / 100)
          : 0
        taxable = taxable * (1 + growthRate) + afterTaxRmd - expenses
        roth = roth * (1 + growthRate) + row.rothConversion
        if (taxable < 0) {
          const withdrawal = Math.min(-taxable, roth)
          roth = Math.max(0, roth - withdrawal)
          taxable = 0
        }
        out.push(roth)
      }
      return out
    }
    return {
      baseline: computeRothBalances(baselineRows),
      optimized: computeRothBalances(optimizedRows),
    }
  }, [baselineRows, optimizedRows, brokerageTaxableTotal, brokerageRothTotal, form.taxableBalance, form.rothBalance, form.annualLivingExpenses, form.portfolioGrowthPct, form.inflationPct, startYear])

  const balanceChartData = baselineRows.map((bRow, i) => {
    const oRow = optimizedRows[i]
    return {
      year: bRow.year,
      age: bRow.age,
      baselineIra: bRow.iraBalanceEnd,
      optimizedIra: oRow?.iraBalanceEnd ?? 0,
      baselineRoth: rothAdjustedTrajectory.baseline[i] ?? 0,
      optimizedRoth: rothAdjustedTrajectory.optimized[i] ?? 0,
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
            qcds: numVal(form.qcds),
            rothBalance: numVal(form.rothBalance),
            taxableBalance: numVal(form.taxableBalance),
            otherAssets: numVal(form.otherAssets),
            realEstateValue: numVal(form.realEstateValue),
            annualLivingExpenses: numVal(form.annualLivingExpenses),
            portfolioGrowthPct: numVal(form.portfolioGrowthPct),
            retirementYear: numVal(form.retirementYear),
            ssStartYear: numVal(form.ssStartYear),
            ssPaymentsPerYear: numVal(form.ssPaymentsPerYear),
            spouseSsStartYear: numVal(form.spouseSsStartYear) || null,
            spouseSsPaymentsPerYear: numVal(form.spouseSsPaymentsPerYear),
            inflationPct: numVal(form.inflationPct),
            medicareEnrollees: form.medicareEnrollees === '2' ? 2 : 1,
            medicareStartYear: numVal(form.medicareStartYear),
            irmaaTargetTier,
            conversionWindow,
            showConversions,
            planToAge: numVal(form.planToAge) || null,
            spousePlanToAge: numVal(form.spousePlanToAge) || null,
            annualDeferredContrib: numVal(form.annualDeferredContrib),
            annualRothContrib: numVal(form.annualRothContrib),
            employerMatchPct: numVal(form.employerMatchPct),
            spouseAnnualDeferredContrib: numVal(form.spouseAnnualDeferredContrib),
            spouseAnnualRothContrib: numVal(form.spouseAnnualRothContrib),
            spouseEmployerMatchPct: numVal(form.spouseEmployerMatchPct),
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
          <p className="text-muted-foreground font-medium uppercase tracking-wide" style={{ fontSize: 10 }}>Estimated Taxes</p>
          <p>
            <span className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />
            Federal (income): <span className="font-medium">{fmtCurrency(federalTax)}</span>
          </p>
          {optRow.conversionTax > 0 && (
            <p>
              <span className="inline-block w-2 h-2 rounded-sm bg-violet-500 mr-1" />
              Extra from conversion: <span className="font-medium text-violet-600">+{fmtCurrency(optRow.conversionTax)}</span>
            </p>
          )}
          {optRow.stateTax > 0 && (
            <p className="text-sky-600">
              State ({stateInfo?.code ?? ''}): <span className="font-medium">{fmtCurrency(optRow.stateTax)}</span>
            </p>
          )}
          <p className="font-semibold">Total est. taxes: {fmtCurrency(totalFederal + optRow.stateTax)}</p>
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
        <h2 className="text-2xl font-bold">Retirement Optimizer</h2>
        <div className="flex items-center gap-2 text-sm">
          {saveError
            ? <span className="text-destructive">{saveError}</span>
            : saveMsg
              ? <span className={saveMsg === 'Saving…' ? 'text-muted-foreground' : 'text-green-600 font-medium'}>{saveMsg}</span>
              : null
          }
        </div>
      </div>

      {/* State tax notice */}
      {stateInfo ? (
        <div className="rounded-lg border px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
          <span>State tax estimate:</span>
          <span className="font-medium text-foreground">{stateInfo.name}</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{stateInfo.code}</span>
          <span>{stateInfo.rate === 0 ? 'no state income tax' : `~${(stateInfo.rate * 100).toFixed(1)}% effective rate on retirement income`}</span>
          <a href="/account" className="ml-auto text-xs text-primary underline hover:no-underline shrink-0">Update zip →</a>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-400">
          Add your zip code in <a href="/account" className="underline font-medium">Account</a> to include state income tax estimates.
        </div>
      )}

      {/* No-DOB warning */}
      {birthYear === null && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
          Add your date of birth in your profile to see age-based calculations (RMD, IRMAA).
        </div>
      )}

      {/* ── A / B / C Section Groups ── */}
      <Accordion type="single" defaultValue={inputsNeedAttention ? 'inputs' : projectionNeedsReview ? 'projection' : 'results'} collapsible className="space-y-3">

        {/* ── A: Inputs ── */}
        <AccordionItem value="inputs" className="rounded-lg border overflow-hidden">
          <AccordionTrigger className="text-sm font-bold px-4 py-3 bg-muted/60 hover:bg-muted/80 hover:no-underline rounded-none items-center data-[state=open]:border-b">
            <span className="flex items-center">Inputs{inputsNeedAttention && <NeedsInputBadge />}</span>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="p-4">
              <Accordion type="single" defaultValue={assetsNeedInput ? 'assets' : ssNeedsInput ? 'ss' : expensesNeedInput ? 'expenses' : 'assets'} collapsible className="space-y-2">

                {/* ── 1: Assets ── */}
                <AccordionItem value="assets" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    <span className="flex items-center">Assets{assetsNeedInput && <NeedsInputBadge />}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-5">

                    {/* Connected Brokerages */}
                    <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-2 text-sm">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Connected Brokerages — auto-synced from{' '}
                        <a href="/portfolio" className="text-primary underline hover:no-underline">Portfolio</a>
                      </p>
                      {brokerageIraAccounts.length === 0 && brokerageRothAccounts.length === 0 && brokerageTaxableAccounts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No brokerage accounts connected yet.{' '}
                          <a href="/portfolio" className="text-primary underline hover:no-underline">Connect on Portfolio page →</a>
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {brokerageIraAccounts.length > 0 && (
                            <div>
                              <p className="font-medium">IRA / Tax-Deferred: <span className="tabular-nums">{fmtK(brokerageIraTotal)}</span></p>
                              {brokerageIraAccounts.map((a, i) => (
                                <p key={i} className="text-xs text-muted-foreground pl-3">· {a.name}: {a.balance != null ? fmtK(a.balance) : 'Syncing…'}</p>
                              ))}
                            </div>
                          )}
                          {brokerageRothAccounts.length > 0 && (
                            <div>
                              <p className="font-medium">Roth IRA: <span className="tabular-nums">{fmtK(brokerageRothTotal)}</span></p>
                              {brokerageRothAccounts.map((a, i) => (
                                <p key={i} className="text-xs text-muted-foreground pl-3">· {a.name}: {a.balance != null ? fmtK(a.balance) : 'Syncing…'}</p>
                              ))}
                            </div>
                          )}
                          {brokerageTaxableAccounts.length > 0 && (
                            <div>
                              <p className="font-medium">Taxable: <span className="tabular-nums">{fmtK(brokerageTaxableTotal)}</span></p>
                              {brokerageTaxableAccounts.map((a, i) => (
                                <p key={i} className="text-xs text-muted-foreground pl-3">· {a.name}: {a.balance != null ? fmtK(a.balance) : 'Syncing…'}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Additional manual accounts */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Additional Accounts (not connected)</p>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                          <NumberInput id="iraBalance" label="IRA / 401k Balance" value={form.iraBalance} onChange={set('iraBalance')} step="1000" highlight={assetsNeedInput} />
                          {brokerageIraTotal > 0 && numVal(form.iraBalance) > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">Total in model: {fmtK(brokerageIraTotal + numVal(form.iraBalance))}</p>
                          )}
                        </div>
                        <div>
                          <NumberInput id="rothBalance" label="Roth IRA Balance" value={form.rothBalance} onChange={set('rothBalance')} step="1000" highlight={assetsNeedInput} />
                          {brokerageRothTotal > 0 && numVal(form.rothBalance) > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">Total in model: {fmtK(brokerageRothTotal + numVal(form.rothBalance))}</p>
                          )}
                        </div>
                        <div>
                          <NumberInput id="taxableBalance" label="Taxable Savings and Brokerage Balance" value={form.taxableBalance} onChange={set('taxableBalance')} step="1000" highlight={assetsNeedInput} />
                          {brokerageTaxableTotal > 0 && numVal(form.taxableBalance) > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">Total: {fmtK(brokerageTaxableTotal + numVal(form.taxableBalance))}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Other & Real Estate */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Other Assets (informational — not used in projection)</p>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                          <NumberInput id="otherAssets" label="Other Savings / Investments" value={form.otherAssets} onChange={set('otherAssets')} step="1000" />
                          <p className="text-xs text-muted-foreground mt-1">CDs, annuities, savings accounts, etc.</p>
                        </div>
                        <div>
                          <NumberInput id="realEstateValue" label="Real Estate Value" value={form.realEstateValue} onChange={set('realEstateValue')} step="1000" />
                          <p className="text-xs text-muted-foreground mt-1">Estimated market value of real estate holdings.</p>
                        </div>
                      </div>
                    </div>

                  </AccordionContent>
                </AccordionItem>

                {/* ── 2: Income ── */}
                <AccordionItem value="income" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    Income
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-5">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Taxable Income Sources</p>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <NumberInput id="w2Income" label="W2 / Salary" value={form.w2Income} onChange={set('w2Income')} />
                        <NumberInput id="otherIncome" label="Other Income (pension, rental, IRA withdrawals…)" value={form.otherIncome} onChange={set('otherIncome')} />
                        <NumberInput id="interestIncome" label="Interest Income" value={form.interestIncome} onChange={set('interestIncome')} />
                        <NumberInput id="dividendIncome" label="Qualified Dividends" value={form.dividendIncome} onChange={set('dividendIncome')} />
                        <NumberInput id="capGainsDist" label="Cap Gains Distributions" value={form.capGainsDist} onChange={set('capGainsDist')} />
                        <NumberInput id="stcg" label="Short-Term Cap Gains" value={form.stcg} onChange={set('stcg')} />
                        <NumberInput id="ltcg" label="Long-Term Cap Gains" value={form.ltcg} onChange={set('ltcg')} />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ── 3: Social Security ── */}
                <AccordionItem value="ss" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    <span className="flex items-center">Social Security{ssNeedsInput && <NeedsInputBadge />}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-5">
                    <div>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <NumberInput id="ssStartYear" label="Your SS Start Year" value={form.ssStartYear} onChange={set('ssStartYear')} step="1" prefix="" min="2020" />
                        <NumberInput id="ssPaymentsPerYear" label="Your SS Amount / Year" value={form.ssPaymentsPerYear} onChange={set('ssPaymentsPerYear')} highlight={ssNeedsInput} />
                        {isJoint && (
                          <>
                            <NumberInput id="spouseSsStartYear" label="Spouse SS Start Year" value={form.spouseSsStartYear} onChange={set('spouseSsStartYear')} step="1" prefix="" min="2020" />
                            <NumberInput id="spouseSsPaymentsPerYear" label="Spouse SS Amount / Year" value={form.spouseSsPaymentsPerYear} onChange={set('spouseSsPaymentsPerYear')} />
                            {!spouseBirthYear && (
                              <div className="sm:col-span-2 md:col-span-3">
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
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* ── 4: Expenses ── */}
                <AccordionItem value="expenses" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    <span className="flex items-center">Expenses{expensesNeedInput && <NeedsInputBadge />}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-5">

                    {/* Medicare / IRMAA */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Medicare &amp; IRMAA</p>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
                        <div className="space-y-1">
                          <NumberInput
                            id="medicareStartYear"
                            label="Medicare Part B Start Year"
                            value={form.medicareStartYear === '0' ? '' : form.medicareStartYear}
                            onChange={(v) => setForm((f) => ({ ...f, medicareStartYear: v || '0' }))}
                            step="1"
                            prefix=""
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            IRMAA charges begin this year. Leave blank to auto-set to the later of retirement year or age 65 (typical for those on employer insurance until retirement).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Living Expenses */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Living Expenses</p>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                          <NumberInput id="annualLivingExpenses" label="Annual Living Expenses" value={form.annualLivingExpenses} onChange={set('annualLivingExpenses')} step="1000" highlight={expensesNeedInput} />
                          <p className="text-xs text-muted-foreground mt-1">Used for future taxable-account drawdown modeling.</p>
                        </div>
                      </div>
                    </div>

                  </AccordionContent>
                </AccordionItem>

                {/* ── 5: Pre-Retirement Contributions ── */}
                <AccordionItem value="contributions" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    Pre-Retirement Contributions
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-5">
                    <p className="text-xs text-muted-foreground">
                      Annual contributions applied each year through your retirement year, then stopped. Tax-deferred contributions reduce your taxable W2 income. Employer match is added pre-tax to your IRA/401k balance.
                    </p>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Your Contributions</p>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <div>
                          <NumberInput id="annualDeferredContrib" label="Tax-Deferred / Year (401k + IRA)" value={form.annualDeferredContrib} onChange={set('annualDeferredContrib')} step="500" />
                          <p className="text-xs text-muted-foreground mt-1">2026 limit: $23,500 ($31,000 if 50+) for 401k</p>
                        </div>
                        <div>
                          <NumberInput id="annualRothContrib" label="Roth / Year (Roth 401k + Roth IRA)" value={form.annualRothContrib} onChange={set('annualRothContrib')} step="500" />
                          <p className="text-xs text-muted-foreground mt-1">2026 IRA limit: $7,000 ($8,000 if 50+)</p>
                        </div>
                        <div>
                          <NumberInput id="employerMatchPct" label="Employer Match (% of W2)" value={form.employerMatchPct} onChange={set('employerMatchPct')} step="0.5" prefix="" suffix="%" />
                          <p className="text-xs text-muted-foreground mt-1">e.g. 4 if company matches 100% up to 4% of salary</p>
                        </div>
                      </div>
                    </div>

                    {isJoint && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Spouse Contributions</p>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                          <div>
                            <NumberInput id="spouseAnnualDeferredContrib" label="Spouse Tax-Deferred / Year" value={form.spouseAnnualDeferredContrib} onChange={set('spouseAnnualDeferredContrib')} step="500" />
                            <p className="text-xs text-muted-foreground mt-1">2026 limit: $23,500 ($31,000 if 50+) for 401k</p>
                          </div>
                          <div>
                            <NumberInput id="spouseAnnualRothContrib" label="Spouse Roth / Year" value={form.spouseAnnualRothContrib} onChange={set('spouseAnnualRothContrib')} step="500" />
                          </div>
                          <div>
                            <NumberInput id="spouseEmployerMatchPct" label="Spouse Employer Match (% of W2)" value={form.spouseEmployerMatchPct} onChange={set('spouseEmployerMatchPct')} step="0.5" prefix="" suffix="%" />
                          </div>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── B: Projection Settings ── */}
        <AccordionItem value="projection" className="rounded-lg border overflow-hidden">
          <AccordionTrigger className="text-sm font-bold px-4 py-3 bg-muted/60 hover:bg-muted/80 hover:no-underline rounded-none items-center data-[state=open]:border-b">
            <span className="flex items-center">Projection Settings{projectionNeedsReview && <ReviewBadge />}</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pt-4 pb-5">
            <div className="flex items-center justify-end mb-3">
              <p className="text-xs text-muted-foreground">
                Filing status: <strong className="text-foreground">{isJoint ? 'Married Filing Jointly' : 'Single'}</strong>
                {' '}— <a href="/account" className="text-primary underline hover:no-underline">change in Account</a>
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <NumberInput id="retirementYear" label="Retirement Year" value={form.retirementYear} onChange={set('retirementYear')} step="1" prefix="" min="2020" />
                <p className="text-xs text-muted-foreground mt-1">W2 / salary income stops after this year. No effect if W2 is $0.</p>
              </div>
              <NumberInput id="portfolioGrowthPct" label="Portfolio Growth %" value={form.portfolioGrowthPct} onChange={set('portfolioGrowthPct')} step="0.1" prefix="" suffix="%" />
              <NumberInput id="inflationPct" label="Inflation / SS COLA %" value={form.inflationPct} onChange={set('inflationPct')} step="0.1" prefix="" suffix="%" />
              <NumberInput id="qcds" label="QCDs (% of RMD, age 73+)" value={form.qcds} onChange={set('qcds')} step="1" prefix="" suffix="%" min="0" />
              <div className="space-y-1">
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
                <p className="text-xs text-muted-foreground mt-1">Higher tiers convert more now, reducing future RMDs.</p>
              </div>
              <div className="space-y-1">
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
                <p className="text-xs text-muted-foreground mt-1">Limit conversions to the low-income window before SS or RMDs.</p>
              </div>

              {/* Plan-to-age overrides */}
              {birthYear && (() => {
                const currentAge = startYear - birthYear
                const ssaAge = ssaExpectedAge(birthYear, startYear, sex)
                const minAge = currentAge + 5
                return (
                  <div className="space-y-1">
                    <Label htmlFor="planToAge" className="text-xs text-muted-foreground">Plan to Age — You</Label>
                    <Select
                      value={form.planToAge || 'ssa'}
                      onValueChange={(v) => set('planToAge')(v === 'ssa' ? '' : v)}
                    >
                      <SelectTrigger id="planToAge" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ssa">SSA default (~{ssaAge})</SelectItem>
                        {Array.from({ length: 110 - minAge + 1 }, (_, i) => minAge + i).map(age => (
                          <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Override SSA life expectancy for planning purposes.</p>
                  </div>
                )
              })()}

              {isJoint && effectiveSpouseBirthYear && (() => {
                const spouseCurrentAge = startYear - effectiveSpouseBirthYear
                const ssaSpouseAge = ssaExpectedAge(effectiveSpouseBirthYear, startYear, spouseSex)
                const minAge = spouseCurrentAge + 5
                return (
                  <div className="space-y-1">
                    <Label htmlFor="spousePlanToAge" className="text-xs text-muted-foreground">Plan to Age — Spouse</Label>
                    <Select
                      value={form.spousePlanToAge || 'ssa'}
                      onValueChange={(v) => set('spousePlanToAge')(v === 'ssa' ? '' : v)}
                    >
                      <SelectTrigger id="spousePlanToAge" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ssa">SSA default (~{ssaSpouseAge})</SelectItem>
                        {Array.from({ length: 110 - minAge + 1 }, (_, i) => minAge + i).map(age => (
                          <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Override SSA life expectancy for planning purposes.</p>
                  </div>
                )
              })()}

            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── C: Results ── */}
        <AccordionItem value="results" className="rounded-lg border overflow-hidden">
          <AccordionTrigger className="text-sm font-bold px-4 py-3 bg-muted/60 hover:bg-muted/80 hover:no-underline rounded-none items-center data-[state=open]:border-b">
            Results
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <div className="p-4">
              <Accordion type="single" defaultValue="living" collapsible className="space-y-2">

                {/* ── Funding ── */}
                <AccordionItem value="living" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    Funding
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-4">

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">Portfolio Balance Trajectory</CardTitle>
              {fundingProjection.depletionYear !== null && (
                <span className="text-xs font-semibold text-destructive">
                  ⚠ All sources depleted in {fundingProjection.depletionYear}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 mb-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">Starting Taxable</p>
                <p className="text-lg font-bold tabular-nums text-sky-500">{fmtK(fundingProjection.startTaxable)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">Starting IRA / 401k</p>
                <p className="text-lg font-bold tabular-nums text-indigo-500">{fmtK(fundingProjection.startIra)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">Starting Roth</p>
                <p className="text-lg font-bold tabular-nums text-emerald-500">{fmtK(fundingProjection.startRoth)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">Ending Taxable</p>
                <p className={`text-lg font-bold tabular-nums ${fundingProjection.endTaxable > 0 ? 'text-sky-500' : 'text-muted-foreground'}`}>{fmtK(fundingProjection.endTaxable)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">Ending IRA / 401k</p>
                <p className={`text-lg font-bold tabular-nums ${fundingProjection.endIra > 0 ? 'text-indigo-500' : 'text-muted-foreground'}`}>{fmtK(fundingProjection.endIra)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium">Ending Roth</p>
                <p className={`text-lg font-bold tabular-nums ${fundingProjection.endRoth > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>{fmtK(fundingProjection.endRoth)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-3">
              <strong>Funding priority:</strong> (1)&nbsp;<span className="text-sky-500 font-medium">Taxable</span> accounts first — COLA-adjusted expenses are drawn here, with Social Security payments and after-tax RMDs from the IRA depositing into this account each year.&ensp;(2)&nbsp;<span className="text-indigo-500 font-medium">IRA&nbsp;/ 401k</span> is depleted by required minimum distributions (age&nbsp;73+) and Roth conversions; excess RMD cash supplements taxable.&ensp;(3)&nbsp;<span className="text-emerald-500 font-medium">Roth&nbsp;IRA</span> last — preserving tax-free growth for heirs. Charitable giving (QCDs), real estate proceeds, or other asset sales can offset withdrawals at any stage.
            </p>
          </CardContent>
        </Card>

        {(fundingProjection.startTaxable > 0 || fundingProjection.startIra > 0 || fundingProjection.startRoth > 0 || numVal(form.annualLivingExpenses) > 0) ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Account Balances by Year</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={fundingProjection.data} margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = fundingProjection.data.find((r) => r.year === label)
                      if (!d) return null
                      const total = d.taxable + d.ira + d.roth
                      return (
                        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md space-y-1 min-w-[190px]">
                          <p className="font-semibold text-sm">Year {d.year}{d.age > 0 ? ` · Age ${d.age}` : ''}</p>
                          <p className="text-sky-500">Taxable: <span className="font-medium text-foreground">{fmtCurrency(d.taxable)}</span></p>
                          <p className="text-indigo-400">IRA / 401k: <span className="font-medium text-foreground">{fmtCurrency(d.ira)}</span></p>
                          <p className="text-emerald-500">Roth IRA: <span className="font-medium text-foreground">{fmtCurrency(d.roth)}</span></p>
                          <p className="text-muted-foreground border-t pt-1">Portfolio total: <span className="font-medium text-foreground">{fmtCurrency(total)}</span></p>
                          {(d.ss > 0 || d.rmd > 0) && (
                            <div className="border-t pt-1 space-y-0.5">
                              {d.ss > 0 && <p className="text-sky-400">SS received: <span className="font-medium text-foreground">{fmtCurrency(d.ss)}</span></p>}
                              {d.rmd > 0 && <p className="text-indigo-400">RMD: <span className="font-medium text-foreground">{fmtCurrency(d.rmd)}</span>{d.qcds > 0 && <span className="text-muted-foreground ml-1"> · QCD {fmtCurrency(d.qcds)}</span>}</p>}
                            </div>
                          )}
                          {d.rothConversion > 0 && (
                            <p className="text-emerald-400">↳ Roth converted: <span className="font-medium text-foreground">{fmtCurrency(d.rothConversion)}</span></p>
                          )}
                          {(d.expenses > 0 || d.taxes > 0 || d.irmaa > 0) && (
                            <div className="border-t pt-1 space-y-0.5">
                              {d.expenses > 0 && <p className="text-orange-400">Living expenses: <span className="font-medium text-foreground">{fmtCurrency(d.expenses)}</span></p>}
                              {d.taxes > 0 && <p className="text-rose-400">Taxes: <span className="font-medium text-foreground">{fmtCurrency(d.taxes)}</span></p>}
                              {d.irmaa > 0 && <p className="text-rose-300">IRMAA: <span className="font-medium text-foreground">{fmtCurrency(d.irmaa)}</span></p>}
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const order = ['Taxable', 'IRA / 401k', 'Roth IRA', 'Living Expenses', 'Taxes', 'IRMAA']
                      const sorted = [...payload].sort((a, b) => {
                        const ai = order.indexOf(a.value as string)
                        const bi = order.indexOf(b.value as string)
                        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
                      })
                      return (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
                          {sorted.map((entry, i) => (
                            <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="inline-block w-3 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color as string }} />
                              {entry.value}
                            </span>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Bar stackId="s" dataKey="taxable" fill="#0ea5e9" name="Taxable" />
                  <Bar stackId="s" dataKey="ira" fill="#818cf8" name="IRA / 401k" />
                  <Bar stackId="s" dataKey="roth" fill="#22c55e" name="Roth IRA" />
                  <Bar stackId="costs" dataKey="expenses" fill="#f97316" name="Living Expenses" />
                  <Bar stackId="costs" dataKey="taxes" fill="#f43f5e" name="Taxes" />
                  <Bar stackId="costs" dataKey="irmaa" fill="#fb7185" name="IRMAA" />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3">
                Left stack — portfolio balances by account type: <span className="text-sky-500 font-medium">Taxable</span> depletes first, <span className="text-indigo-400 font-medium">IRA&nbsp;/&nbsp;401k</span> falls via RMDs and conversions, <span className="text-emerald-500 font-medium">Roth</span> grows during the conversion window then draws last. Right stack — annual outflows: <span className="text-orange-400 font-medium">living expenses</span> (COLA-adjusted) + <span className="text-rose-400 font-medium">taxes</span> + <span className="text-rose-300 font-medium">IRMAA</span>. When a balance layer disappears, that source is exhausted.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-dashed px-6 py-5 text-sm text-muted-foreground text-center">
            Enter account balances or annual living expenses to see the funding projection.
          </div>
        )}
                  </AccordionContent>
                </AccordionItem>

                {/* ── Tax & IRMAA Cost ── */}
                <AccordionItem value="tax" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    Tax &amp; IRMAA Cost over Lifetime
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-4">

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
            <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
              Even if the lifetime tax cost is higher with conversions, shifting savings from a traditional IRA to a Roth is still beneficial for heirs — inherited Roth accounts are tax-free, while inherited IRAs require taxable withdrawals within 10 years under SECURE 2.0.
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
              <Bar yAxisId="left" stackId="cost" dataKey="taxOnIncome" fill="#3b82f6" name="Tax on Income" />
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
                  label={(props: { viewBox?: { x?: number; y?: number; height?: number } }) => {
                    const x = (props.viewBox?.x ?? 0) - 6
                    const y = (props.viewBox?.y ?? 0) + 5
                    return (
                      <g>
                        <rect x={x - 46} y={y} width={50} height={14} rx={3} fill="#f43f5e" />
                        <text x={x - 21} y={y + 10} fill="white" fontSize={9} textAnchor="middle" fontWeight="600">1st death</text>
                      </g>
                    )
                  }}
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

          {/* Detail table */}
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
                      <th className="px-3 py-2 text-right font-semibold">Fed. Tax</th>
                      <th className="px-3 py-2 text-right font-semibold">Conv Tax</th>
                      {(stateInfo?.rate ?? 0) > 0 && <th className="px-3 py-2 text-right font-semibold">{stateInfo!.code} Tax</th>}
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
                              <td colSpan={(stateInfo?.rate ?? 0) > 0 ? 13 : 12} className="px-3 py-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
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
                            <td className="px-3 py-1.5 tabular-nums text-right">{fmtK(r.federalTax + r.ltcgTax - r.conversionTax)}</td>
                            <td className="px-3 py-1.5 tabular-nums text-right">
                              {r.conversionTax > 0 ? <span className="text-violet-600">{fmtK(r.conversionTax)}</span> : '—'}
                            </td>
                            {(stateInfo?.rate ?? 0) > 0 && (
                              <td className="px-3 py-1.5 tabular-nums text-right">
                                {r.stateTax > 0 ? <span className="text-sky-600">{fmtK(r.stateTax)}</span> : '—'}
                              </td>
                            )}
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

                  </AccordionContent>
                </AccordionItem>

                {/* ── Wealth & Legacy ── */}
                <AccordionItem value="legacy" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    Wealth &amp; Legacy
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-4">

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Estate &amp; Legacy Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Final Taxable Acct</p>
                <p className="text-xl font-bold tabular-nums">{fmtK(fundingProjection.endTaxable)}</p>
                <p className="text-xs text-muted-foreground">taxable · to heirs</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-t pt-3">
              Inherited IRA: heirs must withdraw within 10 years (SECURE 2.0), paying income tax on each withdrawal. Inherited Roth: tax-free. Inherited taxable accounts receive a step-up in cost basis. Heir Annual IRA RMD = final IRA balance ÷ 10 (equal-spread estimate).
            </p>
          </CardContent>
        </Card>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

    </div>
  )
}
