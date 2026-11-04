import { MAX_PHOTOS, MAX_WRITINGS } from "../../config/content";
import { H, INNER } from "../houseLayout";

// Letak isi rumah. Murni hitungan, tanpa React dan tanpa three.js.

export type ContentItem = {
  id: string;
  label: string; // jenis: cerpen, sajak, foto, ...
  title: string;
  date: string;
  href: string;
  image?: string; // foto: path atau URL gambar
};

// Pemutar piringan hitam: di dinding depan, di bawah jendela kiri.
export const RECORD = { x: -6.8, z: -124.75 };

// ── meja kerja (lantai atas, dinding belakang) ────────────────
export type DeskSlot = { x: number; y: number; z: number; yaw: number };

export const DESK_TOP_Y = H.floor2Y + 0.78;

function hashStr(t: string) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++)
    h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

// Dua baris di meja, tiga benda per baris. Baris depan (dekat kamera) diisi dulu.
export function deskSlots(items: ContentItem[]): DeskSlot[] {
  const cols = [-7.3, -6.7, -6.1];
  const rows = [INNER.zBack + 0.66, INNER.zBack + 0.31];
  return items.slice(0, MAX_WRITINGS).map((it, i) => ({
    x: cols[i % 3],
    y: DESK_TOP_Y,
    z: rows[Math.floor(i / 3)],
    yaw: (hashStr(it.id) - 0.5) * 0.5,
  }));
}

export type WritingKind = "buku" | "kertas";
const KINDS: Record<string, WritingKind> = {
  cerbung: "buku",
  rekomendasi: "buku",
};
export const writingKind = (label: string): WritingKind =>
  KINDS[label] ?? "kertas";

const COVERS = [
  "#8e2a2a",
  "#27437a",
  "#4a6b4a",
  "#6b3a5e",
  "#a8573a",
  "#7a6a4a",
];
export const coverOf = (id: string) =>
  COVERS[Math.floor(hashStr(id) * COVERS.length) % COVERS.length];

// ── dinding foto (lantai atas, dinding kiri) ──────────────────
export type PhotoSlot = { x: number; y: number; z: number; ry: number };
export const PHOTO_MAX = { w: 1.15, h: 0.8 };

// Dua baris, tiga kolom. Menghadap +x (ke dalam ruangan).
export function photoSlots(n: number): PhotoSlot[] {
  const zs = [-133.3, -135.2, -137.1];
  const ys = [H.floor2Y + 1.85, H.floor2Y + 0.95];
  return Array.from({ length: Math.min(n, MAX_PHOTOS) }, (_, i) => ({
    x: INNER.x0 + 0.05,
    y: ys[Math.floor(i / 3)],
    z: zs[i % 3],
    ry: Math.PI / 2,
  }));
}
