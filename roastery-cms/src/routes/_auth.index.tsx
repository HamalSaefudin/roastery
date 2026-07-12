import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Button } from '../components/ui/button'
import { LoadingButton } from '../components/shared/loading-button'
import { meQueryOptions, useLogoutMutation } from '../features/auth/queries'
import { toastError, toastSukses } from '../lib/toast'

// Placeholder dashboard — layout beneran (sidebar/topbar) dibangun step 03
export const Route = createFileRoute('/_auth/')({
  component: DashboardPlaceholder,
})

function DashboardPlaceholder() {
  const { data: user } = useSuspenseQuery(meQueryOptions())
  const logoutMutation = useLogoutMutation()
  const navigate = Route.useNavigate()

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync()
      toastSukses('Berhasil keluar')
    } catch (err) {
      // sesi lokal tetap dianggap habis meski network gagal — paksa ke
      // /login juga, tapi kasih tahu ada masalah (konvensi plan.md §Logout)
      toastError(err)
    } finally {
      await navigate({ to: '/login' })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div>
        <p className="font-heading text-2xl font-bold">Halo, {user.email}</p>
        <p className="text-sm text-muted-foreground">
          Role: {user.role} — dashboard & sidebar sungguhan menyusul step 03.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <a href="/dev/kitchen-sink">Kitchen sink</a>
        </Button>
        <LoadingButton
          variant="destructive"
          loading={logoutMutation.isPending}
          loadingText="Keluar…"
          onClick={handleLogout}
        >
          Logout
        </LoadingButton>
      </div>
    </div>
  )
}
