import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '#/components/ui/button.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { DataTable } from '#/components/shared/data-table.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import { ConfirmDialog } from '#/components/shared/confirm-dialog.tsx'
import {
  invoicesListQueryOptions,
  usePayInvoiceMutation,
} from '#/features/orders/queries.ts'
import type { Invoice } from '#/features/orders/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatRupiah, formatTanggalSaja } from '#/lib/format.ts'

export const Route = createFileRoute('/_auth/pesanan/invoice')({
  component: InvoicePage,
})

function InvoicePage() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    invoicesListQueryOptions(),
  )
  const payMutation = usePayInvoiceMutation()

  // JANGAN fallback ke [] di sini — DataTable butuh `data` tetap undefined
  // saat query error (bukan di-coerce jadi array kosong), supaya cabang
  // ErrorState-nya (isError && !data) bisa kepicu, bukan ke-mask jadi EmptyState.
  const [payTarget, setPayTarget] = useState<Invoice | null>(null)

  const columns: ColumnDef<Invoice>[] = [
    {
      header: 'Kode',
      accessorKey: 'invoiceNumber',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue() as string}</span>
      ),
    },
    {
      header: 'Jumlah',
      accessorKey: 'amount',
      cell: ({ getValue }) => formatRupiah(getValue() as number),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <StatusBadge jenis="invoice" status={getValue() as string} />
      ),
    },
    {
      header: 'Jatuh Tempo',
      accessorKey: 'dueDate',
      cell: ({ getValue }) => formatTanggalSaja(getValue() as string),
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => {
        const inv = row.original
        if (inv.status === 'paid') {
          return (
            <span className="text-xs text-muted-foreground">
              Lunas {inv.paidAt ? formatTanggalSaja(inv.paidAt) : ''}
            </span>
          )
        }
        return (
          <Button size="sm" variant="outline" onClick={() => setPayTarget(inv)}>
            Tandai Lunas
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader judul="Invoice Wholesale" />

      <DataTable
        columns={columns}
        data={data}
        total={data?.length ?? 0}
        page={1}
        limit={data?.length || 10}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        emptyState={{
          judul: 'Belum ada invoice',
          deskripsi: 'Invoice akan muncul untuk order wholesale.',
        }}
      />

      {/* Backend menandai invoice lunas PENUH (tidak ada konsep pembayaran
          sebagian di skema invoices) — jadi konfirmasi sederhana, bukan
          form nominal. */}
      <ConfirmDialog
        open={!!payTarget}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null)
        }}
        judul={`Tandai "${payTarget?.invoiceNumber}" lunas?`}
        deskripsi={`Invoice sebesar ${formatRupiah(payTarget?.amount ?? 0)} akan ditandai lunas penuh.`}
        labelKonfirmasi="Tandai Lunas"
        labelLoading="Menyimpan…"
        destruktif={false}
        loading={payMutation.isPending}
        onConfirm={() => {
          if (!payTarget) return
          payMutation.mutate(
            { id: payTarget.id },
            { onSuccess: () => setPayTarget(null) },
          )
        }}
      />
    </div>
  )
}
