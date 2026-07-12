import { Skeleton } from '../ui/skeleton'

/** Skeleton baris tabel — dipakai di DALAM <tbody> area tabel saat load pertama. */
export function TableSkeleton({ kolom = 4, baris = 5 }: { kolom?: number; baris?: number }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Memuat data">
      {Array.from({ length: baris }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: kolom }).map((__, j) => (
            <Skeleton key={j} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Skeleton halaman utuh — menyerupai layout final (judul + kartu + blok konten). */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6" role="status" aria-label="Memuat halaman">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  )
}
