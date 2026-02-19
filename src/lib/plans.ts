export type PlanId = 'advantage' | 'medigap-g' | 'medigap-n' | 'medigap-k'

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
  premiumRange: string     // estimated monthly
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
}

// Score each plan 0-20 based on selected goals
export function scorePlans(goals: Goals, age = 65): PlanSummary[] {
  const hasAnyGoal = Object.values(goals).some(Boolean)

  const raw: Record<PlanId, number> = {
    'advantage': 0,
    'medigap-g': hasAnyGoal ? 0 : 2, // default slight preference for G if no goals
    'medigap-n': 0,
    'medigap-k': 0,
  }

  if (goals.catastrophicRisk) {
    raw['medigap-g'] += 5
    raw['medigap-n'] += 3
    raw['medigap-k'] += 2
    raw['advantage'] += 1
  }
  if (goals.doctorFreedom) {
    raw['medigap-g'] += 4
    raw['medigap-n'] += 4
    raw['medigap-k'] += 4
    raw['advantage'] += 0
  }
  if (goals.minPremium) {
    raw['advantage'] += 5
    raw['medigap-k'] += 3
    raw['medigap-n'] += 2
    raw['medigap-g'] += 0
  }
  if (goals.minTotalCost) {
    raw['medigap-g'] += 4
    raw['medigap-n'] += 3
    raw['medigap-k'] += 2
    raw['advantage'] += 2
  }
  if (goals.travelCoverage) {
    raw['medigap-g'] += 3
    raw['medigap-n'] += 3
    raw['medigap-k'] += 0
    raw['advantage'] += 0
  }

  // Age-adjusted premium ranges (rough estimates — actual quotes vary by state, gender, tobacco)
  const ageFactor = age <= 65 ? '' : age <= 70 ? ' (+~20% for age)' : ' (+~40% for age)'

  return ([
    {
      id: 'advantage' as const,
      name: 'Medicare Advantage',
      type: 'Medicare Advantage',
      premiumRange: `$0–$60/mo${ageFactor}`,
      maxAnnualOOP: 'Up to $8,850/yr',
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
      premiumRange: `$110–$195/mo${ageFactor}`,
      maxAnnualOOP: '~$240/yr (Part B deductible only)',
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
      premiumRange: `$75–$150/mo${ageFactor}`,
      maxAnnualOOP: '~$240 deductible + copays',
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
      premiumRange: `$50–$100/mo${ageFactor}`,
      maxAnnualOOP: '$7,220/yr cap (2025)',
      anyDoctor: true,
      foreignTravel: false,
      rxIncluded: false,
      bestFor: 'Lowest Medigap premium, catastrophic cap',
      score: raw['medigap-k'],
    },
  ] as PlanSummary[]).sort((a, b) => b.score - a.score)
}

export const PROVIDERS: Provider[] = [
  // Medigap Plan G
  {
    name: 'AARP / UnitedHealthcare',
    planId: 'medigap-g',
    planLabel: 'Plan G',
    premiumRange: '$120–$195/mo',
    phone: '1-888-867-5788',
    quoteUrl: 'https://www.medicare.com/supplement-insurance/',
  },
  {
    name: 'Mutual of Omaha',
    planId: 'medigap-g',
    planLabel: 'Plan G',
    premiumRange: '$110–$180/mo',
    phone: '1-800-775-6000',
    quoteUrl: 'https://www.mutualofomaha.com/medicare-supplement-insurance',
  },
  {
    name: 'Cigna',
    planId: 'medigap-g',
    planLabel: 'Plan G',
    premiumRange: '$115–$185/mo',
    phone: '1-800-668-3600',
    quoteUrl: 'https://www.cigna.com/medicare/supplement',
  },
  {
    name: 'Humana',
    planId: 'medigap-g',
    planLabel: 'Plan G',
    premiumRange: '$118–$190/mo',
    phone: '1-800-213-5286',
    quoteUrl: 'https://www.humana.com/medicare/medigap-policies',
  },
  // Medigap Plan N
  {
    name: 'AARP / UnitedHealthcare',
    planId: 'medigap-n',
    planLabel: 'Plan N',
    premiumRange: '$85–$145/mo',
    phone: '1-888-867-5788',
    quoteUrl: 'https://www.medicare.com/supplement-insurance/',
  },
  {
    name: 'Mutual of Omaha',
    planId: 'medigap-n',
    planLabel: 'Plan N',
    premiumRange: '$78–$138/mo',
    phone: '1-800-775-6000',
    quoteUrl: 'https://www.mutualofomaha.com/medicare-supplement-insurance',
  },
  {
    name: 'Aetna',
    planId: 'medigap-n',
    planLabel: 'Plan N',
    premiumRange: '$80–$140/mo',
    phone: '1-833-570-6867',
    quoteUrl: 'https://www.aetnamedicare.com/supplements',
  },
  // Medigap Plan K
  {
    name: 'Mutual of Omaha',
    planId: 'medigap-k',
    planLabel: 'Plan K',
    premiumRange: '$55–$95/mo',
    phone: '1-800-775-6000',
    quoteUrl: 'https://www.mutualofomaha.com/medicare-supplement-insurance',
  },
  {
    name: 'Cigna',
    planId: 'medigap-k',
    planLabel: 'Plan K',
    premiumRange: '$52–$90/mo',
    phone: '1-800-668-3600',
    quoteUrl: 'https://www.cigna.com/medicare/supplement',
  },
  // Medicare Advantage
  {
    name: 'UnitedHealthcare',
    planId: 'advantage',
    planLabel: 'Medicare Advantage',
    premiumRange: '$0–$50/mo',
    phone: '1-888-867-5788',
    quoteUrl: 'https://www.uhc.com/medicare',
  },
  {
    name: 'Humana',
    planId: 'advantage',
    planLabel: 'Medicare Advantage',
    premiumRange: '$0–$45/mo',
    phone: '1-800-213-5286',
    quoteUrl: 'https://www.humana.com/medicare/medicare-advantage',
  },
  {
    name: 'Aetna',
    planId: 'advantage',
    planLabel: 'Medicare Advantage',
    premiumRange: '$0–$60/mo',
    phone: '1-833-570-6867',
    quoteUrl: 'https://www.aetnamedicare.com/medicare-advantage',
  },
  {
    name: 'Cigna',
    planId: 'advantage',
    planLabel: 'Medicare Advantage',
    premiumRange: '$0–$55/mo',
    phone: '1-800-668-3600',
    quoteUrl: 'https://www.cigna.com/medicare/medicare-advantage',
  },
]
