# CMS 10. Service Desk — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Queries

- [ ] `features/service-desk/queries.ts` (warranties, register, tickets, update)

## Fase 1 — Garansi

- [ ] List garansi (WRT- mono, badge aktif/expired dari endsAt)
- [ ] Registrasi manual: lookup serial → preview (produk + masa + tanggal akhir) → simpan
- [ ] 3 error case tampil benar: serial 404, belum sold 400, duplikat 409

## Fase 2 — Tiket servis

- [ ] List tiket (filter status, default aktif; badge klaim garansi)
- [ ] Buat tiket dari CMS (customer + serial/garansi opsional + keluhan); klaim tidak valid → alasan tampil, tiket tetap terbuat berbayar
- [ ] Detail: keluhan + info garansi + timeline repair_updates

## Fase 3 — Aksi tiket

- [ ] Transisi status hanya yang valid (pola panel aksi step 08)
- [ ] Assign teknisi (user staff) — 404 teknisi invalid kebaca
- [ ] Set biaya: disabled + tooltip kalau garansi; InputRupiah kalau berbayar; 400 backend kebaca
- [ ] Tambah catatan progres → masuk timeline

## Fase 4 — Verifikasi

- [ ] Alur penuh tiket open→completed dari browser (klaim garansi & berbayar)
- [ ] Set biaya tiket garansi tertolak dengan pesan jelas
- [ ] Loading/sukses/error/empty semua halaman terbukti
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
