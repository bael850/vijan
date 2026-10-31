import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";

// Angka ikan di danau. Ubah di sini kalau terlalu ramai, terlalu terang, atau terlalu jarang melompat.
export const FISH = {
  // Ikan yang berenang pelan di bawah permukaan (tampak samar menembus air).
  count: { low: 10, medium: 18, high: 28 } as Record<GraphicsQuality, number>,
  size: [1.5, 2.8] as [number, number], // panjang ikan (m); sengaja agak besar supaya terlihat dari dermaga
  depth: [0.35, 0.9] as [number, number], // kedalaman di bawah permukaan (m)
  speed: [1.0, 2.4] as [number, number], // kecepatan renang (m/s)
  orbit: [5, 13] as [number, number], // jari-jari lintasan berputar (m)
  alpha: 0.62, // seberapa jelas ikan terlihat menembus air (0 = hilang, 1 = pekat)
  glow: 1.0, // pengali terang warna ikan

  // Ikan yang melompat keluar dari air, lalu meninggalkan riak dan percikan.
  jumpers: { low: 1, medium: 2, high: 3 } as Record<GraphicsQuality, number>,
  jumpEvery: [5, 13] as [number, number], // selang antar lompatan per ikan (detik)
  jumpTime: 1.0, // lama satu lompatan (detik)
  jumpHeight: [0.9, 1.7] as [number, number], // tinggi lompatan di atas air (m)
  jumpLength: [2.5, 4.5] as [number, number], // jarak yang ditempuh saat melompat (m)
  jumpSize: [0.9, 1.5] as [number, number], // pengali ukuran ikan melompat
  jumpRange: [18, 85] as [number, number], // jarak dari kamera tempat lompatan dipilih (m)
};
