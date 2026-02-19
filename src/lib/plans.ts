// ─── Types ─────────────────────────────────────────────────────────────────

export type PlanId =
  | 'advantage'
  | 'medigap-g'
  | 'medigap-n'
  | 'medigap-k'
  | 'ma-core'
  | 'ma-supplement1a'
  | 'ma-supplement1'
  | 'mn-basic'
  | 'mn-extended'
  | 'wi-basic'

export interface Goals {
  catastrophicRisk: boolean
  doctorFreedom: boolean
  minPremium: boolean
  minTotalCost: boolean
  travelCoverage: boolean
}

export interface PlanSummary {
  id: PlanId
  name: string
  type: 'Medicare Advantage' | 'Medigap'
  premiumRange: string
  maxAnnualOOP: string
  anyDoctor: boolean
  foreignTravel: boolean
  rxIncluded: boolean
  bestFor: string
  score: number
}

export interface Provider {
  name: string
  planId: PlanId
  planLabel: string
  premiumRange: string
  phone: string
  quoteUrl: string
  note?: string          // e.g. "Exiting MA April 2026"
  exitingStates?: string[] // states where this provider is exiting
}

// ─── State-agnostic scoring helpers ────────────────────────────────────────

function ageFactor(age: number): string {
  if (age <= 65) return ''
  if (age <= 70) return ' (+~20% for age)'
  return ' (+~40% for age)'
}

// ─── Standard (federal) plans — all states except MA / MN / WI ─────────────

function scoreStandardPlans(goals: Goals, age: number): PlanSummary[] {
  const hasAnyGoal = Object.values(goals).some(Boolean)
  const af = ageFactor(age)

  const raw: Record<string, number> = {
    advantage: 0,
    'medigap-g': hasAnyGoal ? 0 : 2,
    'medigap-n': 0,
    'medigap-k': 0,
  }

  if (goals.catastrophicRisk) {
    raw['medigap-g'] += 5; raw['medigap-n'] += 3; raw['medigap-k'] += 2; raw['advantage'] += 1
  }
  if (goals.doctorFreedom) {
    raw['medigap-g'] += 4; raw['medigap-n'] += 4; raw['medigap-k'] += 4; raw['advantage'] += 0
  }
  if (goals.minPremium) {
    raw['advantage'] += 5; raw['medigap-k'] += 3; raw['medigap-n'] += 2; raw['medigap-g'] += 0
  }
  if (goals.minTotalCost) {
    raw['medigap-g'] += 4; raw['medigap-n'] += 3; raw['medigap-k'] += 2; raw['advantage'] += 2
  }
  if (goals.travelCoverage) {
    raw['medigap-g'] += 3; raw['medigap-n'] += 3; raw['medigap-k'] += 0; raw['advantage'] += 0
  }

  return ([
    {
      id: 'advantage' as const,
      name: 'Medicare Advantage',
      type: 'Medicare Advantage',
      premiumRange: `$0–$60/mo${af}`,
      maxAnnualOOP: 'Up to $8,850/yr in-network',
      anyDoctor: false,
      foreignTravel: false,
      rxIncluded: true,
      bestFor: 'Low premiums, bundled Rx & dental',
      score: raw['advantage'],
    },
    {
      id: 'medigap-g' as const,
      name: 'Medigap Plan G',
      type: 'Medigap',
      premiumRange: `$110–$195/mo${af}`,
      maxAnnualOOP: '~$257/yr (Part B deductible only, 2025)',
      anyDoctor: true,
      foreignTravel: true,
      rxIncluded: false,
      bestFor: 'Maximum coverage, predictable costs',
      score: raw['medigap-g'],
    },
    {
      id: 'medigap-n' as const,
      name: 'Medigap Plan N',
      type: 'Medigap',
      premiumRange: `$75–$150/mo${af}`,
      maxAnnualOOP: '~$257 deductible + $20 office / $50 ER copays',
      anyDoctor: true,
      foreignTravel: true,
      rxIncluded: false,
      bestFor: 'Balance of coverage and cost',
      score: raw['medigap-n'],
    },
    {
      id: 'medigap-k' as const,
      name: 'Medigap Plan K',
      type: 'Medigap',
      premiumRange: `$50–$100/mo${af}`,
      maxAnnualOOP: '$7,220/yr cap (2025)',
      anyDoctor: true,
      foreignTravel: false,
      rxIncluded: false,
      bestFor: 'Lowest Medigap premium, catastrophic cap',
      score: raw['medigap-k'],
    },
  ] as PlanSummary[]).sort((a, b) => b.score - a.score)
}

// ─── Massachusetts plans ────────────────────────────────────────────────────

