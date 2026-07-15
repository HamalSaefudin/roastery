import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { DataTable } from '#/components/shared/data-table.tsx'
import { ConfirmDialog } from '#/components/shared/confirm-dialog.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import {
  wholesaleApplicationsQueryOptions,
  useApproveWholesaleMutation,
  useRejectWholesaleMutation,
} from '#/features/customers/queries.ts'
import type { WholesaleApplication } from '#/features/customers/types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { formatTanggalSaja } from '#/lib/format.ts'

export const Route = createFileRoute('/_auth/pelanggan/wholesale')({
  component: WholesalePage,
})

function WholesalePage() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    wholesaleApplicationsQueryOptions(statusFilter || undefined),
  )

  const approveMutation = useApproveWholesaleMutation()
  const rejectMutation = useRejectWholesaleMutation()

  const [approveTarget, setApproveTarget] =
    useState<WholesaleApplication | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<WholesaleApplication | null>(
    null,
  )
  const [rejectNote, setRejectNote] = useState('')

  const columns: ColumnDef<WholesaleApplication>[] = [
    {
      header: 'Nama Usaha',
      accessorKey: 'businessName',
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue() as string}</span>
      ),
    },
    {
      header: 'NPWP',
      accessorKey: 'taxId',
      cell: ({ getValue }) => (getValue() as string) || '—',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => (
        <StatusBadge jenis="wholesale" status={getValue() as string} />
      ),
    },
    {
      header: 'Diajukan',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => formatTanggalSaja(getValue() as string),
    },
    {
      header: 'Aksi',
      id: 'aksi',
      cell: ({ row }) => {
        const app = row.original
        if (app.status !== 'pending') {
          return (
            <span className="text-xs text-muted-foreground">
              {app.reviewedBy ? `oleh ${app.reviewedBy}` : '—'}
            </span>
          )
        }
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setApproveTarget(app)}
            >
              Setujui
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-bahaya border-bahaya/30 hover:bg-bahaya/10"
              onClick={() => {
                setRejectTarget(app)
                setRejectNote('')
                setRejectDialogOpen(true)
              }}
            >
              Tolak
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader judul="Pengajuan Wholesale" />

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Disetujui</SelectItem>
            <SelectItem value="rejected">Ditolak</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          judul:
            statusFilter === 'pending'
              ? 'Tidak ada pengajuan menunggu'
              : 'Tidak ada pengajuan',
          deskripsi: 'Pengajuan wholesale dari pelanggan akan muncul di sini.',
        }}
      />

      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null)
        }}
        judul={`Setujui "${approveTarget?.businessName}"?`}
        deskripsi="Pelanggan ini akan langsung melihat harga grosir di storefront."
        labelKonfirmasi="Setujui"
        labelLoading="Menyetujui…"
        destruktif={false}
        loading={approveMutation.isPending}
        onConfirm={() => {
          if (!approveTarget) return
          approveMutation.mutate(
            { id: approveTarget.id },
            { onSuccess: () => setApproveTarget(null) },
          )
        }}
      />

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak "{rejectTarget?.businessName}"</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan — alasan ini akan terlihat oleh
              pelanggan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alasan">Alasan penolakan</Label>
              <Textarea
                id="alasan"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Minimal 10 karakter…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Batal
            </Button>
            <LoadingButton
              variant="destructive"
              loading={rejectMutation.isPending}
              loadingText="Menolak…"
              onClick={() => {
                if (!rejectTarget || rejectNote.trim().length < 10) return
                rejectMutation.mutate(
                  { id: rejectTarget.id, note: rejectNote.trim() },
                  { onSuccess: () => setRejectDialogOpen(false) },
                )
              }}
              disabled={rejectNote.trim().length < 10}
            >
              Tolak & Kirim
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
