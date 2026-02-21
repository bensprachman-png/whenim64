'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function MfaVerifyPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'totp' | 'email'>('totp')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  async function handleSubmitTotp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await authClient.twoFactor.verifyTotp({ code })

    if (result.error) {
      setError(result.error.message ?? 'Invalid code.')
      setLoading(false)
      return
    }

    router.push('/account')
  }

  async function handleSendOtp() {
    setSending(true)
    setError('')
    const result = await authClient.twoFactor.sendOtp()
    if (result.error) {
      setError(result.error.message ?? 'Failed to send code.')
      setSending(false)
      return
    }
    setMode('email')
    setOtpSent(true)
    setCode('')
    setSending(false)
  }

  async function handleSubmitOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await authClient.twoFactor.verifyOtp({ code })

    if (result.error) {
      setError(result.error.message ?? 'Invalid code.')
      setLoading(false)
      return
    }

    router.push('/account')
  }

  if (mode === 'email') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              {otpSent ? 'A code was sent to your email.' : 'Enter the code sent to your email.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code">Sign-in Code</Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </form>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sending}
                className="text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                {sending ? 'Sending...' : 'Resend code'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('totp'); setCode(''); setError('') }}
                className="text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Use authenticator instead
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Two-Factor Verification</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitTotp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Authentication Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className="text-center text-2xl tracking-widest"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
          <div className="mt-4 border-t pt-4">
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={sending}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              {sending ? 'Sending...' : 'Send a code to my email instead \u2192'}
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
