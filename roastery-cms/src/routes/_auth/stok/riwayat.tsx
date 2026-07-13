import { createFileRoute } from '@tanstack/react-router'
import { Input } from '#/components/ui/input.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { EmptyState } from '#/components/shared/empty-state.tsx'
import { TableSkeleton } from '#/components/shared/skeletons.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { cn } from '#/lib/utils.ts'
import { formatTanggal } from '#/lib/format.ts'
import { useState } from 'react'
import { SearchIcon } from 'lucide-react'

const MOCK_MOVEMENTS = [
  {
    id: '1',
    variantId: 'v1',
    quantity: 50,
    reason: 'purchase',
    createdAt: '2026-07-13T08:00:00Z',
  },
  {
    id: '2',
    variantId: 'v1',
    quantity: -3,
    reason: 'order',
    refOrderId: 'ORD-001',
    createdAt: '2026-07-12T14:30:00Z',
  },
  {
    id: '3',
    variantId: 'v2',
    quantity: -10,
    reason: 'adjustment',
    createdAt: '2026-07-11T10:00:00Z',
  },
]

const REASON_LABEL: Record<string, string> = {
  purchase: 'Pembelian',
  adjustment: 'Penyesuaian',
  return: 'Retur',
  order: 'Pesanan',
  manual: 'Manual',
}

export const Route = createFileRoute('/_auth/stok/riwayat')({
  component: StokRiwayatPage,
})

function StokRiwayatPage() {
  const [search, setSearch] = useState('')
  const [isLoading] = useState(false)
  const movements = MOCK_MOVEMENTS

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader judul="Riwayat Stok" />
        <div className="rounded-md border">
          <TableSkeleton kolom={5} baris={5} />
        </div>
      </div>
    )
  }

  if (movements.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader judul="Riwayat Stok" />
        <EmptyState
          judul="Belum ada riwayat"
          deskripsi="Riwayat pergerakan stok akan muncul setelah ada aktivitas."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader judul="Riwayat Stok" />

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari riwayat…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs pl-8"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Perubahan</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Ref. Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {formatTanggal(m.createdAt)}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'font-mono text-sm',
                      m.quantity > 0
                        ? 'text-success'
                        : m.quantity < 0
                          ? 'text-bahaya'
                          : '',
                    )}
                  >
                    {m.quantity > 0 ? '+' : ''}
                    {m.quantity}
                  </span>
                </TableCell>
                <TableCell className="text-sm capitalize">
                  {REASON_LABEL[m.reason] ?? m.reason}
                </TableCell>
                <TableCell>
                  {m.refOrderId ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {m.refOrderId}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
