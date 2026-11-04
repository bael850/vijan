// Lingkaran rune di puncak bukit Gerbang Waktu. Ubah angka di sini, jangan di komponen.
import { START } from "./world";

export const RUNE = {
  modelUrl: "/models/vegvisir.glb",
  x: START.x,
  z: START.z,
  diameter: 7, // lebar lingkaran (m)
  modelWidth: 2.15, // lebar asli model (m), dari file glb
  lift: 0.05, // naik dari tanah (m), supaya tidak tenggelam
  glowDay: 1.5, // cahaya rune siang hari (model aslinya 10)
  glowNight: 7, // cahaya rune malam hari
  pulse: 0.25, // denyut cahaya (0 = mati)
  pulseSpeed: 0.9,
};
