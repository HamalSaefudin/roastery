import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon } from 'lucide-react'
import { PageHeader } from '#/components/shared/page-header.tsx'
import { PageSkeleton } from '#/components/shared/skeletons.tsx'
import { ErrorState } from '#/components/shared/error-state.tsx'
import { ProductForm } from '#/features/katalog/components/product-form.tsx'
import {
  produkDetailQueryOptions,
  useUpdateProductMutation,
} from '#/features/katalog/queries.ts'
import { toast } from 'sonner'

export const Route = createFileRoute('/_auth/katalog/$slug/edit')({
  component: EditProductPage,
  pendingComponent: PageSkeleton,
})

function EditProductPage() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery(
    produkDetailQueryOptions(slug),
  )
  const mutation = useUpdateProductMutation()

  if (isLoading) return <PageSkeleton />
  if (isError || !data?.product) {
    return <ErrorState pesan="Gagal memuat produk" onRetry={() => refetch()} />
  }

  async function handleSubmit(
    formData: {
      type: string
      name: string
      detail: Record<string, unknown>
    } & Record<string, unknown>,
  ) {
    try {
      await mutation.mutateAsync({ ...formData, id: data!.product.id })
      navigate({ to: '/katalog/$slug', params: { slug } })
    } catch {
      toast.error('Gagal menyimpan perubahan')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        judul={`Edit: ${data.product.name}`}
        breadcrumb={
          <Link
            to="/katalog/$slug"
            params={{ slug }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="mr-1 inline size-4" />
            Kembali
          </Link>
        }
      />
      <ProductForm
        initialData={data.product}
        isPending={mutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
