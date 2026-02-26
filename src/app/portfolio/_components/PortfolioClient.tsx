'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type FilterFn,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, RefreshCw, Link2, Link2Off, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AccountRow, HoldingRow } from '../page'
import type { TaxTreatment } from '@/lib/snaptrade'

interface Props {
  isConnected: boolean
  accounts: AccountRow[]
  holdings: HoldingRow[]
  isDev?: boolean
  isPaid?: boolean
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="ml-1 size-3.5 shrink-0" />
  if (sorted === 'desc') return <ArrowDown className="ml-1 size-3.5 shrink-0" />
  return <ArrowUpDown className="ml-1 size-3.5 shrink-0 opacity-40" />
}

function fmt(n: number | null, decimals = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtCurrency(n: number | null) {
  if (n == null) return '—'
  return '$' + fmt(n)
}

function TaxBadge({ treatment }: { treatment: TaxTreatment }) {
  const styles: Record<TaxTreatment, string> = {
    'tax-free': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'tax-deferred': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    'taxable': 'bg-muted text-muted-foreground',
  }
  const labels: Record<TaxTreatment, string> = {
    'tax-free': 'Tax-Free',
    'tax-deferred': 'Tax-Deferred',
    'taxable': 'Taxable',
  }
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${styles[treatment]}`}>
      {labels[treatment]}
    </span>
  )
}

const taxFilterFn: FilterFn<HoldingRow> = (row, columnId, filterValue) => {
  if (!filterValue) return true
  return row.getValue<string>(columnId) === filterValue
}

const accountFilterFn: FilterFn<HoldingRow> = (row, columnId, filterValue) => {
  if (!filterValue) return true
  return row.getValue<string>(columnId) === filterValue
}

export default function PortfolioClient({ isConnected, accounts, holdings, isDev = false, isPaid = false }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [connecting, setConnecting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [error, setError] = useState('')
  const [syncErrors, setSyncErrors] = useState<string[]>([])
  const [holdingsPending, setHoldingsPending] = useState(0)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'marketValue', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/portfolio/connect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to connect')
      } else {
        window.open(data.redirectURI, '_blank')
        startTransition(() => router.refresh())
      }
    } catch {
      setError('Network error')
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    setSyncErrors([])
    try {
      const res = await fetch('/api/portfolio/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Sync failed')
      } else {
        if (data.errors?.length) setSyncErrors(data.errors)
        setHoldingsPending(data.holdingsPending ?? 0)
        startTransition(() => router.refresh())
      }
    } catch {
      setError('Network error')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    setError('')
    try {
      const res = await fetch('/api/portfolio/connect', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to disconnect')
      } else {
        setConfirmDisconnect(false)
        startTransition(() => router.refresh())
      }
    } catch {
      setError('Network error')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleDevSeed = async () => {
    setSeeding(true)
    setError('')
    try {
      const res = await fetch('/api/portfolio/dev-seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Seed failed')
      } else {
        startTransition(() => router.refresh())
      }
    } catch {
      setError('Network error')
    } finally {
      setSeeding(false)
    }
  }

  // Stats
  const totalMarketValue = holdings.reduce((s, h) => s + (h.marketValue ?? 0), 0)
  const totalCostBasis = holdings.reduce((s, h) => s + (h.costBasis ?? 0), 0)
  const totalGL = totalMarketValue - totalCostBasis
  const totalGLPct = totalCostBasis > 0 ? (totalGL / totalCostBasis) * 100 : 0

  const byTreatment = useMemo(() => {
    const map: Record<TaxTreatment, number> = { 'tax-free': 0, 'tax-deferred': 0, 'taxable': 0 }
    for (const h of holdings) map[h.taxTreatment] += h.marketValue ?? 0
    return map
  }, [holdings])

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ id: a.id, label: `${a.brokerageName}${a.accountName ? ' – ' + a.accountName : ''}` })),
    [accounts]
  )

  const taxFilterValue = (columnFilters.find((f) => f.id === 'taxTreatment')?.value as string) ?? ''
  const accountFilterValue = (columnFilters.find((f) => f.id === 'accountId')?.value as string) ?? ''

  const columns = useMemo<ColumnDef<HoldingRow>[]>(() => [
    {
      accessorKey: 'symbol',
      header: 'Symbol',
      size: 90,
      cell: ({ getValue }) => (
        <span className="font-mono font-medium text-sm">{getValue<string | null>() ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      size: 200,
    },
    {
      accessorKey: 'accountId',
      header: 'Account',
      size: 180,
      filterFn: accountFilterFn,
      enableSorting: false,
      cell: ({ row }) => {
        const h = row.original
        return (
          <span className="text-xs">
            {h.brokerageName}{h.accountName ? <> – {h.accountName}</> : null}
          </span>
        )
      },
    },
    {
      accessorKey: 'taxTreatment',
      header: 'Tax Treatment',
      size: 130,
      filterFn: taxFilterFn,
      enableSorting: false,
      cell: ({ getValue }) => <TaxBadge treatment={getValue<TaxTreatment>()} />,
    },
    {
      accessorKey: 'units',
      header: 'Units',
      size: 90,
      cell: ({ getValue }) => <span className="text-right block">{fmt(getValue<number | null>(), 4)}</span>,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      size: 90,
      cell: ({ getValue }) => <span className="text-right block">{fmtCurrency(getValue<number | null>())}</span>,
    },
    {
      accessorKey: 'marketValue',
      header: 'Market Value',
      size: 110,
      cell: ({ getValue }) => <span className="text-right block font-medium">{fmtCurrency(getValue<number | null>())}</span>,
    },
    {
      accessorKey: 'averagePurchasePrice',
      header: 'Avg Cost',
      size: 90,
      cell: ({ getValue }) => <span className="text-right block">{fmtCurrency(getValue<number | null>())}</span>,
    },
    {
      accessorKey: 'costBasis',
      header: 'Cost Basis',
      size: 110,
      cell: ({ getValue }) => <span className="text-right block">{fmtCurrency(getValue<number | null>())}</span>,
    },
    {
      id: 'unrealizedGL',
      header: 'Unreal. G/L',
      size: 110,
      accessorFn: (row) => (row.marketValue ?? 0) - (row.costBasis ?? 0),
      cell: ({ getValue }) => {
        const v = getValue<number>()
        const color = v > 0 ? 'text-green-600 dark:text-green-400' : v < 0 ? 'text-destructive' : ''
        return <span className={`text-right block font-medium ${color}`}>{v >= 0 ? '+' : ''}{fmtCurrency(v)}</span>
      },
    },
    {
      id: 'glPct',
      header: 'G/L %',
      size: 80,
      accessorFn: (row) => {
        const cb = row.costBasis ?? 0
        if (cb === 0) return 0
        return ((row.marketValue ?? 0) - cb) / cb * 100
      },
      cell: ({ getValue }) => {
        const v = getValue<number>()
        const color = v > 0 ? 'text-green-600 dark:text-green-400' : v < 0 ? 'text-destructive' : ''
        return <span className={`text-right block ${color}`}>{v >= 0 ? '+' : ''}{fmt(v, 1)}%</span>
      },
    },
  ], [])

  const table = useReactTable({
    data: holdings,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  // ── Not connected ────────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        {isPaid ? (
          <div className="rounded-lg border bg-card p-8 text-center space-y-4">
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect your brokerage accounts to view your holdings and get personalized
              Roth conversion, LTCG harvesting, and tax-loss harvesting insights.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleConnect} disabled={connecting} className="gap-2">
              <Link2 className="size-4" />
              {connecting ? 'Opening portal…' : 'Connect Brokerage'}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Lock className="size-5 text-muted-foreground" />
              <span className="inline-flex items-center rounded-full bg-muted px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                Premium Feature
              </span>
            </div>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect your brokerage accounts to automatically sync holdings and balances.
              Get personalized Roth conversion, LTCG harvesting, and tax-loss harvesting insights.
            </p>
            <button
              disabled
              title="Subscription billing coming soon"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed gap-2"
            >
              <Lock className="size-4" />
              Upgrade to Premium
            </button>
            <p className="text-xs text-muted-foreground">Subscription billing coming soon.</p>
          </div>
        )}
      </div>
    )
  }

  // ── Connected but no accounts synced yet ────────────────────────────────────
  if (accounts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={() => setConfirmDisconnect(true)}>
            <Link2Off className="size-4" /> Disconnect
          </Button>
        </div>
        <div className="rounded-lg border bg-card p-8 text-center space-y-4">
          {holdingsPending > 0 ? (
            <p className="text-muted-foreground">
              Your brokerage is syncing in the background — this can take a few minutes for the first connection.
              Click <strong>Sync Now</strong> again once it&apos;s ready.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Your brokerage is connected. Sync now to load your accounts and holdings.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center justify-center gap-3">
            <Button onClick={handleSync} disabled={syncing} className="gap-2">
              <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
            {isPaid && (
              <Button onClick={handleConnect} disabled={connecting} variant="outline" className="gap-2">
                <Link2 className="size-4" />
                {connecting ? 'Opening portal…' : 'Add Brokerage'}
              </Button>
            )}
          </div>
        </div>
        <DisconnectDialog open={confirmDisconnect} onClose={() => setConfirmDisconnect(false)} onConfirm={handleDisconnect} loading={disconnecting} />
      </div>
    )
  }

  // ── Full view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </Button>
          {isPaid && (
            <Button onClick={handleConnect} disabled={connecting} variant="outline" size="sm" className="gap-1.5">
              <Link2 className="size-4" />
              {connecting ? 'Opening…' : 'Add Brokerage'}
            </Button>
          )}
          {isDev && (
            <Button onClick={handleDevSeed} disabled={seeding} variant="ghost" size="sm" className="text-muted-foreground gap-1 font-mono text-xs">
              <RefreshCw className={`size-3 ${seeding ? 'animate-spin' : ''}`} />
              {seeding ? 'Seeding…' : '[dev] Seed from prod'}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={() => setConfirmDisconnect(true)}>
            <Link2Off className="size-4" /> Disconnect
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {holdingsPending > 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          {holdingsPending} account{holdingsPending !== 1 ? 's are' : ' is'} still syncing in the background — click <strong>Sync Now</strong> again in a minute to load holdings.
        </div>
      )}
      {syncErrors.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 space-y-1">
          <p className="font-medium">Some accounts had sync errors:</p>
          {syncErrors.map((e, i) => <p key={i}>• {e}</p>)}
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Market Value" value={fmtCurrency(totalMarketValue)} />
        <StatCard label="Total Cost Basis" value={fmtCurrency(totalCostBasis)} />
        <StatCard
          label="Unrealized G/L"
          value={`${totalGL >= 0 ? '+' : ''}${fmtCurrency(totalGL)}`}
          sub={`${totalGLPct >= 0 ? '+' : ''}${fmt(totalGLPct, 1)}%`}
          valueColor={totalGL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}
        />
        <StatCard
          label="By Tax Treatment"
          value=""
          custom={
            <div className="text-xs space-y-1 mt-1">
              <div className="flex justify-between"><span className="text-green-700 dark:text-green-400">Tax-Free</span><span>{fmtCurrency(byTreatment['tax-free'])}</span></div>
              <div className="flex justify-between"><span className="text-amber-700 dark:text-amber-400">Tax-Deferred</span><span>{fmtCurrency(byTreatment['tax-deferred'])}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span>{fmtCurrency(byTreatment['taxable'])}</span></div>
            </div>
          }
        />
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((a) => {
          const isPending = a.totalValue == null
          return (
            <div key={a.id} className={`rounded-lg border bg-card p-4 space-y-2 ${isPending ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{a.brokerageName}</p>
                  {a.accountName && <p className="text-xs text-muted-foreground">{a.accountName}</p>}
                </div>
                <TaxBadge treatment={a.taxTreatment} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-mono text-xs">
                  {a.accountNumber ? `****${a.accountNumber.slice(-4)}` : a.accountType ?? '—'}
                </span>
                {isPending ? (
                  <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                    <RefreshCw className="size-3 animate-spin" /> Syncing…
                  </span>
                ) : (
                  <span className="font-medium">{fmtCurrency(a.totalValue)} {a.currency ?? ''}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Holdings table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Holdings</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={canSort ? 'cursor-pointer select-none' : ''}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="flex items-center">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <SortIcon sorted={sorted} />}
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}

              {/* Filter row */}
              <TableRow className="hover:bg-transparent border-t border-dashed">
                {table.getHeaderGroups()[0].headers.map((header) => {
                  const id = header.column.id
                  if (id === 'symbol' || id === 'description') {
                    return (
                      <TableHead key={`filter-${id}`} className="py-1.5">
                        <Input
                          placeholder="Filter…"
                          value={(header.column.getFilterValue() as string) ?? ''}
                          onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                          className="h-7 text-xs font-normal"
                        />
                      </TableHead>
                    )
                  }
                  if (id === 'accountId') {
                    return (
                      <TableHead key={`filter-${id}`} className="py-1.5">
                        <select
                          value={accountFilterValue}
                          onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                          className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">All accounts</option>
                          {accountOptions.map((a) => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                        </select>
                      </TableHead>
                    )
                  }
                  if (id === 'taxTreatment') {
                    return (
                      <TableHead key={`filter-${id}`} className="py-1.5">
                        <select
                          value={taxFilterValue}
                          onChange={(e) => header.column.setFilterValue(e.target.value || undefined)}
                          className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">All</option>
                          <option value="tax-free">Tax-Free</option>
                          <option value="tax-deferred">Tax-Deferred</option>
                          <option value="taxable">Taxable</option>
                        </select>
                      </TableHead>
                    )
                  }
                  return <TableHead key={`filter-${id}`} />
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                    No holdings match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {table.getFilteredRowModel().rows.length} holding{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
            {table.getFilteredRowModel().rows.length !== holdings.length && ` (filtered from ${holdings.length})`}
          </span>
          <div className="flex items-center gap-2">
            <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
            <Button variant="outline" size="icon" className="size-7" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-7" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <DisconnectDialog open={confirmDisconnect} onClose={() => setConfirmDisconnect(false)} onConfirm={handleDisconnect} loading={disconnecting} />
    </div>
  )
}

function StatCard({ label, value, sub, valueColor, custom }: {
  label: string
  value: string
  sub?: string
  valueColor?: string
  custom?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {custom ?? (
        <>
          <p className={`text-lg font-bold ${valueColor ?? ''}`}>{value}</p>
          {sub && <p className={`text-xs ${valueColor ?? 'text-muted-foreground'}`}>{sub}</p>}
        </>
      )}
    </div>
  )
}

function DisconnectDialog({ open, onClose, onConfirm, loading }: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect brokerage?</DialogTitle>
          <DialogDescription>
            This will remove all synced accounts and holdings from WhenIm64. You can reconnect at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
