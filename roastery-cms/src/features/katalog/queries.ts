import {
  queryOptions,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { api, getErrorMessage } from '#/lib/api/client.ts'
import { toast } from 'sonner'
import type {
  Brand,
  Origin,
  Category,
  ProdukListItem,
  PaginatedResponse,
  ProdukDetail,
  ProductFilterParams,
} from './types.ts'

export const KATALOG_QK = {
  brands: ['katalog', 'brands'] as const,
  origins: ['katalog', 'origins'] as const,
  categories: ['katalog', 'categories'] as const,
  products: (params: ProductFilterParams) =>
    ['katalog', 'products', params] as const,
  productDetail: (slug: string) => ['katalog', 'product', slug] as const,
}

async function fetchBrands(): Promise<Brand[]> {
  const { data, response } = await api.GET('/api/catalog/brands')
  if (!response.ok) throw new Error('Gagal memuat brand')
  const body = data as unknown as PaginatedResponse<Brand> | undefined
  return body?.data ?? []
}

async function fetchOrigins(): Promise<Origin[]> {
  const { data, response } = await api.GET('/api/catalog/origins')
  if (!response.ok) throw new Error('Gagal memuat origin')
  const body = data as unknown as PaginatedResponse<Origin> | undefined
  return body?.data ?? []
}

async function fetchCategories(): Promise<Category[]> {
  const { data, response } = await api.GET('/api/catalog/categories')
  if (!response.ok) throw new Error('Gagal memuat kategori')
  const body = data as unknown as PaginatedResponse<Category> | undefined
  return body?.data ?? []
}

export function brandsQueryOptions() {
  return queryOptions({
    queryKey: KATALOG_QK.brands,
    queryFn: fetchBrands,
    staleTime: 60_000,
  })
}

export function originsQueryOptions() {
  return queryOptions({
    queryKey: KATALOG_QK.origins,
    queryFn: fetchOrigins,
    staleTime: 60_000,
  })
}

export function categoriesQueryOptions() {
  return queryOptions({
    queryKey: KATALOG_QK.categories,
    queryFn: fetchCategories,
    staleTime: 60_000,
  })
}

export function produkListQueryOptions(params: ProductFilterParams) {
  return queryOptions({
    queryKey: KATALOG_QK.products(params),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/catalog/products', {
        params: { query: params as Record<string, string> },
      })
      if (!response.ok) throw new Error('Gagal memuat produk')
      return data as unknown as PaginatedResponse<ProdukListItem>
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function produkDetailQueryOptions(slug: string) {
  return queryOptions({
    queryKey: KATALOG_QK.productDetail(slug),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/catalog/products/{slug}', {
        params: { path: { slug } },
      })
      if (!response.ok) throw new Error('Gagal memuat detail produk')
      return data as unknown as ProdukDetail
    },
  })
}

export function useCreateBrandMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      logoUrl?: string
      description?: string
    }) => {
      const { response } = await api.POST('/api/catalog/brands', { body })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.brands })
      toast.success('Brand berhasil dibuat')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useUpdateBrandMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      name?: string
      logoUrl?: string
      description?: string
    }) => {
      const { response } = await api.PATCH('/api/catalog/brands/{id}', {
        params: { path: { id } },
        body,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.brands })
      toast.success('Brand berhasil diperbarui')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useDeleteBrandMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { response } = await api.DELETE('/api/catalog/brands/{id}', {
        params: { path: { id } },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.brands })
      toast.success('Brand berhasil dihapus')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useCreateOriginMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      country: string
      region?: string
      description?: string
    }) => {
      const { response } = await api.POST('/api/catalog/origins', { body })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.origins })
      toast.success('Origin berhasil dibuat')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useUpdateOriginMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      name?: string
      country?: string
      region?: string
      description?: string
    }) => {
      const { response } = await api.PATCH('/api/catalog/origins/{id}', {
        params: { path: { id } },
        body,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.origins })
      toast.success('Origin berhasil diperbarui')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useDeleteOriginMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { response } = await api.DELETE('/api/catalog/origins/{id}', {
        params: { path: { id } },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.origins })
      toast.success('Origin berhasil dihapus')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; parentId?: string }) => {
      const { response } = await api.POST('/api/catalog/categories', { body })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.categories })
      toast.success('Kategori berhasil dibuat')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useUpdateCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      name?: string
      parentId?: string | null
    }) => {
      const patchBody: Record<string, unknown> = { ...body }
      if ('parentId' in patchBody) patchBody.parentId = body.parentId ?? null
      const { response } = await api.PATCH('/api/catalog/categories/{id}', {
        params: { path: { id } } as never,
        body: patchBody as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.categories })
      toast.success('Kategori berhasil diperbarui')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useDeleteCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { response } = await api.DELETE('/api/catalog/categories/{id}', {
        params: { path: { id } },
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KATALOG_QK.categories })
      toast.success('Kategori berhasil dihapus')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useCreateProductMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { response } = await api.POST('/api/catalog/products', {
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
      return response
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['katalog', 'products'] })
      toast.success('Produk berhasil dibuat')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useUpdateProductMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: { id: string } & Record<string, unknown>) => {
      const { response } = await api.PATCH('/api/catalog/products/{id}', {
        params: { path: { id } } as never,
        body: body as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
      return response
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['katalog', 'products'] })
      toast.success('Produk berhasil diperbarui')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useToggleProductStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { response } = await api.PATCH('/api/catalog/products/{id}', {
        params: { path: { id } } as never,
        body: { isActive } as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['katalog', 'products'] })
      toast.success('Status produk diperbarui')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useCreateVariantMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      weightGrams,
      grind,
    }: {
      productId: string
      weightGrams: number
      grind: string
    }) => {
      const { response } = await api.POST('/api/catalog/beans/{id}/variants', {
        params: { path: { id: productId } } as never,
        body: { weightGrams, grind } as never,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(getErrorMessage(err))
      }
      return response
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['katalog', 'product'] })
      toast.success(`Varian ${vars.weightGrams}g berhasil ditambahkan`)
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
