import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertTriangleIcon, HistoryIcon } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { DataTable } from '#/components/shared/data-table.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import {
  overviewQueryOptions,
  useAdjustStockMutation,
} from '#/features/inventory/queries.ts'
import type { BeanStock } from '#/features/inventory/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { cn } from '#/lib/utils.ts'

export const Route = createFileRoute('/_auth/stok/biji')({
  component: StokBijiPage,
})

const REASON_OPTIONS = [
  { value: 'purchase', label: 'Pembelian' },
  { value: 'adjustment', label: 'Penyesuaian' },
  { value: 'return', label: 'Retur' },
]

function StokBijiPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    overviewQueryOptions(),
  )
  const adjustMutation = useAdjustStockMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<BeanStock | null>(null)
  const [newQty, setNewQty] = useState('')
  const [reason, setReason] = useState('adjustment')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  // JANGAN fallback ke [] di sini — DataTable butuh `data` tetap undefined
  // saat query error, supaya cabang ErrorState-nya kepicu, bukan ke-mask
  // jadi EmptyState (lihat data-table.tsx: `isError && !data`).
  const stocks = data?.beans
  const filtered = lowStockOnly
    ? stocks?.filter((s) => s.available <= s.lowStockThreshold)
    : stocks

  function openAdjust(stock: BeanStock) {
    setSelectedVariant(stock)
    setNewQty(String(stock.quantity))
    setReason('adjustment')
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (!selectedVariant) return
    adjustMutation.mutate(
      {
        variantId: selectedVariant.variantId,
        quantity: Number(newQty),
        reason,
      },
      { onSuccess: () => setDialogOpen(false) },
    )
  }

  const diff = selectedVariant ? Number(newQty) - selectedVariant.quantity : 0

  const columns: ColumnDef<BeanStock>[] = [
    {
      header: 'SKU',
      accessorKey: 'sku',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue() as string}</span>
      ),
    },
    {
      header: 'Stok',
      accessorKey: 'quantity',
    },
    {
      header: 'Reserved',
      accessorKey: 'reserved',
      cell: ({ getValue }) => {
        const val = getValue() as number
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-muted-foreground">{val}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Reserved oleh pesanan — tidak bisa diedit manual
              </p>
            </TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      header: 'Tersedia',
      id: 'available',
      cell: ({ row }) => {
        const avail = row.original.available
        const threshold = row.original.lowStockThreshold
        return (
          <span
            className={cn(avail <= threshold && 'font-semibold text-bahaya')}
          >
            {avail}
            {avail <= threshold && (
              <AlertTriangleIcon className="ml-1 inline size-3.5" />
            )}
          </span>
        )
      },
    },
    {
      header: 'Ambang',
      accessorKey: 'lowStockThreshold',
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAdjust(row.original)}
          >
            Sesuaikan Stok
          </Button>
          <Link
            to="/stok/riwayat"
            search={{ variantId: row.original.variantId }}
            className="inline-flex items-center justify-center rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <HistoryIcon className="size-4" />
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader judul="Stok Biji" />

      <DataTable
        columns={columns}
        data={filtered}
        total={filtered?.length ?? 0}
        page={1}
        limit={filtered?.length || 10}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        emptyState={{
          judul: lowStockOnly
            ? 'Tidak ada stok menipis'
            : 'Belum ada data stok',
          deskripsi: lowStockOnly
            ? 'Semua stok dalam batas aman.'
            : 'Stok biji akan muncul setelah ada varian produk.',
        }}
        toolbar={{
          actions: (
            <Button
              variant={lowStockOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLowStockOnly(!lowStockOnly)}
            >
              <AlertTriangleIcon className="size-4" />
              Stok Menipis
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sesuaikan Stok</DialogTitle>
            <DialogDescription>
              {selectedVariant && (
                <span className="font-mono text-xs">{selectedVariant.sku}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVariant && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>
                  Stok saat ini: <strong>{selectedVariant.quantity}</strong>
                </p>
                {diff !== 0 && (
                  <p
                    className={cn(
                      'mt-1',
                      diff > 0 ? 'text-success' : 'text-bahaya',
                    )}
                  >
                    Preview: {selectedVariant.quantity} →{' '}
                    <strong>{Number(newQty)}</strong>{' '}
                    <span>
                      ({diff > 0 ? '+' : ''}
                      {diff})
                    </span>
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="qty">Stok Baru</Label>
              <Input
                id="qty"
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LoadingButton
              loading={adjustMutation.isPending}
              loadingText="Menyimpan…"
              onClick={handleSubmit}
              disabled={!newQty || Number(newQty) < 0}
              className="w-full"
            >
              Simpan
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
