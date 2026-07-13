import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '#/components/ui/button.tsx'
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
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import { InputRupiah } from '#/components/shared/input-rupiah.tsx'
import {
  pricesQueryOptions,
  useSetPriceMutation,
  useUpdatePriceMutation,
} from '#/features/pricing/queries.ts'
import type { Price } from '#/features/pricing/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatRupiah } from '#/lib/format.ts'

export const Route = createFileRoute('/_auth/harga-promo/')({
  component: HargaPage,
})

function HargaPage() {
  const { data, isLoading, isError, refetch, isRefetching } =
    useQuery(pricesQueryOptions())
  const setMutation = useSetPriceMutation()
  const updateMutation = useUpdatePriceMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editPrice, setEditPrice] = useState<Price | null>(null)
  const [priceValue, setPriceValue] = useState<number | ''>('')

  const prices = data ?? []

  function openCreate() {
    setEditPrice(null)
    setPriceValue('')
    setDialogOpen(true)
  }

  function openEdit(price: Price) {
    setEditPrice(price)
    setPriceValue(price.price)
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (priceValue === '' || priceValue <= 0) return
    if (editPrice) {
      updateMutation.mutate(
        { id: editPrice.id, price: priceValue },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      setMutation.mutate(
        { price: priceValue },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  const isPending = setMutation.isPending || updateMutation.isPending

  const columns: ColumnDef<Price>[] = [
    {
      header: 'Item',
      id: 'item',
      cell: ({ row }) => (
        <span>{row.original.itemName ?? row.original.itemSku ?? '—'}</span>
      ),
    },
    {
      header: 'SKU',
      accessorKey: 'itemSku',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {getValue() as string}
        </span>
      ),
    },
    {
      header: 'Harga Retail',
      accessorKey: 'price',
      cell: ({ getValue }) => formatRupiah(getValue() as number),
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openEdit(row.original)}
        >
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader judul="Harga Retail" />

      <DataTable
        columns={columns}
        data={prices}
        total={prices.length}
        page={1}
        limit={prices.length || 10}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        emptyState={{
          judul: 'Belum ada harga',
          deskripsi: 'Atur harga retail untuk varian atau produk.',
          aksi: <Button onClick={openCreate}>Set Harga</Button>,
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPrice ? 'Edit Harga' : 'Set Harga'}</DialogTitle>
            <DialogDescription>
              {editPrice
                ? `Mengubah harga untuk ${editPrice.itemName ?? editPrice.itemSku ?? 'item'}`
                : 'Masukkan harga retail untuk item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Harga Retail</Label>
              <InputRupiah
                id="price"
                value={priceValue}
                onChange={setPriceValue}
                placeholder="0"
              />
            </div>
            <LoadingButton
              loading={isPending}
              loadingText="Menyimpan…"
              onClick={handleSubmit}
              disabled={priceValue === '' || priceValue <= 0}
              className="w-full"
            >
              {editPrice ? 'Simpan Perubahan' : 'Simpan'}
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
