# CMS 05. Stok — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Queries

- [ ] `features/inventory/queries.ts` (bean-stock, units, movements)

## Fase 1 — Stok biji

- [ ] Tabel per varian (SKU mono, qty, reserved read-only + tooltip, available, badge menipis) + filter lowStock
- [ ] Dialog penyesuaian stok: alasan wajib + preview "50 → 65 (+15)"; sukses toast + baris ter-update; 400/409 kebaca
- [ ] Link "lihat riwayat varian ini" → halaman riwayat terfilter

## Fase 2 — Unit equipment

- [ ] Tabel unit (serial mono, StatusBadge) + filter status/produk
- [ ] Input unit baru (produk mesin/grinder + serial) — 409 duplikat serial tampil
- [ ] Tandai defective (ConfirmDialog + loading + toast)

## Fase 3 — Riwayat pergerakan

- [ ] Tabel movements read-only: perubahan +/− berwarna, alasan, link ref order; filter varian/unit/alasan

## Fase 4 — Verifikasi

- [ ] Penyesuaian stok tercermin di riwayat + angka DB (psql cross-check)
- [ ] Reserve dari order (via curl checkout) terlihat di kolom reserved setelah refetch
- [ ] Loading/sukses/error/empty semua halaman terbukti (throttling + matikan backend + DB kosong)
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
