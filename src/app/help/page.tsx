import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import HelpChat from '@/components/help-chat'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Retirement Help',
  description: 'Ask our AI assistant anything about Medicare, Social Security, RMDs, Roth conversions, or tax-efficient withdrawal strategies in retirement.',
  openGraph: {
    title: 'Retirement Help | WhenIm64',
    description: 'Ask our AI assistant anything about Medicare, Social Security, RMDs, Roth conversions, or tax-efficient withdrawal strategies in retirement.',
  },
}

export default async function HelpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const [profile] = await db
    .select({ isPaid: profiles.isPaid })
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1)
  const isPaid = profile?.isPaid ?? false

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-3xl font-bold">Retirement Help</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isPaid
            ? 'Ask anything about Medicare, Social Security, RMDs, or tax planning in retirement.'
            : 'Browse common questions below. Upgrade to Premium to ask your own questions.'}
        </p>
      </div>
      <HelpChat className="flex-1 min-h-0" isPaid={isPaid} />
    </main>
  )
}
