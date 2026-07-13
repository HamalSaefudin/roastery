import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '../components/shared/placeholder-page'
import { PageHeader } from '../components/shared/page-header'

export const Route = createFileRoute('/_auth/katalog/brands')({
  component: () => (
    <div className="space-y-6">
      <PageHeader judul="Brand" />
      <PlaceholderPage judul="Brand" />
    </div>
  ),
})
