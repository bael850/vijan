// Tipe bersama untuk isi dunia.

// Satu tulisan atau foto dari Google Sheets. Dipakai app/page.tsx dan WorldJourney.
export type ContentItem = {
  id: string;
  label: string; // jenis: cerpen, sajak, foto, ...
  title: string;
  date: string;
  href: string;
  image?: string; // foto: path atau URL gambar
};
