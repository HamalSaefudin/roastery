import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  api,
  resetAutentikasi,
  tandaiAutentikasiSukses,
} from '../../lib/api/client'
import type { AuthUser, MeResponse } from './types'

export const AUTH_QK = {
  me: ['auth', 'me'] as const,
}

/**
 * Bentuk error dari backend (lihat lib/api/client.ts#getErrorMessage).
 * Swagger belum mendeklarasikan response 4xx (lihat features/auth/types.ts),
 * jadi openapi-fetch mengetik `error` sebagai `never` — di-cast manual di
 * sini supaya pesan asli backend (mis. "Akun disuspend") tidak hilang jadi
 * pesan generik.
 */
interface ErrorBodyMentah {
  statusCode?: number
  message?: string | Array<string>
  error?: string
}

async function fetchMe(): Promise<AuthUser> {
  const { data, error, response } = await api.GET('/api/auth/me')
  if (!response.ok) {
    throw (
      (error as ErrorBodyMentah | undefined) ?? {
        statusCode: response.status,
        message: 'Gagal memuat sesi',
      }
    )
  }
  const body = data as unknown as MeResponse
  tandaiAutentikasiSukses()
  return body.user
}

export function meQueryOptions() {
  return queryOptions({
    queryKey: AUTH_QK.me,
    queryFn: fetchMe,
    // sesi tidak berubah tiap detik — hindari refetch berlebihan, tapi
    // tetap refetch saat window difokus (login/logout di tab lain kekejar)
    staleTime: 60_000,
    retry: false,
  })
}

interface LoginInput {
  email: string
  password: string
}

async function login(input: LoginInput): Promise<AuthUser> {
  const { data, error, response } = await api.POST('/api/auth/login', {
    body: input,
  })
  if (!response.ok) {
    throw (
      (error as ErrorBodyMentah | undefined) ?? {
        statusCode: response.status,
        message: 'Gagal masuk',
      }
    )
  }
  const body = data as unknown as MeResponse
  tandaiAutentikasiSukses()
  return body.user
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QK.me, user)
    },
  })
}

async function logout(): Promise<void> {
  // logout dianggap sukses lokal apa pun jawaban server HTTP-nya (konvensi
  // plan.md CMS 02 §Logout — sesi lokal dianggap habis pokoknya). Network
  // benar-benar mati (server down) otomatis throw dari fetch itu sendiri
  // dan propagate ke onError mutation.
  await api.POST('/api/auth/logout')
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      resetAutentikasi()
      queryClient.clear()
    },
  })
}
