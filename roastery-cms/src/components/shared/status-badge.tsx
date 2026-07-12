import { cn } from '../../lib/utils'

/**
 * Satu sumber mapping SEMUA enum status backend → warna semantic + label
 * (konvensi §6-7: status enum selalu lewat StatusBadge, jangan teks mentah).
 * Nilai enum diambil dari schema backend — jangan mengarang status baru di FE.
 */

type Variant = 'sukses' | 'peringatan' | 'bahaya' | 'info' | 'netral' | 'primer'

const VARIANT_CLASS: Record<Variant, string> = {
  sukses: 'bg-sukses-bg text-sukses',
  peringatan: 'bg-peringatan-bg text-peringatan',
  bahaya: 'bg-bahaya-bg text-bahaya',
  info: 'bg-info-bg text-info',
  netral: 'bg-netral-bg text-netral',
  primer: 'bg-primary text-primary-foreground',
}

interface StatusInfo {
  label: string
  variant: Variant
}

const MAPPING = {
  order: {
    created: { label: 'Baru', variant: 'netral' },
    paid: { label: 'Dibayar', variant: 'info' },
    processing: { label: 'Diproses', variant: 'peringatan' },
    out_for_delivery: { label: 'Dikirim', variant: 'info' },
    ready_for_pickup: { label: 'Siap diambil', variant: 'peringatan' },
    delivered: { label: 'Selesai', variant: 'sukses' },
    cancelled: { label: 'Dibatalkan', variant: 'bahaya' },
  },
  payment: {
    pending: { label: 'Menunggu bayar', variant: 'peringatan' },
    paid: { label: 'Lunas', variant: 'sukses' },
    failed: { label: 'Gagal', variant: 'bahaya' },
    refunded: { label: 'Refund penuh', variant: 'netral' },
    partially_refunded: { label: 'Refund sebagian', variant: 'peringatan' },
  },
  invoice: {
    issued: { label: 'Terbit', variant: 'info' },
    paid: { label: 'Lunas', variant: 'sukses' },
    overdue: { label: 'Jatuh tempo', variant: 'bahaya' },
    cancelled: { label: 'Dibatalkan', variant: 'netral' },
  },
  delivery: {
    pending: { label: 'Belum di-assign', variant: 'peringatan' },
    assigned: { label: 'Ditugaskan', variant: 'info' },
    picked_up: { label: 'Diambil driver', variant: 'info' },
    en_route: { label: 'Dalam perjalanan', variant: 'info' },
    delivered: { label: 'Terkirim', variant: 'sukses' },
    failed: { label: 'Gagal', variant: 'bahaya' },
  },
  settlement: {
    pending: { label: 'Menunggu konfirmasi', variant: 'peringatan' },
    confirmed: { label: 'Dikonfirmasi', variant: 'sukses' },
  },
  unit: {
    in_stock: { label: 'Tersedia', variant: 'sukses' },
    reserved: { label: 'Direservasi', variant: 'peringatan' },
    sold: { label: 'Terjual', variant: 'netral' },
    defective: { label: 'Rusak', variant: 'bahaya' },
  },
  wholesale: {
    pending: { label: 'Menunggu review', variant: 'peringatan' },
    approved: { label: 'Disetujui', variant: 'sukses' },
    rejected: { label: 'Ditolak', variant: 'bahaya' },
  },
  repair: {
    open: { label: 'Baru', variant: 'netral' },
    diagnosing: { label: 'Diagnosa', variant: 'info' },
    in_progress: { label: 'Dikerjakan', variant: 'peringatan' },
    waiting_parts: { label: 'Tunggu part', variant: 'peringatan' },
    completed: { label: 'Selesai', variant: 'sukses' },
    cancelled: { label: 'Dibatalkan', variant: 'bahaya' },
  },
  content: {
    draft: { label: 'Draft', variant: 'netral' },
    published: { label: 'Terbit', variant: 'sukses' },
  },
  user: {
    active: { label: 'Aktif', variant: 'sukses' },
    pending: { label: 'Pending', variant: 'peringatan' },
    suspended: { label: 'Ditangguhkan', variant: 'bahaya' },
  },
  customerType: {
    retail: { label: 'Retail', variant: 'netral' },
    wholesale: { label: 'Wholesale', variant: 'primer' },
  },
  paymentType: {
    prepaid: { label: 'Bayar di muka', variant: 'netral' },
    invoice: { label: 'Invoice', variant: 'info' },
  },
  fulfillment: {
    delivery: { label: 'Diantar', variant: 'netral' },
    pickup: { label: 'Pickup', variant: 'info' },
  },
  shipping: {
    internal: { label: 'Driver sendiri', variant: 'netral' },
    external: { label: 'Kurir eksternal', variant: 'info' },
  },
  movement: {
    purchase: { label: 'Pembelian', variant: 'sukses' },
    sale: { label: 'Penjualan', variant: 'info' },
    adjustment: { label: 'Penyesuaian', variant: 'peringatan' },
    return: { label: 'Retur', variant: 'netral' },
    reserve: { label: 'Reservasi', variant: 'peringatan' },
    release: { label: 'Rilis reservasi', variant: 'netral' },
  },
} satisfies Record<string, Record<string, StatusInfo>>

type Mapping = typeof MAPPING
export type StatusJenis = keyof Mapping

interface StatusBadgeProps<TJenis extends StatusJenis> {
  jenis: TJenis
  status: keyof Mapping[TJenis] | (string & {})
  className?: string
}

export function StatusBadge<TJenis extends StatusJenis>({
  jenis,
  status,
  className,
}: StatusBadgeProps<J>) {
  const info = (MAPPING[jenis] as Record<string, StatusInfo>)[status as string] ?? {
    // Status tidak dikenal (enum backend nambah tapi FE belum update) —
    // tampilkan mentah sebagai netral, jangan crash
    label: String(status),
    variant: 'netral' as const,
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        VARIANT_CLASS[info.variant],
        className,
      )}
    >
      {info.label}
    </span>
  )
}
