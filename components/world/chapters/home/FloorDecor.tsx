"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ROOMS } from "../../config/home";
import { INTERIOR } from "./homeGeometry";

// Penghias lantai: (1) bahan lantai beda tiap ruang (batu, keramik, kayu dengan warna sendiri) sebagai lapisan tipis
// di atas lantai lama; (2) pola di atas karpet datar yang sudah ada (bingkai, kisi belah ketupat, medali tengah).
// Tambahan murni: tidak mengubah lantai, karpet, atau perabot. Lantai lama tetap ada di bawahnya.
// Dipasang di dalam grup rumah, di samping <WallDecor />. Lantai atas hanya Kamar dan Ruang Baca, karena
// Ruang Album dan Galeri berbatasan dengan lubang tangga dan ruang tamu terbuka.

const FL = INTERIOR.floorY;
const U = INTERIOR.floor2Y;

// pembuat angka acak yang tetap sama tiap kali (tidak berubah antar muat ulang)
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, dl: number) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, dl);
  return "#" + c.getHexString();
}

function finish(c: HTMLCanvasElement, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// ── tekstur dasar ──────────────────────────────────────────
const WOOD_SPAN = 1.6; // satu kanvas kayu = 1,6 m (8 papan @ 20 cm)
function woodCanvas(base: string, seed: number) {
  const n = 512;
  const rows = 8;
  const h = n / rows;
  const r = rng(seed);
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  for (let i = 0; i < rows; i++) {
    const y = i * h;
    // tiap papan dipotong dua dengan sambungan di tempat acak
    const joint = 80 + r() * (n - 160);
    for (const [x0, x1] of [
      [0, joint],
      [joint, n],
    ] as [number, number][]) {
      g.fillStyle = shade(base, (r() - 0.5) * 0.07);
      g.fillRect(x0, y, x1 - x0, h);
      // serat
      for (let k = 0; k < 9; k++) {
        g.strokeStyle =
          r() > 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,235,200,0.06)";
        g.lineWidth = 1;
        const yy = y + 4 + r() * (h - 8);
        g.beginPath();
        g.moveTo(x0, yy);
        g.bezierCurveTo(
          x0 + (x1 - x0) * 0.3,
          yy + (r() - 0.5) * 4,
          x0 + (x1 - x0) * 0.7,
          yy + (r() - 0.5) * 4,
          x1,
          yy + (r() - 0.5) * 2,
        );
        g.stroke();
      }
      g.fillStyle = "rgba(0,0,0,0.28)";
      g.fillRect(x0, y, 2, h);
    }
    g.fillStyle = "rgba(0,0,0,0.30)";
    g.fillRect(0, y, n, 2);
  }
  return c;
}

