import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/stok/')({
  component: () => <Navigate to="/stok/biji" replace />,
})
