export type GlossaryCategory = 'Social Security' | 'Medicare' | 'Tax' | 'Investing'

export interface GlossaryTerm {
  id: string
  term: string
  abbr?: string
  category: GlossaryCategory
  brief: string
  detail: string
}

export const CATEGORY_ORDER: GlossaryCategory[] = [
  'Social Security',
  'Medicare',
  'Tax',
  'Investing',
]

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ── Social Security ────────────────────────────────────────────────────────
  {
    id: 'fra',
    term: 'Full Retirement Age',
    abbr: 'FRA',
    category: 'Social Security',
    brief: 'The age at which you receive 100% of your earned Social Security benefit.',
    detail:
      'FRA is 66 for people born 1943–1954, gradually rises to 67 for those born 1960 or later, with two-month increments for each birth year in between. Claiming before FRA permanently reduces your benefit — by as much as 30% if you claim at 62 with an FRA of 67. Claiming after FRA earns Delayed Retirement Credits of 8% per year until age 70. Your FRA is the reference point from which all early and late claiming adjustments are calculated, and it also affects spousal and survivor benefits.',
  },
  {
    id: 'drc',
    term: 'Delayed Retirement Credits',
    abbr: 'DRC',
    category: 'Social Security',
    brief: 'The 8%/year increase in your Social Security benefit for each year you delay past FRA.',
    detail:
      'Delayed Retirement Credits accrue at two-thirds of 1% per month (8% per year) for every month you delay claiming past your Full Retirement Age, up to age 70. Waiting from an FRA of 67 to age 70 permanently increases your benefit by 24%. Credits stop accumulating at 70, so there is no financial reason to delay further. Because DRCs also increase the survivor benefit paid to a spouse, delaying is especially powerful for the higher earner in a married couple.',
  },
  {
    id: 'pia',
    term: 'Primary Insurance Amount',
    abbr: 'PIA',
    category: 'Social Security',
    brief: 'The monthly Social Security benefit you receive if you claim exactly at Full Retirement Age.',
    detail:
      'SSA calculates your PIA from your Average Indexed Monthly Earnings (AIME) using a progressive formula: 90% of the first $1,174 of AIME, 32% of the next tier, and 15% above a higher threshold (2025 bend points). The formula heavily replaces lower earners\' wages, making Social Security disproportionately valuable relative to contributions for lower incomes. All other benefit adjustments — early-claim reductions, delayed credits, spousal benefits, survivor benefits — are expressed as a percentage of PIA. You can see your estimated PIA by creating a my Social Security account at ssa.gov.',
  },
  {
    id: 'aime',
    term: 'Average Indexed Monthly Earnings',
    abbr: 'AIME',
    category: 'Social Security',
    brief: 'The inflation-adjusted monthly earnings average SSA uses to calculate your Social Security benefit.',
    detail:
      'SSA takes your highest 35 years of annual earnings, adjusts each year for wage growth, sums them, and divides by 420 (35 years × 12 months) to get AIME. Years with zero earnings count as zeroes and drag the average down. Working additional years can replace low or zero-earning years in the 35-year window, raising your AIME and thus your PIA. The AIME is the sole input into the PIA formula, so maximizing covered earnings — especially in your peak earning years — directly increases your lifetime benefit.',
  },
  {
    id: 'earnings-test',
    term: 'Earnings Test',
    abbr: undefined,
    category: 'Social Security',
    brief: 'A rule that temporarily reduces benefits if you claim Social Security before FRA while still working.',
    detail:
      'If you claim before FRA and earn wages above the annual threshold ($22,320 in 2025), SSA withholds $1 of benefits for every $2 over the limit. In the year you reach FRA, only earnings above a higher threshold are counted, and the reduction is $1 for every $3. Once you reach FRA, the test disappears entirely, and SSA restores withheld benefits by permanently recalculating your benefit upward. The test applies only to wages and self-employment income — not to investment income, pensions, or RMDs.',
  },
  {
    id: 'spousal-benefit',
    term: 'Spousal Benefit',
    abbr: undefined,
    category: 'Social Security',
    brief: 'A benefit worth up to 50% of a worker\'s PIA available to a current or divorced spouse.',
    detail:
      'A spouse can receive up to 50% of the worker\'s PIA if that amount exceeds their own earned benefit. The spousal benefit is reduced if claimed before the claiming spouse\'s own FRA, and — unlike the worker\'s benefit — it cannot be increased beyond 50% by delaying past FRA. The worker must have filed for their own benefit before a spousal benefit can be paid. A divorced spouse married for at least 10 years who has not remarried can claim on the ex-spouse\'s record even if the ex-spouse has not yet filed, as long as both are at least 62.',
  },
  {
    id: 'survivor-benefit',
    term: 'Survivor Benefit',
    abbr: undefined,
    category: 'Social Security',
    brief: 'A benefit paid to a surviving spouse equal to up to 100% of the deceased worker\'s benefit.',
    detail:
      'A widow or widower can receive the deceased worker\'s full benefit, including any Delayed Retirement Credits accrued before death. Survivor benefits can be claimed as early as age 60 (reduced) or at the survivor\'s FRA for the full amount. A surviving spouse who has their own work record can claim one benefit first and switch to the higher benefit later — a flexibility not available for spousal benefits while both spouses are alive. Because the higher earner\'s DRCs flow directly into the survivor benefit, delaying the higher earner to 70 is often the most cost-effective longevity insurance a couple can buy.',
  },
  {
    id: 'cola',
    term: 'Cost-of-Living Adjustment',
    abbr: 'COLA',
    category: 'Social Security',
    brief: 'The annual inflation increase applied to Social Security benefits each January.',
    detail:
      'COLA is based on the change in the Consumer Price Index for Urban Wage Earners and Clerical Workers (CPI-W) from Q3 of the prior year to Q3 of the current year. A positive CPI-W change means benefits rise the following January; there is no reduction if CPI-W falls. The 2025 COLA was 2.5%. Because COLA is calculated on your full benefit amount, delaying to receive a larger benefit also amplifies the dollar value of each future COLA, compounding the advantage of delay over a long retirement.',
  },
  {
    id: 'break-even',
    term: 'Break-Even Age',
    abbr: undefined,
    category: 'Social Security',
    brief: 'The age at which cumulative lifetime benefits from a later claim surpass those from an earlier claim.',
    detail:
      'The break-even age compares total benefits received under two claiming strategies. For example, claiming at 62 versus 70 (with FRA 67): the early claimer receives more checks, but each is smaller; the late claimer receives fewer, larger checks. In nominal terms the break-even is typically around age 80–82; on a present-value basis (discounting future dollars) it is somewhat younger. People in good health who expect to reach their early 80s generally maximize lifetime benefits by delaying. For couples, the joint break-even analysis favors delay even more strongly because of the survivor benefit.',
  },
  {
    id: 'wep',
    term: 'Windfall Elimination Provision',
    abbr: 'WEP',
    category: 'Social Security',
    brief: 'A formula that reduces Social Security for workers who also receive a pension from non-covered employment.',
    detail:
      'WEP affects workers who receive a pension from a job not subject to Social Security taxes — such as some state/local government positions or federal employment before 1984 — and who also have Social Security-covered earnings. It modifies the PIA formula by reducing the 90% replacement factor for the lowest earnings tier to as little as 40%. WEP cannot reduce your benefit by more than half of the non-covered pension. The reduction shrinks with 20+ years of substantial Social Security-covered earnings and disappears entirely at 30 such years. Note: the Social Security Fairness Act signed in early 2025 repealed WEP prospectively.',
  },
  {
    id: 'gpo',
    term: 'Government Pension Offset',
    abbr: 'GPO',
    category: 'Social Security',
    brief: 'A rule that reduces spousal or survivor Social Security benefits for government pension recipients.',
    detail:
      'GPO reduces the spousal or survivor benefit by two-thirds of the government pension amount, which can wipe out the benefit entirely for many affected retirees. It applies to people who receive a pension from non-Social Security-covered government employment. GPO does not affect the worker\'s own earned Social Security benefit — only spousal and survivor benefits. Like WEP, GPO was substantially modified by the Social Security Fairness Act of 2025, which repealed the provision for earnings after December 2023, potentially restoring benefits for many retirees affected for years.',
  },

  // ── Medicare ───────────────────────────────────────────────────────────────
  {
    id: 'medicare-a',
    term: 'Medicare Part A',
    abbr: undefined,
    category: 'Medicare',
    brief: 'Hospital insurance covering inpatient stays, skilled nursing care, and hospice.',
    detail:
      'Part A covers inpatient hospital care, skilled nursing facility care following a qualifying 3-night hospital stay, hospice, and limited home health care. Most people pay no Part A premium if they or a spouse paid Medicare taxes for at least 40 quarters (10 years). The deductible applies per benefit period (not annually), and coinsurance kicks in for hospital stays beyond 60 days. Part A does not cover custodial long-term care; that requires private long-term care insurance or spending down assets to qualify for Medicaid.',
  },
  {
    id: 'medicare-b',
    term: 'Medicare Part B',
    abbr: undefined,
    category: 'Medicare',
    brief: 'Medical insurance covering doctor visits, outpatient care, and preventive services.',
    detail:
      'Part B covers physician services, outpatient hospital care, lab tests, durable medical equipment, ambulance services, and preventive screenings (many at no cost-sharing). The standard monthly premium is $185.00 in 2026, with a $257 annual deductible (2025), after which Medicare pays 80% of approved costs. Higher-income beneficiaries pay an IRMAA surcharge on top of the base premium. Late enrollment without creditable coverage triggers a permanent 10% premium penalty for each 12-month period of delay.',
  },
  {
    id: 'medicare-d',
    term: 'Medicare Part D',
    abbr: undefined,
    category: 'Medicare',
    brief: 'Optional prescription drug coverage offered through private, Medicare-approved plans.',
    detail:
      'Part D plans vary by formulary, monthly premium, deductible, and pharmacy network. The Inflation Reduction Act capped annual out-of-pocket drug costs at $2,000 starting in 2025, eliminating the catastrophic coverage gap. Higher-income enrollees pay an IRMAA surcharge on top of their plan premium. Failing to enroll when first eligible — unless you have creditable drug coverage from an employer, union, or other source — results in a permanent 1% penalty per month of delay added to your premium for as long as you have Part D.',
  },
  {
    id: 'medicare-advantage',
    term: 'Medicare Advantage',
    abbr: 'MA',
    category: 'Medicare',
    brief: 'An all-in-one Medicare alternative from private insurers, replacing Parts A and B.',
    detail:
      'Medicare Advantage plans must cover everything Original Medicare covers and typically bundle Part D drug coverage. They often charge low or $0 monthly premiums but restrict care to a network (HMO or PPO) and may require prior authorizations. The in-network out-of-pocket maximum is capped by law (approximately $8,850 in 2025) and resets each January 1. Switching back to Original Medicare after being on MA can be difficult because Medigap insurers in most states are not required to accept you without medical underwriting once your initial enrollment window has passed.',
  },
  {
    id: 'medigap',
    term: 'Medigap',
    abbr: undefined,
    category: 'Medicare',
    brief: 'Private supplemental insurance that covers cost-sharing gaps left by Original Medicare.',
    detail:
      'Medigap (Medicare Supplement) policies are standardized by letter. Plan G — the most popular — covers all Part A and B cost-sharing except the Part B deductible. Plan N covers most costs but requires small copays for office and ER visits. Medigap works alongside Original Medicare and does not include drug coverage; Part D must be purchased separately. Your Medigap Open Enrollment Period — six months starting the month you are both 65 and enrolled in Part B — is your only guaranteed-issue window; after it closes, insurers in most states may use full medical underwriting to deny coverage or charge higher premiums.',
  },
  {
    id: 'irmaa',
    term: 'Income-Related Monthly Adjustment Amount',
    abbr: 'IRMAA',
    category: 'Medicare',
    brief: 'A Medicare premium surcharge added to Parts B and D for higher-income beneficiaries.',
    detail:
      'IRMAA is triggered when your MAGI exceeds the base threshold ($106,000 single / $212,000 joint in 2026). There are five income tiers; the top single-filer tier adds roughly $443/month to Part B and ~$81/month to Part D in 2026. The surcharge is based on your MAGI from two years prior (the look-back year). If a qualifying life-changing event — retirement, death of a spouse, divorce, or pension loss — has reduced your income since the look-back year, you can file SSA Form SSA-44 to request that IRMAA be based on your more recent income.',
  },
  {
    id: 'irmaa-lookback',
    term: 'IRMAA Look-Back',
    abbr: undefined,
    category: 'Medicare',
    brief: 'CMS sets your current-year IRMAA surcharge using your tax return from two years ago.',
    detail:
      'Because SSA uses IRS data, which is typically two years behind, your 2024 MAGI determines your 2026 IRMAA tier. A large Roth conversion, asset sale, or one-time income event in any given year can trigger higher Medicare premiums two years later — a surprise that catches many retirees off guard. Planning Roth conversions carefully, and sizing them to stay below the next IRMAA threshold, is a core strategy for managing Medicare costs. Municipally exempt interest income is added back into MAGI for IRMAA purposes, which also surprises people who hold muni bonds for "tax-free" income.',
  },
  {
    id: 'iep',
    term: 'Initial Enrollment Period',
    abbr: 'IEP',
    category: 'Medicare',
    brief: 'The 7-month window around your 65th birthday to first enroll in Medicare.',
    detail:
      'Your IEP spans the 3 months before your birth month, your birth month, and the 3 months after — 7 months total. Enrolling in Part B before or during your birth month means coverage starts the first of that month; enrolling in months 4–7 delays coverage by 1–3 months. Missing IEP without creditable coverage triggers permanent late-enrollment penalties for Part B (10% per 12 months delayed) and Part D (1% per month delayed). If you are covered by a large employer\'s group health plan through active employment, you may delay Medicare without penalty and use a Special Enrollment Period when that coverage ends.',
  },
  {
    id: 'sep',
    term: 'Special Enrollment Period',
    abbr: 'SEP',
    category: 'Medicare',
    brief: 'A Medicare enrollment window triggered by specific life events, such as losing employer coverage.',
    detail:
      'The most common Medicare SEP arises when you or your spouse loses employer group health plan coverage — you get 8 months from the date coverage (or employment) ends to enroll in Part B penalty-free. Part D has a separate 63-day SEP window after losing creditable drug coverage. Other SEP triggers include moving out of a plan\'s service area and a plan losing its Medicare contract. COBRA coverage and marketplace plans do not qualify as "active employment" coverage, so they do not generate an SEP for Part B and should not be used to delay Medicare enrollment.',
  },
  {
    id: 'gep',
    term: 'General Enrollment Period',
    abbr: 'GEP',
    category: 'Medicare',
    brief: 'The January–March annual window to enroll in Medicare if you missed your IEP.',
    detail:
      'If you missed your Initial Enrollment Period and do not qualify for a Special Enrollment Period, you can sign up for Part B during the GEP (January 1 – March 31), with coverage beginning July 1. GEP enrollment still triggers the permanent 10% Part B late penalty for each 12-month period you were eligible but unenrolled, plus Part D late penalties. Because of the July 1 coverage start date, GEP enrollees go without coverage from January through June of that year, making the GEP a last resort to be avoided through proactive planning.',
  },
  {
    id: 'creditable-coverage',
    term: 'Creditable Coverage',
    abbr: undefined,
    category: 'Medicare',
    brief: 'Health or drug coverage that is at least as good as Medicare, allowing penalty-free delay.',
    detail:
      'For Part D, creditable coverage means your employer or union drug plan is expected to pay at least as much as the standard Medicare Part D benefit on average. Employers are required to send annual notices telling employees whether their drug plan is creditable. For Part B, the equivalent concept is coverage through active employment at a company with 20 or more employees — COBRA, retiree coverage, and individual marketplace plans do not satisfy this standard and will not protect you from the Part B late penalty if you delay enrollment beyond your IEP.',
  },

  // ── Tax ────────────────────────────────────────────────────────────────────
  {
    id: 'rmd',
    term: 'Required Minimum Distribution',
    abbr: 'RMD',
    category: 'Tax',
    brief: 'The minimum amount the IRS requires you to withdraw annually from tax-deferred accounts after a certain age.',
    detail:
      'Under SECURE Act 2.0, RMDs begin at age 73 for those born 1951–1959, and age 75 for those born 1960 or later. The annual RMD is your prior December 31 account balance divided by a life-expectancy factor from the IRS Uniform Lifetime Table (or Joint Life Table if your sole beneficiary is a spouse more than 10 years younger). Missing your full RMD triggers a 25% excise tax on the shortfall, reduced to 10% if corrected within two years. Roth IRAs are not subject to RMDs during the owner\'s lifetime; Roth 401(k)s were also exempted from RMDs under SECURE Act 2.0 starting in 2024.',
  },
  {
    id: 'qcd',
    term: 'Qualified Charitable Distribution',
    abbr: 'QCD',
    category: 'Tax',
    brief: 'A direct IRA-to-charity transfer that counts toward your RMD but is excluded from taxable income.',
    detail:
      'IRA owners age 70½ or older can transfer up to $108,000 (2025, indexed for inflation) directly from a traditional IRA to one or more qualified charities. The transferred amount is excluded from federal taxable income, reducing MAGI and potentially lowering IRMAA surcharges and the taxable portion of Social Security. A QCD satisfies your RMD obligation dollar-for-dollar and is more tax-efficient than taking the distribution and donating separately, since it reduces gross income rather than being itemized as a deduction. Donor-Advised Funds and private foundations do not qualify as recipients.',
  },
  {
    id: 'roth-conversion',
    term: 'Roth Conversion',
    abbr: undefined,
    category: 'Tax',
    brief: 'Moving pre-tax retirement money into a Roth IRA, paying income tax now to avoid it later.',
    detail:
      'A Roth conversion moves funds from a traditional IRA, 401(k), or similar pre-tax account into a Roth IRA; the converted amount is added to your taxable income for that year. The converted money then grows tax-free and qualified withdrawals are never taxed again. Conversions are most efficient during the tax valley — the years between retiring and when RMDs begin — when income is temporarily low and marginal rates are favorable. Each conversion must be carefully sized to avoid crossing into a higher federal bracket, triggering the next IRMAA tier two years later, or causing more Social Security to become taxable.',
  },
  {
    id: 'backdoor-roth',
    term: 'Backdoor Roth',
    abbr: undefined,
    category: 'Tax',
    brief: 'A strategy allowing high earners to fund a Roth IRA despite income limits, via a non-deductible IRA.',
    detail:
      'High earners who exceed the Roth IRA contribution income limits can make a non-deductible contribution to a traditional IRA and then convert it to a Roth. Because the original contribution was after-tax, only growth between contribution and conversion is taxable. The strategy is complicated by the pro-rata rule: if you hold other pre-tax IRA balances, a proportional share of every conversion is treated as pre-tax money, creating unexpected taxes. Rolling pre-tax IRA balances into a current employer\'s 401(k) before executing a backdoor Roth eliminates the pro-rata problem.',
  },
  {
    id: 'magi',
    term: 'Modified Adjusted Gross Income',
    abbr: 'MAGI',
    category: 'Tax',
    brief: 'Your AGI plus certain add-backs; used to calculate IRMAA tiers, IRA eligibility, and more.',
    detail:
      'MAGI starts with your Adjusted Gross Income (Form 1040, line 11) and adds back items such as tax-exempt interest, excluded foreign income, and the non-taxable portion of Social Security. For Medicare IRMAA purposes, tax-exempt municipal bond interest is included in MAGI — a detail that surprises many retirees who hold muni bonds for "tax-free" income. Roth conversions, RMDs, capital gains, and other income events all increase MAGI in the year they occur. Because IRMAA uses your MAGI from two years prior, planning income levels today means considering their Medicare impact two years down the road.',
  },
  {
    id: 'provisional-income',
    term: 'Provisional Income',
    abbr: undefined,
    category: 'Tax',
    brief: 'The income figure used to determine how much of your Social Security benefit is federally taxable.',
    detail:
      'Provisional income equals your AGI plus tax-exempt interest plus 50% of your Social Security benefits. If it exceeds $25,000 (single) or $32,000 (joint), up to 50% of Social Security becomes taxable; above $34,000 / $44,000, up to 85% is taxable. These thresholds have never been indexed for inflation, meaning more retirees are drawn into benefit taxation each year. Each dollar of RMD or Roth conversion income raises provisional income by one dollar, potentially causing 85 cents of additional Social Security to become taxable — creating the effective marginal rate spike known as the Tax Torpedo.',
  },
  {
    id: 'tax-valley',
    term: 'Tax Valley',
    abbr: undefined,
    category: 'Tax',
    brief: 'The low-income window in early retirement before RMDs and Social Security begin — ideal for Roth conversions.',
    detail:
      'The tax valley is the period — often ages 60 to 72 — when a retiree has left full-time work but has not yet started Social Security or required RMDs, resulting in unusually low taxable income and marginal rates. This window is often the single best opportunity in a lifetime to execute large Roth conversions at favorable rates, harvest capital gains at the 0% long-term rate, or shift assets tax-efficiently. Once RMDs kick in at 73 they can permanently elevate income and push retirees into higher IRMAA tiers and tax brackets. Recognizing and fully exploiting the tax valley is one of the highest-value planning activities for anyone approaching retirement.',
  },
  {
    id: 'tax-torpedo',
    term: 'Tax Torpedo',
    abbr: undefined,
    category: 'Tax',
    brief: 'A hidden spike in effective tax rates caused by RMDs pushing Social Security benefits into taxable income.',
    detail:
      'Because up to 85% of Social Security benefits become taxable as income rises above the provisional income thresholds, each additional dollar of RMD or other income can effectively generate $1.85 of taxable income — turning a nominal 22% bracket into an effective marginal rate above 40%. This rate spike is invisible on a standard tax bracket table and catches many retirees off guard. The torpedo is worst when large RMDs are layered on top of moderate Social Security income. The most effective mitigation strategy is Roth conversions during the tax valley to reduce future RMDs before they begin at age 73.',
  },
  {
    id: 'catch-up',
    term: 'Catch-Up Contribution',
    abbr: undefined,
    category: 'Tax',
    brief: 'Extra annual retirement account contributions allowed for people age 50 and older.',
    detail:
      'Workers 50 and older can contribute an extra $1,000/year to IRAs (total $8,000 in 2025) and an extra $7,500 to 401(k)s and similar plans (total $31,000 in 2025). SECURE Act 2.0 introduced a "super catch-up" for ages 60–63: the 401(k) catch-up rises to $11,250 for that age band starting in 2025. Starting in 2026, high earners (wages over $145,000) must direct 401(k) catch-up contributions to the Roth side. Catch-up contributions to traditional accounts lower current taxable income; Roth catch-ups grow and withdraw tax-free, making them especially valuable if you expect to be in a higher bracket in retirement.',
  },
  {
    id: 'hsa',
    term: 'Health Savings Account',
    abbr: 'HSA',
    category: 'Tax',
    brief: 'A triple-tax-advantaged account for medical expenses, available only with a high-deductible health plan.',
    detail:
      'HSA contributions are tax-deductible (or pre-tax via payroll), invested funds grow tax-free, and withdrawals for qualified medical expenses are tax-free — the only account with all three benefits. 2025 limits are $4,300 (self-only) and $8,550 (family), with an extra $1,000 catch-up for those 55+. You cannot contribute to an HSA once you are enrolled in any part of Medicare, but you can continue spending down an existing HSA tax-free on medical expenses, including Medicare premiums. After age 65, non-medical HSA withdrawals are taxed as ordinary income (like a traditional IRA) without the 20% penalty that applies before 65.',
  },
  {
    id: 'ira-limits',
    term: 'IRA Contribution Limit',
    abbr: undefined,
    category: 'Tax',
    brief: 'The maximum combined amount you can contribute to traditional and Roth IRAs in a year.',
    detail:
      'In 2025 you can contribute up to $7,000 per year ($8,000 if age 50+) across all your traditional and Roth IRAs combined — the limit is per person, not per account. Roth IRA contributions phase out for higher earners ($150,000–$165,000 single; $236,000–$246,000 joint in 2025); traditional IRA deductibility phases out if you (or your spouse) participate in a workplace plan at certain income levels. You have until the tax filing deadline (typically April 15 of the following year) to make a prior-year IRA contribution. Spousal IRA contributions allow a non-working or low-earning spouse to contribute based on the working spouse\'s income.',
  },

  // ── Investing ──────────────────────────────────────────────────────────────
  {
    id: 'four-percent',
    term: '4% Rule',
    abbr: undefined,
    category: 'Investing',
    brief: 'A guideline to withdraw 4% of your portfolio in year one, then adjust for inflation annually.',
    detail:
      'Introduced by William Bengen in 1994 and reinforced by the Trinity Study, the 4% rule states that a retiree with a balanced portfolio (50–75% stocks) can withdraw 4% of the initial balance in year one, then increase that dollar amount by inflation each year, with a historically high probability the portfolio lasts 30 years. The rule was derived from U.S. historical returns. Many researchers today suggest a more conservative starting rate of 3.3–3.5% given lower bond yields, higher starting valuations, and retirements that can exceed 35 years. The 4% rule is best treated as a rough starting benchmark, not a rigid withdrawal mandate.',
  },
  {
    id: 'swr',
    term: 'Safe Withdrawal Rate',
    abbr: 'SWR',
    category: 'Investing',
    brief: 'The annual portfolio withdrawal rate with a high probability of not running out of money.',
    detail:
      'The SWR is the maximum inflation-adjusted annual withdrawal that historically sustains a portfolio for a given time horizon (e.g., 30 or 40 years) at a given success probability (e.g., 90%). For 30-year retirements, historical SWR approximates 4%; for longer horizons or more conservative assumptions, 3.3–3.5% is often cited. Dynamic withdrawal strategies — cutting spending in down markets or maintaining a cash buffer — can increase effective withdrawal rates compared to rigid fixed rules, because they reduce the damage done by sequence-of-returns risk. Monte Carlo simulation is the standard tool for stress-testing an SWR against thousands of hypothetical return paths.',
  },
  {
    id: 'sequence-risk',
    term: 'Sequence-of-Returns Risk',
    abbr: undefined,
    category: 'Investing',
    brief: 'The danger that poor returns early in retirement permanently deplete a portfolio even if averages recover.',
    detail:
      'Sequence risk arises because withdrawals during down markets lock in losses at the worst time, leaving less capital to participate in recoveries. Two retirees with identical 30-year average returns but opposite return sequences can end up with dramatically different outcomes: the one who experiences bad years early faces ruin, while the one who experiences bad years late is largely unaffected. Mitigation strategies include keeping 1–3 years of expenses in cash or short bonds, using a bond ladder for near-term income, delaying large equity withdrawals during severe downturns (flexible spending), and pairing a partial annuity with an invested portfolio.',
  },
  {
    id: 'bond-ladder',
    term: 'Bond Ladder',
    abbr: undefined,
    category: 'Investing',
    brief: 'A portfolio of bonds with staggered maturities providing predictable income over successive years.',
    detail:
      'A bond ladder holds individual bonds (or CDs) maturing in successive years — for example, one bond per year for the next 10 years. As each rung matures, the proceeds either fund living expenses or are reinvested in a new long-dated bond to extend the ladder. This eliminates reinvestment risk at any single point, provides known cash flows, and insulates near-term spending money from equity volatility. TIPS ladders (Treasury Inflation-Protected Securities) are particularly attractive for retirees because payments rise with CPI, directly hedging cost-of-living increases without the inflation risk of nominal bonds.',
  },
  {
    id: 'spia',
    term: 'Single Premium Immediate Annuity',
    abbr: 'SPIA',
    category: 'Investing',
    brief: 'An insurance contract that converts a lump sum into a guaranteed lifetime income stream.',
    detail:
      'A SPIA begins making regular payments (monthly, quarterly, or annually) immediately after a single premium is paid to an insurer. Payout options include a fixed period, a single lifetime, or joint lives (payments continue until the second spouse dies). Because the insurer pools mortality risk across many annuitants, a SPIA typically pays more per dollar of premium than a retiree could safely withdraw from a portfolio — this "mortality credit" is what makes SPIAs uniquely efficient for covering essential expenses. Main trade-offs are loss of liquidity, lack of inflation adjustment (unless a CPI rider is added), and insurer credit risk (partly mitigated by state guaranty funds). A partial annuitization strategy — covering fixed expenses with a SPIA and keeping the rest invested — is a common middle-ground approach.',
  },
  {
    id: 'longevity-risk',
    term: 'Longevity Risk',
    abbr: undefined,
    category: 'Investing',
    brief: 'The risk of outliving your assets due to a longer-than-expected lifespan.',
    detail:
      'A 65-year-old American man has roughly a 50% chance of living past 84; a 65-year-old woman, past 87. For a married couple, there is approximately a 50% chance at least one partner reaches 90. Planning only for a 20-year horizon leaves many retirees financially vulnerable. Tools that hedge longevity risk include delaying Social Security (permanent inflation-adjusted income for life), SPIAs and deferred income annuities (longevity insurance), maintaining meaningful equity exposure for real long-term growth, and using flexible spending rules that reduce withdrawals in down markets. Long-term care costs compound longevity risk because a longer lifespan increases both the probability and the duration of needing care.',
  },
  {
    id: 'ltc',
    term: 'Long-Term Care',
    abbr: 'LTC',
    category: 'Investing',
    brief: 'Ongoing assistance with daily activities due to aging, chronic illness, or disability.',
    detail:
      'Long-term care includes home health aides, adult day care, assisted living, memory care, and nursing home care. The median annual cost of a private nursing home room was approximately $108,000 in 2023, and LTC costs typically outpace general inflation. Medicare covers only short-term skilled nursing care following a qualifying hospital stay; Medicaid covers custodial LTC only after most countable assets are spent down. Planning options include stand-alone LTC insurance, hybrid life/LTC or annuity/LTC policies, self-insurance with a dedicated liquid reserve, and Medicaid asset-protection planning with an elder-law attorney. Purchasing LTC insurance in your late 50s or early 60s typically offers the best balance of premium affordability and coverage adequacy.',
  },
]
