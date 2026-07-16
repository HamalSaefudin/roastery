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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { EmptyState } from '#/components/shared/empty-state.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import { ConfirmDialog } from '#/components/shared/confirm-dialog.tsx'
import {
  driversQueryOptions,
  codBalanceQueryOptions,
  codSettlementsQueryOptions,
  useCreateCodSettlementMutation,
  useConfirmCodSettlementMutation,
} from '#/features/delivery/queries.ts'
import { formatRupiah, formatTanggal } from '#/lib/format.ts'

export const Route = createFileRoute('/_auth/pengiriman/cod')({
  component: SetoranCodPage,
})

function SetoranCodPage() {
  const { data: drivers } = useQuery(driversQueryOptions())
  const [driverId, setDriverId] = useState('')

  const { data: balance, isLoading: balanceLoading } = useQuery(
    codBalanceQueryOptions(driverId),
  )
  const { data: settlements, isLoading: settlementsLoading } = useQuery(
    codSettlementsQueryOptions(driverId || undefined),
  )
  const createMutation = useCreateCodSettlementMutation()
  const confirmMutation = useConfirmCodSettlementMutation()

  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)

  const driver = drivers?.find((d) => d.id === driverId)

  return (
    <div className="space-y-6">
      <PageHeader judul="Setoran COD" />

      <div className="max-w-xs">
        <Select value={driverId} onValueChange={setDriverId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih driver" />
          </SelectTrigger>
          <SelectContent>
            {(drivers ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!driverId && (
        <EmptyState
          judul="Pilih driver"
          deskripsi="Pilih driver untuk melihat saldo COD dan riwayat setoran."
        />
      )}

      {driverId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Saldo COD di Tangan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {balanceLoading ? (
                <p className="text-sm text-muted-foreground">Memuat…</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-2xl font-bold">
                      {formatRupiah(balance?.balance ?? 0)}
                    </span>
                    {(balance?.balance ?? 0) > 0 && (
                      <Button onClick={() => setSettleDialogOpen(true)}>
                        Terima Setoran
                      </Button>
                    )}
                  </div>
                  {(balance?.deliveries.length ?? 0) > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Delivery</TableHead>
                          <TableHead className="text-right">Nominal</TableHead>
                          <TableHead className="text-right">Diterima</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balance?.deliveries.map((d) => (
                          <TableRow key={d.deliveryNumber}>
                            <TableCell className="font-mono text-xs">
                              {d.deliveryNumber}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatRupiah(d.codAmount ?? 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {d.codCollectedAt
                                ? formatTanggal(d.codCollectedAt)
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Setoran</CardTitle>
            </CardHeader>
            <CardContent>
              {settlementsLoading ? (
                <p className="text-sm text-muted-foreground">Memuat…</p>
              ) : (settlements ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada riwayat setoran.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements?.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">
                          {s.settlementNumber}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRupiah(s.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge jenis="settlement" status={s.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTanggal(s.createdAt)}
                        </TableCell>
                        <TableCell>
                          {s.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmTarget(s.id)}
                            >
                              Konfirmasi
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={settleDialogOpen}
        onOpenChange={setSettleDialogOpen}
        judul={`Terima setoran dari ${driver?.name}?`}
        deskripsi={`Seluruh saldo COD (${formatRupiah(balance?.balance ?? 0)}) akan dicatat sebagai satu setoran, menunggu konfirmasi.`}
        labelKonfirmasi="Buat Setoran"
        labelLoading="Membuat…"
        destruktif={false}
        loading={createMutation.isPending}
        onConfirm={() => {
          if (!driverId) return
          createMutation.mutate(
            { driverId },
            { onSuccess: () => setSettleDialogOpen(false) },
          )
        }}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null)
        }}
        judul="Konfirmasi setoran ini?"
        deskripsi="Setoran akan ditandai sudah diterima dan dikonfirmasi."
        labelKonfirmasi="Konfirmasi"
        labelLoading="Mengonfirmasi…"
        destruktif={false}
        loading={confirmMutation.isPending}
        onConfirm={() => {
          if (!confirmTarget || !driverId) return
          confirmMutation.mutate(
            { id: confirmTarget, driverId },
            { onSuccess: () => setConfirmTarget(null) },
          )
        }}
      />
    </div>
  )
}
