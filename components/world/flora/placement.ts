import { COTTAGES, FIELDS, MILL, TAVERN } from "../config/village";
import { HOUSE, START, WATER_Y, WORLD } from "../config/world";
import { PIER } from "../lake/pierLayout";
import { FLORA, type TreeDef } from "../config/flora";
import { routeDist } from "../core/route";
import {
  castleDist,
  groundHeight,
  lakeDist,
  padDist,
} from "../terrain/heightmap";

// Titik yang sudah ditanami. r = jarak minimal ke pohon keras lain; soft = rumput (tidak menghalangi pohon).
export type Occupied = { x: number; z: number; r?: number; soft?: boolean };

export type Spot = {
  x: number;
  z: number;
  y: number; // tinggi pangkal batang (sudah ditanam sedikit ke tanah)
  h: number; // tinggi pohon (m)
  w: number; // pengali lebar
  yaw: number;
  tx: number; // miring sangat kecil, rad
  tz: number;
  tint: [number, number, number];
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Apakah titik ini boleh ditanami? (bukan jalur, kastil, air, rumah, bangunan desa, ladang)
function allowed(x: number, z: number, def: TreeDef) {
  const A = { ...FLORA.avoid, ...def.clear };
  const bm = def.clear?.building ?? 7;
  const x0 = WORLD.centerX - WORLD.width / 2 + 60;
  const x1 = WORLD.centerX + WORLD.width / 2 - 60;
  const z0 = WORLD.centerZ - WORLD.length / 2 + 60;
  const z1 = WORLD.centerZ + WORLD.length / 2 - 60;
  if (x < x0 || x > x1 || z < z0 || z > z1) return false;
  if (routeDist(x, z) < A.route) return false;
  if (castleDist(x, z) < A.castle) return false;
  if (lakeDist(x, z) < A.lakeDist) return false;
  if (padDist(x, z) < 8) return false; // dataran naga
  if (groundHeight(x, z) < WATER_Y + 0.12) return false; // jangan di air atau tepat di garis air
  if (x > PIER.x0 - 8 && x < PIER.x1 + 8 && Math.abs(z - PIER.z) < 9)
    return false;
  if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < A.house) return false;
  if (Math.hypot(x - START.x, z - START.z) < A.start) return false;
  for (const c of COTTAGES)
    if (Math.hypot(x - c.x, z - c.z) < Math.max(c.w, c.d) / 2 + bm)
      return false;
  if (
    Math.abs(x - TAVERN.x) < TAVERN.w / 2 + bm + 1 &&
    Math.abs(z - TAVERN.z) < TAVERN.d / 2 + bm + 1
  )
    return false;
  if (Math.hypot(x - MILL.x, z - MILL.z) < 7 + bm) return false;
  for (const f of FIELDS)
    if (
      Math.abs(x - f.x) < f.w / 2 + bm / 2 &&
      Math.abs(z - f.z) < f.d / 2 + bm / 2
    )
      return false;
  return true;
}

