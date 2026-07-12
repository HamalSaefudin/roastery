# CMS 03. Layout & Dashboard — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Layout shell

- [ ] Route layout `_auth` (guard step 02 pindah ke sini); `/login` di luar
- [ ] Sidebar: menu lengkap sesuai plan, sub-menu collapsible, aktif-state (termasuk halaman detail), collapse persist localStorage
- [ ] Topbar: breadcrumb otomatis dari route + toggle tema + menu user (email, role badge, logout)
- [ ] Halaman placeholder "Segera" utk menu yang belum dibangun
- [ ] `defaultPendingComponent` router = `PageSkeleton`; route error boundary = `ErrorState` dalam area konten
- [ ] Halaman 403 & 404

## Fase 1 — Dashboard

- [ ] `features/dashboard/queries.ts` — query per kartu (order baru, perlu diproses, pengiriman aktif, wholesale pending, stok menipis) pakai `total` dari list endpoint (cek param di api-contract; kalau filter tidak tersedia → drop kartu + catat backlog)
- [ ] Kartu: skeleton mandiri per kartu; error per kartu = "—" + retry kecil (kartu lain tetap jalan)
- [ ] Klik kartu → halaman list terkait dengan filter terpasang (route + search params)

## Fase 2 — Verifikasi

- [ ] Angka kartu dicross-check langsung ke DB (psql) minimal 2 kartu
- [ ] Matikan backend sesaat → kartu error mandiri, tidak menjatuhkan dashboard; nyalakan → retry jalan
- [ ] Navigasi antar menu: pending skeleton kelihatan (throttling), aktif-state & breadcrumb benar
- [ ] Toggle tema & collapse sidebar persist setelah reload
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
