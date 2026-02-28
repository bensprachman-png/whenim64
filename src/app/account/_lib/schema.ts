import { z } from 'zod'

export const FILING_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'qualifying_surviving_spouse', label: 'Qualifying Surviving Spouse' },
]

export const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid US zip code'),
  filingStatus: z.string().min(1, 'Please select a filing status'),
  sex: z.string().min(1, 'Please select a biological sex'),
  spouseDateOfBirth: z.string().optional(),
  spouseSex: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.filingStatus === 'married_jointly') {
    if (!data.spouseDateOfBirth) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Spouse date of birth is required', path: ['spouseDateOfBirth'] })
    }
    if (!data.spouseSex) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please select spouse biological sex', path: ['spouseSex'] })
    }
  }
})

export type FormValues = z.infer<typeof formSchema>
