/**
 * Jembatan sederhana dari api/client.ts (di luar React) ke komponen React
 * (yang punya akses ke QueryClient & router) — dipakai saat refresh-retry
 * gagal (sesi benar-benar habis). Didaftarkan oleh <SessionWatcher> di
 * __root.tsx.
 */
type Handler = () => void

let handler: Handler | null = null

export function setSessionExpiredHandler(fn: Handler) {
  handler = fn
}

export function emitSessionExpired() {
  handler?.()
}
