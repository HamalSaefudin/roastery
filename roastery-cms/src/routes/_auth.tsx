import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { PageSkeleton } from '../components/shared/skeletons'
import { AppLayout } from '../components/shared/app-layout'
import { meQueryOptions } from '../features/auth/queries'
import { ROLE_CMS } from '../features/auth/types'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient
      .ensureQueryData(meQueryOptions())
      .catch(() => null)

    if (!user) {
      throw redirect({ to: '/login' })
    }

    if (!ROLE_CMS.includes(user.role)) {
      throw redirect({ to: '/login' })
    }

    return { user }
  },
  pendingComponent: PageSkeleton,
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
