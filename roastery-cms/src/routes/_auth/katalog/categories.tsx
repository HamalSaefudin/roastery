import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  ChevronRightIcon,
} from 'lucide-react'
import { useState, useMemo } from 'react'
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
import {
  categoriesQueryOptions,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '#/features/katalog/queries.ts'
import type { Category } from '#/features/katalog/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { cn } from '#/lib/utils.ts'

export const Route = createFileRoute('/_auth/katalog/categories')({
  component: CategoriesPage,
})

function CategoriesPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    categoriesQueryOptions(),
  )
  const createMutation = useCreateCategoryMutation()
  const updateMutation = useUpdateCategoryMutation()
  const deleteMutation = useDeleteCategoryMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Category | null>(null)
  const [formName, setFormName] = useState('')
  const [formParentId, setFormParentId] = useState<string>('')
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const parentOptions = useMemo(() => {
    if (!data) return []
    return data.filter((c) => !c.parentId)
  }, [data])

  function getParentName(id: string | null): string {
    if (!id || !data) return '—'
    const parent = data.find((c) => c.id === id)
    return parent?.name ?? '—'
  }

  function openCreate() {
    setEditItem(null)
    setFormName('')
    setFormParentId('')
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditItem(cat)
    setFormName(cat.name)
    setFormParentId(cat.parentId ?? '')
    setDialogOpen(true)
  }

  function handleSubmit() {
    const payload = { name: formName, parentId: formParentId || undefined }
    if (editItem) {
      updateMutation.mutate(
        { id: editItem.id, ...payload },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setDialogOpen(false),
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const columns: ColumnDef<Category>[] = [
    {
      header: 'Nama',
      accessorKey: 'name',
      cell: ({ row }) => {
        const hasParent = !!row.original.parentId
        return (
          <span className={cn(hasParent && 'ml-6 text-muted-foreground')}>
            {hasParent && <ChevronRightIcon className="mr-1 inline size-3" />}
            {row.original.name}
          </span>
        )
      },
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
    {
      header: 'Induk',
      id: 'parent',
      cell: ({ row }) => getParentName(row.original.parentId),
    },
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
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Kategori"
        aksi={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Tambah Kategori
          </Button>
        }
      />

      <DataTable
        columns={columns}
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
          judul: 'Belum ada kategori',
          deskripsi: 'Kategorikan produk agar mudah ditemukan.',
          aksi: (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Tambah Kategori
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem ? 'Edit Kategori' : 'Tambah Kategori'}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? 'Ubah nama atau induk kategori.'
                : 'Tambahkan kategori baru.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama</Label>
              <Input
                id="nama"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nama kategori"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="induk">Induk (opsional)</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger id="induk">
                  <SelectValue placeholder="Tidak ada induk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">Tidak ada induk</SelectItem>
                  {parentOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <LoadingButton
              loading={isPending}
              loadingText="Menyimpan…"
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
        judul={`Hapus kategori "${deleteTarget?.name}"?`}
        deskripsi="Kategori yang masih dipakai produk tidak bisa dihapus."
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
