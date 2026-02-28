import { getYearData } from './retirement-data'
import { getRmdAge } from './milestones'

// ─── Types ───────────────────────────────────────────────────────────────────

export type FilingStatus = 'single' | 'joint'

export type IrmaaTargetTier = 0 | 1 | 2

export interface TaxInputs {
  w2Income: number
  interestIncome: number
  dividendIncome: number   // qualified dividends → taxed at LTCG rates
  capGainsDist: number
  stcg: number
  ltcg: number
  otherIncome: number      // pension, rental, etc. → ordinary income rates
  iraBalance: number
  iraWithdrawals: number
  qcdPct: number       // % of annual RMD to donate as QCD (0–100); effective age 73+; capped at IRS annual limit
  rothBalance: number
  portfolioGrowthPct: number
  retirementYear: number
  ssStartYear: number
  ssPaymentsPerYear: number
  filing: FilingStatus
  birthYear: number
  startYear: number
  projectionYears: number
  irmaaTargetTier: IrmaaTargetTier
  inflationPct: number        // annual COLA / inflation rate applied to SS and IRMAA brackets
  conversionStopYear: number  // first year where conversions are NOT applied (use 9999 for always)
  medicareEnrollees: 1 | 2    // number of household members on Medicare (multiplies IRMAA)
  medicareStartYear: number   // first year IRMAA applies (Part B enrollment); 0 = auto = max(retirementYear, birthYear+65)
  sex: Sex | null           // primary user's biological sex (for life expectancy)
  // Spouse (0 / undefined means no spouse)
  spouseBirthYear: number
  spouseSsStartYear: number
  spouseSsPaymentsPerYear: number
  spouseSex: Sex | null     // spouse's biological sex (for life expectancy)
  stateTaxRate: number      // effective state income tax rate (0–1); 0 = no state tax
  planToAge: number         // override primary life expectancy (0 = use SSA)
  spousePlanToAge: number   // override spouse life expectancy (0 = use SSA)
  // Pre-retirement contributions — applied each year through retirementYear, then stop
  annualDeferredContrib: number    // primary pre-tax (traditional 401k/IRA) $/year
  annualRothContrib: number        // primary Roth (Roth 401k/Roth IRA) $/year
  annualEmployerMatch: number      // primary employer match $/year (pre-tax)
  spouseAnnualDeferredContrib: number
  spouseAnnualRothContrib: number
  spouseAnnualEmployerMatch: number
}

export interface ScenarioRow {
  year: number; age: number
  w2: number; ss: number; rmd: number; iraWithdrawal: number
  taxableSS: number; magi: number
  federalTax: number; ltcgTax: number; stateTax: number; totalTax: number
  effectiveRatePct: number
  irmaaAnnual: number; totalCost: number; iraBalanceEnd: number
  rothConversion: number
  conversionTax: number
  filing: FilingStatus  // effective filing status for this year
  rothBalanceEnd: number
  qcdsActual: number
}

export interface ProjectionResult {
  baselineRows: ScenarioRow[]
  optimizedRows: ScenarioRow[]
  summary: {
    baselineTotalCost: number; optimizedTotalCost: number
    lifetimeSavings: number
    totalRothConverted: number
    baselineTotalTax: number; optimizedTotalTax: number
    baselineTotalIrmaa: number; optimizedTotalIrmaa: number
    firstSpouseDeathYear: number | null  // null if single or no spouse birth year
    totalQcds: number
    baselineFinalIraBalance: number
    optimizedFinalIraBalance: number
    baselineFinalRothBalance: number
    optimizedFinalRothBalance: number
    heirAnnualIraRmdBaseline: number
    heirAnnualIraRmdOptimized: number
  }
}

// ─── Tax constants (2025 brackets) ───────────────────────────────────────────

const BRACKETS_SINGLE: [number, number][] = [
  [11_925, 0.10], [48_475, 0.12], [103_350, 0.22],
  [197_300, 0.24], [250_525, 0.32], [626_350, 0.35], [Infinity, 0.37],
]

