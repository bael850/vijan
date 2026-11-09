import * as THREE from "three";
import { clamp, smoothstep } from "./math";

// Keadaan cuaca bersama. Langit, efek angin, hujan, dan petir membaca dari sini, jadi semuanya selalu serasi.
// Ubah angka dasar di sini, jangan di komponen.
export const weather = {
  cover: 0.42, // tutupan awan 0 (cerah) .. 1 (mendung penuh); bergeser pelan dengan sendirinya
  dark: 0, // 0 normal .. 1 badai: langit dan awan menggelap
  rain: 0, // 0 .. 1 (dipakai efek hujan, belum dipasang)
  storm: 0, // 0 .. 1 (dipakai petir, belum dipasang)
  wind: new THREE.Vector2(0.55, 0.2), // arah dan kekuatan angin (x, z); diubah di tempat, jadi boleh disimpan sebagai referensi
  windDir: new THREE.Vector2(0.94, 0.34), // arah angin saja (panjang 1)
  gust: 0, // 0 tenang .. 1 hembusan kuat; datang dan pergi sendiri
};

export const WEATHER = {
  coverBase: 0.42,
  coverSwing: 0.2, // seberapa jauh tutupan awan bergeser naik-turun
  coverMin: 0.12,
  coverMax: 0.85,
  windAngle: Math.atan2(0.2, 0.55), // arah angin rata-rata (rad): ke timur, sedikit ke selatan
  windSpeed: Math.hypot(0.55, 0.2), // kekuatan angin rata-rata
  windTurn: 0.35, // seberapa jauh arah angin berayun (rad)
  gustSpeed: 1, // pengali kecepatan hembusan datang dan pergi (1 = bawaan)
};

// Dipanggil tiap frame dari langit. t = detik jam 3D.
export function tickWeather(t: number) {
  weather.cover = clamp(
    WEATHER.coverBase +
      WEATHER.coverSwing * 0.65 * Math.sin(t * 0.017) +
      WEATHER.coverSwing * 0.35 * Math.sin(t * 0.043 + 1.3),
    WEATHER.coverMin,
    WEATHER.coverMax,
  );

  // angin: arah berayun pelan, hembusan kecil datang dan pergi, sesekali ada hembusan besar
  const w = t * WEATHER.gustSpeed;
  const ang =
    WEATHER.windAngle +
    WEATHER.windTurn * Math.sin(t * 0.021) +
    WEATHER.windTurn * 0.4 * Math.sin(t * 0.057 + 1);
  const small =
    0.5 + 0.5 * (0.6 * Math.sin(w * 0.31) + 0.4 * Math.sin(w * 0.83 + 2));
  const surge = smoothstep(0.55, 1, 0.5 + 0.5 * Math.sin(w * 0.047));
  weather.gust = clamp(small * 0.7 + surge * 0.6, 0, 1);
  const speed = WEATHER.windSpeed * (0.75 + 0.6 * weather.gust);
  weather.windDir.set(Math.cos(ang), Math.sin(ang));
  weather.wind.set(weather.windDir.x * speed, weather.windDir.y * speed);
}
