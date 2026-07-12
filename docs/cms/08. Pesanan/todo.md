# CMS 08. Pesanan — TODO

Aturan: per fase, urut. Detail di [plan.md](./plan.md).

## Fase 0 — Queries

- [ ] `features/orders/queries.ts` + `features/payments/queries.ts` (list, detail, changeStatus, shipping, refund, invoices)

## Fase 1 — List order

- [ ] Tabel + filter (status/tipe bayar/fulfillment/tanggal) + search; default filter "butuh perhatian" (`paid`+`processing`)
- [ ] Ikon COD jelas; badge count `paid` di sidebar

## Fase 2 — Detail order

- [ ] Section item (snapshot), pembayaran (payment/invoice + refund), alamat/pickup, timeline status history
- [ ] Auto-refetch 30 detik saat tab aktif

## Fase 3 — Panel aksi status

- [ ] Render tombol HANYA transisi valid (mirror tabel transisi backend)
- [ ] Proses → siap kirim / siap diambil / form kurir+resi manual (luar zona, field wajib)
- [ ] Selesai pickup dengan pencocokan kode pickup
- [ ] Batalkan (ConfirmDialog "stok dikembalikan") — sukses toast + timeline update
- [ ] 409 race (status berubah dari luar) → toast pesan backend + data refresh otomatis

## Fase 4 — Pembayaran

- [ ] Refund: dialog InputRupiah (default sisa) + alasan → riwayat RFD- tampil; error melebihi nominal kebaca
- [ ] List invoice wholesale + "Tandai lunas" (ConfirmDialog + jumlah) + 409 sudah-lunas kebaca + badge overdue

## Fase 5 — Verifikasi

- [ ] Alur penuh: paid → proses → (3 cabang: kirim/pickup/resi) → selesai — dari browser
- [ ] Batalkan order → stok balik (cross-check psql)
- [ ] Refund parsial + penuh + error; invoice lunas + 409
- [ ] Race status via curl saat halaman terbuka → UI menangani 409 dengan benar
- [ ] Loading/sukses/error/empty semua halaman terbukti
- [ ] `pnpm build` + `pnpm lint` + `pnpm check` hijau
- [ ] Update CLAUDE.md + commit
