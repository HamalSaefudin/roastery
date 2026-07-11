# 06. Orders — TODO

Aturan: **per fase, urut**. Detail di [plan.md](./plan.md), kontrak di [api-contract.md](./api-contract.md).

---

## Fase 0 — Setup

- [ ] Pastikan `catalog`, `inventory`, `pricing` selesai
- [ ] Sepakati format `order_number` (mis. `ORD-20260708-0001`)

## Fase 1 — Schema & migration

- [ ] `carts`, `cart_items`
- [ ] `orders` + enum `order_status`, `payment_type`
- [ ] `order_items`, `order_status_history`
- [ ] Re-export di `src/database/schema.ts`
- [ ] `pnpm db:generate` → `pnpm db:migrate`

## Fase 2 — Scaffold file (Nest CLI)

- [ ] `nest g service modules/orders --no-spec`
- [ ] `nest g controller modules/orders --no-spec`
- [ ] DTO add-cart-item, checkout, update-status

## Fase 3 — Keranjang

- [ ] `GET /orders/cart` (auto-create cart jika belum ada)
- [ ] `POST /orders/cart/items` (validasi stok via inventory)
- [ ] `PATCH /orders/cart/items/:id`, `DELETE /orders/cart/items/:id`

## Fase 4 — Checkout

- [ ] `POST /orders/checkout` — validasi stok, resolve harga (pricing), apply promo, hitung ongkir (delivery/zones)
- [ ] Checkout: `fulfillmentMethod` delivery|pickup + `paymentMethod` online|cod (COD → langsung `processing`, hanya delivery internal)
- [ ] Alur luar zona: `shipping_method=external`, ongkir flat zona fallback; `PATCH /orders/:id/shipping` (kurir + resi manual)
- [ ] Alur pickup: status `ready_for_pickup` + `pickup_code` random; tandai `delivered` saat diambil
- [ ] Reserve stok (inventory) di dalam **transaksi DB**
- [ ] Buat order + order_items (snapshot) + status `created`
- [ ] Tulis `order_status_history`

## Fase 5 — Riwayat & admin

- [ ] `GET /orders` + `GET /orders/:id` (punya sendiri)
- [ ] `GET /orders/admin` (staff, filter status)
- [ ] `PATCH /orders/:id/status` (transisi valid + history)

## Fase 6 — Verifikasi

- [ ] Alur end-to-end: add cart → checkout → order muncul → ubah status
- [ ] Stok berkurang/reserve benar; rollback jika checkout gagal
- [ ] Endpoint modul ini muncul di Swagger (`/api/docs`) dengan tag yang benar
- [ ] Tulis `test/orders.e2e-spec.ts` — cakupan golden path + tiap error case di api-contract.md (lihat konvensi §18)
- [ ] `pnpm test:e2e` hijau
- [ ] `pnpm build` hijau & boot OK
- [ ] Tandai selesai → lanjut `07. Payments`
