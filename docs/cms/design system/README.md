# Design System CMS — Keputusan

**Terpilih: Dark Roast** (keputusan user, 2026-07-12) — lihat [03-dark-roast.html](03-dark-roast.html) (buka di browser, ada toggle light/dark di pojok kanan atas).

> Proses: dibuat 5 varian HTML (Kopi Klasik, Modern Minimal, Dark Roast, Terracotta & Sage, Industrial Utility) → dikerucutkan ke 2 (Dark Roast & Terracotta-Sage, masing-masing dibuatkan dual-theme) → user memilih **Dark Roast**. Varian lain dihapus, hanya file terpilih yang disimpan sebagai referensi.

## Ringkasan token

| Token | Dark (default) | Light |
| --- | --- | --- |
| `--bg` | `#141110` | `#FAF6EE` |
| `--panel` | `#1E1A18` | `#FFFFFF` |
| `--panel-2` | `#282320` | `#F1EAD9` |
| `--garis` (border) | `#383029` | `#E3D9C6` |
| `--teks` | `#EDE7E0` | `#2A2118` |
| `--teks-redup` | `#A89D90` | `#8A7C6A` |
| `--emas` (primer/aksen) | `#E8B04B` | `#A97B1C` |
| `--emas-hover` | `#C28F2C` | `#8A6414` |
| `--on-emas` | `#241C0E` | `#FFFBF2` |
| `--sukses` | `#7BC47F` | `#3E7C44` |
| `--peringatan` | `#E8B04B` | `#96700F` |
| `--bahaya` | `#E2695C` | `#B8503D` |
| `--info` | `#6FAEDB` | `#3D6F96` |

- **Font**: Space Grotesk (heading), Inter (body), JetBrains Mono (kode/angka/nomor pesanan).
- **Radius**: 10px.
- **Tema default CMS = dark**; light mode tersedia via toggle (`data-theme` di `<html>`).
- Catatan kontras: emas dituakan di light mode (`#A97B1C`) — jangan pakai `#E8B04B` sebagai warna teks di atas background terang.

## Implementasi (nanti, mulai step 01+)

Token dipetakan ke CSS variables shadcn/Tailwind di `roastery-cms/src/styles.css` (`:root` = dark default, `[data-theme="light"]` override) saat layout dashboard mulai dibangun.
