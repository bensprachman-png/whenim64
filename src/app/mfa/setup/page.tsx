'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'password' | 'qr' | 'verify' | 'backup'

export default function MfaSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('password')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [totpURI, setTotpURI] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await authClient.twoFactor.enable({ password })

    if (result.error) {
      setError(result.error.message ?? 'Failed to enable 2FA.')
      setLoading(false)
      return
    }

    const uri = (result.data as { totpURI?: string })?.totpURI
    const codes = (result.data as { backupCodes?: string[] })?.backupCodes ?? []

    if (!uri) {
      setError('No TOTP URI returned.')
      setLoading(false)
      return
    }

    setTotpURI(uri)
    setBackupCodes(codes)

    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(uri)
    setQrCode(dataUrl)
    setStep('qr')
    setLoading(false)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await authClient.twoFactor.verifyTotp({ code: totpCode })

    if (result.error) {
      setError(result.error.message ?? 'Invalid code. Please try again.')
      setLoading(false)
      return
    }

    setStep('backup')
    setLoading(false)
  }

  if (step === 'password') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Enable Two-Factor Auth</CardTitle>
            <CardDescription>Confirm your password to get your authenticator setup code.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEnable} className="space-y-4">
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
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Confirming...' : 'Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (step === 'qr') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Scan QR Code</CardTitle>
            <CardDescription>
              Scan this code with Google Authenticator or Authy, then click Continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrCode && (
              <div className="flex justify-center">
                <Image src={qrCode} alt="TOTP QR Code" width={200} height={200} />
              </div>
            )}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Can&apos;t scan? Enter manually</summary>
              <p className="mt-2 break-all font-mono">{totpURI}</p>
            </details>
            <Button className="w-full" onClick={() => setStep('verify')}>
              I&apos;ve scanned it — Continue
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (step === 'verify') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Verify Setup</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app to confirm setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Authenticator Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Activate'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Two-Factor Auth Enabled</CardTitle>
          <CardDescription>
            Store these backup codes somewhere safe. Each can be used once to sign in if you lose your authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 font-mono text-sm space-y-1">
            {backupCodes.map((code) => (
              <p key={code}>{code}</p>
            ))}
          </div>
          <Button className="w-full" onClick={async () => {
            await fetch('/api/users/set-mfa-method', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ method: 'totp' }),
            })
            router.push('/account')
          }}>
            Done
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
