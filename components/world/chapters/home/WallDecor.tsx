"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BEDROOM, HOME, PLAN } from "../../config/home";
import { INTERIOR } from "./homeGeometry";

// Penghias dinding: (1) lis bawah kayu di semua dinding dalam, terpotong di pintu; (2) dinding aksen per ruang:
// wallpaper bermotif halus di atas panel kayu (wainscot), tepat di balik lukisan (lihat WallPaintings.tsx).
// Tambahan murni: tidak mengubah dinding atau perabot yang sudah ada, hanya menempel 0,4 sampai 4,5 cm di muka dinding.
// Dipasang di dalam grup rumah (kerangka lokal rumah). Mesh diberi userData.noShadow supaya tidak ikut diatur pembuat bayangan.

type Face = "+x" | "-x" | "+z" | "-z";
const YAW: Record<Face, number> = {
  "+z": 0,
  "-z": Math.PI,
  "+x": Math.PI / 2,
  "-x": -Math.PI / 2,
};
const NORMAL: Record<Face, [number, number]> = {
  "+x": [1, 0],
  "-x": [-1, 0],
  "+z": [0, 1],
  "-z": [0, -1],
};

// Balok yang menempel di muka dinding. f = koordinat muka dinding, s0..s1 = rentang sepanjang dinding,
// y0..y1 = tinggi (m, absolut), d = tebal ke arah ruangan.
function slab(
  face: Face,
  f: number,
  s0: number,
  s1: number,
  y0: number,
  y1: number,
  d: number,
) {
  const [nx, nz] = NORMAL[face];
  const len = s1 - s0;
  const alongX = nz !== 0; // dinding membentang sepanjang x
  const geo = new THREE.BoxGeometry(
    alongX ? len : d,
    y1 - y0,
    alongX ? d : len,
  );
  const sm = (s0 + s1) / 2;
  geo.translate(
    alongX ? sm : f + nx * (d / 2),
    (y0 + y1) / 2,
    alongX ? f + nz * (d / 2) : sm,
  );
  return geo;
}

// ── lis bawah ──────────────────────────────────────────────
type Door = { c: number; w: number };
type Run = {
  face: Face;
  f: number;
  a: number;
  b: number;
  doors: Door[];
  up: boolean;
};

function wallRuns(): Run[] {
  const runs: Run[] = [];
  const part = (
    p: { axis: "x" | "z"; at: number; a: number; b: number; doors: Door[] },
    half: number,
    up: boolean,
  ) => {
    for (const side of [1, -1] as const) {
      const face: Face =
        p.axis === "x" ? (side > 0 ? "+x" : "-x") : side > 0 ? "+z" : "-z";
      runs.push({
        face,
        f: p.at + side * half,
        a: p.a,
        b: p.b,
        doors: p.doors,
        up,
      });
    }
  };
  for (const p of PLAN.ground) part(p, PLAN.t / 2, false);
  for (const p of PLAN.upper) part(p, PLAN.t / 2, true);
  part(
    { axis: "x", at: BEDROOM.x1, a: BEDROOM.z0, b: BEDROOM.z1, doors: [] },
    BEDROOM.t / 2,
    true,
  );
  part(
    {
      axis: "z",
      at: BEDROOM.z1,
      a: BEDROOM.x0,
      b: BEDROOM.x1,
      doors: [{ c: BEDROOM.door.c, w: BEDROOM.door.w }],
    },
    BEDROOM.t / 2,
    true,
  );
  // dinding luar (sisi dalam). Pintu depan lantai bawah dan pintu kaca balkon dilewati.
  runs.push({ face: "+x", f: -11.7, a: -6.7, b: 6.7, doors: [], up: false });
  runs.push({ face: "-x", f: 11.7, a: -6.7, b: 6.7, doors: [], up: false });
  runs.push({ face: "+z", f: -6.7, a: -11.7, b: 11.7, doors: [], up: false });
  runs.push({
    face: "-z",
    f: 6.7,
    a: -11.7,
    b: 11.7,
    doors: [{ c: 0, w: 2.7 }],
    up: false,
  });
  runs.push({
    face: "+x",
    f: -3.7,
    a: -6.7,
    b: 8.3,
    doors: [{ c: -3.0, w: 2.8 }],
    up: true,
  });
  runs.push({ face: "-x", f: 11.7, a: -6.7, b: 8.3, doors: [], up: true });
  runs.push({ face: "+z", f: -6.7, a: -3.7, b: 11.7, doors: [], up: true });
  runs.push({ face: "-z", f: 8.3, a: -3.7, b: 11.7, doors: [], up: true });
  return runs;
}

