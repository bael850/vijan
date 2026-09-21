// Rekomendasi buku. Masih hardcoded — nanti kalau formatnya udah pasti,
// pindahin ke lib/data.ts (query dari database/sheet) kayak Post/FotoKage,
// dan tambahin data film di file yang sama.
export interface Book {
  slug: string;
  judul: string;
  penulis: string;
  penerbit: string;
  cover: string; // URL eksternal — domainnya harus ada di next.config.ts
  blurb: string;
}

export const BOOKS: Book[] = [
  {
    slug: "ayah",
    judul: "Ayah",
    penulis: "Andrea Hirata",
    penerbit: "Bentang Pustaka, 2015",
    cover:
      "https://api.seekquel.app/storage/covers/editions/01/01kr84s536cxy2k905psst0rza.jpg",
    blurb:
      "Novel kesembilan Andrea Hirata, tentang Sabari — seorang ayah yang cintanya kepada anaknya, Zorro, begitu besar sampai mengguncang jiwanya sendiri. Ditulis Andrea selama enam tahun, dengan gaya tutur yang nggak linear kayak biasanya.",
  },
  {
    slug: "orang-orang-biasa",
    judul: "Orang-Orang Biasa",
    penulis: "Andrea Hirata",
    penerbit: "Bentang Pustaka, 2019",
    cover: "https://cdn.gramedia.com/uploads/items/Orang_Biasa_Baru.JPG",
    blurb:
      "Novel pertama Andrea Hirata yang masuk genre kejahatan — tentang sepuluh orang biasa-biasa saja di sebuah kota yang penduduknya begitu jujur, sampai nyaris lupa cara berbuat jahat, lalu nekat merampok demi alasan yang sangat manusiawi.",
  },
];
