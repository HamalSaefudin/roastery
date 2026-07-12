import { useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ConfirmDialog } from '../components/shared/confirm-dialog'
import { EmptyState } from '../components/shared/empty-state'
import { ErrorState } from '../components/shared/error-state'
import { LoadingButton } from '../components/shared/loading-button'
import { PageHeader } from '../components/shared/page-header'
import { StatusBadge } from '../components/shared/status-badge'
import { PageSkeleton, TableSkeleton } from '../components/shared/skeletons'
import { ThemeToggle } from '../components/shared/theme-toggle'
import { formatRupiah, formatTanggal } from '../lib/format'
import { toastError, toastSukses } from '../lib/toast'

// Etalase semua komponen fondasi dalam 3 kondisi (loading/sukses/error) —
// alat verifikasi visual step 01. Hanya tersedia saat dev.
export const Route = createFileRoute('/dev/kitchen-sink')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: KitchenSink,
})

const SEMUA_STATUS = {
  order: [
    'created',
    'paid',
    'processing',
    'out_for_delivery',
    'ready_for_pickup',
    'delivered',
    'cancelled',
  ],
  payment: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
  invoice: ['issued', 'paid', 'overdue', 'cancelled'],
  delivery: [
    'pending',
    'assigned',
    'picked_up',
    'en_route',
    'delivered',
    'failed',
  ],
  settlement: ['pending', 'confirmed'],
  unit: ['in_stock', 'reserved', 'sold', 'defective'],
  wholesale: ['pending', 'approved', 'rejected'],
  repair: [
    'open',
    'diagnosing',
    'in_progress',
    'waiting_parts',
    'completed',
    'cancelled',
  ],
  content: ['draft', 'published'],
  user: ['active', 'pending', 'suspended'],
  customerType: ['retail', 'wholesale'],
  paymentType: ['prepaid', 'invoice'],
  fulfillment: ['delivery', 'pickup'],
  shipping: ['internal', 'external'],
  movement: ['purchase', 'sale', 'adjustment', 'return', 'reserve', 'release'],
} as const

function KitchenSink() {
  const [simulasiLoading, setSimulasiLoading] = useState(false)
  const [dialogTerbuka, setDialogTerbuka] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)

  function simulasiSubmit() {
    setSimulasiLoading(true)
    setTimeout(() => {
      setSimulasiLoading(false)
      toastSukses('Produk berhasil disimpan')
    }, 1500)
  }

  function simulasiKonfirmasi() {
    setDialogLoading(true)
    setTimeout(() => {
      setDialogLoading(false)
      setDialogTerbuka(false)
      toastSukses('Brand "Rocket" dihapus')
    }, 1500)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-8">
      <PageHeader
        judul="Kitchen Sink — Fondasi UI"
        deskripsi="Etalase semua komponen step 01 dalam kondisi normal / loading / error / empty. Dev-only."
        aksi={<ThemeToggle />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Tombol & Loading</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button>Primer</Button>
          <Button variant="secondary">Sekunder</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Hapus</Button>
          <Button disabled>Disabled</Button>
          <LoadingButton
            loading={simulasiLoading}
            loadingText="Menyimpan…"
            onClick={simulasiSubmit}
          >
            Simulasi submit (1,5 dtk)
          </LoadingButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Toast</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => toastSukses('Perubahan disimpan')}
          >
            Toast sukses
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toastError({
                statusCode: 409,
                message: 'Kombinasi berat & gilingan sudah ada',
              })
            }
          >
            Toast error 409 (pesan backend)
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toastError({
                statusCode: 400,
                message: ['nama tidak boleh kosong', 'harga minimal 1000'],
              })
            }
          >
            Toast error validasi (array)
          </Button>
          <Button
            variant="outline"
            onClick={() => toastError(new TypeError('fetch failed'))}
          >
            Toast network error
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">ConfirmDialog</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDialogTerbuka(true)}>
            Hapus brand "Rocket"
          </Button>
          <ConfirmDialog
            open={dialogTerbuka}
            onOpenChange={setDialogTerbuka}
            judul='Hapus brand "Rocket"?'
            deskripsi="Brand yang masih dipakai produk tidak bisa dihapus. Aksi ini tidak bisa dibatalkan."
            labelLoading="Menghapus…"
            loading={dialogLoading}
            onConfirm={simulasiKonfirmasi}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            StatusBadge — semua enum backend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(SEMUA_STATUS).map(([jenis, daftar]) => (
            <div key={jenis} className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                {jenis}
              </span>
              {daftar.map((s) => (
                <StatusBadge
                  key={s}
                  jenis={jenis as keyof typeof SEMUA_STATUS}
                  status={s}
                />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            Skeleton / Empty / Error
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border">
            <p className="border-b px-4 py-2 text-sm text-muted-foreground">
              TableSkeleton
            </p>
            <TableSkeleton />
          </div>
          <div className="rounded-lg border">
            <p className="border-b px-4 py-2 text-sm text-muted-foreground">
              EmptyState
            </p>
            <EmptyState
              judul="Belum ada produk"
              deskripsi="Produk yang kamu buat akan tampil di sini dan otomatis muncul di storefront."
              aksi={
                <Button size="sm">
                  <PlusIcon className="size-4" />
                  Tambah Produk
                </Button>
              }
            />
          </div>
          <div className="rounded-lg border">
            <p className="border-b px-4 py-2 text-sm text-muted-foreground">
              ErrorState
            </p>
            <ErrorState
              error={{ statusCode: 500, message: 'Internal server error' }}
              onRetry={() => toastSukses('Refetch dipanggil')}
            />
          </div>
          <div className="rounded-lg border">
            <p className="border-b px-4 py-2 text-sm text-muted-foreground">
              PageSkeleton (mini)
            </p>
            <div className="max-h-64 overflow-hidden">
              <PageSkeleton />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Form & Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid max-w-sm gap-2">
            <Label htmlFor="demo-nama">Nama Produk</Label>
            <Input id="demo-nama" defaultValue="Gayo Wine Process 250g" />
          </div>
          <div className="space-y-1 text-sm">
            <p>
              formatRupiah(2450000) →{' '}
              <b className="font-mono">{formatRupiah(2450000)}</b>
            </p>
            <p>
              formatTanggal(sekarang) →{' '}
              <b className="font-mono">{formatTanggal(new Date())}</b>
            </p>
            <p>
              Kode publik (mono):{' '}
              <span className="font-mono">ORD-20260712-0042</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
