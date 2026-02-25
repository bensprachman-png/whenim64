import HelpChat from '@/components/help-chat'

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
