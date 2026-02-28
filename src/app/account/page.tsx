'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, authClient } from '@/lib/auth-client'

import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

import { formSchema, FILING_STATUSES, type FormValues } from './_lib/schema'
import OnboardingWizard from './_components/OnboardingWizard'

export default function AccountPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [profileId, setProfileId] = useState<number | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [twoFactorMethod, setTwoFactorMethod] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<number | null>(null)
  const [prices, setPrices] = useState<{ monthly: { formatted: string }; yearly: { formatted: string } } | null>(null)
  const [upgradeLoading, setUpgradeLoading] = useState<'monthly' | 'yearly' | 'portal' | null>(null)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteScope, setDeleteScope] = useState<'data' | 'account'>('data')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // After checkout success, sync subscription directly from Stripe then refresh profile
  useEffect(() => {
    if (!checkoutSuccess || isPaid) return
    fetch('/api/stripe/sync', { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.synced) fetchProfile()
      })
      .catch(() => {})
  }, [checkoutSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  // Which method to enable when the toggle is turned on (while 2FA is off)
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'totp'>('email')

  // Change password state (no TOTP field — dialog handles that separately)
  const [changePw, setChangePw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [changePwError, setChangePwError] = useState('')
  const [changePwDone, setChangePwDone] = useState(false)
  const [changePwLoading, setChangePwLoading] = useState(false)

  // Dialog: TOTP verification before changing password
  const [totpDialogOpen, setTotpDialogOpen] = useState(false)
  const [totpDialogCode, setTotpDialogCode] = useState('')
  const [totpDialogError, setTotpDialogError] = useState('')
  const [totpDialogLoading, setTotpDialogLoading] = useState(false)

  // Dialog: MFA enable/disable confirmation
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false)
  const [mfaDialogMode, setMfaDialogMode] = useState<'enable-email' | 'disable'>('enable-email')
  const [mfaDialogPassword, setMfaDialogPassword] = useState('')
  const [mfaDialogLoading, setMfaDialogLoading] = useState(false)
  const [mfaDialogError, setMfaDialogError] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', email: '', dateOfBirth: '', zipCode: '', filingStatus: '', sex: '', spouseDateOfBirth: '', spouseSex: '',
    },
  })

  async function fetchProfile() {
    const res = await fetch('/api/users')
    const profile = await res.json()
    if (profile) {
      setHasPassword(profile.hasPassword ?? false)
      setIsPaid(profile.isPaid ?? false)
      setSubscriptionStatus(profile.subscriptionStatus ?? null)
      setSubscriptionPlan(profile.subscriptionPlan ?? null)
      setCurrentPeriodEnd(profile.currentPeriodEnd ?? null)
      const method = profile.twoFactorMethod ?? null
      setTwoFactorMethod(method)
      if (method) setSelectedMethod(method as 'email' | 'totp')
    }
    if (profile?.id) {
      setProfileId(profile.id)
      form.reset({
        name: profile.name ?? '',
        email: profile.email ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        zipCode: profile.zipCode ?? '',
        filingStatus: profile.filingStatus ?? '',
        sex: profile.sex ?? '',
        spouseDateOfBirth: profile.spouseDateOfBirth ?? '',
        spouseSex: profile.spouseSex ?? '',
      }, { keepDirtyValues: true })
    } else {
      form.reset({
        name: session?.user?.name ?? '',
        email: session?.user?.email ?? '',
        dateOfBirth: '', zipCode: '', filingStatus: '', sex: '', spouseDateOfBirth: '', spouseSex: '',
      }, { keepDirtyValues: true })
    }
    // Validate on load for existing users so missing required fields are highlighted immediately
    // (New users go through the wizard which uses disabled-button UX instead)
    if (profile?.id) {
      setTimeout(() => form.trigger(), 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()
    // Fetch Stripe prices for display
    fetch('/api/stripe/prices')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.monthly) setPrices(data) })
      .catch(() => {})
    // Detect successful checkout redirect
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      setCheckoutSuccess(true)
      window.history.replaceState({}, '', '/account')
    }
  }, [form, session]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues): Promise<boolean> {
    setSaveError(null)
    if (profileId) {
      const res = await fetch(`/api/users/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveError(`Save failed (${res.status}): ${(err as { error?: string }).error ?? 'Unknown error'}`)
        return false
      }
    } else {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveError(`Save failed (${res.status}): ${(err as { error?: string }).error ?? 'Unknown error'}`)
        return false
      }
      const created = await res.json()
      setProfileId(created.id)
    }

    // Keep the auth user record in sync so the navbar reflects the updated name.
    if (values.name !== session?.user?.name) {
      await authClient.updateUser({ name: values.name })
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    return true
  }

  // ── Stripe ───────────────────────────────────────────────────────────────────

  async function handleUpgrade(plan: 'monthly' | 'yearly') {
    setUpgradeLoading(plan)
    setUpgradeError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setUpgradeError(data.error ?? 'Could not start checkout. Please try again.')
      }
    } catch {
      setUpgradeError('Could not connect to payment provider. Please try again.')
    } finally {
      setUpgradeLoading(null)
    }
  }

  async function handleManageSubscription() {
    setUpgradeLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silently fail
    } finally {
      setUpgradeLoading(null)
    }
  }

  // ── Change Password ──────────────────────────────────────────────────────────

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault()
    setChangePwError('')
    const { currentPassword, newPassword, confirmPassword } = changePw
    if (newPassword !== confirmPassword) { setChangePwError('Passwords do not match'); return }
    if (newPassword.length < 8) { setChangePwError('Password must be at least 8 characters'); return }

    // If TOTP 2FA is active, open the verification dialog first
    if (session?.user?.twoFactorEnabled && twoFactorMethod === 'totp') {
      setTotpDialogCode('')
      setTotpDialogError('')
      setTotpDialogOpen(true)
      return
    }

    setChangePwLoading(true)
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false })
    if (result.error) {
      setChangePwError(result.error.message ?? 'Failed to change password.')
    } else {
      setChangePwDone(true)
      setChangePw({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }
    setChangePwLoading(false)
  }

  async function handleTotpDialogConfirm(e: React.FormEvent) {
    e.preventDefault()
    setTotpDialogError('')
    setTotpDialogLoading(true)

    const res = await fetch('/api/users/verify-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: totpDialogCode }),
    })
    if (!res.ok) {
      setTotpDialogError('Invalid authenticator code.')
      setTotpDialogLoading(false)
      return
    }

    const result = await authClient.changePassword({
      currentPassword: changePw.currentPassword,
      newPassword: changePw.newPassword,
      revokeOtherSessions: false,
    })
    if (result.error) {
      setTotpDialogError(result.error.message ?? 'Failed to change password.')
      setTotpDialogLoading(false)
      return
    }

    setTotpDialogOpen(false)
    setTotpDialogLoading(false)
    setChangePwDone(true)
    setChangePw({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  // ── MFA enable / disable ─────────────────────────────────────────────────────

  function openMfaDialog(mode: 'enable-email' | 'disable') {
    setMfaDialogMode(mode)
    setMfaDialogPassword('')
    setMfaDialogError('')
    setMfaDialogOpen(true)
  }

  function handleToggle2FA(checked: boolean) {
    if (checked) {
      if (selectedMethod === 'totp') {
        router.push('/mfa/setup')
      } else {
        openMfaDialog('enable-email')
      }
    } else {
      openMfaDialog('disable')
    }
  }

  function handleMethodChange(val: string) {
    const method = val as 'email' | 'totp'
    if (twoFAEnabled) {
      // Switch active method
      if (method === 'totp') {
        router.push('/mfa/setup')
      } else {
        openMfaDialog('enable-email')
      }
    } else {
      setSelectedMethod(method)
    }
  }

  async function handleMfaDialogConfirm(e: React.FormEvent) {
    e.preventDefault()
    setMfaDialogError('')
    setMfaDialogLoading(true)

    if (mfaDialogMode === 'disable') {
      const result = await authClient.twoFactor.disable({ password: mfaDialogPassword })
      if (result.error) {
        setMfaDialogError(result.error.message ?? 'Failed to disable 2FA.')
        setMfaDialogLoading(false)
        return
      }
      await fetch('/api/users/set-mfa-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: null }),
      })
    } else {
      // enable-email (also handles switching from totp → email)
      const res = await fetch('/api/users/enable-email-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: mfaDialogPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        setMfaDialogError(data.error ?? 'Failed to enable email 2FA.')
        setMfaDialogLoading(false)
        return
      }
    }

    await authClient.getSession()
    await fetchProfile()
    setMfaDialogOpen(false)
    setMfaDialogPassword('')
    setMfaDialogLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    )
  }

  const isNew = !profileId
  const twoFAEnabled = session?.user?.twoFactorEnabled
  const filingStatusValue = form.watch('filingStatus')

  async function handleDeleteSubmit() {
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: deleteScope }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError((data as { error?: string }).error ?? 'Something went wrong.')
        return
      }
      if (deleteScope === 'account') {
        await authClient.signOut()
        router.push('/')
      } else {
        setDeleteDialogOpen(false)
        router.refresh()
      }
    } catch {
      setDeleteError('Network error — please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── New user: show onboarding wizard ─────────────────────────────────────
  if (isNew) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <OnboardingWizard form={form} onSubmit={onSubmit} saveError={saveError} />
      </main>
    )
  }

  // ── Existing user: full account page ─────────────────────────────────────
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-6">

      {/* Membership card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">Membership</CardTitle>
            {isPaid ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Premium Member
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                Free Plan
              </span>
            )}
          </div>
          <CardDescription>
            {isPaid
              ? 'You have full access to all features, including the AI Retirement Assistant, brokerage portfolio import, and an ad-free experience.'
              : 'Upgrade to Premium for the AI Retirement Assistant, an ad-free experience, and brokerage portfolio import.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPaid ? (
            /* ── Paid: Premium status card ── */
            <div className="space-y-4">
              {checkoutSuccess && (
                <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-400">
                  <strong>Welcome to Premium!</strong> Your account is now fully unlocked.
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold">Premium Member</p>
                  {subscriptionPlan && (
                    <p className="text-xs text-muted-foreground capitalize">{subscriptionPlan} plan</p>
                  )}
                </div>
              </div>
              {currentPeriodEnd && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {subscriptionStatus === 'canceled' ? 'Access until' : 'Next payment'}:
                  </span>{' '}
                  <span className="font-medium">
                    {new Date(currentPeriodEnd * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
              {subscriptionStatus && subscriptionStatus !== 'active' && (
                <p className="text-sm">
                  Status: <span className="font-medium text-amber-600 dark:text-amber-400 capitalize">{subscriptionStatus.replace('_', ' ')}</span>
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={upgradeLoading === 'portal'}
              >
                {upgradeLoading === 'portal' ? 'Opening…' : 'Manage Subscription'}
              </Button>
            </div>
          ) : (
            /* ── Free: show checkout-processing banner or pricing cards ── */
            <>
            {checkoutSuccess && (
              <div className="mb-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-400">
                <strong>Payment received — activating your account…</strong> This usually takes a few seconds. Refresh if the page doesn&apos;t update automatically.
              </div>
            )}
            <div className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ AI Retirement Assistant</li>
                <li>✓ Ad-free experience</li>
                <li>✓ Brokerage portfolio import &amp; sync</li>
                <li>✓ All planning and dashboard features</li>
              </ul>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="font-semibold">Monthly</p>
                    <p className="text-2xl font-bold mt-1">
                      {prices?.monthly.formatted ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Billed monthly · cancel anytime</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade('monthly')}
                    disabled={upgradeLoading !== null}
                  >
                    {upgradeLoading === 'monthly' ? 'Redirecting…' : 'Get Monthly'}
                  </Button>
                </div>
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Yearly</p>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Best value</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {prices?.yearly.formatted ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Billed annually · cancel anytime</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade('yearly')}
                    disabled={upgradeLoading !== null}
                  >
                    {upgradeLoading === 'yearly' ? 'Redirecting…' : 'Get Yearly'}
                  </Button>
                </div>
              </div>
              {upgradeError && (
                <p className="text-sm text-destructive">{upgradeError}</p>
              )}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Your Account</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="zipCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code</FormLabel>
                  <FormControl><Input maxLength={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Biological Sex</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Used for life expectancy calculations.</p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="filingStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Filing Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a filing status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FILING_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {filingStatusValue === 'married_jointly' && (
                <>
                  <FormField control={form.control} name="spouseDateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spouse Date of Birth</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="spouseSex" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spouse Biological Sex</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Used for life expectancy calculations.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {Object.keys(form.formState.errors).length > 0 && (
                <p className="text-sm text-destructive">Please fill in the missing information above.</p>
              )}
              <div className="flex items-center gap-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                {saved && <p className="text-sm text-green-600">Changes saved!</p>}
                {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication card */}
      {hasPassword && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
            <CardDescription>Add a second layer of security to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <Label htmlFor="2fa-toggle" className="text-sm font-medium cursor-pointer">
                Enable Two-Factor Authentication
              </Label>
              <Switch
                id="2fa-toggle"
                checked={!!twoFAEnabled}
                onCheckedChange={handleToggle2FA}
              />
            </div>

            <RadioGroup
              value={twoFAEnabled ? (twoFactorMethod ?? selectedMethod) : selectedMethod}
              onValueChange={handleMethodChange}
              className="space-y-3"
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="email" id="method-email" className="mt-0.5" />
                <Label htmlFor="method-email" className="font-normal cursor-pointer leading-snug">
                  <span className="font-medium">Email</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Receive a one-time code to your email each sign-in
                  </span>
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="totp" id="method-totp" className="mt-0.5" />
                <Label htmlFor="method-totp" className="font-normal cursor-pointer leading-snug">
                  <span className="font-medium">Authenticator App</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Use Google Authenticator or Authy
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Change Password card */}
      {hasPassword && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Change Password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent>
            {changePwDone ? (
              <p className="text-sm text-green-600">Password changed successfully.</p>
            ) : (
              <form onSubmit={handleChangePw} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="currentPassword">Current Password</label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={changePw.currentPassword}
                    onChange={(e) => setChangePw((p) => ({ ...p, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="newPassword">New Password</label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={changePw.newPassword}
                    onChange={(e) => setChangePw((p) => ({ ...p, newPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm New Password</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={changePw.confirmPassword}
                    onChange={(e) => setChangePw((p) => ({ ...p, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                {changePwError && <p className="text-sm text-destructive">{changePwError}</p>}
                <Button type="submit" size="sm" disabled={changePwLoading}>
                  {changePwLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog: TOTP verification before changing password */}
      <Dialog
        open={totpDialogOpen}
        onOpenChange={(open) => { if (!totpDialogLoading) setTotpDialogOpen(open) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your Identity</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app to confirm the password change.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTotpDialogConfirm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp-dialog-code">Authenticator Code</Label>
              <Input
                id="totp-dialog-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={totpDialogCode}
                onChange={(e) => setTotpDialogCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
                className="text-center text-2xl tracking-widest"
              />
            </div>
            {totpDialogError && <p className="text-sm text-destructive">{totpDialogError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTotpDialogOpen(false)}
                disabled={totpDialogLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={totpDialogLoading || totpDialogCode.length !== 6}>
                {totpDialogLoading ? 'Verifying...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: MFA enable / disable */}
      <Dialog
        open={mfaDialogOpen}
        onOpenChange={(open) => { if (!mfaDialogLoading) setMfaDialogOpen(open) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mfaDialogMode === 'disable'
                ? 'Disable Two-Factor Authentication'
                : 'Enable Email Two-Factor Authentication'}
            </DialogTitle>
            <DialogDescription>
              {mfaDialogMode === 'disable'
                ? 'Enter your password to confirm.'
                : 'Enter your password to enable email verification at each sign-in.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMfaDialogConfirm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-dialog-password">Password</Label>
              <Input
                id="mfa-dialog-password"
                type="password"
                value={mfaDialogPassword}
                onChange={(e) => setMfaDialogPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            {mfaDialogError && <p className="text-sm text-destructive">{mfaDialogError}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMfaDialogOpen(false)}
                disabled={mfaDialogLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={mfaDialogMode === 'disable' ? 'destructive' : 'default'}
                disabled={mfaDialogLoading}
              >
                {mfaDialogLoading ? 'Confirming...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your data or your entire account. These actions cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => { setDeleteScope('data'); setDeleteError(null); setDeleteDialogOpen(true) }}
          >
            Delete Account or Data…
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) setDeleteDialogOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account or data</DialogTitle>
            <DialogDescription>
              Choose what you want to delete. <strong>This cannot be undone — deleted data cannot be recovered.</strong>
            </DialogDescription>
          </DialogHeader>

          <RadioGroup
            value={deleteScope}
            onValueChange={(v) => setDeleteScope(v as 'data' | 'account')}
            className="space-y-3 py-2"
          >
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer has-[:checked]:border-destructive has-[:checked]:bg-destructive/5">
              <RadioGroupItem value="data" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Delete my data only</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Removes your profile, planning scenarios, and brokerage connections. Your login and email address will be kept.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer has-[:checked]:border-destructive has-[:checked]:bg-destructive/5">
              <RadioGroupItem value="account" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Delete my account completely</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently removes your account, login, and all associated data. You will be signed out immediately.
                </p>
              </div>
            </label>
          </RadioGroup>

          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubmit} disabled={deleteLoading}>
              {deleteLoading
                ? 'Deleting…'
                : deleteScope === 'account'
                  ? 'Delete My Account'
                  : 'Delete My Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  )
}
