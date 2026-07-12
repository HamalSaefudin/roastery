import { AlertTriangleIcon, RotateCwIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { getErrorMessage } from '../../lib/api/client'

interface ErrorStateProps {
  /** Error dari query — pesannya ditampilkan via getErrorMessage */
  error?: unknown
  /** Override pesan (kalau tidak ada objek error) */
  pesan?: string
  /** Handler tombol "Coba lagi" — biasanya `refetch` dari useQuery */
  onRetry?: () => void
}

/** Tampilan error page/section-level (konvensi §5) — selalu ada jalan keluar (Coba lagi). */
export function ErrorState({ error, pesan, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <AlertTriangleIcon className="size-10 text-bahaya" />
      <p className="font-heading text-lg font-semibold">Gagal memuat data</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {pesan ?? (error ? getErrorMessage(error) : 'Terjadi kesalahan. Coba lagi.')}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          <RotateCwIcon className="size-4" />
          Coba lagi
        </Button>
      )}
    </div>
  )
}
