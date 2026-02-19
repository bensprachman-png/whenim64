'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useState } from 'react'

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

export default function Home() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', dateOfBirth: '', zipCode: '', filingStatus: '',
      goalCatastrophicRisk: false, goalDoctorFreedom: false,
      goalMinPremium: false, goalMinTotalCost: false, goalTravelCoverage: false,
      enrolledMedicare: false, collectingSS: false,
    },
  })

  async function onSubmit(values: FormValues) {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">You&apos;re all set!</CardTitle>
            <CardDescription>Your details have been saved. Welcome to WhenIm64.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to WhenIm64</CardTitle>
          <CardDescription>Tell us a bit about yourself to get started with your retirement plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your name?</FormLabel>
                    <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your date of birth?</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your zip code?</FormLabel>
                    <FormControl><Input placeholder="90210" maxLength={10} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filingStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What is your tax filing status?</FormLabel>
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
                )}
              />

              {/* Supplemental insurance goals */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium leading-none">Medicare Supplemental Insurance Priorities</p>
                  <p className="text-xs text-muted-foreground mt-1">What matters most to you? Select all that apply.</p>
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
              <FormField
                control={form.control}
                name="enrolledMedicare"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Are you currently enrolled in Medicare?</FormLabel>
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
                    <FormLabel>Are you currently collecting Social Security benefits?</FormLabel>
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

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Get Started'}
              </Button>

            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  )
}
