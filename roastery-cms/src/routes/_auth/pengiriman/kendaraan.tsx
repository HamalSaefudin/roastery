import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, PencilIcon } from 'lucide-react'
import { useState } from 'react'
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
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import {
  vehiclesQueryOptions,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
} from '#/features/delivery/queries.ts'
import type { Vehicle } from '#/features/delivery/types.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_auth/pengiriman/kendaraan')({
  component: KendaraanPage,
})

const TIPE_LABEL: Record<string, string> = {
  motor: 'Motor',
  mobil: 'Mobil',
  van: 'Van',
}

function KendaraanPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    vehiclesQueryOptions(),
  )
  const createMutation = useCreateVehicleMutation()
  const updateMutation = useUpdateVehicleMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Vehicle | null>(null)
  const [plateNumber, setPlateNumber] = useState('')
  const [type, setType] = useState<'motor' | 'mobil' | 'van'>('motor')
  const [capacityKg, setCapacityKg] = useState('')

  function openCreate() {
    setEditItem(null)
    setPlateNumber('')
    setType('motor')
    setCapacityKg('')
    setDialogOpen(true)
  }

  function openEdit(vehicle: Vehicle) {
    setEditItem(vehicle)
    setPlateNumber(vehicle.plateNumber)
    setType(vehicle.type)
    setCapacityKg(vehicle.capacityKg ? String(vehicle.capacityKg) : '')
    setDialogOpen(true)
  }

  function handleSubmit() {
    const capacity = capacityKg.trim() ? Number(capacityKg) : undefined
    if (editItem) {
      updateMutation.mutate(
        {
          id: editItem.id,
          plateNumber: plateNumber.trim().toUpperCase(),
          type,
          capacityKg: capacity,
        },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createMutation.mutate(
        {
          plateNumber: plateNumber.trim().toUpperCase(),
          type,
          capacityKg: capacity,
        },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const columns: ColumnDef<Vehicle>[] = [
    {
      header: 'Plat',
      accessorKey: 'plateNumber',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm font-semibold">
          {getValue() as string}
        </span>
      ),
    },
    {
      header: 'Jenis',
      accessorKey: 'type',
      cell: ({ getValue }) => TIPE_LABEL[getValue() as string],
    },
    {
      header: 'Kapasitas',
      accessorKey: 'capacityKg',
      cell: ({ getValue }) => {
        const kg = getValue() as number | null
        return kg ? `${kg} kg` : '—'
      },
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: ({ getValue }) => (
        <StatusBadge
          jenis="user"
          status={(getValue() as boolean) ? 'active' : 'inactive'}
        />
      ),
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openEdit(row.original)}
        >
          <PencilIcon className="size-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Kendaraan"
        aksi={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Tambah Kendaraan
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        total={data?.length}
        page={1}
        limit={data?.length || 10}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        emptyState={{
          judul: 'Belum ada kendaraan',
          deskripsi:
            'Tambahkan kendaraan pertama untuk operasional pengiriman.',
          aksi: (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Tambah Kendaraan
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? 'Ubah informasi kendaraan.'
                : 'Tambahkan kendaraan baru.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plateNumber">Plat Nomor</Label>
              <Input
                id="plateNumber"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                placeholder="D 1234 AB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Jenis</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as typeof type)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motor">Motor</SelectItem>
                  <SelectItem value="mobil">Mobil</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacityKg">Kapasitas (kg, opsional)</Label>
              <Input
                id="capacityKg"
                type="number"
                min={0}
                value={capacityKg}
                onChange={(e) => setCapacityKg(e.target.value)}
                placeholder="20"
              />
            </div>
            <LoadingButton
              loading={isPending}
              loadingText="Menyimpan…"
              onClick={handleSubmit}
              disabled={!plateNumber.trim()}
              className="w-full"
            >
              {editItem ? 'Simpan Perubahan' : 'Simpan'}
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
