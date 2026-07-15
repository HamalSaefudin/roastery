import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Input } from '#/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { DataTable } from '#/components/shared/data-table.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import { customersListQueryOptions } from '#/features/customers/queries.ts'
import type { Customer } from '#/features/customers/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatTanggalSaja } from '#/lib/format.ts'
import { SearchIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/pelanggan/')({
  component: PelangganPage,
})

function PelangganPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const limit = 20

  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    customersListQueryOptions({
      search: search || undefined,
      type: typeFilter || undefined,
      page,
      limit,
    }),
  )

  const total = data?.total ?? 0

  const columns: ColumnDef<Customer>[] = [
    {
      header: 'Kode',
      accessorKey: 'code',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue() as string}</span>
      ),
    },
    {
      header: 'Nama',
      accessorKey: 'fullName',
      cell: ({ row }) => (
        <Link
          to="/pelanggan/$id"
          params={{ id: row.original.id }}
          className="hover:underline font-medium"
        >
          {row.original.fullName || '—'}
        </Link>
      ),
    },
    {
      header: 'Email',
      accessorKey: 'email',
    },
    {
      header: 'Tipe',
      accessorKey: 'customerType',
      cell: ({ getValue }) => {
        const tipe = getValue() as string
        return <StatusBadge jenis="customerType" status={tipe} />
      },
    },
    {
      header: 'Daftar',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => formatTanggalSaja(getValue() as string),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader judul="Pelanggan" />

      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama/email/kode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua tipe</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="wholesale">Wholesale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        total={total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={setPage}
        onLimitChange={() => {}}
        emptyState={{
          judul: 'Belum ada pelanggan',
          deskripsi: 'Pelanggan akan muncul setelah mereka mendaftar.',
        }}
      />
    </div>
  )
}
