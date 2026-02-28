export type MilestoneId = 'ss-early' | 'medicare' | 'ss-fra' | 'ss-max' | 'rmd' | 'plan-ends'

export interface Milestone {
  id: MilestoneId
  label: string
  sublabel: string
  age: number
  year?: number
}

export interface Fra {
  years: number
  months: number
}

/**
 * SECURE 2.0 Act RMD start age by birth year.
 * Born 1951–1959 → 73  |  Born 1960+ → 75
 */
export function getRmdAge(birthYear: number): number {
  if (birthYear >= 1960) return 75
  return 73 // born 1951–1959 (anyone born ≤1950 is already past RMD age)
}

export function getFullRetirementAge(birthYear: number): Fra {
  if (birthYear <= 1937) return { years: 65, months: 0 }
  if (birthYear === 1938) return { years: 65, months: 2 }
  if (birthYear === 1939) return { years: 65, months: 4 }
  if (birthYear === 1940) return { years: 65, months: 6 }
  if (birthYear === 1941) return { years: 65, months: 8 }
  if (birthYear === 1942) return { years: 65, months: 10 }
  if (birthYear <= 1954) return { years: 66, months: 0 }
  if (birthYear === 1955) return { years: 66, months: 2 }
  if (birthYear === 1956) return { years: 66, months: 4 }
  if (birthYear === 1957) return { years: 66, months: 6 }
  if (birthYear === 1958) return { years: 66, months: 8 }
  if (birthYear === 1959) return { years: 66, months: 10 }
  return { years: 67, months: 0 }
}

export function fraToString(fra: Fra): string {
  return fra.months > 0 ? `${fra.years} yrs ${fra.months} mo` : `${fra.years}`
}

export function calculateMilestones(dateOfBirth?: string | null): Milestone[] {
  const dob = dateOfBirth ? new Date(dateOfBirth + 'T00:00:00') : null
  const birthYear = dob?.getFullYear() ?? null
  const getYear = (age: number) => (birthYear != null ? birthYear + age : undefined)

  const fra = birthYear != null ? getFullRetirementAge(birthYear) : { years: 67, months: 0 }
  const rmdAge = birthYear != null ? getRmdAge(birthYear) : 73

  return [
    {
      id: 'ss-early',
      label: 'SS Early',
      sublabel: 'Reduced benefits',
      age: 62,
      year: getYear(62),
    },
    {
      id: 'medicare',
      label: 'Medicare',
      sublabel: 'Part A & B',
      age: 65,
      year: getYear(65),
    },
    {
      id: 'ss-fra',
      label: 'SS Full',
      sublabel: `Age ${fraToString(fra)}`,
      age: fra.years,
      year: getYear(fra.years),
    },
    {
      id: 'ss-max',
      label: 'SS Maximum',
      sublabel: 'Delayed to 70',
      age: 70,
      year: getYear(70),
    },
    {
      id: 'rmd',
      label: 'RMD Begins',
      sublabel: '401k / IRA / QCD',
      age: rmdAge,
      year: getYear(rmdAge),
    },
  ]
}
