// State income tax estimation for retirement income.
// Each entry has:
//   rate             — statutory flat/effective rate applied to taxable income
//   retirementExempt — true when SS benefits and qualified IRA/401k/pension
//                      distributions are exempt from state tax; only W2 wages,
//                      investment income, and other non-retirement income are taxed.
// Sources: state DOR publications, Tax Foundation, AARP state tax guides (2024–2025).

// ─── Zip code → state mapping ─────────────────────────────────────────────────
// Sorted [start3, end3, stateCode] — first 3 digits of the zip code.
const ZIP3_RANGES: [number, number, string][] = [
  [10,  27,  'MA'], [28,  29,  'RI'], [30,  38,  'NH'],
  [39,  49,  'ME'], [50,  59,  'VT'], [60,  69,  'CT'],
  [70,  89,  'NJ'],
  [100, 149, 'NY'], [150, 196, 'PA'], [197, 199, 'DE'],
  [200, 205, 'DC'], [206, 212, 'MD'], [214, 219, 'MD'],
  [220, 246, 'VA'], [247, 268, 'WV'], [270, 289, 'NC'],
  [290, 299, 'SC'], [300, 319, 'GA'], [320, 349, 'FL'],
  [350, 369, 'AL'], [370, 385, 'TN'], [386, 397, 'MS'],
  [398, 399, 'GA'], [400, 427, 'KY'], [430, 459, 'OH'],
  [460, 479, 'IN'], [480, 499, 'MI'], [500, 528, 'IA'],
  [530, 549, 'WI'], [550, 567, 'MN'], [570, 577, 'SD'],
  [580, 588, 'ND'], [590, 599, 'MT'], [600, 631, 'IL'],
  [632, 658, 'MO'], [660, 679, 'KS'], [680, 693, 'NE'],
  [700, 714, 'LA'], [716, 729, 'AR'], [730, 749, 'OK'],
  [750, 799, 'TX'], [800, 816, 'CO'], [820, 831, 'WY'],
  [832, 838, 'ID'], [840, 847, 'UT'], [850, 865, 'AZ'],
  [870, 884, 'NM'], [889, 898, 'NV'], [900, 961, 'CA'],
  [967, 968, 'HI'], [970, 979, 'OR'], [980, 994, 'WA'],
  [995, 999, 'AK'],
]

export function zipToState(zip: string): string | null {
  const digits = zip.replace(/\D/g, '').padStart(5, '0')
  const prefix = parseInt(digits.slice(0, 3), 10)
  for (const [lo, hi, state] of ZIP3_RANGES) {
    if (prefix >= lo && prefix <= hi) return state
  }
  return null
}

// ─── State names ──────────────────────────────────────────────────────────────
const STATE_NAMES: Record<string, string> = {
  AK: 'Alaska', AL: 'Alabama', AR: 'Arkansas', AZ: 'Arizona',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DC: 'D.C.',
  DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
  IA: 'Iowa', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', MA: 'Massachusetts',
  MD: 'Maryland', ME: 'Maine', MI: 'Michigan', MN: 'Minnesota',
  MO: 'Missouri', MS: 'Mississippi', MT: 'Montana', NC: 'North Carolina',
  ND: 'North Dakota', NE: 'Nebraska', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NV: 'Nevada', NY: 'New York', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VA: 'Virginia', VT: 'Vermont', WA: 'Washington',
  WI: 'Wisconsin', WV: 'West Virginia', WY: 'Wyoming',
}

export function getStateName(stateCode: string): string {
  return STATE_NAMES[stateCode] ?? stateCode
}

