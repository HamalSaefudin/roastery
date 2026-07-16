import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#/components/ui/dialog.tsx'
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
import { PageSkeleton } from '#/components/shared/skeletons.tsx'
import { ErrorState } from '#/components/shared/error-state.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import { ConfirmDialog } from '#/components/shared/confirm-dialog.tsx'
import { LoadingButton } from '#/components/shared/loading-button.tsx'
import { InputRupiah } from '#/components/shared/input-rupiah.tsx'
import {
  orderDetailQueryOptions,
  orderPaymentQueryOptions,
  useChangeOrderStatusMutation,
  useUpdateShippingMutation,
  useRefundMutation,
} from '#/features/orders/queries.ts'
import { formatRupiah, formatTanggal } from '#/lib/format.ts'
import { BanknoteIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/pesanan/$id')({
  component: DetailPesananPage,
})

// Backend (ORDER_TRANSITIONS) izinkan processing -> out_for_delivery ATAU
// ready_for_pickup tanpa syarat fulfillmentMethod — tapi tampilkan cuma
// SATU tombol yang masuk akal sesuai plan.md ("delivery -> Siap kirim;
// pickup -> Siap diambil"), bukan tawarkan aksi yang salah ke staff.
function transisiValid(status: string, fulfillmentMethod: string): string[] {
  switch (status) {
    case 'paid':
    case 'created':
      return ['processing']
    case 'processing':
      return fulfillmentMethod === 'pickup'
        ? ['ready_for_pickup']
        : ['out_for_delivery']
    case 'ready_for_pickup':
    case 'out_for_delivery':
      return ['delivered']
    default:
      return []
  }
}

