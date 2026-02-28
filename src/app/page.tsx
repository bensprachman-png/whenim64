import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import Image from 'next/image'
import type { StaticImport } from 'next/dist/shared/lib/get-img-props'
import imgSteps from '../../public/images/steps.png'
import imgPlanning from '../../public/images/planning.png'
import imgMedicare from '../../public/images/medicare.png'
import imgDashboard from '../../public/images/dashboard.png'
import {
  Activity, Shield, TrendingUp, Calculator, PiggyBank, Briefcase,
  MessageSquare, CheckCircle2, ArrowRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'WhenIm64 — Retirement Planning' },
  description: 'Your personalized retirement planning guide — Medicare enrollment, Social Security timing, Roth conversions, and tax-efficient withdrawals.',
  openGraph: {
    title: 'WhenIm64 — Retirement Planning',
    description: 'Your personalized retirement planning guide — Medicare enrollment, Social Security timing, Roth conversions, and tax-efficient withdrawals.',
  },
}

const FEATURES = [
  {
    icon: Shield,
    title: 'Medicare Planning',
    body: 'Compare Medigap and Medicare Advantage side by side. Find Part D drug plans for your state, track your enrollment status, and never miss an enrollment window.',
  },
  {
    icon: Activity,
    title: 'Social Security Timing',
    body: 'Model your Full Retirement Age, delay credits, spousal benefits, and survivor benefits. See the lifetime break-even between claiming at 62 vs. 70.',
  },
  {
    icon: TrendingUp,
    title: 'Roth Conversion Optimizer',
    body: 'Fill your tax bracket intelligently each year. Visualize the full projection — IRA balance, Roth growth, RMDs, and IRMAA surcharges — across your entire retirement.',
  },
  {
    icon: Calculator,
    title: 'Quarterly Tax Estimates',
    body: 'In retirement there\'s no paycheck withholding. Know your federal and state estimated tax payments each quarter so you never face an underpayment penalty.',
  },
  {
    icon: PiggyBank,
    title: 'RMD Planning',
    body: 'Required Minimum Distributions begin at 73 or 75 (depending on your birth year) and rise every year. Model the impact on your tax bracket and see how Roth conversions reduce future RMD burdens.',
  },
  {
    icon: Briefcase,
    title: 'Portfolio Import',
    body: 'Connect your brokerage accounts to automatically sync holdings and account balances across IRA, Roth, and taxable accounts.',
    premium: true,
  },
  {
    icon: MessageSquare,
    title: 'AI Retirement Assistant',
    body: 'Ask plain-English questions about Medicare rules, Social Security strategy, Roth conversion mechanics, and more — answered in the context of your own plan.',
    premium: true,
  },
]

const FREE_FEATURES = [
  'Dashboard with your full retirement snapshot',
  'Social Security timing and claiming strategy',
  'Medicare enrollment tracking and plan comparison',
  'Roth conversion optimizer with IRMAA management',
  'Quarterly estimated tax calculator',
  'RMD projections and legacy planning',
  'Educational retirement content and guides',
]

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Ad-free experience',
  'AI retirement help assistant',
  'Brokerage portfolio import and sync',
]

function Screenshot({ src, alt }: { src: string | StaticImport; alt: string }) {
  return (
    <div className="relative w-full aspect-[4/3] rounded-xl border overflow-hidden shadow-md">
      <Image src={src} alt={alt} fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 50vw" />
    </div>
  )
}

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect('/dashboard')

  return (
    <div className="flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
              Free to get started · No credit card required
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
              Retire smarter.<br />
              <span className="text-primary">Know every number.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              WhenIm64 is your personalized guide to the financial decisions that define retirement —
              Medicare enrollment, Social Security timing, Roth conversions, RMDs, and quarterly taxes.
              All in one place, tailored to your situation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Get started free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          {/* Hero screenshot */}
          <div className="hidden lg:block">
            <Screenshot src={imgSteps} alt="WhenIm64 retirement planning steps" />
          </div>
        </div>
      </section>

      {/* ── Screenshot trio ──────────────────────────────────────────────── */}
      <section className="bg-muted/30 border-y py-14">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-widest mb-8">
            What&apos;s inside
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Screenshot src={imgPlanning} alt="Roth conversion optimizer chart" />
              <p className="text-xs text-center text-muted-foreground">Roth Conversion Optimizer</p>
            </div>
            <div className="space-y-2">
              <Screenshot src={imgMedicare} alt="Medicare plan finder" />
              <p className="text-xs text-center text-muted-foreground">Medicare Plan Finder</p>
            </div>
            <div className="space-y-2">
              <Screenshot src={imgDashboard} alt="Retirement dashboard overview" />
              <p className="text-xs text-center text-muted-foreground">Retirement Dashboard</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Everything you need for a confident retirement</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Most retirees leave significant money on the table from sub-optimal Medicare choices, early
            Social Security claims, and avoidable taxes. WhenIm64 makes the right answer clear.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="relative rounded-xl border bg-card p-6 space-y-3">
                {f.premium && (
                  <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                    Premium
                  </span>
                )}
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="bg-muted/30 border-y py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free — upgrade when you want the full experience.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">

            {/* Free */}
            <div className="rounded-xl border bg-card p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold">Free</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground mb-1">/ forever</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Everything you need to plan a great retirement.</p>
              </div>
              <ul className="space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full" variant="outline">
                <Link href="/signup">Get started free</Link>
              </Button>
            </div>

            {/* Premium */}
            <div className="rounded-xl border-2 border-primary bg-card p-8 space-y-6 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Coming soon
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Premium</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold">$10</span>
                  <span className="text-muted-foreground mb-1">/ mo</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  or <strong className="text-foreground">$99 / year</strong>{' '}
                  <span className="text-xs text-green-700 dark:text-green-400 font-medium">save 17%</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">For investors who want the full picture.</p>
              </div>
              <ul className="space-y-2.5">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" disabled title="Subscription billing coming soon">
                Upgrade to Premium
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 w-full text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to take control of your retirement?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Create your free account in seconds. No credit card needed — start planning today.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/signup">
              Create free account <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/login">Already have an account? Sign in →</Link>
          </Button>
        </div>
      </section>

    </div>
  )
}
