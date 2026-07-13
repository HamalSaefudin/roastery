import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  PencilIcon,
  ArrowLeftIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
} from 'lucide-react'
import { Button } from '#/components/ui/button.tsx'
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
import { ErrorState } from '#/components/shared/error-state.tsx'
import { PageSkeleton } from '#/components/shared/skeletons.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import { ConfirmDialog } from '#/components/shared/confirm-dialog.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import {
  produkDetailQueryOptions,
  useToggleProductStatusMutation,
  useCreateVariantMutation,
} from '#/features/katalog/queries.ts'
import type {
  BeanDetail,
  MachineDetail,
  GrinderDetail,
  TipeProduk,
} from '#/features/katalog/types.ts'

const GRIND_OPTIONS = [
  { value: 'whole', label: 'Whole Bean' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'v60', label: 'V60' },
  { value: 'french_press', label: 'French Press' },
  { value: 'moka_pot', label: 'Moka Pot' },
  { value: 'drip', label: 'Drip' },
]

const WEIGHT_OPTIONS = [
  { value: '200', label: '200g' },
  { value: '250', label: '250g' },
  { value: '500', label: '500g' },
  { value: '1000', label: '1kg' },
]

export const Route = createFileRoute('/_auth/katalog/$slug')({
  component: ProdukDetailPage,
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(
      produkDetailQueryOptions(params.slug),
    )
  },
  pendingComponent: PageSkeleton,
})