const BRACKETS_JOINT: [number, number][] = [
  [23_850, 0.10], [96_950, 0.12], [206_700, 0.22],
  [394_600, 0.24], [501_050, 0.32], [751_600, 0.35], [Infinity, 0.37],
]

const STD_DEDUCTION: Record<FilingStatus, number> = { single: 15_000, joint: 30_000 }

const LTCG_0PCT: Record<FilingStatus, number> = { single: 48_350, joint: 96_700 }
const LTCG_15PCT: Record<FilingStatus, number> = { single: 533_400, joint: 600_050 }

// IRS QCD annual limit (2025 base, inflation-indexed forward)
const QCD_ANNUAL_LIMIT_2025 = 108_000

// IRS Uniform Lifetime Table (age → distribution period)
// Covers all possible RMD start ages under SECURE 2.0 (73 for born 1951–1959; 75 for born 1960+)
const RMD_TABLE: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5,
  83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8,
  98: 7.3, 99: 6.8, 100: 6.4,
}

function rmdFactor(age: number): number {
  return RMD_TABLE[age] ?? 8.9
}

// IRMAA conversion ceilings — 2026 base values (floor of the next tier).
// These are scaled forward each year by inflationPct inside computeConversionAmount.
// Index = target tier → max MAGI before the *next* tier kicks in
const IRMAA_CONVERSION_CEILING: Record<FilingStatus, [number, number, number]> = {
  single: [109_000, 137_000, 171_000],
  joint:  [218_000, 274_000, 342_000],
}

// ─── Helper functions ─────────────────────────────────────────────────────────

// Tax brackets, standard deduction, and LTCG thresholds are all CPI-indexed under current law.
// inflFactor scales them forward from their 2025 base each year of the projection.

function calcOrdinaryTax(taxableIncome: number, filing: FilingStatus, inflFactor: number): number {
  const brackets = filing === 'single' ? BRACKETS_SINGLE : BRACKETS_JOINT
  let tax = 0
  let prev = 0
  for (const [ceiling, rate] of brackets) {
    if (taxableIncome <= prev) break
    const inflatedCeiling = ceiling === Infinity ? Infinity : ceiling * inflFactor
    const slice = Math.min(taxableIncome, inflatedCeiling) - prev
    tax += slice * rate
    prev = inflatedCeiling
  }
  return tax
}

function calcLtcgTax(ltcgAmount: number, taxableIncome: number, filing: FilingStatus, inflFactor: number): number {
  if (ltcgAmount <= 0) return 0
  const floor0 = LTCG_0PCT[filing] * inflFactor
  const floor15 = LTCG_15PCT[filing] * inflFactor
  // Cap at taxableIncome — the standard deduction may reduce the taxable LTCG below the gross amount
  const effectiveLtcg = Math.min(ltcgAmount, taxableIncome)
  // Ordinary income fills brackets first; LTCG stacks on top
  const ordinaryIncome = Math.max(0, taxableIncome - effectiveLtcg)
  const in0pct = Math.max(0, Math.min(effectiveLtcg, floor0 - ordinaryIncome))
  const in15pct = Math.max(0, Math.min(effectiveLtcg - in0pct, floor15 - Math.max(ordinaryIncome, floor0)))
  const in20pct = Math.max(0, effectiveLtcg - in0pct - in15pct)
  return in15pct * 0.15 + in20pct * 0.20
}

// Compute the actual taxable portion of SS using the IRS marginal formula.
// Provisional income thresholds ($25k/$34k single, $32k/$44k joint) are NOT indexed to
// inflation under current law — they've been frozen since 1984. Only the marginal amounts
// above each threshold are included, not a flat fraction of all SS.
function calcTaxableSS(ss: number, provisional: number, filing: FilingStatus): number {
  if (filing === 'single') {
    if (provisional <= 25_000) return 0
    if (provisional <= 34_000) return Math.min(0.5 * ss, 0.5 * (provisional - 25_000))
    return Math.min(0.85 * ss, 0.85 * (provisional - 34_000) + 4_500)
  } else {
    if (provisional <= 32_000) return 0
    if (provisional <= 44_000) return Math.min(0.5 * ss, 0.5 * (provisional - 32_000))
    return Math.min(0.85 * ss, 0.85 * (provisional - 44_000) + 6_000)
  }
}

