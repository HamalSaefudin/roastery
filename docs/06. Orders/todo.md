# 06. Orders — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [x] Pastikan `catalog`, `inventory`, `pricing` selesai
- [x] Sepakati format `order_number` (mis. `ORD-20260708-0001`) — via `nextCode()` (`ORD`, daily, width 4)

## Fase 1 — Schema & migration

- [x] `carts`, `cart_items` (CHECK XOR `variant_id`/`product_id`; `carts.customer_id` unique — satu keranjang aktif)
- [x] `orders` + enum `order_status`, `payment_type`, `fulfillment_method`, `shipping_method` (semua kolom Update Desain 2026-07-09 sekaligus: `courier_name`, `tracking_number`, `pickup_code`)
- [x] `order_items` (FK `product_id`/`variant_id` → `set null`, snapshot histori), `order_status_history`
- [x] Re-export di `src/database/schema.ts` — **digabung 1 migrasi bareng modul 07+08** (`0007_next_starhawk.sql`, 14 tabel) karena Orders↔Payments↔Delivery saling FK
- [x] `pnpm db:generate` → `pnpm db:migrate` (+ migrasi susulan `0008_ancient_satana.sql` utk fix FK `order_items`)

## Fase 2 — Scaffold file (Nest CLI)

- [x] `nest g service modules/orders --no-spec`
- [x] `nest g controller modules/orders --no-spec`
- [x] DTO add-cart-item, checkout, update-status, update-shipping
- [x] `OrdersModule` exports `OrdersService`; `forwardRef()` ke `PaymentsModule`+`DispatchModule` (circular, lihat konvensi §12)

## Fase 3 — Keranjang

- [x] `GET /orders/cart` (auto-create cart jika belum ada)
- [x] `POST /orders/cart/items` (validasi stok via inventory, qty item sama dijumlahkan)
- [x] `PATCH /orders/cart/items/:id`, `DELETE /orders/cart/items/:id`

## Fase 4 — Checkout

- [x] `POST /orders/checkout` — validasi stok, resolve harga (pricing), apply promo, hitung ongkir (delivery/zones)
- [x] Checkout: `fulfillmentMethod` delivery|pickup + `paymentMethod` online|cod (COD → langsung `processing`, hanya delivery internal)
- [x] Alur luar zona: `shipping_method=external`, ongkir flat zona fallback; `PATCH /orders/:id/shipping` (kurir + resi manual)
- [x] Alur pickup: status `ready_for_pickup` + `pickup_code` random; tandai `delivered` saat diambil
- [x] Reserve stok (inventory) di dalam **transaksi DB** (order id di-generate duluan via `randomUUID()` biar bisa dipakai reserve sebelum row `orders` di-insert)
- [x] Buat order + order_items (snapshot) + status `created`
- [x] Tulis `order_status_history`

## Fase 5 — Riwayat & admin

- [x] `GET /orders` + `GET /orders/:id` (punya sendiri)
- [x] `GET /orders/admin` (staff, filter status)
- [x] `PATCH /orders/:id/status` (transisi valid + history)

## Fase 6 — Verifikasi

- [x] Alur end-to-end: add cart → checkout → order muncul → ubah status (diuji utk online/COD/pickup/luar-zona/wholesale sekaligus, manual curl + e2e)
- [x] Stok berkurang/reserve benar; rollback jika checkout gagal
- [x] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar (`orders`)
- [x] Tulis `test/orders.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (24 test)
- [x] `pnpm test:e2e` hijau
- [x] `pnpm build` hijau & boot OK
- [x] Tandai selesai → lanjut `07. Payments`

### Fix ditemukan integrasi CMS (2026-07-13)

- [x] **Bug nyata**: `GET /orders/admin?status=created,paid` (dipakai dashboard CMS step 03 utk kartu "order baru") balikin **500 mentah** — `listAdmin`/`listMine` cast `status` ke enum tanpa validasi (`eq(orders.status, status as OrderStatus)`), padahal `status` bisa berisi list dipisah koma dari FE. Postgres nolak cast `'created,paid'` sbg nilai enum tunggal → error mentah, bukan 400 bersih.
- [x] Fix: helper `parseStatusFilter()` — split koma, validasi tiap nilai terhadap `orderStatusEnum.enumValues` (invalid → `400` bersih), `eq` utk 1 nilai / `inArray` utk banyak nilai. Dipakai di `listAdmin` DAN `listMine` (bug yang sama, ditemukan sekalian).
- [x] 2 e2e baru ditambahkan (`test/orders.e2e-spec.ts`): multi-status dipisah koma → 200 + data benar; status ngaco → 400 (bukan 500). Total 26 test, `pnpm test:e2e` 226/226 hijau (2x run stabil).
- [x] `api-contract.md` diupdate: `status` didokumentasikan boleh multi-nilai dipisah koma di `GET /orders` & `GET /orders/admin`.

### Fix ditemukan integrasi CMS step 09 (2026-07-15)

- [x] **Bug nyata**: `order.paymentType` enum-nya cuma `prepaid`/`invoice` — checkout COD (`paymentMethod: 'cod'`) TIDAK PERNAH mengubah `paymentType` jadi `'cod'` (nilai itu mustahil ada di DB, dikonfirmasi lewat enum Postgres). CMS step 08/09 sempat salah asumsi `order.paymentType === 'cod'` utk nampilin ikon tunai — kondisi itu selalu `false`, ikon COD tidak pernah muncul (ditemukan pas testing Papan Dispatch step 09, checkout order COD asli lalu cek response).
- [x] Fix: `assembleOrder()` join ke `deliveries` (by `orderId`) dan tambah field `codAmount` (null kalau bukan COD) — ini satu-satunya sinyal COD yang benar-benar ada.
- [x] 2 assertion baru ditambahkan ke test checkout online & checkout COD yang sudah ada (`test/orders.e2e-spec.ts`) — cek `codAmount: null` utk online, `codAmount === total` utk COD (dari `POST checkout` maupun `GET /orders/:id` sesudahnya). Total tetap 26 test (assertion ditambah, bukan test baru), `pnpm test:e2e` 237/237 hijau.
- [x] `api-contract.md` diupdate dengan field `codAmount` baru.

### Keputusan implementasi tambahan (tidak tertulis eksplisit di plan.md)

- [x] **Kapan `commitBeanStock`/`commitEquipmentUnits` dipanggil**: plan.md hanya sebut `reserve()` (checkout) dan `release()` (cancel), tidak menyebut kapan stok "dipermanenkan" (quantity beneran berkurang). Diputuskan: commit terjadi tepat saat `changeStatus(orderId, 'delivered')` — alasan: tabel transisi status order membuktikan `cancelled` HANYA bisa dicapai dari `created`/`paid` (sebelum `processing`), sedangkan `delivered` adalah status final — jadi tidak ada risiko commit-lalu-cancel (double bug) dengan aturan ini. `changeStatus()` juga yang jadi satu-satunya method untuk semua transisi (dipanggil controller staff, webhook Payments, status update Delivery) — konsisten dgn plan.md poin 4.
- [x] `OrdersService.getProfile()` **tidak** auto-create `customer_profiles` (beda dari `CustomersService.getOrCreateProfile()`) — customer harus sudah pernah panggil endpoint `/customers/*` (mis. `GET /customers/me`, yang auto-create) sebelum bisa pakai cart/checkout. Ini realistis krn frontend pasti panggil `GET /customers/me` saat login/app-load duluan; kalau belum, `NotFoundException('Profil customer tidak ditemukan')`.