const floorY = (up: boolean) => (up ? INTERIOR.floor2Y : INTERIOR.floorY);

// ── dinding aksen ──────────────────────────────────────────
type Feature = {
  face: Face;
  f: number; // muka dinding
  s0: number;
  s1: number;
  up?: boolean;
  paper: string; // warna wallpaper
  motif: "stripe" | "diamond";
};

// Tiap fitur berada di dinding yang polos (tanpa jendela dan pintu) dan sejajar dengan lukisan di WallPaintings.tsx.
const FEATURES: Feature[] = [
  // Foyer dan Lobi: biru batu
  {
    face: "+x",
    f: -2.325,
    s0: 3.65,
    s1: 6.65,
    paper: "#40607a",
    motif: "stripe",
  },
  {
    face: "+x",
    f: -2.325,
    s0: -0.5,
    s1: 1.0,
    paper: "#40607a",
    motif: "stripe",
  },
  // Ruang Kerja: hijau sage
  {
    face: "-x",
    f: -2.475,
    s0: 2.25,
    s1: 6.6,
    paper: "#7d9072",
    motif: "diamond",
  },
  {
    face: "+z",
    f: -0.525,
    s0: -11.6,
    s1: -7.6,
    paper: "#7d9072",
    motif: "diamond",
  },
  {
    face: "+z",
    f: -0.525,
    s0: -6.4,
    s1: -2.5,
    paper: "#7d9072",
    motif: "diamond",
  },
  // Perpustakaan: merah anggur
  {
    face: "+x",
    f: -11.7,
    s0: -3.15,
    s1: -1.05,
    paper: "#7a3f45",
    motif: "stripe",
  },
  // Dapur: terakota
  {
    face: "-x",
    f: 4.325,
    s0: -5.45,
    s1: -3.35,
    paper: "#b8684c",
    motif: "diamond",
  },
  // Ruang Makan: hijau tua
  {
    face: "+z",
    f: -4.325,
    s0: 4.55,
    s1: 11.6,
    paper: "#3f5d4e",
    motif: "stripe",
  },
  // Ruang Tamu: biru malam
  {
    face: "-x",
    f: 11.7,
    s0: -0.55,
    s1: 3.15,
    paper: "#34507a",
    motif: "diamond",
  },
  {
    face: "+x",
    f: 2.475,
    s0: 2.95,
    s1: 6.65,
    paper: "#34507a",
    motif: "diamond",
  },
  // Galeri lantai atas: ungu keabu-abuan
  {
    face: "+z",
    f: -0.325,
    s0: 4.4,
    s1: 9.3,
    up: true,
    paper: "#5f4f78",
    motif: "stripe",
  },
];

const TILE = 0.55; // ukuran satu pengulangan motif (m)
const RAIL = 1.0; // tinggi wainscot (m)
const BASE = 0.12; // tinggi lis bawah (m)