// Compute the IRMAA surcharge — the income-based Medicare penalty above the base Part B premium.
// Returns $0 when MAGI is below Tier 1 (standard premium payers pay no IRMAA surcharge).
// The base Part B premium (~$203/mo in 2026) is a fixed cost users should include in living
// expenses; tracking it here as "IRMAA" would show costs even on a SS-only retirement income.
// medicareEnrollees multiplies the result — joint filers where both are on Medicare pay twice.
function lookupIrmaa(magi: number, filing: FilingStatus, year: number, inflationPct: number, medicareEnrollees: 1 | 2): number {
  const yd = getYearData(2026)
  const brackets = filing === 'single' ? yd.irmaaSingle : yd.irmaaJoint
  const basePremium = brackets[0].partBPremium
  const inflFactor = Math.pow(1 + inflationPct / 100, year - 2026)
  let bracket = brackets[0]
  for (const b of brackets) {
    if (magi >= b.incomeFloor * inflFactor) bracket = b
    else break
  }
  if (bracket === brackets[0]) return 0  // below Tier 1 — no IRMAA surcharge
  // IRMAA surcharge = premium above the base Part B + Part D surcharge, scaled for inflation
  return (bracket.partBPremium - basePremium + bracket.partDSurcharge) * 12 * inflFactor * medicareEnrollees
}

// ─── Life expectancy (SSA 2021 Period Life Table, sex-specific) ───────────────

export type Sex = 'male' | 'female'

// Remaining life expectancy at age X — SSA 2021 Period Life Table
const LE_MALE: Partial<Record<number, number>> = {
  50: 28.3, 51: 27.5, 52: 26.7, 53: 25.9, 54: 25.1,
  55: 24.3, 56: 23.5, 57: 22.8, 58: 22.0, 59: 21.2,
  60: 20.5, 61: 19.7, 62: 19.0, 63: 18.2, 64: 17.5,
  65: 16.8, 66: 16.1, 67: 15.4, 68: 14.7, 69: 14.0,
  70: 13.4, 71: 12.7, 72: 12.1, 73: 11.5, 74: 10.9,
  75: 10.3, 76:  9.7, 77:  9.2, 78:  8.7, 79:  8.1,
  80:  7.7, 81:  7.2, 82:  6.7, 83:  6.3, 84:  5.9,
  85:  5.5, 86:  5.1, 87:  4.7, 88:  4.4, 89:  4.1,
  90:  3.8,
}

const LE_FEMALE: Partial<Record<number, number>> = {
  50: 32.7, 51: 31.9, 52: 31.0, 53: 30.2, 54: 29.4,
  55: 28.5, 56: 27.7, 57: 26.9, 58: 26.1, 59: 25.3,
  60: 24.5, 61: 23.7, 62: 22.9, 63: 22.1, 64: 21.3,
  65: 20.6, 66: 19.8, 67: 19.0, 68: 18.3, 69: 17.5,
  70: 16.8, 71: 16.1, 72: 15.4, 73: 14.7, 74: 14.0,
  75: 13.3, 76: 12.7, 77: 12.0, 78: 11.4, 79: 10.8,
  80: 10.2, 81:  9.6, 82:  9.1, 83:  8.5, 84:  8.0,
  85:  7.5, 86:  7.0, 87:  6.6, 88:  6.1, 89:  5.7,
  90:  5.3,
}

function remainingLifeExpectancy(birthYear: number, startYear: number, sex?: Sex | null): number {
  const age = startYear - birthYear
  const clamped = Math.min(90, Math.max(50, age))
  const table = sex === 'female' ? LE_FEMALE : LE_MALE
  return table[clamped] ?? (sex === 'female' ? 5.3 : 3.8)
}

function expectedDeathYear(birthYear: number, startYear: number, sex?: Sex | null): number {
  return startYear + Math.round(remainingLifeExpectancy(birthYear, startYear, sex))
}

