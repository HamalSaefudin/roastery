import { InboxIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  ikon?: ReactNode
  judul: string
  deskripsi?: string
  /** CTA, mis. tombol "+ Tambah Produk" */
  aksi?: ReactNode
}

/** Tampilan data kosong (konvensi §5) — selalu kasih tahu user KENAPA kosong + apa yang bisa dilakukan. */
export function EmptyState({ ikon, judul, deskripsi, aksi }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="text-muted-foreground">{ikon ?? <InboxIcon className="size-10" />}</div>
      <p className="font-heading text-lg font-semibold">{judul}</p>
      {deskripsi && <p className="max-w-sm text-sm text-muted-foreground">{deskripsi}</p>}
      {aksi && <div className="mt-3">{aksi}</div>}
    </div>
  )
}