// Letakkan pohon satu jenis. occupied dipakai bersama antar jenis supaya tidak saling menumpuk.
export function scatter(
  def: TreeDef,
  baseRadius: number,
  quality: keyof typeof FLORA.density,
  occupied: Occupied[],
): Spot[] {
  const r = rng(def.seed);
  const dens = FLORA.density[quality];
  const out: Spot[] = [];
  const wsum = def.tints.reduce((s, t) => s + t.w, 0);
  const sp = def.clear?.spacing ?? FLORA.avoid.spacing;
  const sp2 = sp * sp;

  const cl = def.clump;
  for (const c of def.clusters) {
    const want = Math.round(c.n * dens);
    let got = 0;
    // Pusat rumpun dipilih dulu, tidak bergantung kualitas, jadi rumpun yang sama di semua kualitas.
    const clumps: { x: number; z: number; rad: number; tall: number }[] = [];
    if (cl) {
      const k = Math.max(3, Math.round(c.n / cl.per));
      for (let i = 0; i < k; i++) {
        let cx = c.x;
        let cz = c.z;
        for (let t = 0; t < 20; t++) {
          const a = r() * Math.PI * 2;
          const d = c.r * Math.sqrt(r());
          cx = c.x + Math.cos(a) * d;
          cz = c.z + Math.sin(a) * d;
          if (allowed(cx, cz, def)) break;
        }
        clumps.push({
          x: cx,
          z: cz,
          rad: cl.size[0] + (cl.size[1] - cl.size[0]) * r(),
          tall: Math.pow(r(), cl.tallBias ?? 1), // 0 = rendah, 1 = tinggi; satu rumpun cenderung seragam
        });
      }
    }
    for (let tries = 0; tries < c.n * (cl ? 24 : 12) && got < want; tries++) {
      const a = r() * Math.PI * 2;
      const d = c.r * Math.sqrt(r());
      // acak rumpun hanya diambil untuk jenis yang memakai rumpun (urutan acak pohon tidak berubah)
      const ck = cl ? r() : 0;
      const ca = cl ? r() * Math.PI * 2 : 0;
      const cd = cl ? r() : 0;
      const cs = cl ? r() : 1;
      let x = c.x + Math.cos(a) * d;
      let z = c.z + Math.sin(a) * d;
      let tall = -1; // -1 = tidak dalam rumpun
      if (cl && cs >= cl.stray) {
        const k = clumps[Math.floor(ck * clumps.length)];
        const dd = k.rad * cd; // makin rapat ke pusat rumpun
        x = k.x + Math.cos(ca) * dd;
        z = k.z + Math.sin(ca) * dd;
        tall = k.tall;
      }
      // acak tetap diambil dulu, supaya jumlah pohon beda kualitas tetap pohon yang sama
      const hk = r();
      const wk = r();
      const yaw = r() * Math.PI * 2;
      const tx = (r() - 0.5) * 0.04;
      const tz = (r() - 0.5) * 0.04;
      let pick = r() * wsum;
      let tint = def.tints[0].rgb;
      for (const t of def.tints) {
        if ((pick -= t.w) <= 0) {
          tint = t.rgb;
          break;
        }
      }
      if (!allowed(x, z, def)) continue;
      // Rumput hanya menjaga jarak sendiri. Pohon mengabaikan rumput, dan memakai jarak yang lebih besar
      // dari dua pihak (elm besar menjauhkan maple, begitu juga sebaliknya, apa pun urutan pemuatannya).
      const blocked = occupied.some((o) => {
        const d2 = (o.x - x) ** 2 + (o.z - z) ** 2;
        if (def.soft) return d2 < sp2;
        if (o.soft) return false;
        const s = Math.max(sp, o.r ?? sp);
        return d2 < s * s;
      });
      if (blocked) continue;

      // Dalam rumpun: tinggi mengikuti rumpunnya, dengan sedikit variasi per tebaran.
      const t =
        tall >= 0
          ? Math.min(1, Math.max(0, tall + (hk - 0.5) * 0.35))
          : Math.pow(hk, 1.3);
      const h = def.height[0] + (def.height[1] - def.height[0]) * t;
      // Tebaran tinggi dibuat lebih ramping (lebar model ikut tinggi), supaya tidak jadi bantalan raksasa.
      const w =
        (def.width[0] + (def.width[1] - def.width[0]) * wk) *
        (tall >= 0 ? 1 - 0.4 * t : 1);
      // Mengakar: ambil tanah paling rendah di sekeliling batang, lalu tanam sedikit lebih dalam.
      // Di lereng, sisi atas batang terkubur dan sisi bawahnya tetap menyentuh tanah.
      const rad = (def.rootRadius ?? baseRadius * 1.1) * h * w;
      let low = groundHeight(x, z);
      for (let k = 0; k < 8; k++) {
        const q = (k / 8) * Math.PI * 2;
        low = Math.min(
          low,
          groundHeight(x + Math.cos(q) * rad, z + Math.sin(q) * rad),
        );
      }
      out.push({ x, z, y: low - def.sink, h, w, yaw, tx, tz, tint });
      occupied.push({ x, z, r: sp, soft: def.soft });
      got++;
    }
  }
  return out;
}
