import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PlusIcon, AlertTriangleIcon } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { DataTable } from '#/components/shared/data-table.tsx'
import { ConfirmDialog } from '#/components/shared/confirm-dialog.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import {
  unitsQueryOptions,
  useCreateUnitMutation,
  useMarkDefectiveMutation,
} from '#/features/inventory/queries.ts'
import type { EquipmentUnit } from '#/features/inventory/types.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_auth/stok/unit')({
  component: StokUnitPage,
})

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'defective', label: 'Defective' },
]

function StokUnitPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [statusFilter, setStatusFilter] = useState('')

  const params: Record<string, string> = {
    page: String(page),
    limit: String(limit),
    ...(statusFilter && { status: statusFilter }),
  }

  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    unitsQueryOptions(params),
  )
  const createMutation = useCreateUnitMutation()
  const defectiveMutation = useMarkDefectiveMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [serial, setSerial] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<EquipmentUnit | null>(null)

  function handleCreate() {
    createMutation.mutate(
      { productId: '', serialNumber: serial },
      {
        onSuccess: () => {
          setDialogOpen(false)
          setSerial('')
        },
      },
    )
  }

  const columns: ColumnDef<EquipmentUnit>[] = [
    {
      header: 'Serial',
      accessorKey: 'serialNumber',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue() as string}</span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <StatusBadge jenis="unit" status={getValue() as string} />
      ),
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) =>
        row.original.status === 'in_stock' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteTarget(row.original)}
          >
            <AlertTriangleIcon className="size-4" />
            Tandai Defective
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Unit Equipment"
        aksi={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="size-4" />
            Tambah Unit
          </Button>
        }
      />

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
        onLimitChange={(l) => {
          setLimit(l)
          setPage(1)
        }}
        emptyState={{
          judul: 'Belum ada unit',
          deskripsi: 'Tambahkan unit equipment pertama.',
          aksi: (
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              Tambah Unit
            </Button>
          ),
        }}
        toolbar={{
          filters: (
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Unit</DialogTitle>
            <DialogDescription>
              Masukkan data unit equipment baru.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                id="serial"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="SN-2026-0001"
              />
            </div>
            <LoadingButton
              loading={createMutation.isPending}
              loadingText="Menyimpan…"
              onClick={handleCreate}
              disabled={!serial.trim()}
              className="w-full"
            >
              Simpan
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        judul={`Tandai defective: ${deleteTarget?.serialNumber}?`}
        deskripsi="Unit defective tidak bisa dijual atau di-reserve."
        loading={defectiveMutation.isPending}
        labelKonfirmasi="Tandai Defective"
        onConfirm={() => {
          if (!deleteTarget) return
          defectiveMutation.mutate(
            { id: deleteTarget.id },
            { onSuccess: () => setDeleteTarget(null) },
          )
        }}
      />
    </div>
  )
}
