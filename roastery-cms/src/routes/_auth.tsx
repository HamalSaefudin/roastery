import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { PageSkeleton } from '../components/shared/skeletons'
import { meQueryOptions } from '../features/auth/queries'
import { ROLE_CMS } from '../features/auth/types'

/**
 * Layout route pathless — payung SEMUA halaman ber-guard (dashboard, katalog,
 * dst. mulai step 03). Guard sesi + role di sini, satu tempat, tidak
 * diulang per halaman. Chrome visual (sidebar/topbar) menyusul step 03 —
 * untuk sekarang cukup Outlet.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient
      .ensureQueryData(meQueryOptions())
      .catch(() => null)

    if (!user) {
      throw redirect({ to: '/login' })
    }

    if (!ROLE_CMS.includes(user.role)) {
      // Sesi valid tapi role bukan staff/admin (mis. cookie retail dari
      // storefront ikut kebawa — backend cookie satu domain lintas app).
      // Tidak perlu logout paksa di sini: cukup tolak akses ke CMS.
      throw redirect({ to: '/login' })
    }

    return { user }
  },
  pendingComponent: PageSkeleton,
  component: () => <Outlet />,
})
