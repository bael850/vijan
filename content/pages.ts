// Teks halaman sistem: 404, error, cek email.
export const notFound = {
  title: "Halaman ini belum ada, atau sudah dipindah.",
  body: "Coba cek lagi link-nya, atau kembali ke beranda.",
  back: "← Kembali ke Beranda",
} as const;

export const errorPage = {
  eyebrow: "Ada yang salah",
  title: "Halaman ini lagi nggak bisa dimuat",
  body: "Kemungkinan sumber datanya (Google Sheets/database) lagi bermasalah sebentar. Coba muat ulang beberapa saat lagi.",
  retry: "Coba lagi",
} as const;

export const cekEmail = {
  title: "Cek email kamu",
  body: "Kami sudah kirim link masuk ke email kamu. Buka email itu dan klik link-nya untuk lanjut berkomentar. Link berlaku 24 jam.",
} as const;
