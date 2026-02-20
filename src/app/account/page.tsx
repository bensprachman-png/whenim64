'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/lib/auth-client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  const { data: session } = useSession()
  const [profileId, setProfileId] = useState<number | null>(null)
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', email: '', dateOfBirth: '', zipCode: '', filingStatus: '',
      goalCatastrophicRisk: false, goalDoctorFreedom: false,
      goalMinPremium: false, goalMinTotalCost: false, goalTravelCoverage: false,
      enrolledMedicare: false, collectingSS: false,
    },
  })

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((profile) => {
        if (profile) setHasPassword(profile.hasPassword ?? false)
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
          // New user — pre-populate from auth session
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
      })
  }, [form, session])

  async function onSubmit(values: FormValues) {
    if (profileId) {
      // Update existing profile
      await fetch(`/api/users/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } else {
      // Create new profile
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

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    )
  }

  const isNew = !profileId

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-6">

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

              {/* Supplemental insurance goals */}
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

              {/* Medicare / SS enrollment status */}
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

      {!isNew && hasPassword && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Security</CardTitle>
            <CardDescription>Manage two-factor authentication for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {session?.user?.twoFactorEnabled ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-600 font-medium">Two-factor authentication is enabled.</span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/mfa/setup">Reconfigure 2FA</Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Two-factor authentication is not enabled.</span>
                <Button size="sm" asChild>
                  <Link href="/mfa/setup">Enable 2FA</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </main>
  )
}
