'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>Enter your email to receive a password reset link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600">
                Check your email for a password reset link. If an account exists for that address, you&apos;ll receive instructions shortly.
              </p>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
