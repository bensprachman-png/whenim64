'use client'

import { useState, useCallback, useMemo } from 'react'
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
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, KeyRound, Unlink } from 'lucide-react'
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
import type { UserRole } from '@/lib/admin'

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  twoFactorEnabled: boolean | null
  hasPassword: boolean
  createdAt: string
  loginCount: number
  lastLogin: string | null
  failedAttempts24h: number
  brokerageConnected: boolean
  brokerageAccountCount: number
}

interface Props {
  initialUsers: UserRow[]
  callerRole: UserRole
  callerId: string
}

const roleFilterFn: FilterFn<UserRow> = (row, columnId, filterValue) => {
  if (!filterValue) return true
  return row.getValue<string>(columnId) === filterValue
}

const twoFaFilterFn: FilterFn<UserRow> = (row, columnId, filterValue) => {
  if (!filterValue) return true
  const val = row.getValue<boolean | null>(columnId)
  return filterValue === 'yes' ? !!val : !val
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="ml-1 size-3.5 shrink-0" />
  if (sorted === 'desc') return <ArrowDown className="ml-1 size-3.5 shrink-0" />
  return <ArrowUpDown className="ml-1 size-3.5 shrink-0 opacity-40" />
}

export default function AdminUsersClient({ initialUsers, callerRole, callerId }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [resetSentId, setResetSentId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState<UserRow | null>(null)
  const [error, setError] = useState<string>('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const handleRoleChange = useCallback(async (targetId: string, newRole: UserRole) => {
    setLoadingId(targetId)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update role')
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetId ? { ...u, role: newRole } : u))
        )
      }
    } catch {
      setError('Network error')
    } finally {
      setLoadingId(null)
    }
  }, [])

  const handleResetPassword = useCallback(async (targetId: string) => {
    setLoadingId(targetId)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to send reset email')
      } else {
        setResetSentId(targetId)
        setTimeout(() => setResetSentId((prev) => (prev === targetId ? null : prev)), 3000)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoadingId(null)
    }
  }, [])

  const handleDisconnectBrokerage = useCallback(async (targetId: string) => {
    setLoadingId(targetId)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${targetId}/brokerage`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to disconnect brokerage')
      } else {
        setUsers((prev) =>
          prev.map((u) => u.id === targetId ? { ...u, brokerageConnected: false, brokerageAccountCount: 0 } : u)
        )
        setConfirmDisconnect(null)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoadingId(null)
    }
  }, [])

  const handleDelete = useCallback(async (targetId: string) => {
    setLoadingId(targetId)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to delete user')
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== targetId))
        setConfirmDelete(null)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoadingId(null)
    }
  }, [])

  const columns = useMemo<ColumnDef<UserRow>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Name',
      size: 160,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      size: 220,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      size: 140,
      filterFn: roleFilterFn,
      cell: ({ row }) => {
        const u = row.original
        const isSelf = u.id === callerId
        const isSuperuser = u.role === 'superuser'

        if (isSuperuser || isSelf) {
          return (
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
              isSuperuser
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground'
            }`}>
              {u.role}
            </span>
          )
        }

        const options: UserRole[] = callerRole === 'superuser'
          ? ['user', 'admin', 'superuser']
          : ['user', 'admin']

        return (
          <select
            value={u.role}
            disabled={loadingId === u.id}
            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
            className="rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
          >
            {options.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )
      },
    },
    {
      accessorKey: 'twoFactorEnabled',
      header: '2FA',
      size: 80,
      filterFn: twoFaFilterFn,
      cell: ({ getValue }) => {
        const v = getValue<boolean | null>()
        return (
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
            v ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}>
            {v ? 'Yes' : 'No'}
          </span>
        )
      },
    },
    {
      accessorKey: 'loginCount',
      header: 'Logins',
      size: 80,
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      size: 200,
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        return v ? <span className="font-mono text-xs">{v}</span> : <span className="text-muted-foreground">—</span>
      },
      sortingFn: 'datetime',
    },
    {
      accessorKey: 'failedAttempts24h',
      header: 'Failed (24h)',
      size: 100,
      cell: ({ getValue }) => {
        const v = getValue<number>()
        return v > 0
          ? <span className="font-medium text-destructive">{v}</span>
          : v
      },
    },
    {
      id: 'brokerage',
      header: 'Brokerage',
      size: 120,
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original
        if (!u.brokerageConnected) {
          return <span className="text-xs text-muted-foreground">—</span>
        }
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs">
              {u.brokerageAccountCount} acct{u.brokerageAccountCount !== 1 ? 's' : ''}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={loadingId === u.id}
              onClick={() => setConfirmDisconnect(u)}
              className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
            >
              <Unlink className="size-3" />
            </Button>
          </div>
        )
      },
    },
    {
      id: 'resetPassword',
      header: 'Reset Pwd',
      size: 110,
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original
        if (!u.hasPassword) return null
        const sent = resetSentId === u.id
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={loadingId === u.id || sent}
            onClick={() => handleResetPassword(u.id)}
            className="h-7 px-2 text-xs gap-1"
          >
            <KeyRound className="size-3" />
            {sent ? 'Sent!' : 'Send'}
          </Button>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      size: 80,
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original
        const isSelf = u.id === callerId
        const canDelete = !isSelf && u.role === 'user'
        if (!canDelete) return null
        return (
          <Button
            size="sm"
            variant="destructive"
            disabled={loadingId === u.id}
            onClick={() => setConfirmDelete(u)}
            className="h-7 px-2 text-xs"
          >
            Delete
          </Button>
        )
      },
    },
  ], [callerRole, callerId, loadingId, handleRoleChange, handleResetPassword, handleDisconnectBrokerage, resetSentId])

  const table = useReactTable({
    data: users,
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

  const roleFilterValue = (table.getColumn('role')?.getFilterValue() as string) ?? ''
  const twoFaFilterValue = (table.getColumn('twoFactorEnabled')?.getFilterValue() as string) ?? ''

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {/* Sort headers */}
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
                const col = header.column
                const id = col.id

                if (id === 'name' || id === 'email') {
                  return (
                    <TableHead key={`filter-${id}`} className="py-1.5">
                      <Input
                        placeholder={`Filter…`}
                        value={(col.getFilterValue() as string) ?? ''}
                        onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                        className="h-7 text-xs font-normal"
                      />
                    </TableHead>
                  )
                }

                if (id === 'role') {
                  return (
                    <TableHead key={`filter-${id}`} className="py-1.5">
                      <select
                        value={roleFilterValue}
                        onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                        className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">All</option>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="superuser">superuser</option>
                      </select>
                    </TableHead>
                  )
                }

                if (id === 'twoFactorEnabled') {
                  return (
                    <TableHead key={`filter-${id}`} className="py-1.5">
                      <select
                        value={twoFaFilterValue}
                        onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                        className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">All</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
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
                  No users match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.original.id === callerId ? 'bg-muted/30' : ''}
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {table.getFilteredRowModel().rows.length} user{table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
          {table.getFilteredRowModel().rows.length !== users.length && ` (filtered from ${users.length})`}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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

      {/* Disconnect brokerage confirmation dialog */}
      <Dialog open={!!confirmDisconnect} onOpenChange={(open) => { if (!open) setConfirmDisconnect(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect brokerage?</DialogTitle>
            <DialogDescription>
              This will remove the SnapTrade connection for <strong>{confirmDisconnect?.name}</strong> ({confirmDisconnect?.email}),
              delete all their synced accounts and holdings, and free up the SnapTrade slot.
              They can reconnect at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDisconnect(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={loadingId === confirmDisconnect?.id}
              onClick={() => confirmDisconnect && handleDisconnectBrokerage(confirmDisconnect.id)}
            >
              {loadingId === confirmDisconnect?.id ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{confirmDelete?.name}</strong> ({confirmDelete?.email}) and all their data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={loadingId === confirmDelete?.id}
              onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
            >
              {loadingId === confirmDelete?.id ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