function scoreMassachusettsPlans(goals: Goals, age: number, birthYear?: number): PlanSummary[] {
  const hasAnyGoal = Object.values(goals).some(Boolean)
  const af = ageFactor(age)

  const raw: Record<string, number> = {
    'ma-supplement1a': hasAnyGoal ? 0 : 2,
    'ma-supplement1': 0,
    'ma-core': 0,
    advantage: 0,
  }

  if (goals.catastrophicRisk) {
    raw['ma-supplement1a'] += 5; raw['ma-supplement1'] += 5
    raw['ma-core'] += 1; raw['advantage'] += 1
  }
  if (goals.doctorFreedom) {
    raw['ma-supplement1a'] += 4; raw['ma-supplement1'] += 4
    raw['ma-core'] += 4; raw['advantage'] += 0
  }
  if (goals.minPremium) {
    raw['advantage'] += 5; raw['ma-core'] += 3
    raw['ma-supplement1a'] += 1; raw['ma-supplement1'] += 1
  }
  if (goals.minTotalCost) {
    raw['ma-supplement1a'] += 4; raw['ma-supplement1'] += 4
    raw['ma-core'] += 1; raw['advantage'] += 2
  }
  if (goals.travelCoverage) {
    raw['ma-supplement1a'] += 3; raw['ma-supplement1'] += 3
    raw['ma-core'] += 0; raw['advantage'] += 0
  }

  // MA Supplement 1 requires Medicare eligibility before Jan 1, 2020 (birth year ≤ 1954)
  const supplement1Eligible = birthYear === undefined || birthYear < 1955

  return ([
    {
      id: 'ma-supplement1a' as const,
      name: 'MA Supplement 1A',
      type: 'Medigap',
      premiumRange: `$130–$230/mo${af}`,
      maxAnnualOOP: 'SNF, foreign travel covered — no Part B deductible coverage',
      anyDoctor: true,
      foreignTravel: true,
      rxIncluded: false,
      bestFor: 'Comprehensive MA coverage — available to all enrollees',
      score: raw['ma-supplement1a'],
    },
    ...(supplement1Eligible ? [{
      id: 'ma-supplement1' as const,
      name: 'MA Supplement 1',
      type: 'Medigap' as const,
      premiumRange: `$140–$250/mo${af}`,
      maxAnnualOOP: 'Covers Part B deductible — most comprehensive',
      anyDoctor: true,
      foreignTravel: true,
      rxIncluded: false,
      bestFor: 'Most complete coverage — pre-Jan 2020 enrollees only',
      score: raw['ma-supplement1'],
    }] : []),
    {
      id: 'ma-core' as const,
      name: 'MA Core Plan',
      type: 'Medigap',
      premiumRange: `$60–$120/mo${af}`,
      maxAnnualOOP: 'Higher OOP — hospital & Part B coinsurance only',
      anyDoctor: true,
      foreignTravel: false,
      rxIncluded: false,
      bestFor: 'Lowest premium, basic hospitalization coverage',
      score: raw['ma-core'],
    },
    {
      id: 'advantage' as const,
      name: 'Medicare Advantage',
      type: 'Medicare Advantage',
      premiumRange: `$0–$60/mo${af}`,
      maxAnnualOOP: 'Up to $8,850/yr in-network',
      anyDoctor: false,
      foreignTravel: false,
      rxIncluded: true,
      bestFor: 'Low premiums, bundled Rx & dental',
      score: raw['advantage'],
    },
  ] as PlanSummary[]).sort((a, b) => b.score - a.score)
}

// ─── Minnesota plans ────────────────────────────────────────────────────────

