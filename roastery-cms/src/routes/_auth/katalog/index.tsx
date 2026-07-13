import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, EyeIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/button.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { DataTable } from '#/components/shared/data-table.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import {
  produkListQueryOptions,
  brandsQueryOptions,
  categoriesQueryOptions,
} from '#/features/katalog/queries.ts'
import type {
  ProdukListItem,
  ProductFilterParams,
} from '#/features/katalog/types.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_auth/katalog/')({
  component: ProdukListPage,
})

const TIPE_OPTIONS = [
  { value: '', label: 'Semua Tipe' },
  { value: 'bean', label: 'Biji' },
  { value: 'machine', label: 'Mesin' },
  { value: 'grinder', label: 'Grinder' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

function ProdukListPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const params: ProductFilterParams = {
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(type && { type }),
    ...(brandId && { brandId }),
    ...(categoryId && { categoryId }),
  }

  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    produkListQueryOptions(params),
  )
  const { data: brands } = useQuery(brandsQueryOptions())
  const { data: categories } = useQuery(categoriesQueryOptions())

  function handleSearch(s: string) {
    setSearch(s)
    setPage(1)
  }

  const columns: ColumnDef<ProdukListItem>[] = [
    {
      header: 'Kode',
      accessorKey: 'code',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue() as string}</span>
      ),
    },
    {
      header: 'Nama',
      accessorKey: 'name',
    },
    {
      header: 'Tipe',
      accessorKey: 'type',
      cell: ({ getValue }) => {
        const t = getValue() as string
        return TIPE_OPTIONS.find((o) => o.value === t)?.label ?? t
      },
    },
    {
      header: 'Brand',
      id: 'brand',
      cell: ({ row }) => row.original.brand?.name ?? '—',
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: ({ getValue }) => (
        <StatusBadge jenis="unit" status={getValue() ? 'active' : 'inactive'} />
      ),
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => (
        <Link
          to="/katalog/$slug"
          params={{ slug: row.original.slug }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <EyeIcon className="size-4" />
          Detail
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Produk"
        aksi={
          <Link to="/katalog/baru">
            <Button>
              <PlusIcon className="size-4" />
              Tambah Produk
            </Button>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={data?.data}
        total={data?.total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l)
          setPage(1)
        }}
        emptyState={{
          judul: 'Belum ada produk',
          deskripsi: 'Tambahkan produk pertama untuk mulai menjual.',
          aksi: (
            <Link to="/katalog/baru">
              <Button>
                <PlusIcon className="size-4" />
                Tambah Produk
              </Button>
            </Link>
          ),
        }}
        toolbar={{
          searchValue: search,
          onSearchChange: handleSearch,
          searchPlaceholder: 'Cari produk…',
          filters: (
            <>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  {TIPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={brandId}
                onValueChange={(v) => {
                  setBrandId(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Semua Brand</SelectItem>
                  {brands?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Semua Kategori</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={isActive}
                onValueChange={(v) => {
                  setIsActive(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ),
        }}
      />
    </div>
  )
}
