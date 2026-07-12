import { useEffect } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { setSessionExpiredHandler } from '../../lib/session-events'

/**
 * Dipasang sekali di __root.tsx. Mendengarkan event "sesi berakhir" dari
 * interceptor 401 (lib/api/client.ts) — hanya terpicu kalau user SEBELUMNYA
 * pernah berhasil autentikasi (bukan kunjungan pertama yang wajar 401).
 */
export function SessionWatcher() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear()
      if (pathname !== '/login') {
        toast.error('Sesi berakhir, silakan login lagi', { duration: 6000 })
      }
      void navigate({ to: '/login' })
    })
    return () => setSessionExpiredHandler(() => {})
  }, [navigate, queryClient, pathname])

  return null
}
