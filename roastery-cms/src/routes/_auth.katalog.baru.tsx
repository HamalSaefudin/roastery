import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { ProductForm } from '#/features/katalog/components/product-form.tsx'
import { useCreateProductMutation } from '#/features/katalog/queries.ts'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/katalog/baru')({
  component: NewProductPage,
})

function NewProductPage() {
  const navigate = useNavigate()
  const mutation = useCreateProductMutation()

  async function handleSubmit(data: Parameters<typeof mutation.mutate>[0]) {
    try {
      await mutation.mutateAsync(data)
      navigate({ to: '/katalog' })
    } catch {
      toast.error('Gagal membuat produk')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader judul="Tambah Produk" />
      <ProductForm isPending={mutation.isPending} onSubmit={handleSubmit} />
    </div>
  )
}