// ─── State tax data ────────────────────────────────────────────────────────────
const STATE_DATA: Record<string, { rate: number; retirementExempt: boolean }> = {
  // No state income tax
  AK: { rate: 0.000, retirementExempt: false },
  FL: { rate: 0.000, retirementExempt: false },
  NV: { rate: 0.000, retirementExempt: false },
  SD: { rate: 0.000, retirementExempt: false },
  TN: { rate: 0.000, retirementExempt: false },
  TX: { rate: 0.000, retirementExempt: false },
  WA: { rate: 0.000, retirementExempt: false },
  WY: { rate: 0.000, retirementExempt: false },
  NH: { rate: 0.000, retirementExempt: false }, // dividend/interest tax fully repealed 2025

  // States with broad retirement income exemptions:
  // SS benefits and qualified IRA/401k/pension distributions are exempt.
  // W2 wages, investment income, and non-qualified income are still taxable.
  IL: { rate: 0.0495, retirementExempt: true }, // 4.95% flat; all retirement income exempt
  MS: { rate: 0.050,  retirementExempt: true }, // 5% flat; all retirement income exempt
  PA: { rate: 0.0307, retirementExempt: true }, // 3.07% flat; all retirement income exempt
  IA: { rate: 0.038,  retirementExempt: true }, // 3.8% flat; all retirement income exempt for 55+

  // All other states — rate is approximate effective rate for a retiree
  // (after typical senior deductions; SS usually excluded where noted)
  AZ: { rate: 0.025, retirementExempt: false }, // 2.5% flat (2023+)
  IN: { rate: 0.030, retirementExempt: false }, // 3.05% flat
  AL: { rate: 0.030, retirementExempt: false }, // SS + most pensions exempt; ~3% on IRA
  LA: { rate: 0.030, retirementExempt: false }, // ~3% effective after flat rate reform
  ND: { rate: 0.020, retirementExempt: false }, // 2.5% flat; SS largely exempt
  OH: { rate: 0.030, retirementExempt: false }, // graduated to 3.5%; senior credits
  CO: { rate: 0.035, retirementExempt: false }, // 4.4% flat; $24k pension/IRA senior deduction
  KY: { rate: 0.040, retirementExempt: false }, // 4% flat; $31k pension exemption
  GA: { rate: 0.040, retirementExempt: false }, // graduated to 5.75%; $35k retirement exclusion (65+)
  AR: { rate: 0.039, retirementExempt: false }, // 3.9% flat (2024); some retirement exemptions
  MO: { rate: 0.040, retirementExempt: false }, // graduated to 4.95%; broad SS/pension exemptions
  SC: { rate: 0.040, retirementExempt: false }, // graduated to 6.4%; large senior deductions
  DE: { rate: 0.046, retirementExempt: false }, // graduated to 6.6%; $12.5k pension exclusion
  NJ: { rate: 0.020, retirementExempt: false }, // graduated to 10.75%; $100k pension exclusion for couples
  MI: { rate: 0.042, retirementExempt: false }, // 4.25%; phasing in retirement exemptions
  NC: { rate: 0.045, retirementExempt: false }, // 4.5% flat; SS exempt
  OK: { rate: 0.040, retirementExempt: false }, // graduated to 4.75%; $10k pension exemption
  MA: { rate: 0.050, retirementExempt: false }, // 5% flat; SS and some pension exempt
  MD: { rate: 0.048, retirementExempt: false }, // graduated to 5.75%; SS exempt; $34.5k pension exclusion
  UT: { rate: 0.047, retirementExempt: false }, // 4.65% flat; retirement credit for lower incomes
  ME: { rate: 0.055, retirementExempt: false }, // graduated to 7.15%; $35k pension/SS exclusion
  NM: { rate: 0.049, retirementExempt: false }, // graduated to 5.9%
  KS: { rate: 0.049, retirementExempt: false }, // graduated to 5.7%; SS exempt at lower incomes
  NE: { rate: 0.053, retirementExempt: false }, // graduated to 5.84%; SS phasing toward full exemption
  VA: { rate: 0.050, retirementExempt: false }, // graduated to 5.75%; SS exempt; $12k age deduction
  WV: { rate: 0.050, retirementExempt: false }, // graduated to 6.5%; SS exempt
  ID: { rate: 0.058, retirementExempt: false }, // 5.8% flat
  MT: { rate: 0.059, retirementExempt: false }, // 5.9% flat (2024); some retirement deductions
  RI: { rate: 0.049, retirementExempt: false }, // graduated to 5.99%; some retirement exemptions
  NY: { rate: 0.060, retirementExempt: false }, // graduated to 10.9%; $20k pension exclusion; SS exempt
  CT: { rate: 0.055, retirementExempt: false }, // graduated to 6.99%; SS exempt under threshold
  WI: { rate: 0.065, retirementExempt: false }, // graduated to 7.65%
  VT: { rate: 0.070, retirementExempt: false }, // graduated to 8.75%; partial SS exemption
  MN: { rate: 0.070, retirementExempt: false }, // graduated to 9.85%; partial SS exemption
  HI: { rate: 0.070, retirementExempt: false }, // graduated to 11%; small pension exclusion
  OR: { rate: 0.090, retirementExempt: false }, // graduated to 9.9%; SS exempt; federal pension credit
  CA: { rate: 0.093, retirementExempt: false }, // graduated to 13.3%; SS exempt
  DC: { rate: 0.085, retirementExempt: false }, // graduated to 10.75%; SS exempt
}

/** Returns the estimated effective state income tax rate (0–1) for a given zip code.
 *  For states with retirement income exemptions, returns the statutory rate
 *  (caller should also check retirementExempt via getStateInfo). */
export function getStateTaxRate(zipCode: string): number {
  const state = zipToState(zipCode)
  if (!state) return 0
  return STATE_DATA[state]?.rate ?? 0
}

/** Returns state code, display name, tax rate, and whether retirement income
 *  (SS benefits + IRA/401k/pension distributions) is exempt from state tax. */
export function getStateInfo(zipCode: string): { code: string; name: string; rate: number; retirementExempt: boolean } | null {
  const code = zipToState(zipCode)
  if (!code) return null
  const data = STATE_DATA[code]
  if (!data) return null
  return { code, name: getStateName(code), rate: data.rate, retirementExempt: data.retirementExempt }
}
