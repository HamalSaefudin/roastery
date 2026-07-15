import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PlusIcon, PencilIcon, PowerIcon, PowerOffIcon } from 'lucide-react'
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
import { InputRupiah } from '#/components/shared/input-rupiah.tsx'
import {
  promosQueryOptions,
  useCreatePromoMutation,
} from '#/features/pricing/queries.ts'
import type { PromoCode } from '#/features/pricing/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatTanggalSaja } from '#/lib/format.ts'
import { cn } from '#/lib/utils.ts'

export const Route = createFileRoute('/_auth/harga-promo/promo')({
  component: PromoPage,
})

function PromoPage() {
  const { data, isLoading, isError, refetch, isRefetching } =
    useQuery(promosQueryOptions())
  const createMutation = useCreatePromoMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null)

  const [code, setCode] = useState('')
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState<number | ''>('')
  const [minOrder, setMinOrder] = useState<number | ''>('')
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [usageLimit, setUsageLimit] = useState<number | ''>('')

  function openCreate() {
    setCode('')
    setType('percent')
    setValue('')
    setMinOrder('')
    setMaxDiscount('')
    setStartsAt('')
    setEndsAt('')
    setUsageLimit('')
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (!code.trim()) return
    createMutation.mutate(
      {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        minOrder: Number(minOrder || 0),
        maxDiscount: maxDiscount === '' ? null : Number(maxDiscount),
        startsAt: startsAt ? `${startsAt}T00:00:00Z` : undefined,
        endsAt: endsAt ? `${endsAt}T23:59:59Z` : undefined,
        usageLimit: Number(usageLimit || 0),
      },
      { onSuccess: () => setDialogOpen(false) },
    )
  }

  function now() {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  }

  function isPromoExpired(p: PromoCode): boolean {
    return p.endsAt < now()
  }

  function isPromoNotStarted(p: PromoCode): boolean {
    return p.startsAt > now()
  }

  function getQuotaPercent(p: PromoCode): number {
    if (!p.usageLimit) return 0
    return (p.usedCount / p.usageLimit) * 100
  }

  const columns: ColumnDef<PromoCode>[] = [
    {
      header: 'Kode',
      accessorKey: 'code',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-semibold">
          {getValue() as string}
        </span>
      ),
    },
    {
      header: 'Tipe',
      accessorKey: 'type',
      cell: ({ getValue }) => (getValue() === 'percent' ? 'Persen' : 'Nominal'),
    },
    {
      header: 'Nilai',
      accessorKey: 'value',
      cell: ({ row }) =>
        row.original.type === 'percent'
          ? `${row.original.value}%`
          : `Rp ${row.original.value.toLocaleString('id-ID')}`,
    },
    {
      header: 'Masa Berlaku',
      id: 'periode',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatTanggalSaja(row.original.startsAt)} —{' '}
          {formatTanggalSaja(row.original.endsAt)}
        </span>
      ),
    },
    {
      header: 'Kuota',
      id: 'quota',
      cell: ({ row }) => {
        const p = row.original
        const perc = getQuotaPercent(p)
        return (
          <span className={cn(perc >= 80 && 'font-semibold text-bahaya')}>
            {p.usedCount}/{p.usageLimit || '∞'}
          </span>
        )
      },
    },
    {
      header: 'Status',
      id: 'status',
      cell: ({ row }) => {
        const p = row.original
        if (!p.isActive) return <StatusBadge jenis="user" status="inactive" />
        if (isPromoExpired(p))
          return <StatusBadge jenis="order" status="expired" />
        if (isPromoNotStarted(p))
          return <StatusBadge jenis="user" status="pending" />
        return <StatusBadge jenis="user" status="active" />
      },
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon">
            <PencilIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedPromo(row.original)
              setStatusDialogOpen(true)
            }}
          >
            {row.original.isActive ? (
              <PowerOffIcon className="size-4" />
            ) : (
              <PowerIcon className="size-4" />
            )}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Kode Promo"
        aksi={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Tambah Promo
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
          judul: 'Belum ada kode promo',
          deskripsi: 'Buat kode promo untuk menarik pelanggan.',
          aksi: (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Tambah Promo
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Promo</DialogTitle>
            <DialogDescription>Buat kode promo baru.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Kode</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="HEMAT10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipe</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'percent' | 'fixed')}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Persen</SelectItem>
                  <SelectItem value="fixed">Nominal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">
                {type === 'percent' ? 'Nilai (%)' : 'Nilai (Rp)'}
              </Label>
              {type === 'percent' ? (
                <Input
                  id="value"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.valueAsNumber || '')}
                  min={1}
                  max={100}
                />
              ) : (
                <InputRupiah id="value" value={value} onChange={setValue} />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrder">Min. Belanja (Rp)</Label>
              <InputRupiah
                id="minOrder"
                value={minOrder}
                onChange={setMinOrder}
              />
            </div>
            {type === 'percent' && (
              <div className="space-y-2">
                <Label htmlFor="maxDisc">Max. Diskon (Rp)</Label>
                <InputRupiah
                  id="maxDisc"
                  value={maxDiscount}
                  onChange={setMaxDiscount}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="quota">Kuota</Label>
              <Input
                id="quota"
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.valueAsNumber || '')}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mulai">Mulai</Label>
              <Input
                id="mulai"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="akhir">Berakhir</Label>
              <Input
                id="akhir"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                min={startsAt}
              />
            </div>
          </div>
          <LoadingButton
            loading={createMutation.isPending}
            loadingText="Menyimpan…"
            onClick={handleSubmit}
            disabled={!code.trim()}
            className="w-full"
          >
            Simpan
          </LoadingButton>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        judul={`${selectedPromo?.isActive ? 'Nonaktifkan' : 'Aktifkan'} promo ${selectedPromo?.code}?`}
        deskripsi={
          selectedPromo?.isActive
            ? 'Promo nonaktif tidak bisa digunakan saat checkout.'
            : 'Promo aktif akan tersedia untuk pelanggan.'
        }
        loading={false}
        labelKonfirmasi={selectedPromo?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        onConfirm={() => setStatusDialogOpen(false)}
      />
    </div>
  )
}
