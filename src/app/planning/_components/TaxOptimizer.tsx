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
import { projectTaxes, computeProjectionYears, ssaExpectedAge, type ScenarioRow, type IrmaaTargetTier, type Sex, type TaxInputs } from '@/lib/tax-engine'
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
  isPaid: boolean
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
  ssMonthlyFraBenefit: string   // FRA monthly benefit from SSA statement (today's $); 0 = use ssPaymentsPerYear
  inflationPct: string
  medicareEnrollees: '1' | '2'
  medicareStartYear: string   // 0 = auto (max of retirementYear and birthYear+65)
  spouseSsStartYear: string
  spouseSsPaymentsPerYear: string
  spouseSsMonthlyFraBenefit: string
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
    ssMonthlyFraBenefit: nz(scenario?.ssMonthlyFraBenefit),
    inflationPct: String(scenario?.inflationPct ?? 2.5),
    medicareEnrollees: (scenario?.medicareEnrollees != null ? String(scenario.medicareEnrollees) : (isJoint ? '2' : '1')) as '1' | '2',
    medicareStartYear: scenario?.medicareStartYear ? String(scenario.medicareStartYear) : '0',
    spouseSsStartYear: nz(scenario?.spouseSsStartYear),
    spouseSsPaymentsPerYear: nz(scenario?.spouseSsPaymentsPerYear),
    spouseSsMonthlyFraBenefit: nz(scenario?.spouseSsMonthlyFraBenefit),
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


// ─── Social Security FRA helpers ─────────────────────────────────────────────

/** Full Retirement Age in whole months from birth. */
function getFraMonths(birthYear: number): number {
  if (birthYear <= 1954) return 66 * 12
  if (birthYear >= 1960) return 67 * 12
  return 66 * 12 + (birthYear - 1954) * 2   // +2 months per year from 1955–1959
}

/** Display string for FRA, e.g. "67" or "66 + 2 mo". */
function fraDisplay(birthYear: number): string {
  const m = getFraMonths(birthYear)
  const yrs = Math.floor(m / 12), mo = m % 12
  return mo === 0 ? `${yrs}` : `${yrs} + ${mo} mo`
}

/**
 * Percentage adjustment applied to the FRA benefit when claiming at startYear.
 * Negative = early reduction, positive = delayed credit.
 * Assumes birth month = January (only birth year is known).
 */
function ssAdjustmentPct(birthYear: number, startYear: number): number {
  const fraMonths = getFraMonths(birthYear)
  const claimMonths = (startYear - birthYear) * 12
  const diff = claimMonths - fraMonths          // positive = delayed, negative = early
  if (diff >= 0) {
    // Delayed retirement credits: +2/3 % per month, max to age 70
    const maxDelay = 70 * 12 - fraMonths
    return Math.min(diff, maxDelay) * (2 / 3)
  }
  const early = -diff
  if (early <= 36) return -(early * 5 / 9)
  return -(36 * 5 / 9 + (early - 36) * 5 / 12)
}