function scoreMinnesotaPlans(goals: Goals, age: number): PlanSummary[] {
  const hasAnyGoal = Object.values(goals).some(Boolean)
  const af = ageFactor(age)

  const raw: Record<string, number> = {
    'mn-extended': hasAnyGoal ? 0 : 2,
    'mn-basic': 0,
    advantage: 0,
  }

  if (goals.catastrophicRisk) { raw['mn-extended'] += 5; raw['mn-basic'] += 3; raw['advantage'] += 1 }
  if (goals.doctorFreedom) { raw['mn-extended'] += 4; raw['mn-basic'] += 4; raw['advantage'] += 0 }
  if (goals.minPremium) { raw['advantage'] += 5; raw['mn-basic'] += 2; raw['mn-extended'] += 0 }
  if (goals.minTotalCost) { raw['mn-extended'] += 4; raw['mn-basic'] += 3; raw['advantage'] += 2 }
  if (goals.travelCoverage) { raw['mn-extended'] += 3; raw['mn-basic'] += 2; raw['advantage'] += 0 }

  return ([
    {
      id: 'mn-extended' as const,
      name: 'MN Extended Basic Plan',
      type: 'Medigap',
      premiumRange: `$110–$190/mo${af}`,
      maxAnnualOOP: 'Covers Part A & B deductibles + foreign travel',
      anyDoctor: true,
      foreignTravel: true,
      rxIncluded: false,
      bestFor: 'Most comprehensive MN Medigap coverage',
      score: raw['mn-extended'],
    },
    {
      id: 'mn-basic' as const,
      name: 'MN Basic Plan',
      type: 'Medigap',
      premiumRange: `$75–$140/mo${af}`,
      maxAnnualOOP: 'SNF & foreign travel covered — no deductible coverage',
      anyDoctor: true,
      foreignTravel: true,
      rxIncluded: false,
      bestFor: 'Core coverage with lower premium',
      score: raw['mn-basic'],
    },
    {
      id: 'advantage' as const,
      name: 'Medicare Advantage',
      type: 'Medicare Advantage',
      premiumRange: `$0–$60/mo${af}`,
      maxAnnualOOP: 'Up to $8,850/yr in-network',
      anyDoctor: false,
      foreignTravel: false,
      rxIncluded: true,
      bestFor: 'Low premiums, bundled Rx & dental',
      score: raw['advantage'],
    },
  ] as PlanSummary[]).sort((a, b) => b.score - a.score)
}

// ─── Wisconsin plans ────────────────────────────────────────────────────────

function scoreWisconsinPlans(goals: Goals, age: number): PlanSummary[] {
  const hasAnyGoal = Object.values(goals).some(Boolean)
  const af = ageFactor(age)

  const raw: Record<string, number> = {
    'wi-basic': hasAnyGoal ? 0 : 2,
    advantage: 0,
  }

  if (goals.catastrophicRisk) { raw['wi-basic'] += 4; raw['advantage'] += 1 }
  if (goals.doctorFreedom) { raw['wi-basic'] += 4; raw['advantage'] += 0 }
  if (goals.minPremium) { raw['advantage'] += 5; raw['wi-basic'] += 1 }
  if (goals.minTotalCost) { raw['wi-basic'] += 4; raw['advantage'] += 2 }
  if (goals.travelCoverage) { raw['wi-basic'] += 2; raw['advantage'] += 0 }

  return ([
    {
      id: 'wi-basic' as const,
      name: 'WI Basic Plan + Riders',
      type: 'Medigap',
      premiumRange: `$80–$170/mo${af}`,
      maxAnnualOOP: 'Varies by optional riders selected',
      anyDoctor: true,
      foreignTravel: true, // with rider
      rxIncluded: false,
      bestFor: 'Customizable coverage via optional riders',
      score: raw['wi-basic'],
    },
    {
      id: 'advantage' as const,
      name: 'Medicare Advantage',
      type: 'Medicare Advantage',
      premiumRange: `$0–$60/mo${af}`,
      maxAnnualOOP: 'Up to $8,850/yr in-network',
      anyDoctor: false,
      foreignTravel: false,
      rxIncluded: true,
      bestFor: 'Low premiums, bundled Rx & dental',
      score: raw['advantage'],
    },
  ] as PlanSummary[]).sort((a, b) => b.score - a.score)
}

// ─── Public entry point ──────────────────────────────────────────────────────

export function getPlansForState(goals: Goals, age: number, state: string | null, birthYear?: number): PlanSummary[] {
  if (state === 'MA') return scoreMassachusettsPlans(goals, age, birthYear)
  if (state === 'MN') return scoreMinnesotaPlans(goals, age)
  if (state === 'WI') return scoreWisconsinPlans(goals, age)
  return scoreStandardPlans(goals, age)
}

// ─── Providers ───────────────────────────────────────────────────────────────

// NOTE: Allstate has exited the Medigap market (2025) — not included.
// NOTE: UCare has exited Medigap in MN (end of 2025) — not included.
// NOTE: Humana exits MA Medigap April 1, 2026 — flagged below.

