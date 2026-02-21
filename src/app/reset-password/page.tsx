'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const result = await authClient.resetPassword({ newPassword, token })
    if (result.error) {
      setError(result.error.message ?? 'This link is invalid or has expired.')
      setLoading(false)
      return
    }
    router.push('/login?reset=1')
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">This reset link is invalid or has expired.</p>
        <p className="text-sm text-muted-foreground">
          <Link href="/forgot-password" className="underline underline-offset-4 hover:text-primary">
            Request a new reset link
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      {error && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          {(error.includes('invalid') || error.includes('expired')) && (
            <p className="text-sm text-muted-foreground">
              <Link href="/forgot-password" className="underline underline-offset-4 hover:text-primary">
                Request a new reset link
              </Link>
            </p>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
