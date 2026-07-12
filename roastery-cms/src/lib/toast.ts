import { toast } from 'sonner'
import { getErrorMessage } from './api/client'

/** Toast sukses standar (konvensi §5): ±4 detik, kanan-bawah. */
export function toastSukses(pesan: string) {
  toast.success(pesan, { duration: 4000 })
}

/** Toast error standar: ±6 detik, pesan backend tampil apa adanya. */
export function toastError(err: unknown) {
  toast.error(getErrorMessage(err), { duration: 6000 })
}