// Motif wallpaper: warna dasar + pola halus (garis tegak atau belah ketupat) + grain kertas
function paperTexture(base: string, motif: "stripe" | "diamond") {
  const n = 128;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, n, n);
  g.fillStyle = "rgba(255,240,210,0.10)";
  if (motif === "stripe") {
    for (let x = 0; x < n; x += n / 4) g.fillRect(x + 6, 0, 10, n);
    g.fillStyle = "rgba(0,0,0,0.10)";
    for (let x = 0; x < n; x += n / 4) g.fillRect(x + 20, 0, 2, n);
  } else {
    g.strokeStyle = "rgba(255,240,210,0.16)";
    g.lineWidth = 2;
    for (const [cx, cy] of [
      [n / 2, n / 2],
      [0, 0],
      [n, 0],
      [0, n],
      [n, n],
    ]) {
      g.beginPath();
      g.moveTo(cx, cy - 46);
      g.lineTo(cx + 30, cy);
      g.lineTo(cx, cy + 46);
      g.lineTo(cx - 30, cy);
      g.closePath();
      g.stroke();
    }
    g.fillStyle = "rgba(255,240,210,0.22)";
    for (const [cx, cy] of [
      [n / 2, n / 2],
      [0, 0],
      [n, 0],
      [0, n],
      [n, n],
    ]) {
      g.beginPath();
      g.arc(cx, cy, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
  for (let i = 0; i < 700; i++) {
    g.fillStyle =
      Math.random() > 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";
    g.fillRect(Math.random() * n, Math.random() * n, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export default function WallDecor() {
  const built = useMemo(() => {
    // lis bawah + rel + dasar wainscot (kayu gelap) dan panel timbul (kayu lebih terang)
    const trim: THREE.BufferGeometry[] = [];
    const inset: THREE.BufferGeometry[] = [];
    for (const r of wallRuns()) {
      const fy = floorY(r.up);
      const doors = [...r.doors].sort((p, q) => p.c - q.c);
      const spans: [number, number][] = [];
      let cur = r.a;
      for (const d of doors) {
        spans.push([cur, d.c - d.w / 2]);
        cur = d.c + d.w / 2;
      }
      spans.push([cur, r.b]);
      for (const [s0, s1] of spans) {
        if (s1 - s0 < 0.1) continue;
        trim.push(slab(r.face, r.f, s0, s1, fy, fy + BASE, 0.022));
        trim.push(
          slab(r.face, r.f, s0, s1, fy + BASE, fy + BASE + 0.016, 0.014),
        );
      }
    }
    const papers = FEATURES.map((ft) => {
      const fy = floorY(!!ft.up);
      const top = ft.up
        ? INTERIOR.floor2Y + HOME.upper.h - 0.04
        : INTERIOR.floorY + HOME.h - 0.285;
      const len = ft.s1 - ft.s0;
      // wainscot: dasar, rel di atasnya, dan panel timbul
      trim.push(slab(ft.face, ft.f, ft.s0, ft.s1, fy + BASE, fy + RAIL, 0.03));
      trim.push(
        slab(ft.face, ft.f, ft.s0, ft.s1, fy + RAIL, fy + RAIL + 0.05, 0.05),
      );
      const n = Math.max(1, Math.round(len / 0.8));
      const w = len / n;
      for (let i = 0; i < n; i++)
        inset.push(
          slab(
            ft.face,
            ft.f,
            ft.s0 + i * w + 0.07,
            ft.s0 + (i + 1) * w - 0.07,
            fy + 0.24,
            fy + RAIL - 0.1,
            0.042,
          ),
        );
      const y0 = fy + RAIL + 0.05;
      const h = top - y0;
      const tex = paperTexture(ft.paper, ft.motif);
      tex.repeat.set(len / TILE, h / TILE);
      return { ft, tex, y0, h, len };
    });
    return {
      trim: mergeGeometries(trim, false),
      inset: mergeGeometries(inset, false),
      papers,
    };
  }, []);

  const mats = useMemo(
    () => ({
      trim: new THREE.MeshStandardMaterial({
        color: "#4a3424",
        roughness: 0.6,
      }),
      inset: new THREE.MeshStandardMaterial({
        color: "#5e4330",
        roughness: 0.55,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      built.trim?.dispose();
      built.inset?.dispose();
      built.papers.forEach((p) => p.tex.dispose());
      mats.trim.dispose();
      mats.inset.dispose();
    },
    [built, mats],
  );

  return (
    <>
      {built.trim && (
        <mesh
          geometry={built.trim}
          material={mats.trim}
          userData={{ noShadow: true }}
        />
      )}
      {built.inset && (
        <mesh
          geometry={built.inset}
          material={mats.inset}
          userData={{ noShadow: true }}
        />
      )}
      {built.papers.map(({ ft, tex, y0, h, len }, i) => {
        const [nx, nz] = NORMAL[ft.face];
        const sm = (ft.s0 + ft.s1) / 2;
        const px = nz !== 0 ? sm : ft.f + nx * 0.004;
        const pz = nz !== 0 ? ft.f + nz * 0.004 : sm;
        return (
          <mesh
            key={i}
            position={[px, y0 + h / 2, pz]}
            rotation={[0, YAW[ft.face], 0]}
            userData={{ noShadow: true }}
          >
            <planeGeometry args={[len, h]} />
            <meshLambertMaterial map={tex} />
          </mesh>
        );
      })}
    </>
  );
}
