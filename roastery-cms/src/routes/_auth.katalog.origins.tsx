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
  originsQueryOptions,
  useCreateOriginMutation,
  useUpdateOriginMutation,
  useDeleteOriginMutation,
} from '#/features/katalog/queries.ts'
import type { Origin } from '#/features/katalog/types.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_auth/katalog/origins')({
  component: OriginsPage,
})

const columns: ColumnDef<Origin>[] = [
  {
    header: 'Nama',
    accessorKey: 'name',
  },
  {
    header: 'Negara',
    accessorKey: 'country',
  },
  {
    header: 'Region',
    accessorKey: 'region',
    cell: ({ getValue }) => (getValue() as string | null) ?? '—',
  },
]

function OriginsPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    originsQueryOptions(),
  )
  const createMutation = useCreateOriginMutation()
  const updateMutation = useUpdateOriginMutation()
  const deleteMutation = useDeleteOriginMutation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Origin | null>(null)
  const [formName, setFormName] = useState('')
  const [formCountry, setFormCountry] = useState('')
  const [formRegion, setFormRegion] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Origin | null>(null)

  function openCreate() {
    setEditItem(null)
    setFormName('')
    setFormCountry('')
    setFormRegion('')
    setFormDescription('')
    setDialogOpen(true)
  }

  function openEdit(origin: Origin) {
    setEditItem(origin)
    setFormName(origin.name)
    setFormCountry(origin.country)
    setFormRegion(origin.region ?? '')
    setFormDescription(origin.description ?? '')
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (editItem) {
      updateMutation.mutate(
        {
          id: editItem.id,
          name: formName,
          country: formCountry,
          region: formRegion || undefined,
          description: formDescription || undefined,
        },
        { onSuccess: () => setDialogOpen(false) },
      )
    } else {
      createMutation.mutate(
        {
          name: formName,
          country: formCountry,
          region: formRegion || undefined,
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
        judul="Origin"
        aksi={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Tambah Origin
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
          judul: 'Belum ada origin',
          deskripsi: 'Tambahkan origin pertama untuk melacak asal biji kopi.',
          aksi: (
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Tambah Origin
            </Button>
          ),
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editItem ? 'Edit Origin' : 'Tambah Origin'}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? 'Ubah informasi origin.'
                : 'Tambahkan origin baru untuk biji kopi.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama</Label>
              <Input
                id="nama"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Mis: Ethiopia — Yirgacheffe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="negara">Negara</Label>
              <Input
                id="negara"
                value={formCountry}
                onChange={(e) => setFormCountry(e.target.value)}
                placeholder="Ethiopia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={formRegion}
                onChange={(e) => setFormRegion(e.target.value)}
                placeholder="Yirgacheffe (opsional)"
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
              loadingText="Menyimpan…"
              onClick={handleSubmit}
              disabled={!formName.trim() || !formCountry.trim()}
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
        judul={`Hapus origin "${deleteTarget?.name}"?`}
        deskripsi="Origin yang masih dipakai produk tidak bisa dihapus."
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
