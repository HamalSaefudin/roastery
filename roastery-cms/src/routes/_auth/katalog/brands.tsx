import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
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
  brandsQueryOptions,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} from '#/features/katalog/queries.ts'
import type { Brand } from '#/features/katalog/types.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_auth/katalog/brands')({
  component: BrandsPage,
})

const columns: ColumnDef<Brand>[] = [
  {
    header: 'Nama',
    accessorKey: 'name',
  },
  {
    header: 'Slug',
    accessorKey: 'slug',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getValue() as string}
      </span>
    ),
  },
]

function BrandsPage() {
  const { data, isLoading, isError, refetch, isRefetching } =
    useQuery(brandsQueryOptions())
  const createMutation = useCreateBrandMutation()
  const updateMutation = useUpdateBrandMutation()
  const deleteMutation = useDeleteBrandMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Brand | null>(null)
  const [formName, setFormName] = useState('')
  const [formLogoUrl, setFormLogoUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)

  function openCreate() {
    setEditItem(null)
    setFormName('')
    setFormLogoUrl('')
    setFormDescription('')
    setDialogOpen(true)
  }

  function openEdit(brand: Brand) {
    setEditItem(brand)
    setFormName(brand.name)
    setFormLogoUrl(brand.logoUrl ?? '')
    setFormDescription(brand.description ?? '')
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (editItem) {
      updateMutation.mutate(
        {
          id: editItem.id,
          name: formName,
          logoUrl: formLogoUrl || undefined,
          description: formDescription || undefined,
        },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createMutation.mutate(
        {
          name: formName,
          logoUrl: formLogoUrl || undefined,
          description: formDescription || undefined,
        },
        { onSuccess: () => setDialogOpen(false) },
      )
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Brand"
        aksi={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Tambah Brand
          </Button>
        }
      />

      <DataTable
        columns={[
          ...columns,
          {
            header: 'Aksi',
            id: 'aksi',
            cell: ({ row }) => (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(row.original)}
                >
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
        ]}
        data={data}
        total={data?.length}
        page={1}
        limit={data?.length ?? 10}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRetry={() => refetch()}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        emptyState={{
          judul: 'Belum ada brand',
          deskripsi:
            'Tambahkan brand pertama untuk mulai mengkategorikan produk.',
          aksi: (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Tambah Brand
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem ? 'Edit Brand' : 'Tambah Brand'}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? 'Ubah informasi brand.'
                : 'Tambahkan brand baru untuk produk.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama</Label>
              <Input
                id="nama"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama brand"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">URL Logo</Label>
              <Input
                id="logo"
                value={formLogoUrl}
                onChange={(e) => setFormLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Input
                id="deskripsi"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <LoadingButton
              loading={isPending}
              loadingText={editItem ? 'Menyimpan…' : 'Menyimpan…'}
              onClick={handleSubmit}
              disabled={!formName.trim()}
              className="w-full"
            >
              {editItem ? 'Simpan Perubahan' : 'Simpan'}
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        judul={`Hapus brand "${deleteTarget?.name}"?`}
        deskripsi="Brand yang masih dipakai produk tidak bisa dihapus."
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
