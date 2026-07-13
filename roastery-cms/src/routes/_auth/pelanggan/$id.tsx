import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { ErrorState } from '#/components/shared/error-state.tsx'
import { PageSkeleton } from '#/components/shared/skeletons.tsx'
import { StatusBadge } from '#/components/shared/status-badge.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { customerDetailQueryOptions } from '#/features/customers/queries.ts'
import { formatTanggalSaja } from '#/lib/format.ts'

export const Route = createFileRoute('/_auth/pelanggan/$id')({
  component: DetailPelangganPage,
})

function DetailPelangganPage() {
  const { id } = Route.useParams()
  const {
    data: customer,
    isLoading,
    isError,
    refetch,
  } = useQuery(customerDetailQueryOptions(id))

  if (isLoading) return <PageSkeleton />
  if (isError || !customer) {
    return (
      <div className="space-y-6">
        <PageHeader judul="Detail Pelanggan" />
        <ErrorState
          error={new Error('Gagal memuat pelanggan')}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader judul={customer.fullName || 'Pelanggan'} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kode</span>
              <span className="font-mono text-xs">{customer.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telepon</span>
              <span>{customer.phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipe</span>
              <StatusBadge
                jenis="customerType"
                status={customer.customerType}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daftar</span>
              <span>{formatTanggalSaja(customer.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Riwayat order dan pengajuan wholesale akan tampil di sini.</p>
            <p className="text-xs">
              (Data dari modul Pesanan & Pelanggan — segera tersedia)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
