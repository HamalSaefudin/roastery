import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BanknoteIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { DataTable } from '#/components/shared/data-table.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import {
  dispatchBoardQueryOptions,
  driversQueryOptions,
  useAssignDeliveryMutation,
} from '#/features/delivery/queries.ts'
import type { Delivery } from '#/features/delivery/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatRupiah } from '#/lib/format.ts'

export const Route = createFileRoute('/_auth/pengiriman/')({
  component: PapanDispatchPage,
})

function PapanDispatchPage() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    dispatchBoardQueryOptions(statusFilter || undefined),
  )
  const { data: drivers } = useQuery(driversQueryOptions())
  const assignMutation = useAssignDeliveryMutation()

  const [assignTarget, setAssignTarget] = useState<Delivery | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState('')

  function openAssign(delivery: Delivery) {
    setAssignTarget(delivery)
    setSelectedDriverId('')
  }

  function handleAssign() {
    if (!assignTarget || !selectedDriverId) return
    assignMutation.mutate(
      { id: assignTarget.id, driverId: selectedDriverId },
      { onSuccess: () => setAssignTarget(null) },
    )
  }

  const columns: ColumnDef<Delivery>[] = [
    {
      header: 'Kode',
      accessorKey: 'deliveryNumber',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-semibold">
          {getValue() as string}
        </span>
      ),
    },
    {
      header: 'Order',
      accessorKey: 'order',
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.order.orderNumber}
        </span>
      ),
    },
    {
      header: 'Alamat',
      accessorKey: 'order',
      id: 'alamat',
      cell: ({ row }) => {
        const addr = row.original.order.address
        if (!addr) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-xs text-muted-foreground">
            {addr.district}, {addr.regency}
          </span>
        )
      },
    },
    {
      header: 'COD',
      accessorKey: 'codAmount',
      cell: ({ getValue }) => {
        const amount = getValue() as number | null
        if (amount === null) return null
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-peringatan-bg px-2 py-0.5 text-xs font-semibold text-peringatan">
            <BanknoteIcon className="size-3.5" />
            {formatRupiah(amount)}
          </span>
        )
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <StatusBadge jenis="delivery" status={getValue() as string} />
      ),
    },
    {
      header: 'Driver',
      accessorKey: 'driver',
      cell: ({ row }) => row.original.driver?.name ?? '—',
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => {
        const delivery = row.original
        if (delivery.status !== 'pending' && delivery.status !== 'failed') {
          return null
        }
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openAssign(delivery)}
          >
            Assign
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader judul="Papan Dispatch" />

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Belum di-assign</SelectItem>
            <SelectItem value="">Semua status</SelectItem>
            <SelectItem value="assigned">Ditugaskan</SelectItem>
            <SelectItem value="picked_up">Diambil driver</SelectItem>
            <SelectItem value="en_route">Dalam perjalanan</SelectItem>
            <SelectItem value="delivered">Terkirim</SelectItem>
            <SelectItem value="failed">Gagal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={data?.length}
        page={1}
        limit={data?.length || 20}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        emptyState={{
          judul: 'Tidak ada delivery',
          deskripsi: 'Delivery akan muncul saat ada order checkout delivery.',
        }}
      />

      <Dialog
        open={!!assignTarget}
        onOpenChange={(open) => {
          if (!open) setAssignTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Driver — {assignTarget?.deliveryNumber}
            </DialogTitle>
            <DialogDescription>
              Pilih driver yang tersedia. Driver yang sedang off tidak bisa
              dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(drivers ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Belum ada driver terdaftar.
              </p>
            )}
            {(drivers ?? []).map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={!d.isAvailable}
                onClick={() => setSelectedDriverId(d.id)}
                className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  selectedDriverId === d.id
                    ? 'border-primer bg-primer/5 ring-1 ring-primer'
                    : 'hover:border-muted-foreground/30'
                }`}
              >
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.vehicle?.plateNumber ?? 'Tanpa kendaraan'} ·{' '}
                    {d.activeJobs} tugas aktif
                  </p>
                </div>
                {!d.isAvailable && (
                  <span className="text-xs text-bahaya">Sedang off</span>
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              Batal
            </Button>
            <LoadingButton
              loading={assignMutation.isPending}
              loadingText="Mengirim tugas…"
              onClick={handleAssign}
              disabled={!selectedDriverId}
            >
              Kirim Tugas
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
