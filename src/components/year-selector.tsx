'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SupportedYear } from '@/lib/retirement-data'

interface Props {
  currentYear: SupportedYear
  supportedYears: SupportedYear[]
  calendarYear: number
}

export default function YearSelector({ currentYear, supportedYears, calendarYear }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', value)
    router.replace(`?${params.toString()}`)
  }

  return (
    <Select value={String(currentYear)} onValueChange={handleChange}>
      <SelectTrigger className="w-36 shrink-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportedYears.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}{y === calendarYear ? ' (current)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
