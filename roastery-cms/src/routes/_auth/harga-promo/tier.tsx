import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
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
import {
  tiersQueryOptions,
  useCreateTierMutation,
  useDeleteTierMutation,
} from '#/features/pricing/queries.ts'
import type { WholesaleTier } from '#/features/pricing/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatRupiah } from '#/lib/format.ts'

export const Route = createFileRoute('/_auth/harga-promo/tier')({
  component: TierPage,
})

function TierPage() {
  const { data, isLoading, isError, refetch, isRefetching } =
    useQuery(tiersQueryOptions())
  const createMutation = useCreateTierMutation()
  const deleteMutation = useDeleteTierMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formMinQty, setFormMinQty] = useState('10')
  const [formDiscount, setFormDiscount] = useState('10')
  const [deleteTarget, setDeleteTarget] = useState<WholesaleTier | null>(null)

  function openCreate() {
    setFormName('')
    setFormMinQty('10')
    setFormDiscount('10')
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (!formName.trim() || !formMinQty || !formDiscount) return
    const disc = Number(formDiscount)
    if (disc < 1 || disc > 100) return
    createMutation.mutate(
      {
        name: formName.trim(),
        minQuantity: Number(formMinQty),
        discountPercent: disc,
      },
      { onSuccess: () => setDialogOpen(false) },
    )
  }

  const columns: ColumnDef<WholesaleTier>[] = [
    {
      header: 'Nama',
      accessorKey: 'name',
    },
    {
      header: 'Min. Qty',
      accessorKey: 'minQuantity',
    },
    {
      header: 'Diskon',
      accessorKey: 'discountPercent',
      cell: ({ getValue }) => `${getValue() as number}%`,
    },
    {
      header: 'Preview',
      id: 'preview',
      cell: ({ row }) => {
        const disc = row.original.discountPercent
        const basePrice = 100000
        const finalPrice = basePrice - (basePrice * disc) / 100
        return (
          <span className="text-xs text-muted-foreground">
            ≥{row.original.minQuantity} pcs → {formatRupiah(finalPrice)}/pcs
          </span>
        )
      },
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" disabled>
            <PencilIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2Icon className="size-4 text-bahaya" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Tier Grosir"
        aksi={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Tambah Tier
          </Button>
        }
      />

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
          judul: 'Belum ada tier grosir',
          deskripsi: 'Buat tier diskon untuk pelanggan grosir.',
          aksi: (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Tambah Tier
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Tier Grosir</DialogTitle>
            <DialogDescription>
              Tentukan minimal jumlah dan persentase diskon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Tier</Label>
              <Input
                id="nama"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Grosir A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minQty">Min. Quantity</Label>
              <Input
                id="minQty"
                type="number"
                value={formMinQty}
                onChange={(e) => setFormMinQty(e.target.value)}
                min={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Diskon (%)</Label>
              <Input
                id="discount"
                type="number"
                value={formDiscount}
                onChange={(e) => setFormDiscount(e.target.value)}
                min={1}
                max={100}
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>
                Preview: Harga Rp 100.000 → Rp{' '}
                {(
                  (100000 * (100 - Number(formDiscount || 0))) /
                  100
                ).toLocaleString('id-ID')}
                /pcs (disc {formDiscount}%)
              </p>
            </div>
            <LoadingButton
              loading={createMutation.isPending}
              loadingText="Menyimpan…"
              onClick={handleSubmit}
              disabled={
                !formName.trim() ||
                !formMinQty ||
                !formDiscount ||
                Number(formDiscount) < 1 ||
                Number(formDiscount) > 100
              }
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
        judul={`Hapus tier "${deleteTarget?.name}"?`}
        deskripsi="Tier yang dihapus tidak bisa dikembalikan."
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
      />
    </div>
  )
}
