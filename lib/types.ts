export type PostType =
  | "cerpen"
  | "cerbung"
  | "kukulutus"
  | "potret"
  | "sajak"
  | "rekomendasi";

export type PostStatus = "draft" | "published";

export interface Post {
  judul: string;
  slug: string;
  tipe: PostType;
  ringkasan: string;
  isi: string; // Markdown
  status: PostStatus;
  tanggal: string; // format: "2026-09-15"
  series?: string;
  urutan?: number;
}

export interface FotoKage {
  judul: string;
  slug: string;
  gambar: string; // path/URL ke file gambar
  cerita: string; // ruang bercerita di samping/bawah foto, Markdown
  status: PostStatus;
  tanggal: string;
}
