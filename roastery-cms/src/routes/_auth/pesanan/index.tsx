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
import { ordersListQueryOptions } from '#/features/orders/queries.ts'
import type { Order } from '#/features/orders/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatRupiah, formatTanggal } from '#/lib/format.ts'
import { SearchIcon, BanknoteIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/pesanan/')({
  component: PesananPage,
})

function PesananPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('paid,processing')
  const limit = 20

  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    ordersListQueryOptions({
      status: statusFilter || undefined,
      search: search || undefined,
      page,
    }),
  )

  const columns: ColumnDef<Order>[] = [
    {
      header: 'Kode',
      accessorKey: 'orderNumber',
      cell: ({ row }) => (
        <Link
          to="/pesanan/$id"
          params={{ id: row.original.id }}
          className="hover:underline font-mono text-xs font-semibold"
        >
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      header: 'Total',
      accessorKey: 'total',
      cell: ({ getValue }) => formatRupiah(getValue() as number),
    },
    {
      header: 'Pembayaran',
      accessorKey: 'paymentType',
      cell: ({ getValue }) => {
        const tipe = getValue() as string
        return (
          <span className="inline-flex items-center gap-1 text-xs">
            {tipe === 'cod' && (
              <BanknoteIcon className="size-3.5 text-peringatan" />
            )}
            {tipe === 'prepaid'
              ? 'Bayar di muka'
              : tipe === 'cod'
                ? 'COD'
                : 'Invoice'}
          </span>
        )
      },
    },
    {
      header: 'Fulfillment',
      accessorKey: 'fulfillmentMethod',
      cell: ({ getValue }) =>
        (getValue() as string) === 'pickup' ? 'Pickup' : 'Delivery',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <StatusBadge jenis="order" status={getValue() as string} />
      ),
    },
    {
      header: 'Waktu',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">
          {formatTanggal(getValue() as string)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader judul="Pesanan" />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nomor pesanan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid,processing">Butuh perhatian</SelectItem>
            <SelectItem value="">Semua status</SelectItem>
            <SelectItem value="created">Baru</SelectItem>
            <SelectItem value="paid">Dibayar</SelectItem>
            <SelectItem value="processing">Diproses</SelectItem>
            <SelectItem value="out_for_delivery">Dikirim</SelectItem>
            <SelectItem value="ready_for_pickup">Siap diambil</SelectItem>
            <SelectItem value="delivered">Selesai</SelectItem>
            <SelectItem value="cancelled">Dibatalkan</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {data?.total ?? 0} pesanan
        </span>
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        total={data?.total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={setPage}
        onLimitChange={() => {}}
        emptyState={{
          judul: statusFilter ? 'Tidak ada pesanan' : 'Belum ada pesanan',
          deskripsi: 'Pesanan akan muncul saat pelanggan checkout.',
        }}
      />
    </div>
  )
}
