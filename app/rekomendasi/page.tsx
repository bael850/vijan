import { redirect } from "next/navigation";

// Rekomendasi sekarang jadi salah satu rubrik di halaman Vers.
// Route lama tetap ada supaya link yang sudah kesebar (sosmed/CV) nggak mati.
export default function RekomendasiPage() {
  redirect("/vers?rubrik=rekomendasi");
}
