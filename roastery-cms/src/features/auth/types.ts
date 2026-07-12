/**
 * Types response auth — LOKAL, bukan hasil generate.
 *
 * Catatan penting: Swagger backend saat ini TIDAK mendeklarasikan bentuk
 * response (controller tidak pakai `@ApiResponse({ type })`), jadi
 * `schema.d.ts` hasil generate cuma `content?: never` untuk semua response
 * body — request body (DTO) tetap ter-generate benar. Selama itu belum
 * dibenahi di backend, response di-type manual di sini mengikuti
 * docs/01. Authentication/api-contract.md (sumber kebenaran).
 */
export type UserRole = 'retail' | 'wholesale' | 'staff' | 'admin' | 'driver'
export type UserStatus = 'active' | 'pending' | 'suspended'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  status: UserStatus
}

export interface MeResponse {
  user: AuthUser
}

/** Role yang boleh masuk CMS — lihat konvensi §9. */
export const ROLE_CMS: ReadonlyArray<UserRole> = ['staff', 'admin']
