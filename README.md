# Vice City Platinum Log

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/burnfire1-ops/gta6-trophy-guide-20261120/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/burnfire1-ops/gta6-trophy-guide-20261120/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Bounty: [gta6-trophy-guide-01 — GTA 6 Trophy Guide](https://make.fun/bounty/gta6-trophy-guide-01)

**Vice City Platinum Log** adalah panduan dan tracker trophy PlayStation 5 untuk GTA VI — lengkap untuk 55 trophy — yang berjalan sepenuhnya offline di browser. Daftar trophy, panduan per trophy, dan sitasi sumber dibekukan dari daftar resmi Exophase dan PSNProfiles (per 2026-11-18).

## Fitur

- **Checklist 55 trophy** — tandai trophy yang sudah didapat, progres tersimpan di browser (localStorage).
- **Filter** — cari trophy berdasarkan nama, kategori (Bronze / Silver / Gold / Platinum), atau status perolehan.
- **Spoiler setting** — sembunyikan deskripsi trophy yang mengandung spoiler sampai kamu memilih untuk melihatnya.
- **Export / import** — simpan progres sebagai file JSON dan pulihkan kapan saja.
- **Roadmap platinum** — urutan yang disarankan menuju Platinum, dari trophy awal sampai yang paling sulit.
- **Missables** — daftar trophy yang bisa terlewat dan cara mengamankannya sebelum terlambat.
- **Guide bersitasi** — setiap panduan trophy disertai sumbernya, dengan source matrix dan audit strip.

## Cara menjalankan

```bash
node serve.ts
```

Lalu buka http://localhost:8080 di browser.

Tidak perlu build step dan tidak perlu koneksi internet — semua aset sudah termasuk di repo.

## Struktur file

```
.
├── README.md            # Dokumen ini
├── LICENSE              # Lisensi
├── main.ts              # Entry point build / validasi
├── serve.ts             # Server lokal (node serve.ts → http://localhost:8080)
├── shots.json           # Definisi screenshot
├── app/                 # Aplikasi (HTML/CSS/JS + data 55 trophy)
├── screenshots/         # Screenshot final aplikasi
├── vendor/              # Aset vendor (make.fun frontend)
```