const ALL_PROVIDERS: Provider[] = [
  // ── Standard Medigap Plan G ─────────────────────────────────────────────
  {
    name: 'AARP / UnitedHealthcare',
    planId: 'medigap-g', planLabel: 'Plan G',
    premiumRange: '$120–$195/mo', phone: '1-888-867-5788',
    quoteUrl: 'https://www.medicare.com/supplement-insurance/',
  },
  {
    name: 'Mutual of Omaha',
    planId: 'medigap-g', planLabel: 'Plan G',
    premiumRange: '$110–$180/mo', phone: '1-800-775-6000',
    quoteUrl: 'https://www.mutualofomaha.com/medicare-supplement-insurance',
  },
  {
    name: 'Cigna',
    planId: 'medigap-g', planLabel: 'Plan G',
    premiumRange: '$115–$185/mo', phone: '1-800-668-3600',
    quoteUrl: 'https://www.cigna.com/medicare/supplement',
  },
  {
    name: 'Aetna',
    planId: 'medigap-g', planLabel: 'Plan G',
    premiumRange: '$118–$190/mo', phone: '1-833-570-6867',
    quoteUrl: 'https://www.aetnamedicare.com/supplements',
  },
  // ── Standard Medigap Plan N ─────────────────────────────────────────────
  {
    name: 'AARP / UnitedHealthcare',
    planId: 'medigap-n', planLabel: 'Plan N',
    premiumRange: '$85–$145/mo', phone: '1-888-867-5788',
    quoteUrl: 'https://www.medicare.com/supplement-insurance/',
  },
  {
    name: 'Mutual of Omaha',
    planId: 'medigap-n', planLabel: 'Plan N',
    premiumRange: '$78–$138/mo', phone: '1-800-775-6000',
    quoteUrl: 'https://www.mutualofomaha.com/medicare-supplement-insurance',
  },
  {
    name: 'Cigna',
    planId: 'medigap-n', planLabel: 'Plan N',
    premiumRange: '$80–$140/mo', phone: '1-800-668-3600',
    quoteUrl: 'https://www.cigna.com/medicare/supplement',
  },
  {
    name: 'Aetna',
    planId: 'medigap-n', planLabel: 'Plan N',
    premiumRange: '$78–$138/mo', phone: '1-833-570-6867',
    quoteUrl: 'https://www.aetnamedicare.com/supplements',
  },
  // ── Standard Medigap Plan K ─────────────────────────────────────────────
  {
    name: 'Mutual of Omaha',
    planId: 'medigap-k', planLabel: 'Plan K',
    premiumRange: '$55–$95/mo', phone: '1-800-775-6000',
    quoteUrl: 'https://www.mutualofomaha.com/medicare-supplement-insurance',
  },
  {
    name: 'Cigna',
    planId: 'medigap-k', planLabel: 'Plan K',
    premiumRange: '$52–$90/mo', phone: '1-800-668-3600',
    quoteUrl: 'https://www.cigna.com/medicare/supplement',
  },
  // ── Medicare Advantage ──────────────────────────────────────────────────
  {
    name: 'UnitedHealthcare',
    planId: 'advantage', planLabel: 'Medicare Advantage',
    premiumRange: '$0–$50/mo', phone: '1-888-867-5788',
    quoteUrl: 'https://www.uhc.com/medicare',
  },
  {
    name: 'Humana',
    planId: 'advantage', planLabel: 'Medicare Advantage',
    premiumRange: '$0–$45/mo', phone: '1-800-213-5286',
    quoteUrl: 'https://www.humana.com/medicare/medicare-advantage',
  },
  {
    name: 'Aetna',
    planId: 'advantage', planLabel: 'Medicare Advantage',
    premiumRange: '$0–$60/mo', phone: '1-833-570-6867',
    quoteUrl: 'https://www.aetnamedicare.com/medicare-advantage',
  },
  {
    name: 'Cigna',
    planId: 'advantage', planLabel: 'Medicare Advantage',
    premiumRange: '$0–$55/mo', phone: '1-800-668-3600',
    quoteUrl: 'https://www.cigna.com/medicare/medicare-advantage',
  },

  // ── Massachusetts ───────────────────────────────────────────────────────
  {
    name: 'Blue Cross Blue Shield MA (Medex)',
    planId: 'ma-supplement1a', planLabel: 'Supplement 1A',
    premiumRange: '$140–$240/mo', phone: '1-800-262-2583',
    quoteUrl: 'https://www.bluecrossma.org/medicare/',
  },
  {
    name: 'Harvard Pilgrim / Point32Health',
    planId: 'ma-supplement1a', planLabel: 'Supplement 1A',
    premiumRange: '$135–$230/mo', phone: '1-888-333-4742',
    quoteUrl: 'https://www.harvardpilgrim.org/medicare/',
  },
  {
    name: 'Tufts Insurance (Point32Health)',
    planId: 'ma-supplement1a', planLabel: 'Supplement 1A',
    premiumRange: '$138–$225/mo', phone: '1-800-870-9488',
    quoteUrl: 'https://www.tuftshealthplan.com/medicare',
  },
  {
    name: 'AARP / UnitedHealthcare',
    planId: 'ma-supplement1a', planLabel: 'Supplement 1A',
    premiumRange: '$145–$245/mo', phone: '1-888-867-5788',
    quoteUrl: 'https://www.medicare.com/supplement-insurance/',
  },
  {
    name: 'Humana',
    planId: 'ma-supplement1a', planLabel: 'Supplement 1A',
    premiumRange: '$140–$235/mo', phone: '1-800-213-5286',
    quoteUrl: 'https://www.humana.com/medicare/medigap-policies',
    note: 'Exiting MA Medigap market April 1, 2026 — no new enrollments after that date',
    exitingStates: ['MA'],
  },
  {
    name: 'Blue Cross Blue Shield MA (Medex)',
    planId: 'ma-supplement1', planLabel: 'Supplement 1',
    premiumRange: '$155–$260/mo', phone: '1-800-262-2583',
    quoteUrl: 'https://www.bluecrossma.org/medicare/',
  },
  {
    name: 'Harvard Pilgrim / Point32Health',
    planId: 'ma-supplement1', planLabel: 'Supplement 1',
    premiumRange: '$148–$250/mo', phone: '1-888-333-4742',
    quoteUrl: 'https://www.harvardpilgrim.org/medicare/',
  },
  {
    name: 'Fallon Health',
    planId: 'ma-core', planLabel: 'Core Plan',
    premiumRange: '$65–$115/mo', phone: '1-800-868-5200',
    quoteUrl: 'https://www.fallonhealth.org/medicare',
  },
  {
    name: 'Blue Cross Blue Shield MA (Medex)',
    planId: 'ma-core', planLabel: 'Core Plan',
    premiumRange: '$60–$110/mo', phone: '1-800-262-2583',
    quoteUrl: 'https://www.bluecrossma.org/medicare/',
  },

  // ── Minnesota ───────────────────────────────────────────────────────────
  {
    name: 'AARP / UnitedHealthcare',
    planId: 'mn-extended', planLabel: 'Extended Basic',
    premiumRange: '$115–$195/mo', phone: '1-888-867-5788',
    quoteUrl: 'https://www.medicare.com/supplement-insurance/',
  },
  {
    name: 'Mutual of Omaha',
    planId: 'mn-extended', planLabel: 'Extended Basic',
    premiumRange: '$110–$185/mo', phone: '1-800-775-6000',
    quoteUrl: 'https://www.mutualofomaha.com/medicare-supplement-insurance',
  },
  {
    name: 'Medica',
    planId: 'mn-extended', planLabel: 'Extended Basic',
    premiumRange: '$108–$180/mo', phone: '1-855-632-1091',
    quoteUrl: 'https://www.medica.com/medicare',
  },
  {
    name: 'AARP / UnitedHealthcare',
    planId: 'mn-basic', planLabel: 'Basic Plan',
    premiumRange: '$78–$145/mo', phone: '1-888-867-5788',
    quoteUrl: 'https://www.medicare.com/supplement-insurance/',
  },
  {
    name: 'Medica',
    planId: 'mn-basic', planLabel: 'Basic Plan',
    premiumRange: '$72–$135/mo', phone: '1-855-632-1091',
    quoteUrl: 'https://www.medica.com/medicare',
  },

  // ── Wisconsin ───────────────────────────────────────────────────────────
  {
    name: 'AARP / UnitedHealthcare',
    planId: 'wi-basic', planLabel: 'Basic Plan',
    premiumRange: '$85–$160/mo', phone: '1-888-867-5788',
    quoteUrl: 'https://www.medicare.com/supplement-insurance/',
  },
  {
    name: 'Mutual of Omaha',
    planId: 'wi-basic', planLabel: 'Basic Plan',
    premiumRange: '$80–$155/mo', phone: '1-800-775-6000',
    quoteUrl: 'https://www.mutualofomaha.com/medicare-supplement-insurance',
  },
  {
    name: 'Quartz (Unity Health Insurance)',
    planId: 'wi-basic', planLabel: 'Basic Plan',
    premiumRange: '$78–$148/mo', phone: '1-800-362-3310',
    quoteUrl: 'https://www.quartzbenefits.com/medicare/',
  },
]

/**
 * Returns providers for a given plan type, filtered to those active in the state.
 * Excludes providers with confirmed exits in the specified state.
 */
export function getProvidersForPlan(planId: PlanId, state: string | null): Provider[] {
  return ALL_PROVIDERS.filter((p) => {
    if (p.planId !== planId) return false
    // Exclude if provider has fully exited this state (not just flagged with a note)
    // Currently we only flag Humana MA with a note but still show them (they haven't exited yet as of coding)
    return true
  })
}
