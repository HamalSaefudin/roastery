import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCartIcon,
  ClipboardListIcon,
  TruckIcon,
  Building2Icon,
  AlertTriangleIcon,
} from 'lucide-react'
import { DashboardCard } from '#/components/shared/dashboard-card'
import { PageHeader } from '#/components/shared/page-header'
import {
  orderBaruQueryOptions,
  perluDiprosesQueryOptions,
  pengirimanAktifQueryOptions,
  wholesalePendingQueryOptions,
  stokMenipisQueryOptions,
} from '#/features/dashboard/queries'

export const Route = createFileRoute('/_auth/')({
  component: DashboardPage,
})

function DashboardPage() {
  const orderBaru = useQuery(orderBaruQueryOptions())
  const perluDiproses = useQuery(perluDiprosesQueryOptions())
  const pengirimanAktif = useQuery(pengirimanAktifQueryOptions())
  const wholesalePending = useQuery(wholesalePendingQueryOptions())
  const stokMenipis = useQuery(stokMenipisQueryOptions())

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Dashboard"
        deskripsi="Ringkasan operasional hari ini"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardCard
          judul="Order Baru"
          ikon={ShoppingCartIcon}
          href="/pesanan"
          search={{ status: 'created,paid' }}
          queryResult={orderBaru}
        />
        <DashboardCard
          judul="Perlu Diproses"
          ikon={ClipboardListIcon}
          href="/pesanan"
          search={{ status: 'processing' }}
          queryResult={perluDiproses}
        />
        <DashboardCard
          judul="Pengiriman Aktif"
          ikon={TruckIcon}
          href="/pengiriman"
          queryResult={pengirimanAktif}
        />
        <DashboardCard
          judul="Wholesale Pending"
          ikon={Building2Icon}
          href="/pelanggan"
          queryResult={wholesalePending}
        />
        <DashboardCard
          judul="Stok Menipis"
          ikon={AlertTriangleIcon}
          href="/stok"
          queryResult={stokMenipis}
        />
      </div>
    </div>
  )
}