function DetailPesananPage() {
  const { id } = Route.useParams()
  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery(orderDetailQueryOptions(id))
  const { data: payment } = useQuery(orderPaymentQueryOptions(id))
  const changeStatus = useChangeOrderStatusMutation()
  const updateShipping = useUpdateShippingMutation()
  const refundMutation = useRefundMutation()

  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [statusNote, setStatusNote] = useState('')
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelNote, setCancelNote] = useState('')

  const [shippingDialogOpen, setShippingDialogOpen] = useState(false)
  const [courier, setCourier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [refundAmount, setRefundAmount] = useState<number | ''>('')
  const [refundReason, setRefundReason] = useState('')

  if (isLoading) return <PageSkeleton />
  if (isError || !order) {
    return (
      <div className="space-y-6">
        <PageHeader judul="Detail Pesanan" />
        <ErrorState
          error={new Error('Gagal memuat pesanan')}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const nextStatuses = transisiValid(order.status, order.fulfillmentMethod)
  const isOrderDone = ['delivered', 'cancelled'].includes(order.status)
  // Backend tidak expose riwayat refund per payment (tabel `refunds`
  // terpisah, tidak pernah di-join ke GET /payments/order/:orderId) —
  // jadi "sisa yang bisa direfund" tidak bisa dihitung akurat kalau sudah
  // pernah direfund sebagian. Selalu tawarkan nominal penuh, staff yang
  // menyesuaikan manual kalau tahu sudah ada refund sebelumnya.
  const bisaRefund =
    payment &&
    (payment.status === 'paid' || payment.status === 'partially_refunded')

  function handleStatusChange(status: string) {
    setConfirmAction(status)
    setStatusNote('')
  }

  function confirmStatus() {
    if (!confirmAction) return
    changeStatus.mutate(
      {
        id,
        status: confirmAction,
        note: statusNote || undefined,
      },
      {
        onSuccess: () => setConfirmAction(null),
      },
    )
  }

  function handleCancel() {
    changeStatus.mutate(
      {
        id,
        status: 'cancelled',
        note: cancelNote || undefined,
      },
      {
        onSuccess: () => {
          setCancelDialogOpen(false)
          setCancelNote('')
        },
      },
    )
  }

  function handleShipping() {
    if (!courier.trim() || !trackingNumber.trim()) return
    updateShipping.mutate(
      { id, courier: courier.trim(), trackingNumber: trackingNumber.trim() },
      {
        onSuccess: () => {
          setShippingDialogOpen(false)
          setCourier('')
          setTrackingNumber('')
        },
      },
    )
  }

  function handleRefund() {
    if (refundAmount === '' || refundAmount <= 0 || !refundReason.trim()) return
    refundMutation.mutate(
      {
        orderId: id,
        paymentId: payment!.id,
        amount: refundAmount,
        reason: refundReason.trim(),
      },
      {
        onSuccess: () => {
          setRefundDialogOpen(false)
          setRefundAmount('')
          setRefundReason('')
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        judul={`Pesanan ${order.orderNumber}`}
        aksi={
          !isOrderDone && (
            <Button
              variant="outline"
              className="text-bahaya border-bahaya/30"
              onClick={() => setCancelDialogOpen(true)}
            >
              Batalkan
            </Button>
          )
        }
      />

      {/* Info header */}
      <div className="flex flex-wrap gap-4 rounded-lg border p-4 text-sm">
        <div>
          <span className="text-muted-foreground">Status:</span>{' '}
          <StatusBadge jenis="order" status={order.status} />
        </div>
        <div>
          <span className="text-muted-foreground">Pembayaran:</span>{' '}
          {order.codAmount !== null ? (
            <span className="inline-flex items-center gap-1 font-medium text-peringatan">
              <BanknoteIcon className="inline size-3.5" />
              COD ({formatRupiah(order.codAmount)})
            </span>
          ) : order.paymentType === 'prepaid' ? (
            'Bayar di muka'
          ) : (
            'Invoice'
          )}
        </div>
        <div>
          <span className="text-muted-foreground">Total:</span>{' '}
          {formatRupiah(order.total)}
        </div>
        <div>
          <span className="text-muted-foreground">Dibuat:</span>{' '}
          {formatTanggal(order.createdAt)}
        </div>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Item</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.name}
                    {(item.grind || item.weightGrams) && (
                      <p className="text-xs font-normal text-muted-foreground">
                        {[
                          item.grind,
                          item.weightGrams && `${item.weightGrams}g`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatRupiah(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatRupiah(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment */}
      {payment && (
        <Card>
          <CardHeader>
            <CardTitle>Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kode</span>
              <span className="font-mono text-xs">{payment.paymentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Metode</span>
              <span>{payment.method ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah</span>
              <span>{formatRupiah(payment.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge jenis="payment" status={payment.status} />
            </div>

            {bisaRefund && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefundAmount('')
                  setRefundReason('')
                  setRefundDialogOpen(true)
                }}
              >
                Refund
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alamat / pickup */}
      {order.deliveryAddress && (
        <Card>
          <CardHeader>
            <CardTitle>Alamat Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">
              {order.deliveryAddress.recipientName} —{' '}
              {order.deliveryAddress.phone}
            </p>
            <p className="text-muted-foreground">
              {order.deliveryAddress.line1}
              {order.deliveryAddress.line2 && (
                <>, {order.deliveryAddress.line2}</>
              )}
            </p>
            <p className="text-muted-foreground">
              {order.deliveryAddress.district}, {order.deliveryAddress.regency},{' '}
              {order.deliveryAddress.province}{' '}
              {order.deliveryAddress.postalCode}
            </p>
          </CardContent>
        </Card>
      )}

      {order.pickupCode && (
        <Card>
          <CardHeader>
            <CardTitle>Pickup</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              <span className="text-muted-foreground">Kode pickup:</span>{' '}
              <span className="font-mono">{order.pickupCode}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {order.courierName && (
        <Card>
          <CardHeader>
            <CardTitle>Kurir Eksternal</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Kurir:</span>{' '}
              {order.courierName}
            </p>
            <p>
              <span className="text-muted-foreground">No. Resi:</span>{' '}
              <span className="font-mono">{order.trackingNumber}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status action panel */}
      {nextStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aksi</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <Button key={s} onClick={() => handleStatusChange(s)}>
                {s === 'processing' && 'Proses'}
                {s === 'out_for_delivery' && 'Siap Kirim'}
                {s === 'ready_for_pickup' && 'Siap Diambil'}
                {s === 'delivered' && 'Selesai'}
              </Button>
            ))}
            {order.status === 'processing' && (
              <Button
                variant="outline"
                onClick={() => setShippingDialogOpen(true)}
              >
                Kirim via Kurir Eksternal
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm action dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(o) => {
          if (!o) setConfirmAction(null)
        }}
        judul={
          confirmAction === 'processing'
            ? 'Proses pesanan ini?'
            : confirmAction === 'out_for_delivery'
              ? 'Tandai siap dikirim?'
              : confirmAction === 'ready_for_pickup'
                ? 'Tandai siap diambil?'
                : confirmAction === 'delivered'
                  ? 'Tandai selesai?'
                  : 'Konfirmasi'
        }
        deskripsi={
          <div className="space-y-2">
            <p>Status akan berubah dan tidak bisa dikembalikan.</p>
            <Textarea
              placeholder="Catatan (opsional)"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
            />
          </div>
        }
        labelKonfirmasi="Ya, lanjutkan"
        labelLoading="Memproses…"
        destruktif={false}
        loading={changeStatus.isPending}
        onConfirm={confirmStatus}
      />

      {/* Cancel dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        judul="Batalkan pesanan ini?"
        deskripsi={
          <div className="space-y-2">
            <p>
              Stok akan dikembalikan otomatis. Tindakan ini tidak bisa
              dibatalkan.
            </p>
            <Textarea
              placeholder="Alasan pembatalan (opsional)"
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
            />
          </div>
        }
        labelKonfirmasi="Batalkan Pesanan"
        labelLoading="Membatalkan…"
        loading={changeStatus.isPending}
        onConfirm={handleCancel}
      />

      {/* Shipping dialog */}
      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informasi Pengiriman Eksternal</DialogTitle>
            <DialogDescription>
              Masukkan nama kurir dan nomor resi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="courier">Nama Kurir</Label>
              <Input
                id="courier"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                placeholder="JNE / SiCepat / dll"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resi">Nomor Resi</Label>
              <Input
                id="resi"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="JP000123456"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShippingDialogOpen(false)}
            >
              Batal
            </Button>
            <LoadingButton
              loading={updateShipping.isPending}
              loadingText="Menyimpan…"
              onClick={handleShipping}
              disabled={!courier.trim() || !trackingNumber.trim()}
            >
              Simpan & Tandai Dikirim
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund</DialogTitle>
            <DialogDescription>
              Refund akan dikembalikan ke pelanggan. Jumlah maksimal ={' '}
              {formatRupiah(payment?.amount ?? 0)} (sistem tidak melacak refund
              sebagian sebelumnya — pastikan nominal sudah benar).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="refundAmount">Jumlah Refund</Label>
              <InputRupiah
                id="refundAmount"
                value={refundAmount}
                onChange={setRefundAmount}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refundReason">Alasan</Label>
              <Textarea
                id="refundReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Minimal 10 karakter…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
            >
              Batal
            </Button>
            <LoadingButton
              loading={refundMutation.isPending}
              loadingText="Memproses refund…"
              onClick={handleRefund}
              disabled={
                refundAmount === '' ||
                refundAmount <= 0 ||
                refundAmount > (payment?.amount ?? 0) ||
                !refundReason.trim() ||
                refundReason.trim().length < 10
              }
            >
              Refund
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
