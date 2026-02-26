import type { Metadata } from 'next'
import HelpChat from '@/components/help-chat'

export const metadata: Metadata = {
  title: 'Retirement Help',
  description: 'Ask our AI assistant anything about Medicare, Social Security, RMDs, Roth conversions, or tax-efficient withdrawal strategies in retirement.',
  openGraph: {
    title: 'Retirement Help | WhenIm64',
    description: 'Ask our AI assistant anything about Medicare, Social Security, RMDs, Roth conversions, or tax-efficient withdrawal strategies in retirement.',
  },
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-3xl font-bold">Retirement Help</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ask anything about Medicare, Social Security, RMDs, or tax planning in retirement.
        </p>
      </div>
      <HelpChat className="flex-1 min-h-0" />
    </main>
  )
}
