# Vijan — An Ordinary People

Situs tulisan & foto dengan beranda 3D (Next.js 16, React Three Fiber).

## Stack
- Next.js App Router, Tailwind 4, framer-motion, react-three-fiber
- Konten: Google Sheets (tab `Tulisan` dan `Foto`), di-cache 60 detik
- Komentar: Auth.js (login link email via Resend) + Postgres

## Setup
1. `npm install`
2. Salin `.env.example` ke `.env.local` dan isi semuanya.
3. Jalankan `db/schema.sql` di database Postgres. Kalau database sudah ada,
   jalankan `db/migrations/*.sql` yang belum pernah dijalankan.
4. `npm run dev`

## Kolom Google Sheets
- **Tulisan** `A:L`: judul, slug, tipe, ringkasan, isi, status, tanggal, series, urutan, kategori, cover, cover_belakang
- **Foto** `A:G`: judul, slug, gambar, cerita, status, tanggal, alt (teks alternatif, opsional)

`tipe` yang valid: cerpen, cerbung, kukulutus, potret, sajak, rekomendasi.
`status`: `published` atau `draft`. Baris tidak valid dilewati dan dicatat di log server.

## Moderasi komentar
Login dengan email `AUTHOR_EMAIL`, lalu tombol "Sembunyikan" muncul di tiap komentar.
Komentar hanya disembunyikan (`hidden = true`), tidak dihapus dari database.

## Endpoint
`/sitemap.xml`, `/robots.txt`, `/feed.xml` (RSS).

## Teks & angka
Semua teks ada di `content/`, semua angka dunia 3D di `components/world/config/`.
