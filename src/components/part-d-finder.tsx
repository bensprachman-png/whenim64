import { Fragment } from 'react'
import { DRUG_SCENARIOS, PART_D_PROVIDERS } from '@/lib/part-d-plans'
import { getYearData } from '@/lib/retirement-data'

interface Props {
  state: string | null
  stateName: string | null
  year: number
}

const TIERS = [
  {
    tier: 1,
    label: 'Tier 1 — Generic Preferred',
    examples: 'Atorvastatin, Amlodipine, Lisinopril, Metformin, Levothyroxine',
    typicalCost: '$0/fill',
  },
  {
    tier: 2,
    label: 'Tier 2 — Generic Non-Preferred',
    examples: 'Metoprolol, Celecoxib',
    typicalCost: '$5–$15/fill',
  },
  {
    tier: 3,
    label: 'Tier 3 — Preferred Brand',
    examples: 'Jardiance, Eliquis',
    typicalCost: '$45–$47/fill or 25%',
  },
  {
    tier: 4,
    label: 'Tier 4 — Non-Preferred Brand',
    examples: 'Various brand-name drugs without preferred status',
    typicalCost: '40–45% coinsurance',
  },
  {
    tier: 5,
    label: 'Tier 5 — Specialty',
    examples: 'Enbrel (etanercept) and other biologics/injectables',
    typicalCost: '25–33% coinsurance',
  },
]

