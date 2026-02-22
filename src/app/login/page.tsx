'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn.email({ email, password })

    if (result.error) {
      setError(result.error.message ?? 'Sign in failed.')
      setLoading(false)
      return
    }

    // If MFA is required, better-auth returns a twoFactorRedirect
    if ((result.data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
      router.push('/mfa/verify')
      return
    }

    router.push('/account')
  }

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      const result = await signIn.social({ provider: 'google', callbackURL: '/account' })
      if (result?.error) {
        setError(result.error.message ?? 'Google sign-in failed.')
        setGoogleLoading(false)
      }
      // On success, browser redirects — no need to clear loading
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
      setGoogleLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Sign in to your WhenIm64 account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchParams.get('reset') === '1' && (
            <p className="text-sm text-green-600">Password reset successfully. Please sign in.</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end -mt-1">
              <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={googleLoading || loading}>
            {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline underline-offset-4 hover:text-primary">
              Sign up
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Questions?{' '}
            <Link href="/contact" className="underline underline-offset-4 hover:text-primary">
              Contact us
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
