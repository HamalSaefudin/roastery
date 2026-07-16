import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { DataTable } from '#/components/shared/data-table.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import { InputRupiah } from '#/components/shared/input-rupiah.tsx'
import { DistrictPicker } from '#/components/shared/district-picker.tsx'
import type { DistrictOption } from '#/components/shared/district-picker.tsx'
import {
  zonesQueryOptions,
  useCreateZoneMutation,
  useUpdateZoneMutation,
} from '#/features/delivery/queries.ts'
import type { DeliveryZone } from '#/features/delivery/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatRupiah } from '#/lib/format.ts'

export const Route = createFileRoute('/_auth/pengiriman/zona')({
  component: ZonaPage,
})

function ZonaPage() {
  const { data, isLoading, isError, refetch, isRefetching } =
    useQuery(zonesQueryOptions())
  const createMutation = useCreateZoneMutation()
  const updateMutation = useUpdateZoneMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<DeliveryZone | null>(null)
  const [name, setName] = useState('')
  const [fee, setFee] = useState<number | ''>('')
  const [etaText, setEtaText] = useState('')
  const [isFallback, setIsFallback] = useState(false)
  const [districts, setDistricts] = useState<DistrictOption[]>([])

  function openCreate() {
    setEditItem(null)
    setName('')
    setFee('')
    setEtaText('')
    setIsFallback(false)
    setDistricts([])
    setDialogOpen(true)
  }

  function openEdit(zone: DeliveryZone) {
    setEditItem(zone)
    setName(zone.name)
    setFee(zone.fee)
    setEtaText(zone.etaText ?? '')
    setIsFallback(zone.isFallback)
    // nama kecamatan tidak tersedia dari GET /delivery/zones (cuma kode) —
    // saat edit, kode existing ditampilkan sbg chip pakai kode itu sendiri
    // (bukan nama) krn tidak ada endpoint utk resolve nama dari kode.
    setDistricts(zone.districtCodes.map((code) => ({ code, name: code })))
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (fee === '') return
    if (editItem) {
      updateMutation.mutate(
        {
          id: editItem.id,
          name: name.trim(),
          fee,
          etaText: etaText.trim() || undefined,
          districtCodes: isFallback ? undefined : districts.map((d) => d.code),
        },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createMutation.mutate(
        {
          name: name.trim(),
          fee,
          etaText: etaText.trim() || undefined,
          districtCodes: isFallback ? [] : districts.map((d) => d.code),
          isFallback,
        },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const columns: ColumnDef<DeliveryZone>[] = [
    {
      header: 'Nama',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.name}</span>
          {row.original.isFallback && <Badge variant="outline">Fallback</Badge>}
        </div>
      ),
    },
    {
      header: 'Tarif',
      accessorKey: 'fee',
      cell: ({ getValue }) => formatRupiah(getValue() as number),
    },
    {
      header: 'Kecamatan',
      accessorKey: 'districtCodes',
      cell: ({ row }) =>
        row.original.isFallback
          ? '— (luar jangkauan)'
          : `${row.original.districtCodes.length} kecamatan`,
    },
    {
      header: 'ETA',
      accessorKey: 'etaText',
      cell: ({ getValue }) => (getValue() as string) || '—',
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
        judul="Zona"
        aksi={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Tambah Zona
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
          judul: 'Belum ada zona',
          deskripsi: 'Tambahkan zona ongkir pertama.',
          aksi: (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Tambah Zona
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Zona' : 'Tambah Zona'}</DialogTitle>
            <DialogDescription>
              {editItem
                ? 'Ubah informasi zona.'
                : 'Tambahkan zona ongkir baru.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Zona</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bandung Kota"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">Tarif</Label>
              <InputRupiah id="fee" value={fee} onChange={setFee} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="etaText">Estimasi (opsional)</Label>
              <Input
                id="etaText"
                value={etaText}
                onChange={(e) => setEtaText(e.target.value)}
                placeholder="1-2 hari"
              />
            </div>
            {!editItem && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Zona fallback</p>
                  <p className="text-xs text-muted-foreground">
                    Tarif flat untuk alamat di luar semua zona lain. Hanya boleh
                    ada satu.
                  </p>
                </div>
                <Switch checked={isFallback} onCheckedChange={setIsFallback} />
              </div>
            )}
            {!isFallback && (
              <div className="space-y-2">
                <Label>Kecamatan</Label>
                <DistrictPicker value={districts} onChange={setDistricts} />
              </div>
            )}
            <LoadingButton
              loading={isPending}
              loadingText="Menyimpan…"
              onClick={handleSubmit}
              disabled={
                !name.trim() ||
                fee === '' ||
                (!isFallback && districts.length === 0)
              }
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