// ubin 2 x 2 per kanvas. colors = 4 warna ubin (kiri-atas, kanan-atas, kiri-bawah, kanan-bawah)
function tileCanvas(
  colors: string[],
  grout: string,
  seed: number,
  gloss: number,
) {
  const n = 512;
  const half = n / 2;
  const r = rng(seed);
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  g.fillStyle = grout;
  g.fillRect(0, 0, n, n);
  colors.forEach((col, i) => {
    const x = (i % 2) * half;
    const y = Math.floor(i / 2) * half;
    g.fillStyle = shade(col, (r() - 0.5) * 0.04);
    g.fillRect(x + 3, y + 3, half - 6, half - 6);
    // bintik batu
    for (let k = 0; k < 260; k++) {
      g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
      g.fillRect(x + 4 + r() * (half - 10), y + 4 + r() * (half - 10), 2, 2);
    }
    // kilap tipis di sudut atas ubin
    if (gloss > 0) {
      const gr = g.createLinearGradient(x, y, x + half, y + half);
      gr.addColorStop(0, `rgba(255,255,255,${gloss})`);
      gr.addColorStop(0.5, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(x + 3, y + 3, half - 6, half - 6);
    }
  });
  return c;
}

// ── bahan lantai per ruang ─────────────────────────────────
type Mat =
  | { kind: "wood"; base: string; seed: number }
  | {
      kind: "tile";
      colors: string[];
      grout: string;
      size: number;
      gloss: number;
      seed: number;
    };

type FloorSpec = {
  box: [number, number, number, number]; // x0, x1, z0, z1
  up?: boolean;
  mat: Mat;
};

const b = (k: keyof typeof ROOMS) =>
  ROOMS[k].box as unknown as [number, number, number, number];

const FLOORS: FloorSpec[] = [
  // Foyer: batu abu kebiruan
  {
    box: b("foyer"),
    mat: {
      kind: "tile",
      colors: ["#7b8590", "#6b7580", "#6f7984", "#7f8993"],
      grout: "#4d555d",
      size: 0.6,
      gloss: 0.05,
      seed: 11,
    },
  },
  // Lobi: batu krem hangat
  {
    box: b("lobi"),
    mat: {
      kind: "tile",
      colors: ["#d9cdb4", "#cfc2a8", "#d4c8ae", "#dcd1b9"],
      grout: "#a99c82",
      size: 0.6,
      gloss: 0.08,
      seed: 12,
    },
  },
  // Dapur: keramik catur krem dan hijau kelabu
  {
    box: b("dapur"),
    mat: {
      kind: "tile",
      colors: ["#e7dfca", "#7f988f", "#7f988f", "#e7dfca"],
      grout: "#b8b09c",
      size: 0.45,
      gloss: 0.14,
      seed: 13,
    },
  },
  // Kayu: tiap ruang warnanya sendiri
  { box: b("kerja"), mat: { kind: "wood", base: "#8b6a48", seed: 21 } },
  { box: b("perpus"), mat: { kind: "wood", base: "#4f3626", seed: 22 } },
  { box: b("tamu"), mat: { kind: "wood", base: "#b08658", seed: 23 } },
  { box: b("makan"), mat: { kind: "wood", base: "#7a5636", seed: 24 } },
  // Lantai atas
  {
    box: b("kamar"),
    up: true,
    mat: { kind: "wood", base: "#c2a37a", seed: 31 },
  },
  {
    box: b("baca"),
    up: true,
    mat: { kind: "wood", base: "#6d4c33", seed: 32 },
  },
];

// ── karpet ─────────────────────────────────────────────────
type Rug = {
  x0: number; // bagian dalam karpet (di luar bingkai datar yang sudah ada)
  x1: number;
  z0: number;
  z1: number;
  y: number; // tinggi permukaan atas karpet lama + 2 mm
  edge: string;
  mid: string;
};

const IN = 0.18; // lebar bingkai datar karpet lama
const rg = (
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
  edge: string,
  mid: string,
): Rug => ({
  x0: x0 + IN,
  x1: x1 - IN,
  z0: z0 + IN,
  z1: z1 - IN,
  y,
  edge,
  mid,
});

const RUGS: Rug[] = [
  // lantai bawah (permukaan atas karpet lama = lantai + 0,028)
  rg(-1.2, 1.2, 0.2, 3.0, FL + 0.03, "#6b3f3f", "#c9b48a"),
  rg(-9.8, -5.2, 2.6, 5.3, FL + 0.03, "#5a4632", "#b9a77a"),
  rg(-10.2, -7.0, -4.9, -2.1, FL + 0.03, "#6b3f3f", "#c9b48a"),
  rg(6.0, 10.0, -3.7, -1.3, FL + 0.03, "#5a4632", "#b9a77a"),
  rg(4.8, 9.4, 1.0, 4.2, FL + 0.03, "#6b3f3f", "#c9b48a"),
  // lantai atas
  rg(5.2, 9.2, -4.6, -0.9, U + 0.03, "#5a4632", "#b9a77a"),
  rg(-3.0, 1.4, 1.8, 5.2, U + 0.03, "#6b3f3f", "#c9b48a"),
  rg(3.2, 11.2, 0.15, 1.75, U + 0.03, "#5a4632", "#b9a77a"),
  // karpet kamar dan karpet besar Ruang Baca (dibuat langsung, tanpa bingkai 0,18)
  {
    x0: -1.1,
    x1: 1.9,
    z0: -4.1,
    z1: -1.9,
    y: U + 0.05,
    edge: "#5a4632",
    mid: "#b9a77a",
  },
  {
    x0: -3.5,
    x1: 0.5,
    z0: 1.1,
    z1: 4.1,
    y: U + 0.047,
    edge: "#6b3f3f",
    mid: "#c9b48a",
  },
];

function rugCanvas(w: number, d: number, edge: string, mid: string) {
  const cw = 256;
  const ch = Math.max(96, Math.min(512, Math.round((cw * d) / w)));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const g = c.getContext("2d")!;
  const accent = shade(edge, 0.16);
  g.fillStyle = mid;
  g.fillRect(0, 0, cw, ch);

  // kisi belah ketupat halus di medan tengah
  g.save();
  g.beginPath();
  g.rect(26, 26, cw - 52, ch - 52);
  g.clip();
  g.strokeStyle = "rgba(0,0,0,0.13)";
  g.lineWidth = 1.5;
  const step = 32;
  for (let k = -ch; k < cw + ch; k += step) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k + ch, ch);
    g.moveTo(k, ch);
    g.lineTo(k + ch, 0);
    g.stroke();
  }
  g.restore();

  // bingkai dalam: dua garis
  g.strokeStyle = edge;
  g.lineWidth = 7;
  g.strokeRect(10, 10, cw - 20, ch - 20);
  g.strokeStyle = accent;
  g.lineWidth = 2;
  g.strokeRect(21, 21, cw - 42, ch - 42);

  // medali tengah
  const cx = cw / 2;
  const cy = ch / 2;
  const r = Math.min(cw, ch) * 0.3;
  const dia = (rr: number, fill: string) => {
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(cx, cy - rr);
    g.lineTo(cx + rr * 1.25, cy);
    g.lineTo(cx, cy + rr);
    g.lineTo(cx - rr * 1.25, cy);
    g.closePath();
    g.fill();
  };
  dia(r, edge);
  dia(r * 0.72, mid);
  dia(r * 0.42, accent);
  g.fillStyle = mid;
  g.beginPath();
  g.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
  g.fill();

  // belah ketupat kecil di empat sudut
  for (const [px, py] of [
    [34, 34],
    [cw - 34, 34],
    [34, ch - 34],
    [cw - 34, ch - 34],
  ]) {
    g.fillStyle = accent;
    g.beginPath();
    g.moveTo(px, py - 8);
    g.lineTo(px + 8, py);
    g.lineTo(px, py + 8);
    g.lineTo(px - 8, py);
    g.closePath();
    g.fill();
  }
  return c;
}