function ProdukDetailPage() {
  const { slug } = Route.useParams()
  const { data, isLoading, isError, refetch } = useQuery(
    produkDetailQueryOptions(slug),
  )
  const product = data?.product
  const statusMutation = useToggleProductStatusMutation()
  const createVariantMutation = useCreateVariantMutation()

  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [newWeight, setNewWeight] = useState('250')
  const [newGrind, setNewGrind] = useState('whole')

  if (isLoading) return <PageSkeleton />
  if (isError || !product) {
    return (
      <ErrorState
        pesan="Gagal memuat detail produk"
        onRetry={() => refetch()}
      />
    )
  }

  const isBean = product.type === 'bean'
  const beanDetail = isBean ? (product.detail as BeanDetail) : null

  function handleVariantSubmit() {
    if (!product) return
    createVariantMutation.mutate(
      {
        productId: product.id,
        weightGrams: Number(newWeight),
        grind: newGrind,
      },
      {
        onSuccess: () => {
          setVariantDialogOpen(false)
          setNewWeight('250')
          setNewGrind('whole')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        judul={product.name}
        breadcrumb={
          <Link
            to="/katalog"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="mr-1 inline size-4" />
            Kembali ke Produk
          </Link>
        }
        aksi={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
              {product.isActive ? (
                <PowerOffIcon className="size-4" />
              ) : (
                <PowerIcon className="size-4" />
              )}
              {product.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
            <Link to="/katalog/$slug/edit" params={{ slug }}>
              <Button variant="outline">
                <PencilIcon className="size-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Kode</p>
          <p className="font-mono">{product.code}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Tipe</p>
          <p className="capitalize">
            {product.type === 'bean'
              ? 'Biji Kopi'
              : product.type === 'machine'
                ? 'Mesin'
                : 'Grinder'}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Status</p>
          <StatusBadge
            jenis="unit"
            status={product.isActive ? 'active' : 'inactive'}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Kategori</p>
          <p>{product.category?.name ?? '—'}</p>
        </div>
        {product.brand && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Brand</p>
            <p>{product.brand.name}</p>
          </div>
        )}
        {product.imageUrl && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Gambar</p>
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-20 w-20 rounded-md border object-cover"
            />
          </div>
        )}
        {product.description && (
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm text-muted-foreground">Deskripsi</p>
            <p className="text-sm">{product.description}</p>
          </div>
        )}
      </div>

      {isBean && beanDetail && (
        <BeanDetailSection
          detail={beanDetail}
          onAddVariant={() => setVariantDialogOpen(true)}
        />
      )}

      {(product.type === 'machine' || product.type === 'grinder') && (
        <MachineGrinderDetailSection
          type={product.type}
          detail={product.detail as MachineDetail | GrinderDetail}
        />
      )}

      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        judul={product.isActive ? 'Nonaktifkan produk?' : 'Aktifkan produk?'}
        deskripsi={
          product.isActive
            ? 'Produk yang dinonaktifkan tidak akan muncul di storefront.'
            : 'Produk akan kembali muncul di storefront.'
        }
        loading={statusMutation.isPending}
        labelKonfirmasi={product.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        onConfirm={() => {
          statusMutation.mutate(
            { id: product.id, isActive: !product.isActive },
            { onSuccess: () => setStatusDialogOpen(false) },
          )
        }}
      />

      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Varian</DialogTitle>
            <DialogDescription>
              Pilih berat dan jenis gilingan untuk varian baru.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Berat</Label>
              <Select value={newWeight} onValueChange={setNewWeight}>
                <SelectTrigger id="weight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEIGHT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grind">Giling</Label>
              <Select value={newGrind} onValueChange={setNewGrind}>
                <SelectTrigger id="grind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LoadingButton
              loading={createVariantMutation.isPending}
              loadingText="Menyimpan…"
              onClick={handleVariantSubmit}
              className="w-full"
            >
              Tambah Varian
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BeanDetailSection({
  detail,
  onAddVariant,
}: {
  detail: BeanDetail
  onAddVariant: () => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-semibold">Detail Biji Kopi</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Origin</p>
          <p className="text-sm">{detail.origin?.name ?? '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Proses</p>
          <p className="text-sm capitalize">{detail.process ?? '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Roast Level</p>
          <p className="text-sm capitalize">{detail.roastLevel ?? '—'}</p>
        </div>
        {detail.altitude && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Altitude</p>
            <p className="text-sm">{detail.altitude}</p>
          </div>
        )}
        {detail.variety && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Variety</p>
            <p className="text-sm">{detail.variety}</p>
          </div>
        )}
        {detail.tastingNotes && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Tasting Notes</p>
            <p className="text-sm">{detail.tastingNotes}</p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            Varian ({detail.variants.length})
          </h4>
          <Button variant="outline" size="sm" onClick={onAddVariant}>
            <PlusIcon className="size-4" />
            Tambah Varian
          </Button>
        </div>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  Berat
                </th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  Giling
                </th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  SKU
                </th>
                <th className="px-3 py-2 font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.variants.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    Belum ada varian
                  </td>
                </tr>
              ) : (
                detail.variants.map((v) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{v.weightGrams}g</td>
                    <td className="px-3 py-2 capitalize">{v.grind}</td>
                    <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        jenis="unit"
                        status={v.isActive ? 'active' : 'inactive'}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MachineGrinderDetailSection({
  type,
  detail,
}: {
  type: TipeProduk
  detail: MachineDetail | GrinderDetail
}) {
  const isGrinder = type === 'grinder'
  const grinderDetail = isGrinder ? (detail as GrinderDetail) : null
  const machineDetail = !isGrinder ? (detail as MachineDetail) : null

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg font-semibold">
        Detail {isGrinder ? 'Grinder' : 'Mesin'}
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        {(machineDetail?.brand ?? grinderDetail?.brand) && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Brand</p>
            <p className="text-sm">
              {(machineDetail?.brand ?? grinderDetail?.brand)?.name ?? '—'}
            </p>
          </div>
        )}
        {(machineDetail?.specs ?? grinderDetail?.specs) && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Spesifikasi</p>
            <p className="text-sm whitespace-pre-wrap">
              {machineDetail?.specs ?? grinderDetail?.specs}
            </p>
          </div>
        )}
        {machineDetail?.voltage && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Voltage</p>
            <p className="text-sm">{machineDetail.voltage}</p>
          </div>
        )}
        {grinderDetail?.burrType && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Burr Type</p>
            <p className="text-sm">{grinderDetail.burrType}</p>
          </div>
        )}
        {(machineDetail?.warrantyMonths ?? grinderDetail?.warrantyMonths) && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Garansi</p>
            <p className="text-sm">
              {machineDetail?.warrantyMonths ?? grinderDetail?.warrantyMonths}{' '}
              bulan
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