export default function TaxOptimizer({ initialScenario, birthYear, defaultFilingStatus, defaultSsStartYear, sex, spouseBirthYear, spouseSex, brokerageIraAccounts, brokerageRothAccounts, brokerageTaxableAccounts, stateInfo, isPaid }: Props) {
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
  const [comparisonWindow, setComparisonWindow] = useState<'always' | 'before-ss' | 'before-rmd'>((initialScenario?.conversionWindow ?? 'always') as 'always' | 'before-ss' | 'before-rmd')

  function set(field: keyof FormState) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }))
  }

  const startYear = new Date().getFullYear()

  // Highlight indicators — show badges on triggers when key fields are missing
  const assetsNeedInput = brokerageIraTotal === 0 && brokerageRothTotal === 0 && brokerageTaxableTotal === 0
    && numVal(form.iraBalance) === 0 && numVal(form.rothBalance) === 0 && numVal(form.taxableBalance) === 0
  const expensesNeedInput = numVal(form.annualLivingExpenses) === 0
  const projectionNeedsReview = initialScenario?.retirementYear == null

  // Computed outside memo so UI can reference it for the plan-age dropdowns
  const effectiveSpouseBirthYear = spouseBirthYear ?? (numVal(form.spouseBirthYearOverride) > 0 ? numVal(form.spouseBirthYearOverride) : null)

  // IRS 2026 contribution limits (age-aware)
  const primaryAge = birthYear ? startYear - birthYear : 0
  const spouseAge  = effectiveSpouseBirthYear ? startYear - effectiveSpouseBirthYear : 0
  const contribLimit = (age: number) => age >= 50 ? 39_000 : 30_500  // 401k + IRA combined max
  const primaryContribLimit = contribLimit(primaryAge)
  const spouseContribLimit  = contribLimit(spouseAge)
  const primaryContribTotal = numVal(form.annualDeferredContrib) + numVal(form.annualRothContrib)
  const spouseContribTotal  = numVal(form.spouseAnnualDeferredContrib) + numVal(form.spouseAnnualRothContrib)
  const primaryContribOver  = primaryContribTotal > primaryContribLimit
  const spouseContribOver   = spouseContribTotal  > spouseContribLimit

  // SS FRA-based benefit computation
  // The SSA statement shows benefits in today's dollars.
  // - Before FRA: statement shows the FRA amount → we apply claiming-age adjustment + COLA.
  // - Past FRA:   statement shows year-by-year amounts (already age-adjusted) → COLA only.
  const ssStartYr = numVal(form.ssStartYear)
  const primaryFraBenefit = numVal(form.ssMonthlyFraBenefit)
  // Is the primary person currently past their FRA?
  const primaryPastFraNow = birthYear !== null && (startYear - birthYear) * 12 >= getFraMonths(birthYear)
  const primarySsAdjPct = (!primaryPastFraNow && birthYear && ssStartYr > 0)
    ? ssAdjustmentPct(birthYear, ssStartYr) : null
  const primarySsColaYrs = ssStartYr > startYear ? ssStartYr - startYear : 0
  const primarySsColaFactor = Math.pow(1 + numVal(form.inflationPct) / 100, primarySsColaYrs)
  const computedPrimarySsAnnual = (() => {
    if (primaryFraBenefit <= 0) return null
    if (primaryPastFraNow) {
      // Statement already shows the age-adjusted amount for each year; COLA only.
      // Require a start year so the user knows which row of their statement to use.
      if (ssStartYr <= 0) return null
      return Math.round(primaryFraBenefit * 12 * primarySsColaFactor)
    }
    if (primarySsAdjPct === null) return null
    return Math.round(primaryFraBenefit * 12 * (1 + primarySsAdjPct / 100) * primarySsColaFactor)
  })()

  const spouseSsStartYr = numVal(form.spouseSsStartYear)
  const spouseFraBenefit = numVal(form.spouseSsMonthlyFraBenefit)
  const spousePastFraNow = effectiveSpouseBirthYear !== null &&
    (startYear - effectiveSpouseBirthYear) * 12 >= getFraMonths(effectiveSpouseBirthYear)
  const spouseSsAdjPct = (!spousePastFraNow && effectiveSpouseBirthYear && spouseSsStartYr > 0)
    ? ssAdjustmentPct(effectiveSpouseBirthYear, spouseSsStartYr) : null
  const spouseSsColaYrs = spouseSsStartYr > startYear ? spouseSsStartYr - startYear : 0
  const spouseSsColaFactor = Math.pow(1 + numVal(form.inflationPct) / 100, spouseSsColaYrs)
  const computedSpouseSsAnnual = (() => {
    if (spouseFraBenefit <= 0) return null
    if (spousePastFraNow) {
      if (spouseSsStartYr <= 0) return null
      return Math.round(spouseFraBenefit * 12 * spouseSsColaFactor)
    }
    if (spouseSsAdjPct === null) return null
    return Math.round(spouseFraBenefit * 12 * (1 + spouseSsAdjPct / 100) * spouseSsColaFactor)
  })()

  // ssNeedsInput: flag when neither FRA nor manual amount is entered
  const ssNeedsInput = computedPrimarySsAnnual === null && numVal(form.ssPaymentsPerYear) === 0
  const inputsNeedAttention = assetsNeedInput || ssNeedsInput || expensesNeedInput

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
      ssPaymentsPerYear: computedPrimarySsAnnual ?? numVal(form.ssPaymentsPerYear),
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
      spouseSsPaymentsPerYear: computedSpouseSsAnnual ?? numVal(form.spouseSsPaymentsPerYear),
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

  // Scenario comparison — all 4 aggressiveness tiers with their own comparisonWindow
  const scenarioComparison = useMemo(() => {
    const ssStart = numVal(form.ssStartYear)
    const rmdStart = (birthYear ?? 0) > 0 ? (birthYear! + 73) : 9999
    const convStop =
      comparisonWindow === 'before-ss'  ? (ssStart || 9999) :
      comparisonWindow === 'before-rmd' ? rmdStart :
      9999
    const projYears = computeProjectionYears(
      birthYear ?? 0, effectiveSpouseBirthYear, startYear, sex, spouseSex,
      numVal(form.planToAge), numVal(form.spousePlanToAge),
    )
    const base: TaxInputs = {
      w2Income: numVal(form.w2Income), interestIncome: numVal(form.interestIncome),
      dividendIncome: numVal(form.dividendIncome), capGainsDist: numVal(form.capGainsDist),
      stcg: numVal(form.stcg), ltcg: numVal(form.ltcg), otherIncome: numVal(form.otherIncome),
      iraBalance: brokerageIraTotal + numVal(form.iraBalance), iraWithdrawals: 0,
      qcdPct: numVal(form.qcds), rothBalance: brokerageRothTotal + numVal(form.rothBalance),
      portfolioGrowthPct: numVal(form.portfolioGrowthPct), retirementYear: numVal(form.retirementYear),
      ssStartYear: ssStart,
      ssPaymentsPerYear: computedPrimarySsAnnual ?? numVal(form.ssPaymentsPerYear),
      inflationPct: numVal(form.inflationPct),
      medicareEnrollees: form.medicareEnrollees === '2' ? 2 : 1,
      medicareStartYear: numVal(form.medicareStartYear), filing: taxFiling,
      birthYear: birthYear ?? 0, startYear, projectionYears: projYears,
      irmaaTargetTier: 0, conversionStopYear: convStop, sex,
      spouseBirthYear: effectiveSpouseBirthYear ?? 0,
      spouseSsStartYear: numVal(form.spouseSsStartYear),
      spouseSsPaymentsPerYear: computedSpouseSsAnnual ?? numVal(form.spouseSsPaymentsPerYear),
      spouseSex, stateTaxRate: stateInfo?.rate ?? 0,
      planToAge: numVal(form.planToAge), spousePlanToAge: numVal(form.spousePlanToAge),
      annualDeferredContrib: numVal(form.annualDeferredContrib),
      annualRothContrib: numVal(form.annualRothContrib),
      annualEmployerMatch: numVal(form.w2Income) * numVal(form.employerMatchPct) / 100,
      spouseAnnualDeferredContrib: numVal(form.spouseAnnualDeferredContrib),
      spouseAnnualRothContrib: numVal(form.spouseAnnualRothContrib),
      spouseAnnualEmployerMatch: numVal(form.w2Income) * numVal(form.spouseEmployerMatchPct) / 100,
    }
    const r0 = projectTaxes({ ...base, irmaaTargetTier: 0 })
    const r1 = projectTaxes({ ...base, irmaaTargetTier: 1 })
    const r2 = projectTaxes({ ...base, irmaaTargetTier: 2 })
    function calcBreakeven(r: typeof r0): number | null {
      let running = 0
      for (let i = 0; i < r.optimizedRows.length; i++) {
        running += (r.baselineRows[i]?.totalCost ?? 0) - r.optimizedRows[i].totalCost
        if (running >= 0) return r.optimizedRows[i].year
      }
      return null
    }
    // Run a full cash-flow simulation to get final IRA/Roth after expense drawdowns
    // (mirrors fundingProjection logic so cards agree with the charts)
    const growthRate = numVal(form.portfolioGrowthPct) / 100
    const inflation = numVal(form.inflationPct) / 100
    const baseExpenses = numVal(form.annualLivingExpenses)
    const retYear = numVal(form.retirementYear)
    const annualIraContribs = numVal(form.annualDeferredContrib)
      + numVal(form.w2Income) * numVal(form.employerMatchPct) / 100
      + numVal(form.spouseAnnualDeferredContrib)
      + numVal(form.w2Income) * numVal(form.spouseEmployerMatchPct) / 100
    const annualRothContribs = numVal(form.annualRothContrib) + numVal(form.spouseAnnualRothContrib)
    const totalIraStart = brokerageIraTotal + numVal(form.iraBalance)
    const totalRothStart = brokerageRothTotal + numVal(form.rothBalance)
    const totalTaxableStart = brokerageTaxableTotal + numVal(form.taxableBalance)
    function simulateFinalBalances(rows: typeof r0.optimizedRows): { finalIra: number; finalRoth: number } {
      let ira = totalIraStart, roth = totalRothStart, taxable = totalTaxableStart
      for (const row of rows) {
        const afterTaxRate = Math.max(0, 1 - row.effectiveRatePct / 100)
        const isPreRet = row.year < retYear
        if (isPreRet) { ira += annualIraContribs; roth += annualRothContribs }
        ira = ira * (1 + growthRate)
        roth = roth * (1 + growthRate)
        const rmdOut = Math.min(row.rmd, ira)
        const convOut = Math.min(row.rothConversion, Math.max(0, ira - rmdOut))
        ira = Math.max(0, ira - rmdOut - convOut)
        roth += convOut
        taxable = taxable * (1 + growthRate)
        const yearsElapsed = row.year - startYear
        const expenses = baseExpenses > 0 ? baseExpenses * Math.pow(1 + inflation, yearsElapsed) : 0
        const taxableRmd = !isPreRet && row.rmd > 0 ? rmdOut * (row.iraWithdrawal / row.rmd) : 0
        const afterTaxIncome = isPreRet ? row.w2 * afterTaxRate : taxableRmd * afterTaxRate + row.ss * afterTaxRate
        const netCash = isPreRet ? afterTaxIncome - annualRothContribs - expenses : afterTaxIncome - expenses
        taxable += netCash
        if (taxable < 0 && ira > 0 && afterTaxRate > 0) {
          const iraDraw = Math.min(-taxable / afterTaxRate, ira)
          ira = Math.max(0, ira - iraDraw)
          taxable += iraDraw * afterTaxRate
        }
        if (taxable < 0 && roth > 0) {
          const rothDraw = Math.min(-taxable, roth)
          roth = Math.max(0, roth - rothDraw)
          taxable += rothDraw
        }
        taxable = Math.max(0, taxable)
      }
      return { finalIra: Math.round(ira), finalRoth: Math.round(roth) }
    }
    const sim0base = simulateFinalBalances(r0.baselineRows)
    const sim0 = simulateFinalBalances(r0.optimizedRows)
    const sim1 = simulateFinalBalances(r1.optimizedRows)
    const sim2 = simulateFinalBalances(r2.optimizedRows)
    return [
      { tier: -1 as const, label: 'No Conversion',
        totalCost: r0.summary.baselineTotalCost, totalTax: r0.summary.baselineTotalTax,
        totalIrmaa: r0.summary.baselineTotalIrmaa, netSavings: 0,
        breakevenYear: null as number | null, totalRothConverted: 0,
        finalIra: sim0base.finalIra, finalRoth: sim0base.finalRoth },
      { tier: 0 as const, label: 'Conservative',
        totalCost: r0.summary.optimizedTotalCost, totalTax: r0.summary.optimizedTotalTax,
        totalIrmaa: r0.summary.optimizedTotalIrmaa, netSavings: r0.summary.lifetimeSavings,
        breakevenYear: calcBreakeven(r0), totalRothConverted: r0.summary.totalRothConverted,
        finalIra: sim0.finalIra, finalRoth: sim0.finalRoth },
      { tier: 1 as const, label: 'Moderate',
        totalCost: r1.summary.optimizedTotalCost, totalTax: r1.summary.optimizedTotalTax,
        totalIrmaa: r1.summary.optimizedTotalIrmaa, netSavings: r1.summary.lifetimeSavings,
        breakevenYear: calcBreakeven(r1), totalRothConverted: r1.summary.totalRothConverted,
        finalIra: sim1.finalIra, finalRoth: sim1.finalRoth },
      { tier: 2 as const, label: 'Aggressive',
        totalCost: r2.summary.optimizedTotalCost, totalTax: r2.summary.optimizedTotalTax,
        totalIrmaa: r2.summary.optimizedTotalIrmaa, netSavings: r2.summary.lifetimeSavings,
        breakevenYear: calcBreakeven(r2), totalRothConverted: r2.summary.totalRothConverted,
        finalIra: sim2.finalIra, finalRoth: sim2.finalRoth },
    ]
  }, [form, birthYear, startYear, comparisonWindow, taxFiling, sex, spouseBirthYear, spouseSex,
    brokerageIraTotal, brokerageRothTotal, brokerageTaxableTotal, stateInfo, effectiveSpouseBirthYear,
    computedPrimarySsAnnual, computedSpouseSsAnnual])

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

  // Funding projection: tracks all three account types as running balances year-by-year.
  // IRA and Roth are tracked independently (not from the engine) so that once a balance
  // reaches zero it stays zero — the "drawdown offset" approach caused phantom recovery
  // because the engine's balance kept growing while our offset stayed fixed.
  const fundingProjection = useMemo(() => {
    const totalTaxableStart = brokerageTaxableTotal + numVal(form.taxableBalance)
    const totalRothStart = brokerageRothTotal + numVal(form.rothBalance)
    const totalIraStart = brokerageIraTotal + numVal(form.iraBalance)
    const growthRate = numVal(form.portfolioGrowthPct) / 100
    const inflation = numVal(form.inflationPct) / 100
    const baseExpenses = numVal(form.annualLivingExpenses)
    const retYear = numVal(form.retirementYear)
    // Annual pre-retirement contributions (mirror the engine's inputs)
    const annualIraContribs = numVal(form.annualDeferredContrib)
      + numVal(form.w2Income) * numVal(form.employerMatchPct) / 100
      + numVal(form.spouseAnnualDeferredContrib)
      + numVal(form.w2Income) * numVal(form.spouseEmployerMatchPct) / 100
    const annualRothContribs = numVal(form.annualRothContrib) + numVal(form.spouseAnnualRothContrib)

    // Simulate the projection with tweaked starting taxable, expense multiplier, and retirement delay.
    // Returns true if any year has unfunded expenses (plan fails).
    // Cash-flow model:
    //   Pre-retirement : net = after-tax W2 − Roth contributions − expenses  (W2 funds living costs)
    //   Post-retirement: net = after-tax RMDs + after-tax SS − expenses
    //   net > 0 → surplus into taxable; net < 0 → draw from taxable, then IRA, then Roth
    //   expMultiplier scales only post-retirement expenses (binary search target).
    function simulationFails(extraTaxable: number, expMultiplier: number, retYearDelay = 0): boolean {
      let t = totalTaxableStart + extraTaxable
      let ir = totalIraStart
      let ro = totalRothStart
      for (const row of activeRows) {
        const yearsElapsed = row.year - startYear
        const atr = Math.max(0, 1 - row.effectiveRatePct / 100)
        const isPreRet = row.year < retYear + retYearDelay
        // IRA/Roth: contributions before growth (matching engine order)
        if (isPreRet) { ir += annualIraContribs; ro += annualRothContribs }
        ir = ir * (1 + growthRate)
        ro = ro * (1 + growthRate)
        // Forced IRA outflows: RMDs and Roth conversions
        const rmdOut = Math.min(row.rmd, ir)
        const convOut = Math.min(row.rothConversion, Math.max(0, ir - rmdOut))
        ir = Math.max(0, ir - rmdOut - convOut)
        ro += convOut
        // Taxable grows independently
        t = t * (1 + growthRate)
        // Net cash flow into/out of taxable
        let net: number
        if (isPreRet) {
          const exp = baseExpenses > 0 ? baseExpenses * Math.pow(1 + inflation, yearsElapsed) : 0
          net = row.w2 * atr - annualRothContribs - exp
        } else {
          const exp = baseExpenses > 0 ? baseExpenses * expMultiplier * Math.pow(1 + inflation, yearsElapsed) : 0
          const taxableRmd = row.rmd > 0 ? rmdOut * (row.iraWithdrawal / row.rmd) : 0
          net = taxableRmd * atr + row.ss * atr - exp
        }
        t += net
        if (t < 0 && ir > 0 && atr > 0) { const d = Math.min(-t / atr, ir); ir = Math.max(0, ir - d); t += d * atr }
        if (t < 0 && ro > 0) { const d = Math.min(-t, ro); ro = Math.max(0, ro - d); t += d }
        if (t < 0) return true
        t = Math.max(0, t)
      }
      return false
    }

    let taxable = totalTaxableStart
    let ira = totalIraStart
    let roth = totalRothStart
    let depletionYear: number | null = null
    let firstShortfallYear: number | null = null
    const data: Array<{ year: number; age: number; taxable: number; ira: number; roth: number; expenses: number; taxes: number; irmaa: number; rothConversion: number; ss: number; rmd: number; qcds: number; w2: number; afterTaxIncome: number }> = []
    for (const row of activeRows) {
      const yearsElapsed = row.year - startYear
      const expenses = baseExpenses > 0 ? baseExpenses * Math.pow(1 + inflation, yearsElapsed) : 0
      const afterTaxRate = Math.max(0, 1 - row.effectiveRatePct / 100)
      const isPreRetirement = row.year < retYear
      // IRA/Roth: contributions before growth (matching engine order)
      if (isPreRetirement) {
        ira += annualIraContribs
        roth += annualRothContribs
      }
      ira = ira * (1 + growthRate)
      roth = roth * (1 + growthRate)
      // Forced IRA outflows: RMDs and Roth conversions
      const rmdOut = Math.min(row.rmd, ira)
      const convOut = Math.min(row.rothConversion, Math.max(0, ira - rmdOut))
      ira = Math.max(0, ira - rmdOut - convOut)
      roth += convOut
      // Taxable grows independently
      taxable = taxable * (1 + growthRate)
      // Net cash flow into/out of taxable:
      //   Pre-retirement : after-tax W2 minus Roth contributions minus expenses
      //                    (W2 covers living costs; Roth contributions come from take-home pay)
      //   Post-retirement: after-tax RMDs (net of QCDs) + after-tax SS minus expenses
      const taxableRmd = !isPreRetirement && row.rmd > 0 ? rmdOut * (row.iraWithdrawal / row.rmd) : 0
      const afterTaxIncome = isPreRetirement
        ? row.w2 * afterTaxRate
        : taxableRmd * afterTaxRate + row.ss * afterTaxRate
      const netCash = isPreRetirement
        ? afterTaxIncome - annualRothContribs - expenses
        : afterTaxIncome - expenses
      taxable += netCash
      // Shortfall: draw from IRA first (gross → after-tax), then Roth (tax-free)
      if (taxable < 0 && ira > 0 && afterTaxRate > 0) {
        const iraDraw = Math.min(-taxable / afterTaxRate, ira)
        ira = Math.max(0, ira - iraDraw)
        taxable += iraDraw * afterTaxRate
      }
      if (taxable < 0 && roth > 0) {
        const rothDraw = Math.min(-taxable, roth)
        roth = Math.max(0, roth - rothDraw)
        taxable += rothDraw
      }
      // Any remaining gap = unfunded expenses
      const unfunded = Math.max(0, -taxable)
      if (unfunded > 0 && firstShortfallYear === null) firstShortfallYear = row.year
      taxable = Math.max(0, taxable)
      // Cap displayed expenses to what was actually funded
      const fundedExpenses = Math.max(0, expenses - unfunded)
      if (taxable === 0 && ira === 0 && roth === 0 && depletionYear === null) {
        depletionYear = row.year
      }
      data.push({
        year: row.year, age: row.age,
        taxable: Math.round(taxable), ira: Math.round(ira), roth: Math.round(roth),
        expenses: Math.round(fundedExpenses), taxes: Math.round(row.totalTax), irmaa: Math.round(row.irmaaAnnual),
        rothConversion: Math.round(row.rothConversion),
        ss: Math.round(row.ss), rmd: Math.round(row.rmd), qcds: Math.round(row.qcdsActual ?? 0),
        w2: Math.round(row.w2), afterTaxIncome: Math.round(afterTaxIncome),
      })
    }

    // Binary search: how much additional taxable savings fixes the plan?
    let additionalSavingsNeeded: number | null = null
    // Binary search: how much must annual expenses drop (in today's dollars) to fix the plan?
    let expenseReductionNeeded: number | null = null
    // Linear scan: how many extra years of work fixes the plan (max 20)?
    let retirementDelayYears: number | null = null
    if (firstShortfallYear !== null) {
      // Savings: search 0 → $20M
      const savingsMax = 20_000_000
      if (!simulationFails(savingsMax, 1)) {
        let lo = 0, hi = savingsMax
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2
          if (simulationFails(mid, 1)) lo = mid; else hi = mid
        }
        additionalSavingsNeeded = Math.ceil(hi / 1000) * 1000
      }
      // Expenses: search multiplier 0 → 1; find the highest that still works
      if (!simulationFails(0, 0)) {
        let lo = 0, hi = 1
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2
          if (simulationFails(0, mid)) hi = mid; else lo = mid
        }
        // lo = highest multiplier where plan just barely works
        expenseReductionNeeded = Math.ceil(baseExpenses * (1 - lo) / 100) * 100
      } else {
        // Even $0 expenses fails (taxes/IRMAA alone exceed income)
        expenseReductionNeeded = baseExpenses
      }
      // Retirement delay: scan 1–20 extra years of contributions
      for (let delay = 1; delay <= 20; delay++) {
        if (!simulationFails(0, 1, delay)) {
          retirementDelayYears = delay
          break
        }
      }
    }

    // Baseline balance simulation for the IRA & Roth comparison chart.
    // Mirrors the main simulation but runs on baselineRows (no conversions) so that
    // expense drawdowns are reflected consistently in both chart lines.
    let bIra = totalIraStart
    let bRoth = totalRothStart
    let bTaxable = totalTaxableStart
    const baselineBalanceData: Array<{ year: number; ira: number; roth: number }> = []
    for (const row of baselineRows) {
      const afterTaxRate = Math.max(0, 1 - row.effectiveRatePct / 100)
      const isPreRet = row.year < retYear
      if (isPreRet) { bIra += annualIraContribs; bRoth += annualRothContribs }
      bIra = bIra * (1 + growthRate)
      bRoth = bRoth * (1 + growthRate)
      const bRmdOut = Math.min(row.rmd, bIra)
      bIra = Math.max(0, bIra - bRmdOut)
      bTaxable = bTaxable * (1 + growthRate)
      const yearsElapsedB = row.year - startYear
      const expensesB = baseExpenses > 0 ? baseExpenses * Math.pow(1 + inflation, yearsElapsedB) : 0
      const taxableRmdB = !isPreRet && row.rmd > 0 ? bRmdOut * (row.iraWithdrawal / row.rmd) : 0
      const afterTaxIncomeB = isPreRet ? row.w2 * afterTaxRate : taxableRmdB * afterTaxRate + row.ss * afterTaxRate
      const netCashB = isPreRet ? afterTaxIncomeB - annualRothContribs - expensesB : afterTaxIncomeB - expensesB
      bTaxable += netCashB
      if (bTaxable < 0 && bIra > 0 && afterTaxRate > 0) {
        const iraDraw = Math.min(-bTaxable / afterTaxRate, bIra)
        bIra = Math.max(0, bIra - iraDraw)
        bTaxable += iraDraw * afterTaxRate
      }
      if (bTaxable < 0 && bRoth > 0) {
        const rothDraw = Math.min(-bTaxable, bRoth)
        bRoth = Math.max(0, bRoth - rothDraw)
        bTaxable += rothDraw
      }
      bTaxable = Math.max(0, bTaxable)
      baselineBalanceData.push({ year: row.year, ira: Math.round(bIra), roth: Math.round(bRoth) })
    }

    const lastRow = data[data.length - 1]
    return {
      data,
      baselineBalanceData,
      startTaxable: totalTaxableStart, startIra: totalIraStart, startRoth: totalRothStart,
      endTaxable: lastRow?.taxable ?? 0, endIra: lastRow?.ira ?? 0, endRoth: lastRow?.roth ?? 0,
      depletionYear,
      firstShortfallYear,
      additionalSavingsNeeded,
      expenseReductionNeeded,
      retirementDelayYears,
    }
  }, [activeRows, baselineRows, brokerageIraTotal, brokerageRothTotal, brokerageTaxableTotal, form.iraBalance, form.rothBalance, form.taxableBalance, form.annualLivingExpenses, form.portfolioGrowthPct, form.inflationPct, form.retirementYear, form.annualDeferredContrib, form.annualRothContrib, form.employerMatchPct, form.spouseAnnualDeferredContrib, form.spouseAnnualRothContrib, form.spouseEmployerMatchPct, form.w2Income, startYear])

  const balanceChartData = fundingProjection.data.map((row, i) => {
    const bRow = fundingProjection.baselineBalanceData[i]
    return {
      year: row.year,
      age: row.age,
      baselineIra: bRow?.ira ?? 0,
      optimizedIra: row.ira,
      baselineRoth: bRow?.roth ?? 0,
      optimizedRoth: row.roth,
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
            ssPaymentsPerYear: computedPrimarySsAnnual ?? numVal(form.ssPaymentsPerYear),
            ssMonthlyFraBenefit: numVal(form.ssMonthlyFraBenefit),
            spouseSsStartYear: numVal(form.spouseSsStartYear) || null,
            spouseSsPaymentsPerYear: computedSpouseSsAnnual ?? numVal(form.spouseSsPaymentsPerYear),
            spouseSsMonthlyFraBenefit: numVal(form.spouseSsMonthlyFraBenefit),
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
          Add your date of birth in <a href="/account" className="underline font-medium">Account</a> to see age-based calculations (RMD, IRMAA).
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
                <AccordionItem id="assets-section" value="assets" className="rounded-lg border overflow-hidden">
                  <AccordionTrigger className="text-sm font-semibold px-4 bg-muted/40 hover:bg-muted/60 hover:no-underline rounded-none data-[state=open]:border-b">
                    <span className="flex items-center">Assets{assetsNeedInput && <NeedsInputBadge />}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-4 pb-5 space-y-5">

                    {/* Connected Brokerages */}
                    <div className="rounded-md border bg-muted/30 px-4 py-3 space-y-2 text-sm">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2 flex-wrap">
                        Connected Brokerages — auto-synced from{' '}
                        <a href="/portfolio" className="text-primary underline hover:no-underline">Portfolio</a>
                        {!isPaid && (
                          <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-400 leading-none">
                            Premium
                          </span>
                        )}
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
                          <NumberInput id="iraBalance" label="IRA / 401k / 403b Balance" value={form.iraBalance} onChange={set('iraBalance')} step="1000" highlight={assetsNeedInput} />
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
                        <NumberInput id="otherIncome" label="Other Income (pension, annuities, rental…)" value={form.otherIncome} onChange={set('otherIncome')} />
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
                  <AccordionContent className="px-4 pt-4 pb-5">
                    <div className="space-y-4">
                      <div className={`grid gap-6 ${isJoint ? 'sm:grid-cols-2' : 'sm:grid-cols-1 max-w-sm'}`}>
                        {/* You */}
                        <div className="space-y-3">
                          {isJoint && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">You</p>}
                          <div className="space-y-1">
                            <NumberInput id="ssStartYear" label="SS Start Year" value={form.ssStartYear} onChange={set('ssStartYear')} step="1" prefix="" min="2020" />
                            {birthYear && ssStartYr > 0 && (
                              <p className="text-xs text-muted-foreground pl-0.5">
                                Age {ssStartYr - birthYear} at SS start
                                {primaryPastFraNow
                                  ? <> · <span className="text-amber-600 dark:text-amber-400">Past FRA</span> — statement shows year-by-year amounts</>
                                  : primarySsAdjPct !== null && (
                                    <> · FRA {fraDisplay(birthYear)} · <span className={primarySsAdjPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>{primarySsAdjPct >= 0 ? '+' : ''}{primarySsAdjPct.toFixed(1)}%</span></>
                                  )
                                }
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <NumberInput
                              id="ssMonthlyFraBenefit"
                              label={primaryPastFraNow ? `Monthly Benefit at Start Year` : 'FRA Monthly Benefit'}
                              value={form.ssMonthlyFraBenefit}
                              onChange={set('ssMonthlyFraBenefit')}
                              highlight={ssNeedsInput}
                            />
                            <p className="text-xs text-muted-foreground pl-0.5">
                              {primaryPastFraNow
                                ? <>From your SSA statement, find the amount for {ssStartYr > 0 ? ssStartYr : 'your start year'} (today&apos;s $)</>
                                : <>Your benefit at FRA, from your SSA statement (today&apos;s $)</>
                              }
                            </p>
                          </div>
                          {computedPrimarySsAnnual !== null ? (
                            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs space-y-0.5">
                              <p className="text-muted-foreground">Estimated annual benefit at start</p>
                              <p className="text-base font-bold tabular-nums">{fmtCurrency(computedPrimarySsAnnual)}</p>
                              {primarySsColaYrs > 0 && <p className="text-muted-foreground">Includes {primarySsColaYrs}-yr COLA at {numVal(form.inflationPct)}%/yr</p>}
                            </div>
                          ) : (
                            <NumberInput id="ssPaymentsPerYear" label="SS Amount / Year (manual)" value={form.ssPaymentsPerYear} onChange={set('ssPaymentsPerYear')} />
                          )}
                        </div>

                        {/* Spouse */}
                        {isJoint && (
                          <div className="space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Spouse</p>
                            <div className="space-y-1">
                              <div className="space-y-1">
                                <NumberInput id="spouseSsStartYear" label="SS Start Year" value={form.spouseSsStartYear} onChange={set('spouseSsStartYear')} step="1" prefix="" min="2020" />
                                {effectiveSpouseBirthYear && spouseSsStartYr > 0 && (
                                  <p className="text-xs text-muted-foreground pl-0.5">
                                    Age {spouseSsStartYr - effectiveSpouseBirthYear} at SS start
                                    {spousePastFraNow
                                      ? <> · <span className="text-amber-600 dark:text-amber-400">Past FRA</span> — statement shows year-by-year amounts</>
                                      : spouseSsAdjPct !== null && (
                                        <> · FRA {fraDisplay(effectiveSpouseBirthYear)} · <span className={spouseSsAdjPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>{spouseSsAdjPct >= 0 ? '+' : ''}{spouseSsAdjPct.toFixed(1)}%</span></>
                                      )
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <NumberInput
                                id="spouseSsMonthlyFraBenefit"
                                label={spousePastFraNow ? 'Spouse Monthly Benefit at Start Year' : 'Spouse FRA Monthly Benefit'}
                                value={form.spouseSsMonthlyFraBenefit}
                                onChange={set('spouseSsMonthlyFraBenefit')}
                              />
                              <p className="text-xs text-muted-foreground pl-0.5">
                                {spousePastFraNow
                                  ? <>From spouse&apos;s SSA statement, find the amount for {spouseSsStartYr > 0 ? spouseSsStartYr : 'their start year'} (today&apos;s $)</>
                                  : <>Spouse&apos;s benefit at FRA, from SSA statement (today&apos;s $)</>
                                }
                              </p>
                            </div>
                            {computedSpouseSsAnnual !== null ? (
                              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs space-y-0.5">
                                <p className="text-muted-foreground">Estimated annual benefit at start</p>
                                <p className="text-base font-bold tabular-nums">{fmtCurrency(computedSpouseSsAnnual)}</p>
                                {spouseSsColaYrs > 0 && <p className="text-muted-foreground">Includes {spouseSsColaYrs}-yr COLA at {numVal(form.inflationPct)}%/yr</p>}
                              </div>
                            ) : (
                              <NumberInput id="spouseSsPaymentsPerYear" label="Spouse SS Amount / Year (manual)" value={form.spouseSsPaymentsPerYear} onChange={set('spouseSsPaymentsPerYear')} />
                            )}
                            {!spouseBirthYear && (
                              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 space-y-2">
                                <p className="text-xs text-amber-800 dark:text-amber-400">
                                  <strong>Spouse birth year missing</strong> — needed to model the first-death transition and joint life expectancy.{' '}
                                  <a href="/account" className="underline hover:no-underline">Save it in Account</a> or enter below for this session only.
                                </p>
                                <NumberInput id="spouseBirthYearOverride" label="Spouse Birth Year" value={form.spouseBirthYearOverride} onChange={set('spouseBirthYearOverride')} step="1" prefix="" min="1930" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SSA note */}
                      <div className="rounded-md border px-3 py-2.5 text-xs text-muted-foreground space-y-1">
                        {(primaryPastFraNow || (isJoint && spousePastFraNow)) ? (
                          <p>
                            <strong>Past FRA:</strong> your <strong>Social Security Statement</strong> shows estimated monthly benefits
                            year-by-year from your current age to 70 — enter the amount for your planned start year.{' '}
                            <strong>Before FRA:</strong> the statement shows your FRA benefit — enter that amount.
                          </p>
                        ) : (
                          <p>
                            Your <strong>FRA benefit</strong> is shown on your <strong>Social Security Statement</strong> — we adjust it
                            for your claiming age and project forward with COLA.
                          </p>
                        )}
                        <p>
                          Create a free account at{' '}
                          <a href="https://www.ssa.gov/myaccount/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline font-medium">ssa.gov/myaccount</a>{' '}
                          to view your personalized estimate, verify your earnings record, and download your statement.
                        </p>
                        <p>
                          For more help and detailed information about Social Security benefit strategies and claiming timing,{' '}
                          <a href="/social-security" className="underline hover:no-underline font-medium text-foreground">visit the Social Security page</a>.
                        </p>
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
                          <p className="text-xs text-muted-foreground mt-1">2026 limit: $23,500 ($31,000 if 50+) for 401k + $7,000 IRA</p>
                        </div>
                        <div>
                          <NumberInput id="annualRothContrib" label="Roth / Year (Roth 401k + Roth IRA)" value={form.annualRothContrib} onChange={set('annualRothContrib')} step="500" />
                          <p className="text-xs text-muted-foreground mt-1">2026 limit: $23,500 ($31,000 if 50+) for Roth 401k + $7,000 Roth IRA</p>
                        </div>
                        <div>
                          <NumberInput id="employerMatchPct" label="Employer Match (% of W2)" value={form.employerMatchPct} onChange={set('employerMatchPct')} step="0.5" prefix="" suffix="%" />
                          <p className="text-xs text-muted-foreground mt-1">e.g. 4 if company matches 100% up to 4% of salary</p>
                        </div>
                      </div>
                      {primaryContribOver && (
                        <p className="text-xs text-destructive mt-2">
                          Combined deferred + Roth (${primaryContribTotal.toLocaleString()}) exceeds the 2026 IRS limit of ${primaryContribLimit.toLocaleString()} {primaryAge >= 50 ? '(age 50+ catch-up included)' : `($${contribLimit(50).toLocaleString()} if 50+)`}.
                        </p>
                      )}
                    </div>

                    {isJoint && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Spouse Contributions</p>
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                          <div>
                            <NumberInput id="spouseAnnualDeferredContrib" label="Spouse Tax-Deferred / Year" value={form.spouseAnnualDeferredContrib} onChange={set('spouseAnnualDeferredContrib')} step="500" />
                            <p className="text-xs text-muted-foreground mt-1">2026 limit: $23,500 ($31,000 if 50+) for 401k + $7,000 IRA</p>
                          </div>
                          <div>
                            <NumberInput id="spouseAnnualRothContrib" label="Spouse Roth / Year" value={form.spouseAnnualRothContrib} onChange={set('spouseAnnualRothContrib')} step="500" />
                            <p className="text-xs text-muted-foreground mt-1">2026 limit: $23,500 ($31,000 if 50+) for Roth 401k + $7,000 Roth IRA</p>
                          </div>
                          <div>
                            <NumberInput id="spouseEmployerMatchPct" label="Spouse Employer Match (% of W2)" value={form.spouseEmployerMatchPct} onChange={set('spouseEmployerMatchPct')} step="0.5" prefix="" suffix="%" />
                          </div>
                        </div>
                        {spouseContribOver && (
                          <p className="text-xs text-destructive mt-2">
                            Spouse combined deferred + Roth (${spouseContribTotal.toLocaleString()}) exceeds the 2026 IRS limit of ${spouseContribLimit.toLocaleString()} {spouseAge >= 50 ? '(age 50+ catch-up included)' : `($${contribLimit(50).toLocaleString()} if 50+)`}.
                          </p>
                        )}
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
                <p className="text-xs text-muted-foreground mt-1">
                  {birthYear && numVal(form.retirementYear) > 0 && <>Age {numVal(form.retirementYear) - birthYear} · </>}
                  W2 / salary income stops after this year. No effect if W2 is $0.
                </p>
              </div>
              <NumberInput id="portfolioGrowthPct" label="Portfolio Growth %" value={form.portfolioGrowthPct} onChange={set('portfolioGrowthPct')} step="0.1" prefix="" suffix="%" />
              <NumberInput id="inflationPct" label="Inflation / SS COLA %" value={form.inflationPct} onChange={set('inflationPct')} step="0.1" prefix="" suffix="%" />
              <NumberInput id="qcds" label="QCDs (% of RMD, age 73+)" value={form.qcds} onChange={set('qcds')} step="1" prefix="" suffix="%" min="0" />
              <div className="space-y-1">
                <Label htmlFor="irmaaTargetTier" className="text-xs text-muted-foreground">Roth Conversion Aggressiveness</Label>
                <Select
                  value={showConversions ? String(irmaaTargetTier) : '-1'}
                  onValueChange={(v) => {
                    if (v === '-1') {
                      setShowConversions(false)
                    } else {
                      setShowConversions(true)
                      setIrmaaTargetTier(Number(v) as IrmaaTargetTier)
                    }
                  }}
                >
                  <SelectTrigger id="irmaaTargetTier" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">No conversion</SelectItem>
                    <SelectItem value="0">Conservative — fill to the 12% bracket</SelectItem>
                    <SelectItem value="1">Moderate — fill to the 22% bracket</SelectItem>
                    <SelectItem value="2">Aggressive — fill to the 24% bracket</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Each tier converts up to the corresponding tax bracket ceiling (same thresholds as IRMAA tiers). Conversions are included in MAGI and affect taxes each year, but reduce future RMDs. Roth IRA direct contributions (incl. backdoor Roth) are capped at $7k/yr ($8k age 50+) — enter those in Contributions above.</p>
              </div>
              {showConversions && (
              <div className="space-y-1">
                <Label htmlFor="conversionWindow" className="text-xs text-muted-foreground">Roth Conversion Window</Label>
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
                <p className="text-xs text-muted-foreground mt-1">Controls when conversions stop. &ldquo;Drain IRA&rdquo; converts every year until the IRA is exhausted. The other options end conversions before SS or RMDs arrive and push income up permanently.</p>
              </div>
              )}

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
                <span className="text-xs font-semibold text-destructive bg-destructive/10 rounded px-2 py-0.5">
                  Fully depleted {fundingProjection.depletionYear}
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
                <p className="text-xs text-muted-foreground font-medium">Starting IRA / 401k / 403b</p>
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
                <p className="text-xs text-muted-foreground font-medium">Ending IRA / 401k / 403b</p>
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

        {fundingProjection.firstShortfallYear !== null && (
          <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive dark:bg-destructive/20">
            <p className="text-sm font-semibold">⚠ Plan fails starting {fundingProjection.firstShortfallYear}{fundingProjection.depletionYear !== null ? ` — all sources depleted ${fundingProjection.depletionYear}` : ''}</p>
            <div className="mt-2 flex flex-col sm:flex-row items-stretch gap-0">
              <div className="flex-1 rounded bg-destructive/10 px-3 py-2">
                <p className="text-xs font-medium opacity-80">Additional savings needed today</p>
                <p className="text-base font-bold tabular-nums mt-0.5">
                  {fundingProjection.additionalSavingsNeeded !== null ? fmtCurrency(fundingProjection.additionalSavingsNeeded) : '>$20M'}
                </p>
                <p className="text-xs opacity-60 mt-0.5">added to taxable accounts</p>
              </div>
              <div className="flex items-center justify-center px-2 py-1 sm:py-0">
                <span className="text-xs font-semibold opacity-50 uppercase tracking-widest">or</span>
              </div>
              <div className="flex-1 rounded bg-destructive/10 px-3 py-2">
                <p className="text-xs font-medium opacity-80">Annual expense reduction needed</p>
                <p className="text-base font-bold tabular-nums mt-0.5">
                  {fundingProjection.expenseReductionNeeded !== null ? fmtCurrency(fundingProjection.expenseReductionNeeded) : '—'}
                </p>
                <p className="text-xs opacity-60 mt-0.5">in today&apos;s dollars</p>
              </div>
              <div className="flex items-center justify-center px-2 py-1 sm:py-0">
                <span className="text-xs font-semibold opacity-50 uppercase tracking-widest">or</span>
              </div>
              <div className="flex-1 rounded bg-destructive/10 px-3 py-2">
                <p className="text-xs font-medium opacity-80">Delay retirement by</p>
                {fundingProjection.retirementDelayYears !== null ? (() => {
                  const newYear = numVal(form.retirementYear) + fundingProjection.retirementDelayYears!
                  const newAge = birthYear ? newYear - birthYear : null
                  return (
                    <>
                      <p className="text-base font-bold tabular-nums mt-0.5">
                        {fundingProjection.retirementDelayYears} {fundingProjection.retirementDelayYears === 1 ? 'year' : 'years'}
                      </p>
                      <p className="text-xs opacity-60 mt-0.5">
                        retire {newYear}{newAge !== null ? ` · age ${newAge}` : ''}
                      </p>
                    </>
                  )
                })() : (
                  <>
                    <p className="text-base font-bold tabular-nums mt-0.5">&gt;20 years</p>
                    <p className="text-xs opacity-60 mt-0.5">contributions alone won&apos;t fix this</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {(fundingProjection.startTaxable > 0 || fundingProjection.startIra > 0 || fundingProjection.startRoth > 0 || numVal(form.annualLivingExpenses) > 0) ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Account Balances by Year</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={fundingProjection.data} margin={{ top: 24, right: 20, bottom: 0, left: 20 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => fmtK(v)} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = fundingProjection.data.find((r) => r.year === label)
                      if (!d) return null
                      const portfolioTotal = d.taxable + d.ira + d.roth
                      const isPreRet = numVal(form.retirementYear) > 0 && d.year < numVal(form.retirementYear)
                      return (
                        <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md space-y-1 min-w-[200px]">
                          <p className="font-semibold text-sm">Year {d.year}{d.age > 0 ? ` · Age ${d.age}` : ''}</p>
                          <p className="text-sky-500">Taxable: <span className="font-medium text-foreground">{fmtCurrency(d.taxable)}</span></p>
                          <p className="text-indigo-400">IRA / 401k / 403b: <span className="font-medium text-foreground">{fmtCurrency(d.ira)}</span></p>
                          <p className="text-emerald-500">Roth IRA: <span className="font-medium text-foreground">{fmtCurrency(d.roth)}</span></p>
                          <p className="text-muted-foreground border-t pt-1">Portfolio total: <span className="font-medium text-foreground">{fmtCurrency(portfolioTotal)}</span></p>
                          <div className="border-t pt-1 space-y-0.5">
                            <p className="font-medium text-foreground">Total income (after tax): {fmtCurrency(d.afterTaxIncome)}</p>
                            {isPreRet && d.w2 > 0 && <p className="text-muted-foreground pl-2">W2: {fmtCurrency(d.w2)} gross</p>}
                            {d.ss > 0 && <p className="text-muted-foreground pl-2">SS: {fmtCurrency(d.ss)} gross</p>}
                            {d.rmd > 0 && <p className="text-muted-foreground pl-2">RMD: {fmtCurrency(d.rmd)}{d.qcds > 0 && ` · QCD ${fmtCurrency(d.qcds)}`}</p>}
                          </div>
                          {d.rothConversion > 0 && (
                            <p className="text-emerald-400">↳ Roth converted: <span className="font-medium text-foreground">{fmtCurrency(d.rothConversion)}</span></p>
                          )}
                          <div className="border-t pt-1 space-y-0.5">
                            {d.expenses > 0 && <p className="text-orange-400">Living expenses: <span className="font-medium text-foreground">{fmtCurrency(d.expenses)}</span></p>}
                            {d.taxes > 0 && <p className="text-rose-400">Taxes: <span className="font-medium text-foreground">{fmtCurrency(d.taxes)}</span></p>}
                            {d.irmaa > 0 && <p className="text-rose-300">IRMAA: <span className="font-medium text-foreground">{fmtCurrency(d.irmaa)}</span></p>}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const order = ['Taxable', 'IRA / 401k / 403b', 'Roth IRA', 'Living Expenses', 'Taxes', 'IRMAA']
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
                  {numVal(form.retirementYear) > 0 && (
                    <ReferenceLine
                      x={numVal(form.retirementYear)}
                      stroke="#6366f1"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={(props: { viewBox?: { x?: number; y?: number } }) => {
                        const cx = props.viewBox?.x ?? 0
                        const cy = (props.viewBox?.y ?? 0) - 20
                        const text = 'Retirement'
                        const w = text.length * 6.2 + 10
                        return (
                          <g>
                            <rect x={cx - w / 2} y={cy} width={w} height={16} rx={3} fill="#6366f1" />
                            <text x={cx} y={cy + 11.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="white">{text}</text>
                          </g>
                        )
                      }}
                    />
                  )}
                  {numVal(form.ssStartYear) > 0 && (
                    <ReferenceLine
                      x={numVal(form.ssStartYear)}
                      stroke="#f59e0b"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={(props: { viewBox?: { x?: number; y?: number } }) => {
                        const cx = props.viewBox?.x ?? 0
                        const cy = (props.viewBox?.y ?? 0) - 20
                        const text = isJoint ? 'Your SS' : 'SS Start'
                        const w = text.length * 6.2 + 10
                        return (
                          <g>
                            <rect x={cx - w / 2} y={cy} width={w} height={16} rx={3} fill="#f59e0b" />
                            <text x={cx} y={cy + 11.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="white">{text}</text>
                          </g>
                        )
                      }}
                    />
                  )}
                  {isJoint && numVal(form.spouseSsStartYear) > 0 && (
                    <ReferenceLine
                      x={numVal(form.spouseSsStartYear)}
                      stroke="#f59e0b"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={(props: { viewBox?: { x?: number; y?: number } }) => {
                        const cx = props.viewBox?.x ?? 0
                        const cy = (props.viewBox?.y ?? 0) - 20
                        const text = 'Spouse SS'
                        const w = text.length * 6.2 + 10
                        return (
                          <g>
                            <rect x={cx - w / 2} y={cy} width={w} height={16} rx={3} fill="#f59e0b" />
                            <text x={cx} y={cy + 11.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="white">{text}</text>
                          </g>
                        )
                      }}
                    />
                  )}
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

        {/* Scenario Comparison card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">Roth Conversion Scenario Comparison</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Window</span>
                <Select value={comparisonWindow} onValueChange={(v) => setComparisonWindow(v as typeof comparisonWindow)}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Drain IRA</SelectItem>
                    <SelectItem value="before-ss">Before SS starts</SelectItem>
                    <SelectItem value="before-rmd">Before RMDs (age 73)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {scenarioComparison.map((sc) => {
                const isActive = sc.tier === -1 ? !showConversions : showConversions && irmaaTargetTier === sc.tier
                return (
                  <button
                    key={sc.tier}
                    type="button"
                    onClick={() => {
                      if (sc.tier === -1) {
                        setShowConversions(false)
                      } else {
                        setShowConversions(true)
                        setIrmaaTargetTier(sc.tier as IrmaaTargetTier)
                        setConversionWindow(comparisonWindow)
                      }
                    }}
                    className={`rounded-lg border p-3 text-left space-y-2.5 transition-all cursor-pointer hover:border-primary/60 ${isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card hover:bg-muted/30'}`}
                  >
                    <p className={`text-sm font-semibold flex items-center gap-1.5 ${isActive ? 'text-primary' : ''}`}>
                      {sc.label}
                      {isActive && <span className="text-[10px] font-normal bg-primary text-primary-foreground rounded px-1 py-0.5 leading-none">selected</span>}
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Lifetime Cost</p>
                        <p className="font-bold tabular-nums">{fmtK(sc.totalCost)}</p>
                        <p className="text-[10px] text-muted-foreground">Tax {fmtK(sc.totalTax)} · IRMAA {fmtK(sc.totalIrmaa)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Net Savings vs Baseline</p>
                        {sc.tier === -1 ? (
                          <p className="font-bold text-muted-foreground">—</p>
                        ) : (
                          <p className={`font-bold tabular-nums ${sc.netSavings >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {sc.netSavings >= 0 ? '+' : ''}{fmtK(sc.netSavings)}
                          </p>
                        )}
                      </div>
                      <div>
                        {sc.tier === -1 ? (
                          <p className="font-bold invisible">—</p>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Break-Even</p>
                            {sc.breakevenYear !== null ? (
                              <p className="font-bold tabular-nums">{sc.breakevenYear}</p>
                            ) : (
                              <p className="font-bold text-destructive">Never</p>
                            )}
                          </>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Roth Converted</p>
                        <p className="font-bold tabular-nums">{fmtK(sc.totalRothConverted)}</p>
                      </div>
                      <div className="flex gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Final IRA</p>
                          <p className="font-bold tabular-nums text-indigo-500">{fmtK(sc.finalIra)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Final Roth</p>
                          <p className="font-bold tabular-nums text-emerald-500">{fmtK(sc.finalRoth)}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Click a scenario to select it and update the charts below. The Window dropdown here lets you compare how the stop-year changes outcomes — clicking a scenario also applies that window to the main plan.</p>
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
            Solid lines = selected plan. Dashed = baseline (no conversions). Roth is tax-free to heirs; IRA is taxable under the 10-year inherited RMD rule. Click a scenario card above to switch plans.
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
              ? 'Bars = selected plan cost (with conversions). Grey dashed = baseline. Green line = cumulative savings — negative means conversion tax not yet recovered, positive means break-even reached.'
              : 'Bars = baseline scenario — no Roth conversions. Click a scenario card above or switch to "With Roth conversions" to see the optimized strategy.'}
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
