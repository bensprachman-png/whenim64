/** Maps a US ZIP code to its two-letter state abbreviation using prefix ranges. */
export function zipToState(zip: string): string | null {
  const clean = zip.replace(/\D/g, '')
  if (clean.length < 5) return null
  const p = parseInt(clean.slice(0, 3), 10)

  if (p >= 10 && p <= 26) return 'MA'
  if (p >= 27 && p <= 29) return 'RI'
  if (p >= 30 && p <= 38) return 'NH'
  if (p >= 39 && p <= 49) return 'ME'
  if (p >= 50 && p <= 59) return 'VT'
  if (p >= 60 && p <= 69) return 'CT'
  if (p >= 70 && p <= 89) return 'NJ'
  if (p >= 100 && p <= 149) return 'NY'
  if (p >= 150 && p <= 196) return 'PA'
  if (p >= 197 && p <= 199) return 'DE'
  if (p >= 200 && p <= 205) return 'DC'
  if (p >= 206 && p <= 219) return 'MD'
  if (p >= 220 && p <= 246) return 'VA'
  if (p >= 247 && p <= 268) return 'WV'
  if (p >= 270 && p <= 289) return 'NC'
  if (p >= 290 && p <= 299) return 'SC'
  if (p >= 300 && p <= 319) return 'GA'
  if (p >= 320 && p <= 349) return 'FL'
  if (p >= 350 && p <= 369) return 'AL'
  if (p >= 370 && p <= 385) return 'TN'
  if (p >= 386 && p <= 397) return 'MS'
  if (p >= 398 && p <= 399) return 'GA'
  if (p >= 400 && p <= 427) return 'KY'
  if (p >= 430 && p <= 458) return 'OH'
  if (p >= 460 && p <= 479) return 'IN'
  if (p >= 480 && p <= 499) return 'MI'
  if (p >= 500 && p <= 528) return 'IA'
  if (p >= 530 && p <= 549) return 'WI'
  if (p >= 550 && p <= 567) return 'MN'
  if (p >= 570 && p <= 577) return 'SD'
  if (p >= 580 && p <= 588) return 'ND'
  if (p >= 590 && p <= 599) return 'MT'
  if (p >= 600 && p <= 629) return 'IL'
  if (p >= 630 && p <= 658) return 'MO'
  if (p >= 660 && p <= 679) return 'KS'
  if (p >= 680 && p <= 693) return 'NE'
  if (p >= 700 && p <= 714) return 'LA'
  if (p >= 716 && p <= 729) return 'AR'
  if (p >= 730 && p <= 749) return 'OK'
  if (p >= 750 && p <= 799) return 'TX'
  if (p >= 800 && p <= 816) return 'CO'
  if (p >= 820 && p <= 831) return 'WY'
  if (p >= 832 && p <= 838) return 'ID'
  if (p >= 840 && p <= 847) return 'UT'
  if (p >= 850 && p <= 865) return 'AZ'
  if (p >= 870 && p <= 884) return 'NM'
  if (p === 885) return 'TX'
  if (p >= 889 && p <= 898) return 'NV'
  if (p >= 900 && p <= 966) return 'CA'
  if (p >= 967 && p <= 969) return 'HI'
  if (p >= 970 && p <= 979) return 'OR'
  if (p >= 980 && p <= 994) return 'WA'
  if (p >= 995 && p <= 999) return 'AK'

  return null
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

export function getStateName(abbr: string): string {
  return STATE_NAMES[abbr] ?? abbr
}

/** MA, MN, and WI do not use the standard federal Medigap plan letters (A–N). */
export function isNonStandardMedigapState(state: string): boolean {
  return state === 'MA' || state === 'MN' || state === 'WI'
}
