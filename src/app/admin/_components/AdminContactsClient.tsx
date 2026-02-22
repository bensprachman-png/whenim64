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
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
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

export interface ContactRow {
  id: number
  name: string
  email: string
  phone: string | null
  message: string
  isRead: boolean
  createdAt: string
}

interface Props {
  contacts: ContactRow[]
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="ml-1 size-3.5 shrink-0" />
  if (sorted === 'desc') return <ArrowDown className="ml-1 size-3.5 shrink-0" />
  return <ArrowUpDown className="ml-1 size-3.5 shrink-0 opacity-40" />
}

export default function AdminContactsClient({ contacts: initialContacts }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const unreadCount = contacts.filter((c) => !c.isRead).length

  const handleToggleRead = async (id: number, currentIsRead: boolean) => {
    setLoadingId(id)
    setError('')
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !currentIsRead }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update')
      } else {
        setContacts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isRead: !currentIsRead } : c))
        )
        startTransition(() => router.refresh())
      }
    } catch {
      setError('Network error')
    } finally {
      setLoadingId(null)
    }
  }

  const columns = useMemo<ColumnDef<ContactRow>[]>(() => [
    {
      id: 'readStatus',
      header: 'Read',
      size: 60,
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original
        return (
          <button
            onClick={() => handleToggleRead(c.id, c.isRead)}
            disabled={loadingId === c.id}
            title={c.isRead ? 'Mark as unread' : 'Mark as read'}
            className="flex items-center justify-center w-full disabled:opacity-50"
          >
            <span className={`size-3 rounded-full ${c.isRead ? 'bg-green-500' : 'bg-amber-400'}`} />
          </button>
        )
      },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      size: 160,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      size: 200,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      size: 140,
      cell: ({ getValue }) => getValue<string | null>() ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'message',
      header: 'Message',
      size: 320,
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original
        const isExpanded = expandedId === c.id
        const truncated = c.message.length > 80 ? c.message.slice(0, 80) + '…' : c.message
        return (
          <button
            onClick={() => setExpandedId(isExpanded ? null : c.id)}
            className="text-left text-sm hover:underline"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? c.message : truncated}
          </button>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Received',
      size: 200,
      sortingFn: 'datetime',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue<string>()}</span>
      ),
    },
  ], [loadingId, expandedId])

  const table = useReactTable({
    data: contacts,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Contacts</h2>
        {unreadCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {unreadCount} unread
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
                if (id === 'name' || id === 'email') {
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
                return <TableHead key={`filter-${id}`} />
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                  No contacts yet.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={!row.original.isRead ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                >
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {table.getFilteredRowModel().rows.length} message{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
          {table.getFilteredRowModel().rows.length !== contacts.length && ` (filtered from ${contacts.length})`}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
