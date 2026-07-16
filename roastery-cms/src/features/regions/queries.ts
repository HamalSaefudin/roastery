import { queryOptions } from '@tanstack/react-query'
import { api } from '#/lib/api/client.ts'

export interface RegionSearchResult {
  code: string
  name: string
  level: 'province' | 'regency' | 'district' | 'village'
}

export function regionSearchQueryOptions(
  q: string,
  level: RegionSearchResult['level'],
) {
  return queryOptions({
    queryKey: ['regions', 'search', q, level],
    queryFn: async () => {
      if (!q.trim()) return []
      const { data, response } = await api.GET('/api/regions/search', {
        params: { query: { q, level } },
      })
      if (!response.ok) throw new Error('Gagal mencari wilayah')
      return (data as unknown as { data: RegionSearchResult[] }).data
    },
    enabled: q.trim().length >= 2,
    staleTime: 60_000,
  })
}
