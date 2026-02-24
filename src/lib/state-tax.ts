// State income tax estimation for retirement income.
// Rates are approximate effective rates on ordinary retirement income
// (IRA distributions, pensions, interest) after typical state-level
// exemptions and deductions for retirees. Treat as estimates only.

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

// ─── Effective state tax rates on retirement ordinary income ──────────────────
// These are approximate effective rates after typical senior exemptions.
// Sources: state DOR publications, Tax Foundation, AARP state tax guides (2024–2025).
const STATE_RATES: Record<string, number> = {
  // No state income tax
  AK: 0.000, FL: 0.000, NV: 0.000, SD: 0.000,
  TN: 0.000, TX: 0.000, WA: 0.000, WY: 0.000,
  NH: 0.000, // dividend/interest tax fully repealed 2025

  // Broad retirement income exemptions → near-zero effective rate
  IL: 0.000, // 4.95% flat but all retirement income (IRA, pension, SS) exempt
  MS: 0.000, // 5% flat but all retirement income exempt
  PA: 0.000, // 3.07% flat but all retirement income (IRA, pension, SS) exempt
  IA: 0.000, // all retirement income exempt for those 55+ starting 2023

  // Low effective rates
  AZ: 0.025, // 2.5% flat (2023+); small deduction for SS
  IN: 0.030, // 3.05% flat
  AL: 0.030, // SS + most pensions exempt; ~3% on IRA distributions
  LA: 0.030, // ~3% effective after flat rate reform and exemptions
  ND: 0.020, // 2.5% flat; SS largely exempt
  OH: 0.030, // graduated to 3.5%; senior/retirement credits
  CO: 0.035, // 4.4% flat but $24k pension/IRA senior deduction
  KY: 0.040, // 4% flat; $31k pension exemption
  GA: 0.040, // graduated to 5.75%; $35k retirement exclusion per person (65+)
  AR: 0.039, // 3.9% flat (2024); some retirement exemptions
  MO: 0.040, // graduated to 4.95%; broad SS/pension exemptions
  SC: 0.040, // graduated to 6.4%; large senior deductions
  DE: 0.046, // graduated to 6.6%; $12.5k pension exclusion
  NJ: 0.020, // graduated to 10.75%; $100k pension exclusion for couples
  MI: 0.042, // 4.25%; phasing in retirement exemptions
  NC: 0.045, // 4.5% flat; SS exempt
  OK: 0.040, // graduated to 4.75%; $10k pension exemption
  MA: 0.050, // 5% flat; SS and some pension exempt
  MD: 0.048, // graduated to 5.75%; SS exempt; $34.5k pension exclusion
  UT: 0.047, // 4.65% flat; retirement credit for lower incomes
  ME: 0.055, // graduated to 7.15%; $35k pension/SS exclusion
  NM: 0.049, // graduated to 5.9%
  KS: 0.049, // graduated to 5.7%; SS exempt at lower incomes
  NE: 0.053, // graduated to 5.84%; SS phasing toward full exemption
  VA: 0.050, // graduated to 5.75%; SS exempt; $12k age deduction
  WV: 0.050, // graduated to 6.5%; SS exempt
  ID: 0.058, // 5.8% flat
  MT: 0.059, // 5.9% flat (2024); some retirement deductions
  RI: 0.049, // graduated to 5.99%; some retirement exemptions
  NY: 0.060, // graduated to 10.9%; $20k pension exclusion; SS exempt
  CT: 0.055, // graduated to 6.99%; SS exempt for incomes under threshold
  WI: 0.065, // graduated to 7.65%
  VT: 0.070, // graduated to 8.75%; partial SS exemption
  MN: 0.070, // graduated to 9.85%; partial SS exemption
  HI: 0.070, // graduated to 11%; small pension exclusion
  OR: 0.090, // graduated to 9.9%; SS exempt; federal pension credit
  CA: 0.093, // graduated to 13.3%; SS exempt
  DC: 0.085, // graduated to 10.75%; SS exempt
}

/** Returns the estimated effective state income tax rate (0–1) for a given zip code.
 *  Rates are approximate after typical senior exemptions. Returns 0 for unknown zips. */
export function getStateTaxRate(zipCode: string): number {
  const state = zipToState(zipCode)
  if (!state) return 0
  return STATE_RATES[state] ?? 0
}

/** Returns the state code and display info for a zip code. */
export function getStateInfo(zipCode: string): { code: string; name: string; rate: number } | null {
  const code = zipToState(zipCode)
  if (!code) return null
  const rate = STATE_RATES[code] ?? 0
  return { code, name: getStateName(code), rate }
}
