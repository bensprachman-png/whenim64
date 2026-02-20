import { YearData } from '@/lib/retirement-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function fmtIncome(floor: number, ceiling: number | null): string {
  const f = floor.toLocaleString('en-US')
  if (ceiling === null) return `> $${f}`
  return `$${f} – $${ceiling.toLocaleString('en-US')}`
}

function fmtPremium(n: number): string {
  return `$${n.toFixed(2)}`
}

interface BracketTableProps {
  brackets: YearData['irmaaSingle']
  baseYear: number
}

function BracketTable({ brackets, baseYear }: BracketTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs min-w-[440px]">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-3 py-2 font-semibold">{baseYear} Income</th>
            <th className="text-right px-3 py-2 font-semibold">Part B/mo</th>
            <th className="text-right px-3 py-2 font-semibold">Part D surcharge/mo</th>
          </tr>
        </thead>
        <tbody>
          {brackets.map((b, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="px-3 py-2 tabular-nums">{fmtIncome(b.incomeFloor, b.incomeCeiling)}</td>
              <td className="px-3 py-2 tabular-nums text-right">{fmtPremium(b.partBPremium)}</td>
              <td className="px-3 py-2 tabular-nums text-right">
                {b.partDSurcharge > 0 ? `+${fmtPremium(b.partDSurcharge)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function IrmaaTable({ yearData }: { yearData: YearData }) {
  const { year, irmaaBaseYear, irmaaSingle, irmaaJoint } = yearData

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">IRMAA Brackets — {year}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-5">
        <p className="text-xs text-muted-foreground">
          Based on <strong className="text-foreground">{irmaaBaseYear}</strong> income — the look-back
          year CMS uses for {year} premiums.
        </p>

        <div>
          <p className="font-semibold mb-2">Single Filers</p>
          <BracketTable brackets={irmaaSingle} baseYear={irmaaBaseYear} />
        </div>

        <div>
          <p className="font-semibold mb-2">Married Filing Jointly</p>
          <BracketTable brackets={irmaaJoint} baseYear={irmaaBaseYear} />
        </div>
      </CardContent>
    </Card>
  )
}
