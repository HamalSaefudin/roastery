import { describe, expect, it } from 'vitest'
import { formatRupiah, formatTanggal, formatTanggalSaja } from './format'

// Intl id-ID memakai non-breaking space (U+00A0) setelah "Rp" — normalisasi utk assert
function n(s: string): string {
  return s.replace(/\u00A0/g, ' ')
}

describe('formatRupiah', () => {
  it('format integer rupiah dengan pemisah ribuan', () => {
    expect(n(formatRupiah(185000))).toBe('Rp 185.000')
  })
  it('nol tetap valid', () => {
    expect(n(formatRupiah(0))).toBe('Rp 0')
  })
  it('nilai besar', () => {
    expect(n(formatRupiah(2450000))).toBe('Rp 2.450.000')
  })
})

describe('formatTanggal', () => {
  it('format ISO string ke tanggal+jam id-ID', () => {
    const hasil = formatTanggal('2026-07-12T07:32:00.000Z')
    expect(hasil).toContain('2026')
    expect(hasil).toContain('Jul')
  })
  it('tanggal invalid -> strip', () => {
    expect(formatTanggal('bukan-tanggal')).toBe('—')
  })
})

describe('formatTanggalSaja', () => {
  it('tanpa jam', () => {
    const hasil = formatTanggalSaja('2026-07-12T07:32:00.000Z')
    expect(hasil).not.toMatch(/\d{2}[.:]\d{2}/)
    expect(hasil).toContain('2026')
  })
})
