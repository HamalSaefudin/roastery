import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/harga-promo')({
  component: () => <Outlet />,
})
