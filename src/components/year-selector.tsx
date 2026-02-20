'use client'

import { useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SUPPORTED_YEARS, resolveYear } from '@/lib/retirement-data'

// Self-contained: reads the current year from the URL and navigates via
// window.location.href (hard GET) so the server component always re-renders
// with fresh searchParams. No props required.
export default function YearSelector() {
  const searchParams = useSearchParams()
  const year = resolveYear(searchParams.get('year') ?? undefined)
  const calendarYear = new Date().getFullYear()

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', value)
    window.location.href = `${window.location.pathname}?${params.toString()}`
  }

  return (
    <Select value={String(year)} onValueChange={handleChange}>
      <SelectTrigger className="w-36 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_YEARS.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}{y === calendarYear ? ' (current)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
