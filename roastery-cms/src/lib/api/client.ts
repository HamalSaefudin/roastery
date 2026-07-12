import createClient from 'openapi-fetch'
import { createServerOnlyFn } from '@tanstack/react-start'
import { emitSessionExpired } from '../session-events'
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

/**
 * SSR (TanStack Start) menjalankan `fetch` di Node — tidak ada cookie jar
 * browser sama sekali, jadi cookie `access_token` HARUS diteruskan manual
 * dari request masuk, atau `beforeLoad` yang cek sesi selalu "terlihat"
 * logout tiap full reload / navigasi langsung via URL (bug nyata, ketemu
 * saat verifikasi manual step 02: reload di dashboard mental ke /login
 * walau cookie browser valid).
 *
 * Batasan yang diterima (didokumentasikan, bukan disembunyikan): kalau
 * refresh token ke-rotate SAAT SSR (access token pas kedaluwarsa persis
 * saat reload), token baru itu tidak ikut diteruskan balik ke cookie jar
 * browser — request client-side berikutnya bisa keliru dianggap sesi
 * habis. Skenario ini sempit (butuh reload tepat di menit ke-15) dan
 * dampaknya cuma "login lagi", jadi tidak diotomasi lebih jauh sekarang.
 */
const bacaCookieHeaderServer = createServerOnlyFn(
  async (): Promise<string | undefined> => {
    const { getRequestHeader } = await import('@tanstack/react-start/server')
    return getRequestHeader('cookie')
  },
)

async function cookieHeaderSsr(): Promise<string | undefined> {
  if (!import.meta.env.SSR) return undefined
  return bacaCookieHeaderServer()
}

// --- Interceptor 401: refresh sekali -> retry sekali (konvensi cms §5/§9) ---
// /auth/login TIDAK di-intercept — 401 di situ berarti password salah,
// harus ditangani inline oleh form, bukan memicu "sesi berakhir".
const KECUALI_INTERCEPT = ['/api/auth/login', '/api/auth/register']

/**
 * true kalau sesi PERNAH berhasil (login/me 200) di runtime ini. Dipakai
 * membedakan "belum pernah login sama sekali" (kunjungan pertama ke route
 * ber-guard, wajar 401, cukup redirect diam-diam oleh beforeLoad) vs
 * "sedang login lalu sesi hilang" (WAJIB toast "sesi berakhir" — lihat
 * plan.md CMS 02 & konvensi §5). Tanpa pembeda ini toast palsu muncul
 * setiap kunjungan pertama yang belum login.
 */
let pernahAutentikasi = false
export function tandaiAutentikasiSukses() {
  pernahAutentikasi = true
}
export function resetAutentikasi() {
  pernahAutentikasi = false
}

let refreshingPromise: Promise<boolean> | null = null

async function refreshSekali(): Promise<boolean> {
  refreshingPromise ??= (async () => {
    const cookie = await cookieHeaderSsr()
    return fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: cookie ? { cookie } : undefined,
    })
      .then((r) => r.ok)
      .catch(() => false)
  })().finally(() => {
    refreshingPromise = null
  })
  return refreshingPromise
}

// Clone request DI SINI (sebelum fetch menyentuh body-nya) supaya bisa
// dikirim ulang setelah refresh sukses — Request yang sudah disturbed
// tidak bisa di-clone lagi.
const cloneUntukRetry = new WeakMap<Request, Request>()

api.use({
  async onRequest({ request }) {
    const cookie = await cookieHeaderSsr()
    if (cookie) request.headers.set('cookie', cookie)
    cloneUntukRetry.set(request, request.clone())
    return request
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) return response
    if (KECUALI_INTERCEPT.some((p) => request.url.includes(p))) return response

    const berhasilRefresh = await refreshSekali()
    if (!berhasilRefresh) {
      if (pernahAutentikasi) emitSessionExpired()
      return response
    }
    tandaiAutentikasiSukses()

    const clone = cloneUntukRetry.get(request)
    if (!clone) return response
    return fetch(clone)
  },
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
