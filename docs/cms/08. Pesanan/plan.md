# CMS 08. Pesanan — Papan Order, Detail, Aksi Status, Pembayaran

> Halaman operasional paling sering dipakai staff. Kontrak: [docs/06. Orders](../../06.%20Orders/api-contract.md) + [07. Payments](../../07.%20Payments/api-contract.md). Feedback per [konvensi §5](../_conventions.md).

## Halaman

1. **List order** (`/pesanan`): tabel — nomor ORD- (mono), customer, total (Rupiah), tipe bayar (prepaid/COD/invoice), fulfillment (delivery/pickup/luar zona), StatusBadge, waktu. Filter: status, tipe bayar, fulfillment, tanggal. Search nomor/nama.
2. **Detail order** (`/pesanan/$id`) — halaman terpenting, section:
   - **Item**: snapshot nama/varian/qty/harga (data historis order, bukan katalog live).
   - **Pembayaran**: status payment/PAY- (atau invoice INV- utk wholesale), riwayat refund.
   - **Alamat/pickup**: alamat kirim atau kode pickup.
   - **Timeline status**: `order_status_history` vertikal (waktu + siapa).
   - **Panel aksi** (lihat bawah).
3. **Invoice wholesale** (`/pesanan/invoice`): list invoice (INV- mono, due date, StatusBadge issued/paid/overdue) + aksi "Tandai lunas" (ConfirmDialog + jumlah) — 409 sudah lunas kebaca.

## Panel aksi detail order (inti step ini)

Tombol yang tampil = **hanya transisi yang valid** dari status sekarang (mirror tabel transisi backend — jangan tampilkan semua lalu mengandalkan 409):

| Status order | Aksi tampil |
| --- | --- |
| `paid` (atau `created` COD) | "Proses (roasting/packing)" |
| `processing` | delivery dalam zona → "Siap kirim" (lanjut dispatch step 09); pickup → "Siap diambil"; luar zona → form **kurir + resi manual** (nama kurir + nomor resi wajib) |
| `ready_for_pickup` | "Selesai (sudah diambil)" — minta input kode pickup utk cocokkan |
| `created`/`paid` | "Batalkan order" — ConfirmDialog tegas: "Stok akan dikembalikan otomatis"; alasan opsional |
| lainnya | tidak ada aksi manual (dikendalikan sistem delivery/webhook) |

- Tiap aksi: LoadingButton → toast + timeline & badge langsung bertambah (invalidate). 409 transisi (race dgn webhook/driver) → toast pesan backend + data ter-refresh.
- **Refund** (staff, order prepaid paid): dialog jumlah (InputRupiah, default sisa penuh) + alasan → toast; error "melebihi nominal" kebaca. Riwayat refund tampil (RFD-).

## Keputusan UX spesifik

- List default filter "butuh perhatian" (status `paid`+`processing`) — bukan semua order; filter "Semua" tersedia.
- Badge count order `paid` di sidebar (perlu diproses).
- Detail auto-refetch tiap 30 detik saat tab aktif (status bisa berubah dari webhook/driver) — perubahan dari luar tampil tanpa reload manual.
- Kolom "tipe bayar COD" diberi ikon uang tunai yang jelas — driver menagih, staff wajib aware.

## Verifikasi kunci

Alur penuh dari UI: order paid (buat via curl) → proses → siap kirim/pickup/resi manual → (pickup) selesai dgn kode; batalkan order → cek stok balik (psql); refund parsial & penuh; invoice tandai lunas + 409 kedua kali; race: ubah status via curl saat detail terbuka → aksi UI dapat 409 kebaca + refresh; loading/sukses/error/empty terbukti.
