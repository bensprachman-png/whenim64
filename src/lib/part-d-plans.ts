/**
 * Part D plan data — static reference for 2025 plan year.
 *
 * Data sources: KFF 2025 Part D Landscape analysis, CMS Medicare Plan Finder,
 * NCOA 2025 cost-sharing data, individual plan Summary of Benefits (SBs).
 *
 * Update process: CMS publishes quarterly formulary/pricing files at catalog.data.gov
 * and a monthly plan database at medicare.gov/download/downloaddb.asp.
 * Update constants here each fall during AEP when new plan-year data is available.
 */

export interface PlanArchetype {
  label: string
  premiumRange: string
  typicalPremium: number  // monthly, used for annual calculations
  deductible: number
  tier1: string
  tier2: string
  tier3: string
  tier4: string
  tier5: string
  example: string
}

export const PLAN_ARCHETYPES: PlanArchetype[] = [
  {
    label: 'Low-Premium Plan',
    premiumRange: '$0–$15/mo',
    typicalPremium: 5,
    deductible: 590,
    tier1: '$0',
    tier2: '$5',
    tier3: '$47',
    tier4: '40%',
    tier5: '25%',
    example: 'e.g. WellCare Value Script, SilverScript SmartSaver',
  },
  {
    label: 'Mid-Premium Plan',
    premiumRange: '~$35/mo',
    typicalPremium: 35,
    deductible: 100,
    tier1: '$0',
    tier2: '$8',
    tier3: '$40',
    tier4: '35%',
    tier5: '25%',
    example: 'e.g. AARP MedicareRx Walgreens, Cigna Saver Rx',
  },
  {
    label: 'High-Premium Plan',
    premiumRange: '~$150/mo',
    typicalPremium: 150,
    deductible: 0,
    tier1: '$0',
    tier2: '$0',
    tier3: '$25',
    tier4: '25%',
    tier5: '25%',
    example: 'e.g. AARP MedicareRx Preferred, Humana Premier Rx',
  },
]

export interface PlanRow {
  planLabel: string
  annualDrugOOP: number
  annualPremium: number
  note: string
  /** When true the component substitutes the year's partDOOPMax for annualDrugOOP. */
  capAtOOPMax?: boolean
}

export interface DrugScenario {
  id: string
  label: string
  profile: string
  drugs: { name: string; tier: number; copayLabel: string }[]
  planRows: PlanRow[]  // [low, mid, high]
}

/**
 * 2025 cost assumptions:
 * - Max deductible: $590 (applies to Tier 2+; Tier 1 usually exempt)
 * - Annual OOP cap: $2,000 (Inflation Reduction Act)
 * - Tier 1 copay: $0 on all plan types (generics fully covered)
 */
