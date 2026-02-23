import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect('/dashboard')

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">WhenIm64</CardTitle>
          <CardDescription className="text-base mt-2">
            Your personalized retirement planning guide — Medicare, Social Security, taxes, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/signup">Create Account</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
