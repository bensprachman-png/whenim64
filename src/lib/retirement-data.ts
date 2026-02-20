// ─── Types ──────────────────────────────────────────────────────────────────

export type SupportedYear = 2025 | 2026

export interface IrmaaBracket {
  incomeFloor: number
  incomeCeiling: number | null
  partBPremium: number
  partDSurcharge: number
}

export interface YearData {
  year: SupportedYear
  partBPremium: number           // monthly $
  partBDeductible: number        // annual $
  medicareAdvantageOOPMax: number // in-network annual $
  medigapKOOPMax: number         // annual $
  qcdLimit: number               // annual $
  irmaaBaseYear: number          // look-back year CMS uses for this year's premiums
  irmaaSingle: IrmaaBracket[]
  irmaaJoint: IrmaaBracket[]
}

// ─── Supported years ─────────────────────────────────────────────────────────

export const SUPPORTED_YEARS: SupportedYear[] = [2025, 2026]

// ─── Year data ───────────────────────────────────────────────────────────────

const YEAR_DATA: Record<SupportedYear, YearData> = {
  2025: {
    year: 2025,
    partBPremium: 185.00,
    partBDeductible: 257,
    medicareAdvantageOOPMax: 8850,
    medigapKOOPMax: 7220,
    qcdLimit: 108000,
    irmaaBaseYear: 2023,
    irmaaSingle: [
      { incomeFloor: 0,      incomeCeiling: 106000, partBPremium: 185.00, partDSurcharge: 0 },
      { incomeFloor: 106000, incomeCeiling: 133000, partBPremium: 259.00, partDSurcharge: 13.70 },
      { incomeFloor: 133000, incomeCeiling: 167000, partBPremium: 370.00, partDSurcharge: 35.30 },
      { incomeFloor: 167000, incomeCeiling: 200000, partBPremium: 480.90, partDSurcharge: 57.00 },
      { incomeFloor: 200000, incomeCeiling: 500000, partBPremium: 591.90, partDSurcharge: 78.60 },
      { incomeFloor: 500000, incomeCeiling: null,   partBPremium: 628.90, partDSurcharge: 85.80 },
    ],
    irmaaJoint: [
      { incomeFloor: 0,      incomeCeiling: 212000, partBPremium: 185.00, partDSurcharge: 0 },
      { incomeFloor: 212000, incomeCeiling: 266000, partBPremium: 259.00, partDSurcharge: 13.70 },
      { incomeFloor: 266000, incomeCeiling: 334000, partBPremium: 370.00, partDSurcharge: 35.30 },
      { incomeFloor: 334000, incomeCeiling: 400000, partBPremium: 480.90, partDSurcharge: 57.00 },
      { incomeFloor: 400000, incomeCeiling: 750000, partBPremium: 591.90, partDSurcharge: 78.60 },
      { incomeFloor: 750000, incomeCeiling: null,   partBPremium: 628.90, partDSurcharge: 85.80 },
    ],
  },

  2026: {
    year: 2026,
    partBPremium: 202.90,
    partBDeductible: 283,
    medicareAdvantageOOPMax: 9250,
    medigapKOOPMax: 8000,
    qcdLimit: 111000,
    irmaaBaseYear: 2024,
    irmaaSingle: [
      { incomeFloor: 0,      incomeCeiling: 109000, partBPremium: 202.90, partDSurcharge: 0 },
      { incomeFloor: 109000, incomeCeiling: 137000, partBPremium: 284.10, partDSurcharge: 14.50 },
      { incomeFloor: 137000, incomeCeiling: 171000, partBPremium: 405.80, partDSurcharge: 37.50 },
      { incomeFloor: 171000, incomeCeiling: 205000, partBPremium: 527.50, partDSurcharge: 60.40 },
      { incomeFloor: 205000, incomeCeiling: 500000, partBPremium: 649.20, partDSurcharge: 83.30 },
      { incomeFloor: 500000, incomeCeiling: null,   partBPremium: 689.90, partDSurcharge: 91.00 },
    ],
    irmaaJoint: [
      { incomeFloor: 0,      incomeCeiling: 218000, partBPremium: 202.90, partDSurcharge: 0 },
      { incomeFloor: 218000, incomeCeiling: 274000, partBPremium: 284.10, partDSurcharge: 14.50 },
      { incomeFloor: 274000, incomeCeiling: 342000, partBPremium: 405.80, partDSurcharge: 37.50 },
      { incomeFloor: 342000, incomeCeiling: 410000, partBPremium: 527.50, partDSurcharge: 60.40 },
      { incomeFloor: 410000, incomeCeiling: 750000, partBPremium: 649.20, partDSurcharge: 83.30 },
      { incomeFloor: 750000, incomeCeiling: null,   partBPremium: 689.90, partDSurcharge: 91.00 },
    ],
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validates the raw `?year=` query param and returns a SupportedYear.
 * Falls back to the current calendar year if supported, otherwise the latest year.
 */
export function resolveYear(raw: string | undefined): SupportedYear {
  const candidate = parseInt(raw ?? '', 10)
  if (!isNaN(candidate) && (SUPPORTED_YEARS as number[]).includes(candidate)) {
    return candidate as SupportedYear
  }
  const calendarYear = new Date().getFullYear()
  if ((SUPPORTED_YEARS as number[]).includes(calendarYear)) {
    return calendarYear as SupportedYear
  }
  return SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1]
}

export function getYearData(year: number): YearData {
  return YEAR_DATA[year as SupportedYear] ?? YEAR_DATA[SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1]]
}
