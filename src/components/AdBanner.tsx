'use client'
import { useEffect } from 'react'

declare global { interface Window { adsbygoogle: unknown[] } }

// Topic-keyed fake ads — slot name becomes the key when no real AdSense slot is configured.
// Each page passes `process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOO ?? 'topic-name'` so in dev
// this component always gets a contextually relevant placeholder.
const FAKE_ADS: Record<string, {
  headline: string; body: string; cta: string; initial: string; color: string
}> = {
  medicare: {
    headline: 'Aetna Medicare Supplement',
    body: 'Plan G covers your Part A & B cost-sharing gaps. Free personalized quote in minutes.',
    cta: 'Compare rates →',
    initial: 'A',
    color: 'text-purple-700 dark:text-purple-400',
  },
  'social-security': {
    headline: 'Maximize Your SS Benefit',
    body: 'Model spousal coordination, delay credits, and break-even scenarios before you claim.',
    cta: 'Run analysis →',
    initial: 'SS',
    color: 'text-blue-700 dark:text-blue-400',
  },
  planning: {
    headline: 'Fidelity Roth IRA',
    body: 'Open a Roth IRA today — no account minimums, $0 commission trades, 1,000+ funds.',
    cta: 'Get started →',
    initial: 'F',
    color: 'text-green-700 dark:text-green-400',
  },
  portfolio: {
    headline: 'Schwab Intelligent Portfolios',
    body: 'Automated, diversified investing with no advisory fees. Get started with $5,000.',
    cta: 'See how it works →',
    initial: 'S',
    color: 'text-sky-700 dark:text-sky-400',
  },
  dashboard: {
    headline: 'Vanguard',
    body: 'Low-cost index funds and ETFs built for long-term retirement investors.',
    cta: 'Learn more →',
    initial: 'V',
    color: 'text-red-700 dark:text-red-400',
  },
}

const DEFAULT_AD = FAKE_ADS.dashboard

export default function AdBanner({ adSlot, className }: { adSlot: string; className?: string }) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

  useEffect(() => {
    if (!clientId) return
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}) } catch {}
  }, [clientId])

  if (!clientId) {
    const ad = FAKE_ADS[adSlot] ?? DEFAULT_AD
    return (
      <div className={`relative rounded-md border border-dashed border-muted bg-muted/20 px-4 py-3 flex items-center gap-4 ${className ?? ''}`}>
        <span className="absolute top-1.5 right-2 text-[10px] text-muted-foreground/50 font-medium tracking-wide uppercase select-none">
          Ad
        </span>
        <div className={`shrink-0 w-10 h-10 rounded-md bg-muted flex items-center justify-center text-sm font-bold ${ad.color}`}>
          {ad.initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-tight ${ad.color}`}>{ad.headline}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{ad.body}</p>
        </div>
        <span className={`shrink-0 text-xs font-medium whitespace-nowrap ${ad.color}`}>{ad.cta}</span>
      </div>
    )
  }

  return (
    <ins
      className={`adsbygoogle block ${className ?? ''}`}
      data-ad-client={clientId}
      data-ad-slot={adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