/** Returns the SSA-table expected death age for a person (current age + remaining LE). */
export function ssaExpectedAge(birthYear: number, startYear: number, sex?: Sex | null): number {
  const currentAge = startYear - birthYear
  return currentAge + Math.round(remainingLifeExpectancy(birthYear, startYear, sex))
}

/** Returns the number of years to project based on joint life expectancy.
 *  Projects to the later-surviving spouse's expected end year (rounded).
 *  Pass primaryPlanToAge / spousePlanToAge (> 0) to override the SSA default.
 *  Minimum 10 years. */
export function computeProjectionYears(
  primaryBirthYear: number,
  spouseBirthYear: number | null | undefined,
  startYear: number,
  primarySex?: Sex | null,
  spouseSex?: Sex | null,
  primaryPlanToAge = 0,
  spousePlanToAge = 0,
): number {
  const primaryCurrentAge = primaryBirthYear > 0 ? startYear - primaryBirthYear : 0
  const primaryRemaining = primaryPlanToAge > 0 && primaryBirthYear > 0
    ? primaryPlanToAge - primaryCurrentAge
    : primaryBirthYear > 0
      ? remainingLifeExpectancy(primaryBirthYear, startYear, primarySex)
      : 20
  const spouseCurrentAge = spouseBirthYear && spouseBirthYear > 0 ? startYear - spouseBirthYear : 0
  const spouseRemaining = spousePlanToAge > 0 && spouseBirthYear && spouseBirthYear > 0
    ? spousePlanToAge - spouseCurrentAge
    : spouseBirthYear && spouseBirthYear > 0
      ? remainingLifeExpectancy(spouseBirthYear, startYear, spouseSex)
      : 0
  const maxRemaining = Math.max(primaryRemaining, spouseRemaining)
  return Math.max(10, Math.round(maxRemaining))
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface YearBase {
  w2: number; ss: number; iraWithdrawal: number
  interestIncome: number; dividendIncome: number; capGainsDist: number
  stcg: number; ltcg: number; otherIncome: number; qcds: number; age: number
  filing: FilingStatus
}

interface YearMetrics {
  taxableSS: number; magi: number
  federalTax: number; ltcgTax: number; stateTax: number; totalTax: number
  effectiveRatePct: number; irmaaAnnual: number; totalCost: number
}

function computeYearMetrics(base: YearBase, rothConversion: number, year: number, inflationPct: number, medicareEnrollees: 1 | 2, stateTaxRate: number, medicareStartYear: number): YearMetrics {
  const { w2, ss, iraWithdrawal, interestIncome, dividendIncome, capGainsDist, stcg, ltcg, otherIncome, qcds, age, filing } = base

  // Inflation factor: scales CPI-indexed thresholds (brackets, std deduction, LTCG) from 2025 base.
  // IRMAA is already scaled inside lookupIrmaa. SS provisional thresholds are NOT indexed (frozen since 1984).
  const inflFactor = Math.pow(1 + inflationPct / 100, year - 2025)

  // SS provisional income = all income (excluding SS itself) + half of SS
  // Includes Roth conversion and other ordinary income as they affect SS taxability
  const provisional = (w2 + interestIncome + dividendIncome + capGainsDist + stcg + ltcg + otherIncome + iraWithdrawal + rothConversion - qcds) + 0.5 * ss
  const taxableSS = calcTaxableSS(ss, provisional, filing)

  // MAGI: all income sources including taxable portion of SS
  const magi = w2 + interestIncome + dividendIncome + capGainsDist + stcg + ltcg + otherIncome + iraWithdrawal + taxableSS - qcds + rothConversion

  // Standard deduction is CPI-indexed — scale from 2025 base
  const stdDeduction = STD_DEDUCTION[filing] * inflFactor
  const taxableIncome = Math.max(0, magi - stdDeduction)

  // Preferred (LTCG) rates: qualified dividends, long-term cap gains, cap gains distributions
  // Ordinary rates: W2, interest, STCG, other income, IRA withdrawals, taxable SS, Roth conversion
  const ltcgAmount = dividendIncome + ltcg + capGainsDist
  const ordinaryTaxable = Math.max(0, taxableIncome - ltcgAmount)
  const federalTax = calcOrdinaryTax(ordinaryTaxable, filing, inflFactor)
  const ltcgTax = calcLtcgTax(ltcgAmount, taxableIncome, filing, inflFactor)
  // State tax: applied to full MAGI (many states use own deductions, but MAGI is a reasonable proxy)
  const stateTax = magi * stateTaxRate
  const totalTax = federalTax + ltcgTax + stateTax
  const effectiveRatePct = totalTax / Math.max(1, magi) * 100

  let irmaaAnnual = 0
  if (age >= 65 && year >= medicareStartYear) {
    irmaaAnnual = lookupIrmaa(magi, filing, year, inflationPct, medicareEnrollees)
  }

  const totalCost = totalTax + irmaaAnnual

  return { taxableSS, magi, federalTax, ltcgTax, stateTax, totalTax, effectiveRatePct, irmaaAnnual, totalCost }
}

function computeConversionAmount(
  baseMagi: number,
  iraBalance: number,
  filing: FilingStatus,
  targetTier: IrmaaTargetTier,
  year: number,
  inflationPct: number,
): number {
  const baseCeiling = IRMAA_CONVERSION_CEILING[filing][targetTier]
  const ceiling = baseCeiling * Math.pow(1 + inflationPct / 100, year - 2026)
  const headroom = Math.max(0, ceiling - baseMagi - 1)
  return Math.min(headroom, iraBalance)
}

function runScenario(inputs: TaxInputs, applyConversions: boolean): ScenarioRow[] {
  const {
    w2Income, interestIncome, dividendIncome, capGainsDist,
    stcg, ltcg, otherIncome, iraWithdrawals, qcdPct,
    portfolioGrowthPct, retirementYear, ssStartYear, ssPaymentsPerYear,
    filing, birthYear, startYear, projectionYears, irmaaTargetTier, inflationPct, conversionStopYear, medicareEnrollees, medicareStartYear,
    sex, spouseBirthYear, spouseSsStartYear, spouseSsPaymentsPerYear, spouseSex, stateTaxRate,
    planToAge, spousePlanToAge,
    annualDeferredContrib, annualRothContrib, annualEmployerMatch,
    spouseAnnualDeferredContrib, spouseAnnualRothContrib, spouseAnnualEmployerMatch,
  } = inputs

  let iraBalance = inputs.iraBalance
  let rothBalance = inputs.rothBalance
  const rows: ScenarioRow[] = []

  // Determine first-death year when MFJ with known spouse birth year.
  // Use plan-to-age overrides when provided, otherwise fall back to SSA tables.
  const primaryDeathYear = (filing === 'joint' && birthYear > 0)
    ? (planToAge > 0 ? birthYear + planToAge : expectedDeathYear(birthYear, startYear, sex))
    : null
  const spouseDeathYear = (filing === 'joint' && spouseBirthYear > 0)
    ? (spousePlanToAge > 0 ? spouseBirthYear + spousePlanToAge : expectedDeathYear(spouseBirthYear, startYear, spouseSex))
    : null
  const firstDeathYear = (primaryDeathYear && spouseDeathYear)
    ? Math.min(primaryDeathYear, spouseDeathYear)
    : null

  // Effective Medicare Part B start year — 0 means auto: max(retirementYear, birthYear+65)
  const effectiveMedicareStartYear = medicareStartYear > 0
    ? medicareStartYear
    : Math.max(retirementYear, birthYear > 0 ? birthYear + 65 : 0)

  for (let i = 0; i < projectionYears; i++) {
    const year = startYear + i
    const age = birthYear > 0 ? year - birthYear : 0

    // After first spouse death, switch to single filing and drop to 1 Medicare enrollee
    const isAfterFirstDeath = firstDeathYear !== null && year > firstDeathYear
    const yearFiling: FilingStatus = isAfterFirstDeath ? 'single' : filing
    const yearMedicareEnrollees: 1 | 2 = (isAfterFirstDeath && medicareEnrollees === 2) ? 1 : medicareEnrollees

    // Pre-retirement contributions (added before growth so they compound the full year)
    if (year < retirementYear) {
      iraBalance += annualDeferredContrib + annualEmployerMatch + spouseAnnualDeferredContrib + spouseAnnualEmployerMatch
      rothBalance += annualRothContrib + spouseAnnualRothContrib
    }

    // Grow IRA
    iraBalance *= (1 + portfolioGrowthPct / 100)

    // RMD or voluntary withdrawal — then apply QCDs
    let rmd = 0
    let effectiveQcds = 0
    let taxableIraWithdrawal = 0
    if (age >= getRmdAge(birthYear)) {
      rmd = iraBalance / rmdFactor(age)
      // QCDs: % of RMD, capped at inflation-indexed IRS annual limit and available balance
      const qcdLimit = QCD_ANNUAL_LIMIT_2025 * Math.pow(1 + inflationPct / 100, year - 2025)
      effectiveQcds = Math.min(rmd * qcdPct / 100, qcdLimit, iraBalance)
      // QCDs satisfy the RMD first; any excess still comes out of the IRA tax-free
      const totalIraOut = Math.min(iraBalance, Math.max(rmd, effectiveQcds))
      iraBalance = Math.max(0, iraBalance - totalIraOut)
      // Only the portion of the RMD NOT covered by QCDs is taxable income
      taxableIraWithdrawal = Math.max(0, rmd - effectiveQcds)
    } else {
      taxableIraWithdrawal = iraWithdrawals
      iraBalance = Math.max(0, iraBalance - taxableIraWithdrawal)
    }

    // Pre-tax deferrals reduce taxable W2; Roth contributions and employer match do not
    const deferredReduction = year < retirementYear ? annualDeferredContrib + spouseAnnualDeferredContrib : 0
    const w2 = year < retirementYear ? Math.max(0, w2Income - deferredReduction) : 0

    // SS: compute both streams with COLA, then combine or apply survivor benefit
    const primarySS = year >= ssStartYear
      ? ssPaymentsPerYear * Math.pow(1 + inflationPct / 100, year - ssStartYear)
      : 0
    const spouseSS = (spouseSsPaymentsPerYear > 0 && spouseSsStartYear > 0 && year >= spouseSsStartYear)
      ? spouseSsPaymentsPerYear * Math.pow(1 + inflationPct / 100, year - spouseSsStartYear)
      : 0
    // After first death: survivor receives higher of the two amounts (survivor benefit rule)
    const ss = isAfterFirstDeath ? Math.max(primarySS, spouseSS) : primarySS + spouseSS

    const base: YearBase = {
      w2, ss, iraWithdrawal: taxableIraWithdrawal,
      interestIncome, dividendIncome, capGainsDist,
      stcg, ltcg, otherIncome,
      qcds: 0,   // QCDs already removed from iraWithdrawal above; don't double-subtract
      age, filing: yearFiling,
    }

    let rothConversion = 0
    let conversionTax = 0
    let metrics: YearMetrics

    if (!applyConversions || year >= conversionStopYear) {
      metrics = computeYearMetrics(base, 0, year, inflationPct, yearMedicareEnrollees, stateTaxRate, effectiveMedicareStartYear)
    } else {
      const baseMet = computeYearMetrics(base, 0, year, inflationPct, yearMedicareEnrollees, stateTaxRate, effectiveMedicareStartYear)
      rothConversion = computeConversionAmount(baseMet.magi, iraBalance, yearFiling, irmaaTargetTier, year, inflationPct)
      const optMet = computeYearMetrics(base, rothConversion, year, inflationPct, yearMedicareEnrollees, stateTaxRate, effectiveMedicareStartYear)
      conversionTax = optMet.totalTax - baseMet.totalTax
      metrics = optMet
      iraBalance = Math.max(0, iraBalance - rothConversion)
    }

    // Roth grows tax-free each year; conversions add to it in optimized scenario
    rothBalance *= (1 + portfolioGrowthPct / 100)
    if (applyConversions) rothBalance += rothConversion

    rows.push({
      year, age, w2, ss, rmd, iraWithdrawal: taxableIraWithdrawal,
      taxableSS: metrics.taxableSS,
      magi: metrics.magi,
      federalTax: metrics.federalTax,
      ltcgTax: metrics.ltcgTax,
      stateTax: metrics.stateTax,
      totalTax: metrics.totalTax,
      effectiveRatePct: metrics.effectiveRatePct,
      irmaaAnnual: metrics.irmaaAnnual,
      totalCost: metrics.totalCost,
      iraBalanceEnd: iraBalance,
      rothConversion,
      conversionTax,
      filing: yearFiling,
      rothBalanceEnd: rothBalance,
      qcdsActual: effectiveQcds,
    })
  }

  return rows
}

// ─── Main projection function ─────────────────────────────────────────────────

export function projectTaxes(inputs: TaxInputs): ProjectionResult {
  const baselineRows = runScenario(inputs, false)
  const optimizedRows = runScenario(inputs, true)

  const baselineTotalCost = baselineRows.reduce((s, r) => s + r.totalCost, 0)
  const optimizedTotalCost = optimizedRows.reduce((s, r) => s + r.totalCost, 0)
  const baselineTotalTax = baselineRows.reduce((s, r) => s + r.totalTax, 0)
  const optimizedTotalTax = optimizedRows.reduce((s, r) => s + r.totalTax, 0)
  const baselineTotalIrmaa = baselineRows.reduce((s, r) => s + r.irmaaAnnual, 0)
  const optimizedTotalIrmaa = optimizedRows.reduce((s, r) => s + r.irmaaAnnual, 0)
  const totalRothConverted = optimizedRows.reduce((s, r) => s + r.rothConversion, 0)
  const lifetimeSavings = baselineTotalCost - optimizedTotalCost

  // First-death year for chart annotation — same logic as runScenario
  const pDY = (inputs.filing === 'joint' && inputs.birthYear > 0)
    ? (inputs.planToAge > 0 ? inputs.birthYear + inputs.planToAge : expectedDeathYear(inputs.birthYear, inputs.startYear, inputs.sex))
    : null
  const sDY = (inputs.filing === 'joint' && inputs.spouseBirthYear > 0)
    ? (inputs.spousePlanToAge > 0 ? inputs.spouseBirthYear + inputs.spousePlanToAge : expectedDeathYear(inputs.spouseBirthYear, inputs.startYear, inputs.spouseSex))
    : null
  const firstSpouseDeathYear = (pDY && sDY) ? Math.min(pDY, sDY) : null

  // Legacy / wealth-transfer metrics
  const totalQcds = baselineRows.reduce((s, r) => s + r.qcdsActual, 0)
  const baselineFinalIraBalance = baselineRows.at(-1)?.iraBalanceEnd ?? 0
  const optimizedFinalIraBalance = optimizedRows.at(-1)?.iraBalanceEnd ?? 0
  const baselineFinalRothBalance = baselineRows.at(-1)?.rothBalanceEnd ?? 0
  const optimizedFinalRothBalance = optimizedRows.at(-1)?.rothBalanceEnd ?? 0
  const heirAnnualIraRmdBaseline = baselineFinalIraBalance / 10
  const heirAnnualIraRmdOptimized = optimizedFinalIraBalance / 10

  return {
    baselineRows,
    optimizedRows,
    summary: {
      baselineTotalCost,
      optimizedTotalCost,
      lifetimeSavings,
      totalRothConverted,
      baselineTotalTax,
      optimizedTotalTax,
      baselineTotalIrmaa,
      optimizedTotalIrmaa,
      firstSpouseDeathYear,
      totalQcds,
      baselineFinalIraBalance,
      optimizedFinalIraBalance,
      baselineFinalRothBalance,
      optimizedFinalRothBalance,
      heirAnnualIraRmdBaseline,
      heirAnnualIraRmdOptimized,
    },
  }
}
