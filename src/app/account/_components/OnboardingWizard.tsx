'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UseFormReturn } from 'react-hook-form'
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronLeft,
  CircleHelp,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Users,
  HeartPulse,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { FILING_STATUSES, type FormValues } from '../_lib/schema'

interface Props {
  form: UseFormReturn<FormValues>
  onSubmit: (values: FormValues) => Promise<boolean>
  saveError: string | null
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs text-muted-foreground">Step {current} of {total}</span>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-6 rounded-full transition-colors ${i < current ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function OnboardingWizard({ form, onSubmit, saveError }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)

  async function handleNextStep() {
    const fields: (keyof FormValues)[] = step === 2
      ? ['dateOfBirth', 'zipCode', 'sex']
      : []
    if (fields.length > 0) {
      const valid = await form.trigger(fields)
      if (!valid) return
    }
    setStep((s) => s + 1)
  }

  const handleFinalSubmit = form.handleSubmit(async (values) => {
    const ok = await onSubmit(values)
    if (ok) router.push('/dashboard')
  })

  const filingStatus = form.watch('filingStatus')

  // ── Step 1: Welcome & Tour ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to WhenIm64!</CardTitle>
          <CardDescription>
            Your personal retirement planning guide. Here&apos;s a quick overview before we set up your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div>
            <p className="text-sm font-semibold mb-3">Toolbar icons (top-right)</p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3 text-sm">
                <Settings className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Account</strong> — manage your profile, password, and security settings</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <BookOpen className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Glossary</strong> — look up retirement terms and concepts</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <CircleHelp className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  <strong>Help &amp; AI Retirement Assistant</strong> — ask questions and get personalised guidance{' '}
                  <span className="text-xs text-muted-foreground">(Premium)</span>
                </span>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold mb-3">Pages</p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-3 text-sm">
                <LayoutDashboard className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Dashboard</strong> — retirement overview, projected income, and key milestones</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Users className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Social Security</strong> — benefit estimates at different claiming ages and break-even analysis</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <HeartPulse className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Medicare</strong> — eligibility timeline, Part A/B/D enrollment windows, and IRMAA surcharges</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Calculator className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span><strong>Planning</strong> — Roth conversions, withdrawal strategies, tax scenarios, and RMDs</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <TrendingUp className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span>
                  <strong>Portfolio</strong> — connect brokerage accounts to track holdings and retirement readiness{' '}
                  <span className="text-xs text-muted-foreground">(Premium)</span>
                </span>
              </li>
            </ul>
          </div>

          <Button onClick={handleNextStep} className="gap-2">
            Get Started <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Step 2: Personal details ──────────────────────────────────────────────
  if (step === 2) {
    return (
      <Card>
        <CardHeader>
          <StepDots current={2} total={3} />
          <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
          <CardDescription>This information personalises your retirement projections.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="space-y-6">

              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">
                    Used to calculate your Social Security eligibility age, Medicare enrollment windows, and Required Minimum Distribution (RMD) start date.
                  </p>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="zipCode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code</FormLabel>
                  <FormControl><Input maxLength={10} placeholder="12345" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">
                    Used to estimate state income taxes in your retirement income projections.
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Used for life expectancy calculations that determine your recommended planning horizon.
                  </p>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-1">
                  <ChevronLeft className="size-4" /> Back
                </Button>
                <Button type="button" onClick={handleNextStep} className="gap-2">
                  Next <ArrowRight className="size-4" />
                </Button>
              </div>

            </div>
          </Form>
        </CardContent>
      </Card>
    )
  }

  // ── Step 3: Tax filing ────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <StepDots current={3} total={3} />
        <CardTitle className="text-2xl">Tax &amp; filing details</CardTitle>
        <CardDescription>
          Your filing status affects your tax brackets, deductions, and Social Security taxation thresholds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleFinalSubmit} className="space-y-6">

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

            {filingStatus === 'married_jointly' && (
              <>
                <p className="text-xs text-muted-foreground">
                  Joint life expectancy is used for withdrawal strategy optimisation and survivor benefit planning.
                </p>

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

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-1">
                <ChevronLeft className="size-4" /> Back
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2">
                {form.formState.isSubmitting ? 'Saving…' : <>Save &amp; Continue <ArrowRight className="size-4" /></>}
              </Button>
            </div>

          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
