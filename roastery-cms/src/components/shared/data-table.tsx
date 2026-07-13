import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCwIcon,
  SearchIcon,
} from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Input } from '#/components/ui/input.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { TableSkeleton } from '#/components/shared/skeletons.tsx'
import { EmptyState } from '#/components/shared/empty-state.tsx'
import { ErrorState } from '#/components/shared/error-state.tsx'
import { cn } from '#/lib/utils.ts'

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[] | undefined
  total: number | undefined
  page: number
  limit: number
  isLoading: boolean
  isError: boolean
  isRefetching?: boolean
  onRetry?: () => void
  emptyState: {
    judul: string
    deskripsi?: string
    aksi?: ReactNode
  }
  toolbar?: {
    searchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
    filters?: ReactNode
    actions?: ReactNode
  }
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onRowClick?: (row: T) => void
  className?: string
}

const LIMIT_OPTIONS = [10, 20, 50, 100]

export function DataTable<T extends object>({
  columns,
  data,
  total,
  page,
  limit,
  isLoading,
  isError,
  isRefetching,
  onRetry,
  emptyState,
  toolbar,
  onPageChange,
  onLimitChange,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const table = useReactTable({
    data: (data ?? []) as Record<string, unknown>[],
    columns: columns as ColumnDef<Record<string, unknown>>[],
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total ?? 0,
  })

  const totalPages = total ? Math.max(1, Math.ceil(total / limit)) : 1

  const [searchInput, setSearchInput] = useState(toolbar?.searchValue ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  useEffect(() => {
    setSearchInput(toolbar?.searchValue ?? '')
  }, [toolbar?.searchValue])

  function handleSearchInput(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      toolbar?.onSearchChange?.(value)
    }, 400)
  }

  if (isLoading && !data) {
    return (
      <div className={cn('rounded-md border', className)}>
        <TableSkeleton kolom={columns.length} baris={5} />
      </div>
    )
  }

  if (isError && !data) {
    return (
      <div className={cn('rounded-md border p-4', className)}>
        <ErrorState pesan="Gagal memuat data" onRetry={onRetry} />
      </div>
    )
  }

  if (data && data.length === 0 && !isRefetching) {
    const tb = toolbar
    return (
      <div className={cn('rounded-md border', className)}>
        {tb && (tb.searchValue !== undefined || tb.filters || tb.actions) && (
          <div className="flex items-center gap-2 border-b px-4 py-3">
            {tb.searchValue !== undefined && (
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={tb.searchPlaceholder ?? 'Cari…'}
                  value={searchInput}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  className="max-w-xs pl-8"
                />
              </div>
            )}
            {tb.filters}
            <div className="ml-auto flex gap-2">{tb.actions}</div>
          </div>
        )}
        <EmptyState
          judul={emptyState.judul}
          deskripsi={emptyState.deskripsi}
          aksi={emptyState.aksi}
        />
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        {toolbar?.searchValue !== undefined && (
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={toolbar.searchPlaceholder ?? 'Cari…'}
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="max-w-xs pl-8"
            />
          </div>
        )}
        {toolbar?.filters}
        <div className="ml-auto flex items-center gap-2">
          {isRefetching && (
            <RotateCwIcon className="size-4 animate-spin text-muted-foreground" />
          )}
          {toolbar?.actions}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 && isRefetching ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground"
                >
                  <RotateCwIcon className="mx-auto size-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row.original as unknown as T)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Baris per halaman</span>
          <Select
            value={String(limit)}
            onValueChange={(v) => onLimitChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span>
            Halaman {page} dari {totalPages}
            {total !== undefined && (
              <span className="ml-1">({total} total)</span>
            )}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1 || isRefetching}
              onClick={() => onPageChange(page - 1)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages || isRefetching}
              onClick={() => onPageChange(page + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
