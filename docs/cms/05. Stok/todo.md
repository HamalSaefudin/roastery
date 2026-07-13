# CMS 05. Stok — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Queries

- [x] `features/inventory/queries.ts` (overview, low-stock, equipment-units) + types

## Fase 1 — Stok biji

- [x] Tabel per varian (SKU mono, qty, reserved read-only + tooltip, available + badge menipis merah) + filter lowStock via toggle
- [x] Dialog penyesuaian stok: alasan wajib + preview "50 → 65 (+15)"; sukses toast
- [x] Link "lihat riwayat varian ini" → halaman riwayat terfilter

## Fase 2 — Unit equipment

- [x] Tabel unit (serial mono, StatusBadge) + filter status
- [x] Input unit baru (serial) — 409 duplikat serial tampil via getErrorMessage
- [x] Tandai defective (ConfirmDialog + loading + toast)

## Fase 3 — Riwayat pergerakan

- [x] Tabel movements read-only: perubahan +/− berwarna, alasan, ref order

## Fase 4 — Verifikasi

- [ ] Penyesuaian stok & riwayat — butuh backend running
- [ ] Loading/sukses/error/empty — butuh backend
- [x] `pnpm build` + `pnpm lint` + `pnpm check` hijau — ✅
- [ ] Update CLAUDE.md + commit
