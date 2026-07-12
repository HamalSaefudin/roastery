import type { ReactNode } from 'react'

interface PageHeaderProps {
  judul: string
  deskripsi?: string
  /** Slot breadcrumb (diisi otomatis oleh layout di step 03) */
  breadcrumb?: ReactNode
  /** Aksi kanan, mis. tombol "+ Tambah Produk" */
  aksi?: ReactNode
}

export function PageHeader({
  judul,
  deskripsi,
  breadcrumb,
  aksi,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        {breadcrumb}
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {judul}
        </h1>
        {deskripsi && (
          <p className="text-sm text-muted-foreground">{deskripsi}</p>
        )}
      </div>
      {aksi && <div className="flex shrink-0 items-center gap-2">{aksi}</div>}
    </div>
  )
}