export default function PartDFinder({ state, stateName, year }: Props) {
  const yd = getYearData(year)
  const oopMax = yd.partDOOPMax
  const maxDed = yd.partDMaxDeductible
  const oopMaxFmt = `$${oopMax.toLocaleString('en-US')}`
  const maxDedFmt = `$${maxDed.toLocaleString('en-US')}`

  const COST_FACTORS = [
    {
      title: 'Premium',
      description:
        'The monthly fee you pay regardless of how many prescriptions you fill. Ranges from $0 to $180+/mo depending on the plan. Lower-premium plans typically have higher deductibles and copayments.',
    },
    {
      title: 'Deductible',
      description:
        `The amount you pay out-of-pocket before the plan starts covering drug costs. The ${year} maximum is ${maxDedFmt}. Many plans waive the deductible for Tier 1 generics; zero-deductible plans usually carry higher premiums.`,
    },
    {
      title: 'Copayments / Coinsurance',
      description:
        'Your share per prescription fill — a fixed dollar copay for lower tiers, or a percentage of drug cost (coinsurance) for higher tiers. Copays reset each January 1.',
    },
    {
      title: 'Drug Tiers (Formulary)',
      description:
        'Each plan groups covered drugs into 5 tiers. The tier assignment determines your cost share. The same drug can be a different tier across plans, so comparing formularies side-by-side matters for your specific medications.',
    },
  ]

  return (
    <div className="space-y-8">

      {/* Intro */}
      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          Medicare Part D is the optional prescription drug benefit added to Original Medicare.
          You enroll through a standalone <strong className="text-foreground">Prescription Drug Plan (PDP)</strong> — offered by private insurers — that works alongside your Part A, Part B, and any Medigap coverage.
        </p>
        <p>
          <strong className="text-foreground">Already on Medicare Advantage?</strong> Most Medicare Advantage plans (MAPD) already bundle prescription drug coverage, so a separate Part D plan is typically not needed — and enrolling in one while on MAPD may actually trigger a disenrollment from your Advantage plan.
          Check your MAPD's Evidence of Coverage to confirm drug benefits before enrolling in a PDP.
        </p>
        <p>
          Part D plans vary by <strong className="text-foreground">premium</strong>, <strong className="text-foreground">deductible</strong>, and <strong className="text-foreground">drug tier structure</strong>. The lowest-premium plan is rarely the lowest total-cost plan once you factor in your specific medications. Use the scenario table below to estimate annual costs for common drug profiles.
        </p>
      </div>

      {/* Cost factor cards */}
      <div>
        <h3 className="font-semibold text-base mb-3">Four Cost Factors That Drive Your Annual Bill</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {COST_FACTORS.map((factor) => (
            <div key={factor.title} className="rounded-lg border bg-card p-4 space-y-1">
              <p className="font-semibold text-sm">{factor.title}</p>
              <p className="text-xs text-muted-foreground">{factor.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tier explanation table */}
      <div>
        <h3 className="font-semibold text-base mb-3">Drug Tier Structure (Formulary Tiers)</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold w-[140px]">Tier</th>
                <th className="text-left px-4 py-3 font-semibold">Example Drugs</th>
                <th className="text-left px-4 py-3 font-semibold w-[160px]">Typical Cost Share</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((t) => (
                <tr key={t.tier} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground align-top">{t.label}</td>
                  <td className="px-4 py-3 text-muted-foreground align-top">{t.examples}</td>
                  <td className="px-4 py-3 font-medium text-foreground align-top tabular-nums">{t.typicalCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Tier assignments vary by plan. A drug listed as Tier 2 on one plan may be Tier 3 on another.
          Always verify your specific drugs in a plan&apos;s formulary before enrolling.
        </p>
      </div>

      {/* Scenario cost table */}
      <div>
        <h3 className="font-semibold text-base mb-1">How Drug Costs Vary by Health Profile</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Estimated annual costs ({year}) for three plan archetypes across five common drug profiles.
          The lowest total annual cost per scenario is <strong className="text-foreground">bolded</strong>.
        </p>

        <div className="space-y-6">
          {DRUG_SCENARIOS.map((scenario) => {
            // Resolve drug OOP for each row, substituting year's cap for capAtOOPMax rows
            const resolvedRows = scenario.planRows.map((r) => ({
              ...r,
              resolvedDrugOOP: r.capAtOOPMax ? oopMax : r.annualDrugOOP,
            }))
            const totals = resolvedRows.map((r) => r.resolvedDrugOOP + r.annualPremium)
            const minTotal = Math.min(...totals)

            return (
              <div key={scenario.id} className="rounded-lg border overflow-hidden">
                {/* Scenario header */}
                <div className="bg-muted/40 px-4 py-3 border-b">
                  <p className="font-semibold text-sm">{scenario.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{scenario.profile}</p>
                  {scenario.drugs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {scenario.drugs.map((d) => (
                        <span
                          key={d.name}
                          className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-xs"
                        >
                          <span className="font-medium">{d.name}</span>
                          <span className="text-muted-foreground">Tier {d.tier}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {scenario.drugs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic mt-1">No prescription drugs.</p>
                  )}
                </div>

                {/* Cost rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b bg-muted/20 text-xs">
                        <th className="text-left px-4 py-2 font-medium">Plan Type</th>
                        <th className="text-right px-4 py-2 font-medium">Annual Premium</th>
                        <th className="text-right px-4 py-2 font-medium">Annual Drug OOP</th>
                        <th className="text-right px-4 py-2 font-medium">Total Annual Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedRows.map((row) => {
                        const total = row.resolvedDrugOOP + row.annualPremium
                        const isLowest = total === minTotal
                        return (
                          <tr
                            key={row.planLabel}
                            className={`border-b last:border-0 ${isLowest ? 'bg-primary/5' : 'hover:bg-muted/10'}`}
                          >
                            <td className="px-4 py-2.5 align-top">
                              <span className={isLowest ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                                {row.planLabel}
                              </span>
                              <p className="text-xs text-muted-foreground mt-0.5">{row.note}</p>
                            </td>
                            <td className={`px-4 py-2.5 text-right tabular-nums align-top ${isLowest ? 'font-semibold' : ''}`}>
                              ${row.annualPremium.toLocaleString('en-US')}
                            </td>
                            <td className={`px-4 py-2.5 text-right tabular-nums align-top ${isLowest ? 'font-semibold' : ''}`}>
                              ${row.resolvedDrugOOP.toLocaleString('en-US')}
                            </td>
                            <td className={`px-4 py-2.5 text-right tabular-nums align-top ${isLowest ? 'font-bold text-foreground' : ''}`}>
                              ${total.toLocaleString('en-US')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>

        {/* Scenario footnote */}
        <div className="mt-4 text-xs text-muted-foreground space-y-1.5 rounded-lg border border-dashed px-4 py-3">
          <p>
            <strong>†</strong> {year} figures. Max deductible {maxDedFmt} applies to Tier 2+ drugs; Tier 1 generics are usually deductible-exempt.
            Annual out-of-pocket cap {oopMaxFmt} (Inflation Reduction Act) — once reached, the plan pays 100% for the remainder of the year.
          </p>
          <p>
            Premium + drug OOP are the primary cost drivers shown above. Does not include the Part B premium (~$170–$203/mo), which all Medicare enrollees pay separately.
          </p>
          <p>
            Costs are estimates based on CMS median plan data; actual costs depend on your specific plan&apos;s formulary, preferred pharmacy network, and dosage.
            All major insurers offer an online <strong>formulary tool</strong> — enter your exact prescriptions to get a personalized cost estimate before enrolling.
          </p>
        </div>
      </div>

      {/* IRA impact callout */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-4 space-y-2 text-sm">
        <p className="font-semibold text-foreground">How the Inflation Reduction Act Changed Part D Math</p>
        <p className="text-muted-foreground">
          Before 2025, high-premium plans were justified by unlimited drug-spending risk — a biologic or specialty drug could mean $10,000+ in annual out-of-pocket costs with no ceiling.
          The IRA&apos;s {oopMaxFmt} cap ({year}) eliminates that tail risk on <em>every</em> plan equally.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md bg-background border px-3 py-2 space-y-0.5">
            <p className="font-semibold text-foreground">Low-premium plan — worst case</p>
            <p className="text-muted-foreground">{oopMaxFmt} drug OOP + ~$60/yr premium</p>
            <p className="font-medium text-foreground">≈ {`$${(oopMax + 60).toLocaleString('en-US')}`} total ceiling</p>
          </div>
          <div className="rounded-md bg-background border px-3 py-2 space-y-0.5">
            <p className="font-semibold text-foreground">High-premium plan — worst case</p>
            <p className="text-muted-foreground">{oopMaxFmt} drug OOP + $960–$2,160/yr premium</p>
            <p className="font-medium text-foreground">≈ {`$${(oopMax + 960).toLocaleString('en-US')}–$${(oopMax + 2160).toLocaleString('en-US')}`} total ceiling</p>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          <strong className="text-foreground">Remaining cases where higher-premium plans could make sense:</strong>{' '}
          (1) <strong className="text-foreground">Cash-flow smoothing</strong> — avoiding the year&apos;s deductible hitting in January; premium spreads the cost evenly month-to-month.
          (2) <strong className="text-foreground">Formulary placement</strong> — if your specific drug sits on a significantly lower tier on one plan&apos;s formulary than another&apos;s, the copay difference may offset some of the premium gap.
          Neither is a strong financial argument for most enrollees. Use{' '}
          <a href="https://www.medicare.gov/plan-compare" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
            medicare.gov/plan-compare
          </a>{' '}
          with your exact drug list to compare true annual costs before enrolling.
        </p>
      </div>

      {/* Part D Provider Matrix */}
      <div>
        <h3 className="font-semibold text-base mb-2">Major Part D Plan Providers — {year}</h3>

        {/* State badge */}
        <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
          {state && stateName ? (
            <span className="rounded-md bg-muted px-3 py-1 text-xs">
              State: <strong>{stateName}</strong>
            </span>
          ) : (
            <span className="rounded-md border border-dashed px-3 py-1 text-xs text-muted-foreground">
              Add your ZIP code in Account for state-specific plan availability
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Premiums vary by geography — verify at{' '}
            <a
              href="https://www.medicare.gov/plan-compare"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              medicare.gov/plan-compare
            </a>
          </span>
        </div>

        {/* Column legend */}
        <div className="rounded-md bg-muted/40 border px-4 py-2.5 mb-3 text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">T1–T5</strong> show your copay (flat $) or coinsurance (%) per 30-day prescription fill at each formulary tier.
            Dollar amounts are fixed copays; percentages are coinsurance of the drug&apos;s cost.
            Tier 1 = generic preferred · Tier 2 = generic non-preferred · Tier 3 = preferred brand · Tier 4 = non-preferred brand · Tier 5 = specialty/biologic.
          </p>
          <p>
            <strong className="text-foreground">OOP Max</strong> = annual Out-of-Pocket Maximum — the most you pay in covered drug costs in a calendar year.
            Once you reach this limit, the plan pays 100% for the rest of the year.
            All plans shown are capped at <strong className="text-foreground">{oopMaxFmt}</strong> per the Inflation Reduction Act ({year}).
          </p>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-semibold">Plan</th>
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Premium</th>
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">Deductible</th>
                <th className="text-center px-2 py-3 font-semibold">T1</th>
                <th className="text-center px-2 py-3 font-semibold">T2</th>
                <th className="text-center px-2 py-3 font-semibold">T3</th>
                <th className="text-center px-2 py-3 font-semibold">T4</th>
                <th className="text-center px-2 py-3 font-semibold">T5</th>
                <th className="text-left px-3 py-3 font-semibold whitespace-nowrap">OOP Max</th>
              </tr>
            </thead>
            <tbody>
              {(['low', 'mid', 'high'] as const).map((group) => {
                const groupMeta = {
                  low:  { label: 'Low-Premium Plans',  sub: `$0–$35/mo · ${maxDedFmt} deductible · Best when using mostly Tier 1 generics` },
                  mid:  { label: 'Mid-Premium Plans',  sub: '~$20–$50/mo · No deductible · Lower copays balance the higher premium' },
                  high: { label: 'High-Premium Plans', sub: `~$80–$180/mo · No deductible · Lowest per-fill copays — but post-IRA the ${oopMaxFmt} cap makes total costs higher than low-premium plans in most scenarios` },
                }[group]
                const providers = PART_D_PROVIDERS
                  .filter((p) => p.premiumGroup === group)
                  .sort((a, b) => a.sortPremium - b.sortPremium || a.name.localeCompare(b.name))
                return (
                  <Fragment key={`group-${group}`}>
                    <tr className="border-b border-t bg-muted/20">
                      <td colSpan={9} className="px-4 py-2">
                        <span className="font-semibold text-xs uppercase tracking-wide text-foreground">{groupMeta.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{groupMeta.sub}</span>
                      </td>
                    </tr>
                    {providers.map((p) => (
                      <tr key={p.name} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-sm">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.company}</div>
                          <div className="flex flex-wrap gap-x-3 mt-1 text-xs">
                            <a
                              href={p.formularyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline hover:no-underline"
                            >
                              Formulary →
                            </a>
                            <span className="text-muted-foreground">{p.phone}</span>
                          </div>
                          {p.note && (
                            <div className="text-xs text-muted-foreground mt-1">{p.note}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 tabular-nums align-top text-sm">{p.monthlyPremium}</td>
                        <td className="px-3 py-3 tabular-nums align-top text-sm">{p.deductible}</td>
                        <td className="px-2 py-3 text-center tabular-nums align-top text-sm">{p.tier1}</td>
                        <td className="px-2 py-3 text-center tabular-nums align-top text-sm">{p.tier2}</td>
                        <td className="px-2 py-3 text-center tabular-nums align-top text-sm">{p.tier3}</td>
                        <td className="px-2 py-3 text-center tabular-nums align-top text-sm">{p.tier4}</td>
                        <td className="px-2 py-3 text-center tabular-nums align-top text-sm">{p.tier5}</td>
                        <td className="px-3 py-3 tabular-nums align-top text-sm">{oopMaxFmt}</td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p>
            Premium ranges reflect geographic variation across plan service areas.
            ‡ High-income enrollees may pay IRMAA surcharges of $0–$91/mo on top of their Part D premium.{' '}
            <a href="/taxes" className="text-primary underline hover:no-underline">
              See the Taxes page
            </a>{' '}
            for the full IRMAA bracket table.
          </p>
          <p>
            Sources: KFF 2025 Part D Landscape, CMS Medicare Plan Finder, plan-specific Summary of Benefits. Verify current formularies and premiums at{' '}
            <a
              href="https://www.medicare.gov/plan-compare"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              medicare.gov/plan-compare
            </a>{' '}
            before enrolling.
          </p>
        </div>
      </div>

    </div>
  )
}
