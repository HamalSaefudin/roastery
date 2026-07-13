import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '../components/shared/placeholder-page'
import { PageHeader } from '../components/shared/page-header'

export const Route = createFileRoute('/_auth/stok')({
  component: () => (
    <div className="space-y-6">
      <PageHeader judul="Stok" />
      <PlaceholderPage judul="Stok" />
    </div>
  ),
})
