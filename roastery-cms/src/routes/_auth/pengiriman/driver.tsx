import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
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
  driversQueryOptions,
  vehiclesQueryOptions,
  useRegisterDriverMutation,
  useToggleDriverAvailabilityMutation,
} from '#/features/delivery/queries.ts'
import type { Driver } from '#/features/delivery/types.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_auth/pengiriman/driver')({
  component: DriverPage,
})

function DriverPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    driversQueryOptions(),
  )
  const { data: vehicles } = useQuery(vehiclesQueryOptions())
  const registerMutation = useRegisterDriverMutation()
  const toggleMutation = useToggleDriverAvailabilityMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleId, setVehicleId] = useState('')

  function openCreate() {
    setUserId('')
    setName('')
    setPhone('')
    setVehicleId('')
    setDialogOpen(true)
  }

  function handleSubmit() {
    registerMutation.mutate(
      {
        userId: userId.trim(),
        name: name.trim(),
        phone: phone.trim(),
        vehicleId: vehicleId || undefined,
      },
      { onSuccess: () => setDialogOpen(false) },
    )
  }

  const columns: ColumnDef<Driver>[] = [
    {
      header: 'Nama',
      accessorKey: 'name',
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      header: 'Telepon',
      accessorKey: 'phone',
    },
    {
      header: 'Kendaraan',
      accessorKey: 'vehicle',
      cell: ({ row }) => {
        const v = row.original.vehicle
        return v ? (
          <span className="font-mono text-xs">{v.plateNumber}</span>
        ) : (
          '—'
        )
      },
    },
    {
      header: 'Tugas Aktif',
      accessorKey: 'activeJobs',
    },
    {
      header: 'Status',
      accessorKey: 'isAvailable',
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
      cell: ({ row }) => {
        const driver = row.original
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toggleMutation.mutate({
                id: driver.id,
                isAvailable: !driver.isAvailable,
              })
            }
          >
            {driver.isAvailable ? 'Tandai Off' : 'Tandai Available'}
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Driver"
        aksi={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Registrasi Driver
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
          judul: 'Belum ada driver',
          deskripsi: 'Registrasikan driver pertama untuk mulai dispatch.',
          aksi: (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Registrasi Driver
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrasi Driver</DialogTitle>
            <DialogDescription>
              Daftarkan profil driver dari user yang sudah punya role "driver".
              Pembuatan akun user driver belum ada UI di CMS — minta user ID
              dari tim onboarding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="uuid user dengan role driver"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama driver"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812xxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Kendaraan (opsional)</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger id="vehicleId">
                  <SelectValue placeholder="Pilih kendaraan" />
                </SelectTrigger>
                <SelectContent>
                  {(vehicles ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LoadingButton
              loading={registerMutation.isPending}
              loadingText="Mendaftarkan…"
              onClick={handleSubmit}
              disabled={!userId.trim() || !name.trim() || !phone.trim()}
              className="w-full"
            >
              Daftarkan
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
