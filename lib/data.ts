import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import fs from "fs";
import { Post, FotoKage, PostType, PostStatus } from "./types";

// ─────────────────────────────────────────────────────────────
// Konfigurasi
// ─────────────────────────────────────────────────────────────

const SPREADSHEET_ID = "1bn1KAxvgvB37_l9k6Odbi32YLf-ztagrokhWEWPR59Y";
const KEY_FILE = "./service-account.json";

// Ubah angka ini kalau mau data lebih/kurang real-time (detik).
const REVALIDATE_SECONDS = 60;

// ─────────────────────────────────────────────────────────────
// Auth — support 2 mode:
// 1. Lokal (Laragon/dev): baca file service-account.json di root project
// 2. Production (Vercel): baca dari env var GOOGLE_SERVICE_ACCOUNT_KEY
//    (isinya string JSON penuh dari service-account.json)
// ─────────────────────────────────────────────────────────────

function getAuth() {
  const scopes = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    return new google.auth.GoogleAuth({ credentials, scopes });
  }

  if (fs.existsSync(KEY_FILE)) {
    return new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes });
  }

  throw new Error(
    "Kredensial Google Sheets tidak ditemukan. " +
      "Set env var GOOGLE_SERVICE_ACCOUNT_KEY, atau taruh service-account.json di root project.",
  );
}

async function fetchRange(range: string): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  return (res.data.values as string[][]) ?? [];
}

// ─────────────────────────────────────────────────────────────
// Mapping baris sheet → tipe data (lib/types.ts)
// ─────────────────────────────────────────────────────────────

// Tab "Tulisan" kolom: judul, slug, tipe, ringkasan, isi, status, tanggal, series, urutan,
// kategori, cover, cover_belakang  (3 kolom terakhir khusus rekomendasi, boleh kosong)
// "abc" / "" / spasi -> undefined, bukan NaN (NaN merusak urutan sort).
function parseUrutan(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// Sort tanggal sebelumnya bandingin string mentah ("a.tanggal < b.tanggal"),
// yang cuma bener kalau semua baris di Sheets formatnya konsisten YYYY-MM-DD.
// Sekali aja ada baris ketik manual pakai format lain (mis. 09-16-2026),
// urutan "terbaru dulu" bisa kacau tanpa ketahuan. Parse ke timestamp dulu
// biar aman dari format tanggal apa pun yang bisa dibaca `Date`.
function tanggalTs(tanggal: string): number {
  const t = new Date(tanggal).getTime();
  return Number.isFinite(t) ? t : 0; // tanggal kosong/rusak -> dianggap paling lama
}

function rowToPost(row: string[]): Post | null {
  const [
    judul,
    slug,
    tipe,
    ringkasan,
    isi,
    status,
    tanggal,
    series,
    urutan,
    kategori,
    cover,
    coverBelakang,
  ] = row;

  if (!judul || !slug) return null; // skip baris kosong

  return {
    judul,
    slug,
    tipe: tipe as PostType,
    ringkasan: ringkasan ?? "",
    isi: isi ?? "",
    status: (status as PostStatus) ?? "draft",
    tanggal: tanggal ?? "",
    series: series || undefined,
    urutan: parseUrutan(urutan),
    kategori: kategori?.trim().toLowerCase() || undefined,
    cover: cover?.trim() || undefined,
    coverBelakang: coverBelakang?.trim() || undefined,
  };
}

// Tab "Foto" kolom: judul, slug, gambar, cerita, status, tanggal
function rowToFoto(row: string[]): FotoKage | null {
  const [judul, slug, gambar, cerita, status, tanggal] = row;

  if (!judul || !slug) return null;

  return {
    judul,
    slug,
    gambar: gambar ?? "",
    cerita: cerita ?? "",
    status: (status as PostStatus) ?? "draft",
    tanggal: tanggal ?? "",
  };
}

// ─────────────────────────────────────────────────────────────
// Fetch + cache (di-cache per REVALIDATE_SECONDS, jadi gak nembak
// Google Sheets API di tiap request)
// ─────────────────────────────────────────────────────────────

const fetchAllPostsRaw = unstable_cache(
  async (): Promise<Post[]> => {
    // Skip baris 1 (header) → mulai dari A2
    const rows = await fetchRange("Tulisan!A2:L");
    return rows.map(rowToPost).filter((p): p is Post => p !== null);
  },
  ["sheets-posts"],
  { revalidate: REVALIDATE_SECONDS },
);

const fetchAllFotoRaw = unstable_cache(
  async (): Promise<FotoKage[]> => {
    const rows = await fetchRange("Foto!A2:F");
    return rows.map(rowToFoto).filter((f): f is FotoKage => f !== null);
  },
  ["sheets-foto"],
  { revalidate: REVALIDATE_SECONDS },
);

// ─────────────────────────────────────────────────────────────
// Public API — signature SAMA PERSIS seperti versi JSON dummy,
// jadi komponen/halaman yang manggil fungsi ini tidak perlu diubah.
// ─────────────────────────────────────────────────────────────

export async function getAllPosts(): Promise<Post[]> {
  const posts = await fetchAllPostsRaw();
  return posts
    .filter((p) => p.status === "published")
    .sort((a, b) => tanggalTs(b.tanggal) - tanggalTs(a.tanggal));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const posts = await getAllPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export async function getPostsBySeries(series: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts
    .filter((p) => p.series === series)
    .sort(
      (a, b) =>
        (a.urutan ?? 9999) - (b.urutan ?? 9999) ||
        a.tanggal.localeCompare(b.tanggal),
    );
}

export async function getAllFoto(): Promise<FotoKage[]> {
  const foto = await fetchAllFotoRaw();
  return foto
    .filter((f) => f.status === "published")
    .sort((a, b) => tanggalTs(b.tanggal) - tanggalTs(a.tanggal));
}

export async function getFotoBySlug(slug: string): Promise<FotoKage | null> {
  const foto = await getAllFoto();
  return foto.find((f) => f.slug === slug) ?? null;
}
