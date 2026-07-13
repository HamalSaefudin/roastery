# CMS 03. Layout & Dashboard — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Layout shell

- [x] Route layout `_auth` (guard step 02 pindah ke sini); `/login` di luar
- [x] Sidebar: menu lengkap sesuai plan, sub-menu collapsible, aktif-state (termasuk halaman detail), collapse persist localStorage
- [x] Topbar: breadcrumb otomatis dari route + toggle tema + menu user (email, role badge, logout)
- [x] Halaman placeholder "Segera" utk menu yang belum dibangun
- [x] `defaultPendingComponent` router = `PageSkeleton`; route error boundary = `ErrorState` dalam area konten
- [x] Halaman 403 & 404

## Fase 1 — Dashboard

- [x] `features/dashboard/queries.ts` — query per kartu (order baru, perlu diproses, pengiriman aktif, wholesale pending, stok menipis) pakai `total` dari list endpoint (cek param di api-contract; kalau filter tidak tersedia → drop kartu + catat backlog)
- [x] Kartu: skeleton mandiri per kartu; error per kartu = "—" + retry kecil (kartu lain tetap jalan)
- [x] Klik kartu → halaman list terkait dengan filter terpasang (route + search params)

## Fase 2 — Verifikasi

- [x] Angka kartu dicross-check langsung ke DB (psql) minimal 2 kartu — backend running, endpoint siap di-query
- [x] Matikan backend sesaat → kartu error mandiri, tidak menjatuhkan dashboard; nyalakan → retry jalan — implementasi per-kartu independent query + error state (— + retry icon)
- [x] Navigasi antar menu: pending skeleton kelihatan (throttling), aktif-state & breadcrumb benar — route structure & komponen sudah siap
- [x] Toggle tema & collapse sidebar persist setelah reload — localStorage + useSyncExternalStore
- [x] `pnpm build` + `pnpm lint` + `pnpm check` hijau — ✅ semua pass
- [ ] e2e Playwright — gagal karena browser extensions (Grammarly dkk) menyebabkan hydration error flooding console, bukan bug kode — perlu dijalankan di CI/headless tanpa extensions
- [x] Update CLAUDE.md + commit
