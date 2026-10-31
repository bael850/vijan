// Teks komentar, pesan error komentar/login, email login, dan "Bagikan sebagai Story".
export const commentUi = {
  empty: "Belum ada komentar. Jadi yang pertama?",
  displayNameLabel: "Nama tampilan",
  displayNamePlaceholder: "Nama kamu",
  displayNameHint:
    "Nama ini yang tampil di komentar. Email kamu tidak ditampilkan.",
  commentLabel: "Komentar",
  commentPlaceholder: "Tulis komentar...",
  sending: "Mengirim...",
  submit: "Kirim komentar",
  sendLink: "Kirim link",
  loginPrompt: "Masuk pakai email dulu buat bisa berkomentar.",
  emailLabel: "Alamat email",
  emailPlaceholder: "email@kamu.com",
  linkSent:
    "Link masuk sudah dikirim, cek email kamu. Belum ketemu? Coba cek folder spam.",
} as const;

export const commentErrors = {
  emailInvalid: "Masukkan alamat email yang valid.",
  tooManyAttempts:
    "Terlalu banyak percobaan. Coba lagi beberapa menit lagi, atau cek email kamu — link sebelumnya masih berlaku.",
  sendLinkFailed: "Gagal mengirim link masuk. Coba lagi sebentar lagi.",
  loginRequired: "Kamu harus masuk dulu untuk berkomentar.",
  postNotFound: "Tulisan tidak ditemukan.",
  nameRequired: "Isi nama tampilan dulu (minimal 2 karakter).",
  nameTooLong: "Nama terlalu panjang (maks 40 karakter).",
  nameReserved: "Nama itu dicadangkan. Pakai nama lain ya.",
  commentEmpty: "Komentar tidak boleh kosong.",
  commentTooLong: "Komentar terlalu panjang (maks 2000 karakter).",
  saveFailed: "Gagal menyimpan komentar. Coba lagi sebentar lagi.",
} as const;

export const loginEmail = {
  subject: "Link masuk ke Vijan",
  intro: "Klik tombol di bawah untuk masuk dan mulai berkomentar di Vijan.",
  button: "Masuk sekarang",
  footnote:
    "Link ini berlaku 24 jam. Kalau kamu tidak meminta ini, abaikan saja email ini.",
} as const;

export const story = {
  open: "Bagikan sebagai Story",
  close: "Tutup",
  preparing: "Menyiapkan gambar…",
  download: "Unduh gambar",
  hint: "Tombol Instagram/WhatsApp membuka jendela bagikan bawaan HP kamu — pilih aplikasinya di sana.",
  imageFooter: "An Ordinary People · baca selengkapnya di link bio",
  shareText: (judul: string, url: string) =>
    `${judul} — baca selengkapnya: ${url}`,
  downloadedInstagram:
    "Gambar sudah diunduh. Buka Instagram → buat Story baru → unggah gambarnya.",
  downloadedWhatsapp:
    "Gambar sudah diunduh. Buka WhatsApp → Status → unggah gambarnya.",
} as const;
