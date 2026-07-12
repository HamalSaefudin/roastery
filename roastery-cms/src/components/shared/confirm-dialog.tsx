import { Loader2Icon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Button } from '../ui/button'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Judul spesifik, sebut objeknya: 'Hapus brand "Rocket"?' — bukan generik */
  judul: string
  /** Konsekuensi aksi, mis. "Produk akan hilang dari storefront." */
  deskripsi: ReactNode
  /** Label tombol konfirmasi, default "Hapus" */
  labelKonfirmasi?: string
  /** Label saat pending, default "Memproses…" */
  labelLoading?: string
  /** true → tombol konfirmasi merah (destruktif); false → primer */
  destruktif?: boolean
  /** Pending state mutation — dialog terkunci + spinner */
  loading: boolean
  onConfirm: () => void
}

/** Dialog konfirmasi aksi destruktif/penting (konvensi §5 — WAJIB sebelum hapus/batal). */
export function ConfirmDialog({
  open,
  onOpenChange,
  judul,
  deskripsi,
  labelKonfirmasi = 'Hapus',
  labelLoading = 'Memproses…',
  destruktif = true,
  loading,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{judul}</AlertDialogTitle>
          <AlertDialogDescription>{deskripsi}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
          <Button
            variant={destruktif ? 'destructive' : 'default'}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading && <Loader2Icon className="size-4 animate-spin" />}
            {loading ? labelLoading : labelKonfirmasi}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
