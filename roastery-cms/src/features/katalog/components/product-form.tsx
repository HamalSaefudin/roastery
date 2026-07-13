import { useQuery } from '@tanstack/react-query'
import { CoffeeIcon, DrillIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import {
  brandsQueryOptions,
  categoriesQueryOptions,
  originsQueryOptions,
} from '#/features/katalog/queries.ts'
import { cn } from '#/lib/utils.ts'
import type { TipeProduk, ProdukDetail } from '#/features/katalog/types.ts'

interface ProductFormData {
  type: TipeProduk | null
  name: string
  description: string
  categoryId: string
  brandId: string
  imageUrl: string
  isActive: boolean
  originId: string
  process: string
  roastLevel: string
  fulfillmentType: string
  altitude: string
  variety: string
  tastingNotes: string
  specs: string
  voltage: string
  warrantyMonths: string
  burrType: string
}

interface ProductFormProps {
  initialData?: ProdukDetail['product'] | null
  isPending: boolean
  onSubmit: (data: {
    type: TipeProduk
    name: string
    description?: string
    categoryId?: string
    brandId?: string
    imageUrl?: string
    isActive?: boolean
    detail: Record<string, unknown>
  }) => void
}

const TIPE_CARD = [
  {
    type: 'bean' as TipeProduk,
    label: 'Biji Kopi',
    deskripsi: 'Biji kopi whole bean / bubuk',
    ikon: CoffeeIcon,
  },
  {
    type: 'machine' as TipeProduk,
    label: 'Mesin Espresso',
    deskripsi: 'Mesin kopi komersial & rumahan',
    ikon: CoffeeIcon,
  },
  {
    type: 'grinder' as TipeProduk,
    label: 'Grinder',
    deskripsi: 'Penggiling biji kopi',
    ikon: DrillIcon,
  },
]

const PROCESS_OPTIONS = [
  { value: 'washed', label: 'Washed' },
  { value: 'natural', label: 'Natural' },
  { value: 'honey', label: 'Honey' },
  { value: 'other', label: 'Other' },
]

const ROAST_OPTIONS = [
  { value: 'light', label: 'Light Roast' },
  { value: 'medium', label: 'Medium Roast' },
  { value: 'dark', label: 'Dark Roast' },
]

const FULFILLMENT_OPTIONS = [
  { value: 'ready_stock', label: 'Ready Stock' },
  { value: 'roast_to_order', label: 'Roast to Order' },
]

export function ProductForm({
  initialData,
  isPending,
  onSubmit,
}: ProductFormProps) {
  const isEdit = !!initialData
  const { data: brands } = useQuery(brandsQueryOptions())
  const { data: categories } = useQuery(categoriesQueryOptions())
  const { data: origins } = useQuery(originsQueryOptions())

  const beanDetail =
    initialData?.detail && 'origin' in initialData.detail
      ? (initialData.detail as unknown as {
          origin: { id: string } | null
          process: string | null
          roastLevel: string | null
          fulfillmentType: string | null
          altitude: string | null
          variety: string | null
          tastingNotes: string | null
        })
      : null

  const machineDetail =
    initialData?.detail &&
    'specs' in initialData.detail &&
    !('burrType' in initialData.detail)
      ? (initialData.detail as unknown as {
          specs: string | null
          voltage: string | null
          warrantyMonths: number | null
        })
      : null

  const grinderDetail =
    initialData?.detail && 'burrType' in initialData.detail
      ? (initialData.detail as unknown as {
          specs: string | null
          burrType: string | null
          warrantyMonths: number | null
        })
      : null

  const [form, setForm] = useState<ProductFormData>({
    type: initialData?.type ?? null,
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    categoryId: initialData?.category?.id ?? '',
    brandId:
      initialData?.slug && beanDetail ? '' : (initialData?.brand?.id ?? ''),
    imageUrl: initialData?.imageUrl ?? '',
    isActive: initialData?.isActive ?? true,
    originId: beanDetail?.origin?.id ?? '',
    process: beanDetail?.process ?? '',
    roastLevel: beanDetail?.roastLevel ?? '',
    fulfillmentType: beanDetail?.fulfillmentType ?? '',
    altitude: beanDetail?.altitude ?? '',
    variety: beanDetail?.variety ?? '',
    tastingNotes: beanDetail?.tastingNotes ?? '',
    specs: machineDetail?.specs ?? grinderDetail?.specs ?? '',
    voltage: machineDetail?.voltage ?? '',
    warrantyMonths: String(
      machineDetail?.warrantyMonths ?? grinderDetail?.warrantyMonths ?? '',
    ),
    burrType: grinderDetail?.burrType ?? '',
  })

  function update<TKey extends keyof ProductFormData>(
    key: TKey,
    value: ProductFormData[TKey],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.type) return

    const detail: Record<string, unknown> = {}
    if (form.type === 'bean') {
      if (form.originId) detail.originId = form.originId
      if (form.process) detail.process = form.process
      if (form.roastLevel) detail.roastLevel = form.roastLevel
      if (form.fulfillmentType) detail.fulfillmentType = form.fulfillmentType
      if (form.altitude) detail.altitude = form.altitude
      if (form.variety) detail.variety = form.variety
      if (form.tastingNotes) detail.tastingNotes = form.tastingNotes
    } else if (form.type === 'machine') {
      if (form.brandId) detail.brandId = form.brandId
      if (form.specs) detail.specs = form.specs
      if (form.voltage) detail.voltage = form.voltage
      if (form.warrantyMonths)
        detail.warrantyMonths = Number(form.warrantyMonths)
    } else {
      if (form.brandId) detail.brandId = form.brandId
      if (form.specs) detail.specs = form.specs
      if (form.burrType) detail.burrType = form.burrType
      if (form.warrantyMonths)
        detail.warrantyMonths = Number(form.warrantyMonths)
    }

    onSubmit({
      type: form.type,
      name: form.name,
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      brandId: form.type !== 'bean' ? form.brandId || undefined : undefined,
      imageUrl: form.imageUrl || undefined,
      isActive: form.isActive,
      detail,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!isEdit && (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Tipe Produk
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TIPE_CARD.map((t) => {
                const Icon = t.ikon
                const isSelected = form.type === t.type
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => update('type', t.type)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors',
                      isSelected
                        ? 'border-primer bg-primer/5 ring-1 ring-primer'
                        : 'hover:border-muted-foreground/30',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-8',
                        isSelected ? 'text-primer' : 'text-muted-foreground',
                      )}
                    />
                    <div>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.deskripsi}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="nama">
            Nama Produk <span className="text-bahaya">*</span>
          </Label>
          <Input
            id="nama"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Nama produk"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kategori">Kategori</Label>
          <Select
            value={form.categoryId}
            onValueChange={(v) => update('categoryId', v)}
          >
            <SelectTrigger id="kategori">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.type && form.type !== 'bean' && (
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Select
              value={form.brandId}
              onValueChange={(v) => update('brandId', v)}
            >
              <SelectTrigger id="brand">
                <SelectValue placeholder="Pilih brand" />
              </SelectTrigger>
              <SelectContent>
                {brands?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="imageUrl">URL Gambar</Label>
          <Input
            id="imageUrl"
            value={form.imageUrl}
            onChange={(e) => update('imageUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>

        {form.imageUrl && (
          <div className="flex items-center gap-3">
            <img
              src={form.imageUrl}
              alt="Preview"
              className="h-16 w-16 rounded-md border object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => update('imageUrl', '')}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-3 md:col-span-2">
          <Switch
            id="isActive"
            checked={form.isActive}
            onCheckedChange={(v) => update('isActive', v)}
          />
          <Label htmlFor="isActive">Aktif (tampil di storefront)</Label>
        </div>
      </div>

      {form.type && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm font-medium text-muted-foreground">
              Detail {TIPE_CARD.find((t) => t.type === form.type)?.label}
            </p>

            {form.type === 'bean' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origin</Label>
                  <Select
                    value={form.originId}
                    onValueChange={(v) => update('originId', v)}
                  >
                    <SelectTrigger id="origin">
                      <SelectValue placeholder="Pilih origin" />
                    </SelectTrigger>
                    <SelectContent>
                      {origins?.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="process">Proses</Label>
                  <Select
                    value={form.process}
                    onValueChange={(v) => update('process', v)}
                  >
                    <SelectTrigger id="process">
                      <SelectValue placeholder="Pilih proses" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roast">Roast Level</Label>
                  <Select
                    value={form.roastLevel}
                    onValueChange={(v) => update('roastLevel', v)}
                  >
                    <SelectTrigger id="roast">
                      <SelectValue placeholder="Pilih roast level" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROAST_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fulfillment">Fulfillment</Label>
                  <Select
                    value={form.fulfillmentType}
                    onValueChange={(v) => update('fulfillmentType', v)}
                  >
                    <SelectTrigger id="fulfillment">
                      <SelectValue placeholder="Pilih fulfillment" />
                    </SelectTrigger>
                    <SelectContent>
                      {FULFILLMENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altitude">Altitude</Label>
                  <Input
                    id="altitude"
                    value={form.altitude}
                    onChange={(e) => update('altitude', e.target.value)}
                    placeholder="1900-2100 mdpl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variety">Variety</Label>
                  <Input
                    id="variety"
                    value={form.variety}
                    onChange={(e) => update('variety', e.target.value)}
                    placeholder="Heirloom"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tasting">Tasting Notes</Label>
                  <Input
                    id="tasting"
                    value={form.tastingNotes}
                    onChange={(e) => update('tastingNotes', e.target.value)}
                    placeholder="fruity, floral, chocolate"
                  />
                </div>
              </div>
            )}

            {form.type === 'machine' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="specs">Spesifikasi</Label>
                  <Textarea
                    id="specs"
                    value={form.specs}
                    onChange={(e) => update('specs', e.target.value)}
                    placeholder="Detail spesifikasi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voltage">Voltage</Label>
                  <Input
                    id="voltage"
                    value={form.voltage}
                    onChange={(e) => update('voltage', e.target.value)}
                    placeholder="220V"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty">Garansi (bulan)</Label>
                  <Input
                    id="warranty"
                    type="number"
                    value={form.warrantyMonths}
                    onChange={(e) => update('warrantyMonths', e.target.value)}
                    placeholder="24"
                  />
                </div>
              </div>
            )}

            {form.type === 'grinder' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="specs">Spesifikasi</Label>
                  <Textarea
                    id="specs"
                    value={form.specs}
                    onChange={(e) => update('specs', e.target.value)}
                    placeholder="Detail spesifikasi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="burrType">Burr Type</Label>
                  <Input
                    id="burrType"
                    value={form.burrType}
                    onChange={(e) => update('burrType', e.target.value)}
                    placeholder="Flat / Conical"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty">Garansi (bulan)</Label>
                  <Input
                    id="warranty"
                    type="number"
                    value={form.warrantyMonths}
                    onChange={(e) => update('warrantyMonths', e.target.value)}
                    placeholder="24"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <LoadingButton
          type="submit"
          loading={isPending}
          loadingText={isEdit ? 'Menyimpan…' : 'Menyimpan…'}
          disabled={!form.type || !form.name.trim()}
        >
          {isEdit ? 'Simpan Perubahan' : 'Buat Produk'}
        </LoadingButton>
      </div>
    </form>
  )
}