export const DRUG_SCENARIOS: DrugScenario[] = [
  {
    id: 'healthy',
    label: 'Scenario 1: Healthy — No Regular Prescriptions',
    profile: 'Takes no regular prescription drugs.',
    drugs: [],
    planRows: [
      {
        planLabel: 'Low-Premium ($0–$15/mo)',
        annualDrugOOP: 0,
        annualPremium: 5 * 12,
        note: 'Minimal cost; low-premium plan makes sense if drug needs are unlikely.',
      },
      {
        planLabel: 'Mid-Premium (~$35/mo)',
        annualDrugOOP: 0,
        annualPremium: 35 * 12,
        note: 'No drug spending — premium is the only cost.',
      },
      {
        planLabel: 'High-Premium (~$150/mo)',
        annualDrugOOP: 0,
        annualPremium: 150 * 12,
        note: 'Overpays relative to drug use; not recommended for healthy enrollees.',
      },
    ],
  },
  {
    id: 'hypertension',
    label: 'Scenario 2: Hypertension/Cholesterol — Common Generics Only',
    profile: 'Takes 3–4 common Tier 1 generics monthly.',
    drugs: [
      { name: 'Atorvastatin', tier: 1, copayLabel: '$0' },
      { name: 'Amlodipine', tier: 1, copayLabel: '$0' },
      { name: 'Lisinopril', tier: 1, copayLabel: '$0' },
      { name: 'Levothyroxine', tier: 1, copayLabel: '$0' },
    ],
    planRows: [
      {
        planLabel: 'Low-Premium ($0–$15/mo)',
        annualDrugOOP: 0,
        annualPremium: 5 * 12,
        note: 'All Tier 1 — no drug OOP regardless of plan. Low-premium plan wins.',
      },
      {
        planLabel: 'Mid-Premium (~$35/mo)',
        annualDrugOOP: 0,
        annualPremium: 35 * 12,
        note: 'All Tier 1 drugs covered at $0; premium is the only cost difference.',
      },
      {
        planLabel: 'High-Premium (~$150/mo)',
        annualDrugOOP: 0,
        annualPremium: 150 * 12,
        note: 'Tier 1 generics cost $0 on all plans — high premium adds no benefit here.',
      },
    ],
  },
  {
    id: 'diabetes',
    label: 'Scenario 3: Diabetes — Mix of Generics and Tier 3 Brand',
    profile: 'Takes common generics plus a Tier 3 diabetes brand drug monthly.',
    drugs: [
      { name: 'Metformin', tier: 1, copayLabel: '$0' },
      { name: 'Atorvastatin', tier: 1, copayLabel: '$0' },
      { name: 'Lisinopril', tier: 1, copayLabel: '$0' },
      { name: 'Jardiance', tier: 3, copayLabel: '$47 / $40 / $25 depending on plan' },
    ],
    planRows: [
      {
        planLabel: 'Low-Premium ($0–$15/mo)',
        // $590 deductible + $47 × ~10 fills after deductible
        annualDrugOOP: 1060,
        annualPremium: 5 * 12,
        note: '$590 deductible applies to Tier 3; then $47/fill × ~10 remaining fills.',
      },
      {
        planLabel: 'Mid-Premium (~$35/mo)',
        // $100 deductible + $40 × ~11.75 fills
        annualDrugOOP: 570,
        annualPremium: 35 * 12,
        note: 'Lower deductible ($100) reduces total drug OOP significantly.',
      },
      {
        planLabel: 'High-Premium (~$150/mo)',
        // No deductible + $25 × 12 fills
        annualDrugOOP: 300,
        annualPremium: 150 * 12,
        note: 'Zero deductible and lowest Tier 3 copay — lowest drug OOP.',
      },
    ],
  },
  {
    id: 'heart',
    label: 'Scenario 4: Heart Disease / AFib — Generics + Tier 2 & 3',
    profile: 'Takes Tier 1 generics, a Tier 2 beta-blocker, and a Tier 3 blood thinner.',
    drugs: [
      { name: 'Amlodipine', tier: 1, copayLabel: '$0' },
      { name: 'Atorvastatin', tier: 1, copayLabel: '$0' },
      { name: 'Metoprolol', tier: 2, copayLabel: '$5 / $8 / $0 depending on plan' },
      { name: 'Eliquis', tier: 3, copayLabel: '$47 / $40 / $25 depending on plan' },
    ],
    planRows: [
      {
        planLabel: 'Low-Premium ($0–$15/mo)',
        // $590 ded + $47 × ~10.5 Eliquis fills + $5 × 12 Metoprolol
        annualDrugOOP: 1140,
        annualPremium: 5 * 12,
        note: '$590 deductible on Tier 3 Eliquis; Metoprolol adds modest Tier 2 copays.',
      },
      {
        planLabel: 'Mid-Premium (~$35/mo)',
        // $100 ded + $40 × ~11.75 + $8 × 12
        annualDrugOOP: 660,
        annualPremium: 35 * 12,
        note: 'Reduced deductible and lower Tier 3 copay cuts annual drug spend.',
      },
      {
        planLabel: 'High-Premium (~$150/mo)',
        // No ded + $25 × 12 Eliquis + $0 × 12 Metoprolol
        annualDrugOOP: 300,
        annualPremium: 150 * 12,
        note: 'No deductible; Metoprolol is $0 Tier 2 and Eliquis $25 — lowest OOP.',
      },
    ],
  },
  {
    id: 'specialty',
    label: 'Scenario 5: Specialty Drug (Biologic) — OOP Cap Triggered',
    profile: 'Takes a Tier 5 specialty biologic plus a Tier 2 anti-inflammatory.',
    drugs: [
      { name: 'Celecoxib', tier: 2, copayLabel: '$5 / $8 / $0 depending on plan' },
      { name: 'Enbrel (etanercept)', tier: 5, copayLabel: '25% of ~$2,000/mo list price' },
    ],
    planRows: [
      {
        planLabel: 'Low-Premium ($0–$15/mo)',
        annualDrugOOP: 2000,   // replaced at render time with year's partDOOPMax
        annualPremium: 5 * 12,
        capAtOOPMax: true,
        note: 'OOP cap reached within a few months on Enbrel. IRA equalizes drug OOP across all plans — low premium then wins on total cost.',
      },
      {
        planLabel: 'Mid-Premium (~$35/mo)',
        annualDrugOOP: 2000,
        annualPremium: 35 * 12,
        capAtOOPMax: true,
        note: 'Drug OOP capped at the same amount as the low-premium plan; higher premium produces a worse total.',
      },
      {
        planLabel: 'High-Premium (~$150/mo)',
        annualDrugOOP: 2000,
        annualPremium: 150 * 12,
        capAtOOPMax: true,
        note: 'Drug OOP capped at the same amount on every plan. The $1,800 premium is pure added cost — the worst outcome of the three.',
      },
    ],
  },
]