export default function FloorDecor() {
  const built = useMemo(() => {
    const floors = FLOORS.map((f, i) => {
      const [x0, x1, z0, z1] = f.box;
      const w = x1 - x0;
      const d = z1 - z0;
      const m = f.mat;
      const canvas =
        m.kind === "wood"
          ? woodCanvas(m.base, m.seed)
          : tileCanvas(m.colors, m.grout, m.seed, m.gloss);
      const tex = finish(canvas);
      const span = m.kind === "wood" ? WOOD_SPAN : m.size * 2;
      tex.repeat.set(w / span, d / span);
      const y = (f.up ? U : FL) + (f.up ? 0.021 : 0.002);
      return { key: i, tex, w, d, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, y };
    });
    const rugs = RUGS.map((r, i) => {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const tex = finish(rugCanvas(w, d, r.edge, r.mid), false);
      return {
        key: i,
        tex,
        w,
        d,
        cx: (r.x0 + r.x1) / 2,
        cz: (r.z0 + r.z1) / 2,
        y: r.y,
      };
    });
    return { floors, rugs };
  }, []);

  useEffect(
    () => () => {
      built.floors.forEach((f) => f.tex.dispose());
      built.rugs.forEach((r) => r.tex.dispose());
    },
    [built],
  );

  return (
    <>
      {built.floors.map((f) => (
        <mesh
          key={`f${f.key}`}
          position={[f.cx, f.y, f.cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          userData={{ noShadow: true }}
        >
          <planeGeometry args={[f.w, f.d]} />
          <meshLambertMaterial
            map={f.tex}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}
      {built.rugs.map((r) => (
        <mesh
          key={`r${r.key}`}
          position={[r.cx, r.y, r.cz]}
          rotation={[-Math.PI / 2, 0, 0]}
          userData={{ noShadow: true }}
        >
          <planeGeometry args={[r.w, r.d]} />
          <meshLambertMaterial
            map={r.tex}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}
    </>
  );
}
