import createClient from 'openapi-fetch'
import type { paths } from './schema'

/**
 * Client API type-safe terhadap Swagger backend (schema.d.ts, regenerate:
 * `pnpm generate:api`). Auth pakai cookie httpOnly → WAJIB credentials include.
 *
 * Catatan path: schema di-generate dengan prefix `/api/...` lengkap,
 * jadi baseUrl TANPA `/api` (origin saja).
 */
const apiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api'
const baseUrl = apiUrl.replace(/\/api\/?$/, '')

export const api = createClient<paths>({
  baseUrl,
  credentials: 'include',
})

/** Bentuk error standar NestJS: message bisa string atau array (validasi). */
interface NestError {
  statusCode?: number
  message?: string | Array<string>
  error?: string
}

/**
 * Ambil pesan error yang bisa ditampilkan ke user.
 * Pesan dari backend sudah bahasa Indonesia — tampilkan apa adanya.
 */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as NestError
    if (Array.isArray(e.message)) return e.message.join('\n')
    if (typeof e.message === 'string' && e.message.length > 0) return e.message
    if (err instanceof Error && err.message) {
      // fetch gagal total (server mati / jaringan putus)
      if (err instanceof TypeError) {
        return 'Tidak bisa terhubung ke server. Coba lagi.'
      }
      return err.message
    }
  }
  return 'Terjadi kesalahan. Coba lagi.'
}
