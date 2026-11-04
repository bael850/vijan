// Letak dermaga dan perahu. Angka saja, tanpa gambar. Mengikuti letak danau di config/world.ts.
import { LAKE } from "../config/world";

const westShore = LAKE.x - LAKE.rx; // tepi barat danau
export const PIER = {
  x0: westShore - 12,
  x1: westShore + 10,
  z: LAKE.z + 8,
  width: 1.6,
  y: 0.5,
};
export const BOAT = { x: PIER.x1 + 6, z: PIER.z + 6, yaw: 0.35 };