export interface PartDProvider {
  name: string
  company: string
  monthlyPremium: string
  deductible: string
  tier1: string
  tier2: string
  tier3: string
  tier4: string
  tier5: string
  // oopMax is omitted — all plans share the year's partDOOPMax cap; use getYearData(year).partDOOPMax
  formularyUrl: string
  phone: string
  /** Which premium-tier archetype this plan belongs to — used for grouping in the UI. */
  premiumGroup: 'low' | 'mid' | 'high'
  /** Midpoint of monthly premium range — used for sort order within each group. */
  sortPremium: number
  note?: string
}

/**
 * 8 major national standalone PDP providers — 2025 plan year.
 * All plans have $2,000 annual OOP max per the Inflation Reduction Act.
 * Premium ranges reflect geographic variation; verify exact premium at medicare.gov/plan-compare.
 *
 * Sources: KFF 2025 Part D Landscape, CMS Medicare Plan Finder,
 * individual plan Summary of Benefits.
 */
export const PART_D_PROVIDERS: PartDProvider[] = [
  // ── Low-premium group ($0–$35/mo, $590 deductible) ──────────────────────────
  {
    name: 'WellCare Value Script',
    company: 'Centene',
    monthlyPremium: '$0–$20/mo',
    deductible: '$590',
    tier1: '$0',
    tier2: '$5',
    tier3: '$45',
    tier4: '45%',
    tier5: '25%',

    formularyUrl: 'https://www.wellcare.com/medicare/part-d',
    phone: '1-800-935-5462',
    premiumGroup: 'low',
    sortPremium: 10,
    note: 'Very low to no premium. Higher Tier 4 coinsurance than some competitors.',
  },
  {
    name: 'SilverScript SmartSaver',
    company: 'Aetna/CVS Health',
    monthlyPremium: '$0–$22/mo',
    deductible: '$590',
    tier1: '$0',
    tier2: '$5',
    tier3: '$47',
    tier4: '40%',
    tier5: '25%',

    formularyUrl: 'https://www.silverscript.com',
    phone: '1-866-235-5660',
    premiumGroup: 'low',
    sortPremium: 11,
    note: 'Full deductible applies to Tier 2+. Low premium; best for generic-only users.',
  },
  {
    name: 'Humana Walmart Value Rx',
    company: 'Humana',
    monthlyPremium: '$0–$28/mo',
    deductible: '$590',
    tier1: '$0',
    tier2: '$4',
    tier3: '$47',
    tier4: '40%',
    tier5: '25%',

    formularyUrl: 'https://www.humana.com/medicare/part-d',
    phone: '1-800-281-6918',
    premiumGroup: 'low',
    sortPremium: 14,
    note: 'Lowest Tier 2 copay in class ($4). Preferred pharmacy: Walmart.',
  },
  {
    name: 'AARP MedicareRx Walgreens',
    company: 'UnitedHealthcare',
    monthlyPremium: '$0–$35/mo',
    deductible: '$590',
    tier1: '$0',
    tier2: '$10',
    tier3: '$47',
    tier4: '40%',
    tier5: '25%',

    formularyUrl: 'https://www.uhcmedicaresolutions.com',
    phone: '1-877-699-5710',
    premiumGroup: 'low',
    sortPremium: 18,
    note: 'Preferred pharmacy: Walgreens. Broad formulary coverage.',
  },
  // ── Mid-premium group (~$20–$50/mo, $0 deductible) ───────────────────────────
  {
    name: 'SilverScript Choice',
    company: 'Aetna/CVS Health',
    monthlyPremium: '$22–$48/mo',
    deductible: '$0',
    tier1: '$0',
    tier2: '$5',
    tier3: '$40',
    tier4: '35%',
    tier5: '25%',

    formularyUrl: 'https://www.silverscript.com',
    phone: '1-866-235-5660',
    premiumGroup: 'mid',
    sortPremium: 35,
    note: 'No deductible; lower Tier 3 copay than low-premium plans.',
  },
  {
    name: 'WellCare Classic',
    company: 'Centene',
    monthlyPremium: '$20–$50/mo',
    deductible: '$0',
    tier1: '$0',
    tier2: '$8',
    tier3: '$40',
    tier4: '35%',
    tier5: '25%',

    formularyUrl: 'https://www.wellcare.com/medicare/part-d',
    phone: '1-800-935-5462',
    premiumGroup: 'mid',
    sortPremium: 35,
    note: 'No deductible; good middle-ground for Tier 2–3 drug users.',
  },
  // ── High-premium group (~$80–$180/mo, $0 deductible, lowest copays) ──────────
  {
    name: 'AARP MedicareRx Preferred',
    company: 'UnitedHealthcare',
    monthlyPremium: '$85–$160/mo',
    deductible: '$0',
    tier1: '$0',
    tier2: '$0',
    tier3: '$30',
    tier4: '25%',
    tier5: '25%',

    formularyUrl: 'https://www.uhcmedicaresolutions.com',
    phone: '1-877-699-5710',
    premiumGroup: 'high',
    sortPremium: 122,
    note: 'No deductible; $0 Tier 2 copay. Post-IRA, the premium gap vs. low-premium plans usually exceeds the per-fill savings — verify with your drug list before choosing.',
  },
  {
    name: 'Humana Premier Rx',
    company: 'Humana',
    monthlyPremium: '$80–$180/mo',
    deductible: '$0',
    tier1: '$0',
    tier2: '$0',
    tier3: '$25',
    tier4: '25%',
    tier5: '25%',

    formularyUrl: 'https://www.humana.com/medicare/part-d',
    phone: '1-800-281-6918',
    premiumGroup: 'high',
    sortPremium: 130,
    note: 'Lowest Tier 3 copay ($25); no deductible. Post-IRA OOP cap equalizes drug costs for specialty users — lower-premium plans produce a lower total in most scenarios.',
  },
]
