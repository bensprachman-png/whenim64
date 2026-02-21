'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, authClient } from '@/lib/auth-client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const FILING_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'qualifying_surviving_spouse', label: 'Qualifying Surviving Spouse' },
]

const INSURANCE_GOALS = [
  { name: 'goalCatastrophicRisk' as const, label: 'Protect against catastrophic medical costs' },
  { name: 'goalDoctorFreedom' as const, label: 'Freedom to choose any doctor or hospital' },
  { name: 'goalMinPremium' as const, label: 'Keep monthly premiums as low as possible' },
  { name: 'goalMinTotalCost' as const, label: 'Minimize total annual out-of-pocket costs' },
  { name: 'goalTravelCoverage' as const, label: 'Coverage when traveling internationally' },
]

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address').or(z.literal('')),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid US zip code'),
  filingStatus: z.string().min(1, 'Please select a filing status'),
  goalCatastrophicRisk: z.boolean(),
  goalDoctorFreedom: z.boolean(),
  goalMinPremium: z.boolean(),
  goalMinTotalCost: z.boolean(),
  goalTravelCoverage: z.boolean(),
  enrolledMedicare: z.boolean(),
  collectingSS: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

export default function AccountPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [profileId, setProfileId] = useState<number | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [twoFactorMethod, setTwoFactorMethod] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

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
      name: '', email: '', dateOfBirth: '', zipCode: '', filingStatus: '',
      goalCatastrophicRisk: false, goalDoctorFreedom: false,
      goalMinPremium: false, goalMinTotalCost: false, goalTravelCoverage: false,
      enrolledMedicare: false, collectingSS: false,
    },
  })

  async function fetchProfile() {
    const res = await fetch('/api/users')
    const profile = await res.json()
    if (profile) {
      setHasPassword(profile.hasPassword ?? false)
      const method = profile.twoFactorMethod ?? null
      setTwoFactorMethod(method)
      if (method) setSelectedMethod(method as 'email' | 'totp')
    }
    if (profile?.id) {
      setProfileId(profile.id)
      form.reset({
        name: profile.name,
        email: profile.email ?? '',
        dateOfBirth: profile.dateOfBirth,
        zipCode: profile.zipCode,
        filingStatus: profile.filingStatus ?? '',
        goalCatastrophicRisk: profile.goalCatastrophicRisk ?? false,
        goalDoctorFreedom: profile.goalDoctorFreedom ?? false,
        goalMinPremium: profile.goalMinPremium ?? false,
        goalMinTotalCost: profile.goalMinTotalCost ?? false,
        goalTravelCoverage: profile.goalTravelCoverage ?? false,
        enrolledMedicare: profile.enrolledMedicare ?? false,
        collectingSS: profile.collectingSS ?? false,
      })
    } else {
      form.reset({
        name: session?.user?.name ?? '',
        email: session?.user?.email ?? '',
        dateOfBirth: '', zipCode: '', filingStatus: '',
        goalCatastrophicRisk: false, goalDoctorFreedom: false,
        goalMinPremium: false, goalMinTotalCost: false, goalTravelCoverage: false,
        enrolledMedicare: false, collectingSS: false,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()
  }, [form, session]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues) {
    if (profileId) {
      await fetch(`/api/users/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } else {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const created = await res.json()
      setProfileId(created.id)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-6">

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{isNew ? 'Welcome — Set Up Your Profile' : 'Your Account'}</CardTitle>
          <CardDescription>
            {isNew
              ? 'Tell us a bit about yourself so we can personalise your retirement planning guidance.'
              : 'Update your personal details.'}
          </CardDescription>
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

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium leading-none">Medicare Supplemental Insurance Priorities</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your selections tailor the plan recommendations on the Medicare page.
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-3">
                  {INSURANCE_GOALS.map((goal) => (
                    <FormField
                      key={goal.name}
                      control={form.control}
                      name={goal.name}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">{goal.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium leading-none">Enrollment Status</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Helps us tailor enrollment timing advice and plan recommendations.
                  </p>
                </div>
                <div className="rounded-lg border p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="enrolledMedicare"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal">Are you currently enrolled in Medicare?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value ? 'yes' : 'no'}
                            onValueChange={(v) => field.onChange(v === 'yes')}
                            className="flex gap-6 mt-1"
                          >
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl><RadioGroupItem value="yes" /></FormControl>
                              <FormLabel className="font-normal cursor-pointer">Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl><RadioGroupItem value="no" /></FormControl>
                              <FormLabel className="font-normal cursor-pointer">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="collectingSS"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal">Are you currently collecting Social Security benefits?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value ? 'yes' : 'no'}
                            onValueChange={(v) => field.onChange(v === 'yes')}
                            className="flex gap-6 mt-1"
                          >
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl><RadioGroupItem value="yes" /></FormControl>
                              <FormLabel className="font-normal cursor-pointer">Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl><RadioGroupItem value="no" /></FormControl>
                              <FormLabel className="font-normal cursor-pointer">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : isNew ? 'Save & Continue' : 'Save Changes'}
                </Button>
                {saved && <p className="text-sm text-green-600">{isNew ? 'Profile created!' : 'Changes saved!'}</p>}
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

    </main>
  )
}
