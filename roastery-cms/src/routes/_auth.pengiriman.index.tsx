import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '../components/shared/placeholder-page'
import { PageHeader } from '../components/shared/page-header'

export const Route = createFileRoute('/_auth/pengiriman/')({
  component: () => (
    <div className="space-y-6">
      <PageHeader judul="Papan Dispatch" />
      <PlaceholderPage judul="Papan Dispatch" />
    </div>
  ),
})
