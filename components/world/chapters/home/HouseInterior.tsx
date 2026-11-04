"use client";

import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { applyGrain } from "../../core/grain";
import { CONTACTS } from "@/content/contact";
import { HOME, HOME_UI, VOID } from "../../config/home";

import { cutRects, DOOR, INTERIOR } from "./homeGeometry";
import type { HouseState } from "./houseState";

const FL = INTERIOR.floorY;
type P = [number, number, number];
type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}
const bx = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);

function leaf(g: THREE.BufferGeometry) {
  return paint(g, "#4f6b3a");
}
const WOOD = "#6b4a2e";
const DARK = "#3a2a1c";
const COVERS = [
  "#8a3b3b",
  "#35506b",
  "#4d6a45",
  "#8c6b34",
  "#5a3f63",
  "#2f5f5a",
  "#7a4a2a",
  "#3d3d52",
];

function buildStatic(books: number) {
  const list: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry) => list.push(g);
  const plant = (x: number, y: number, z: number, h: number) => {
    add(
      paint(
        new THREE.CylinderGeometry(0.26, 0.2, 0.4, 10).translate(x, y + 0.2, z),
        "#8a5a3a",
      ),
    );
    add(
      leaf(
        new THREE.IcosahedronGeometry(0.32 * h, 1).translate(
          x,
          y + 0.45 + 0.35 * h,
          z,
        ),
      ),
    );
    add(
      leaf(
        new THREE.IcosahedronGeometry(0.24 * h, 1).translate(
          x + 0.15,
          y + 0.4 + 0.8 * h,
          z - 0.1,
        ),
      ),
    );
  };
  const lampStand = (x: number, y: number, z: number) => {
    add(bx(0.04, 1.5, 0.04, x, y + 0.75, z, DARK));
    add(bx(0.25, 0.04, 0.25, x, y + 0.02, z, DARK));
    add(bx(0.32, 0.28, 0.32, x, y + 1.6, z, "#ffcf80"));
  };

  // zona ruang tamu: karpet besar di bawah sofa dan meja, tepat di bawah void
  add(bx(5.6, 0.015, 3.8, 3.6, FL + 0.01, 2.7, "#6b3f3f"));
  add(bx(5.2, 0.02, 3.4, 3.6, FL + 0.018, 2.7, "#c9b48a"));
  // zona meja kerja: karpet sendiri di bawah meja dan kursi
  add(bx(4.6, 0.015, 3.0, -9.2, FL + 0.01, -4.2, "#5a4632"));
  add(bx(4.2, 0.02, 2.6, -9.2, FL + 0.018, -4.2, "#b9a77a"));

  // meja kerja
  const dx = -9.5,
    dz = -5.6,
    top = FL + 0.76;
  add(bx(3.0, 0.08, 1.4, dx, top, dz, WOOD));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(bx(0.08, 0.72, 0.08, dx + sx * 1.4, FL + 0.36, dz + sz * 0.6, DARK));
  add(bx(0.5, 0.06, 0.5, dx + 0.4, FL + 0.46, dz + 1.4, "#a98258"));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bx(
          0.05,
          0.44,
          0.05,
          dx + 0.4 + sx * 0.2,
          FL + 0.22,
          dz + 1.4 + sz * 0.2,
          DARK,
        ),
      );
  add(bx(0.18, 0.03, 0.18, dx + 1.1, top + 0.055, dz - 0.4, DARK));
  add(bx(0.03, 0.5, 0.03, dx + 1.1, top + 0.31, dz - 0.4, DARK));
  add(bx(0.24, 0.14, 0.24, dx + 1.1, top + 0.6, dz - 0.4, "#ffcf80"));

  // rak buku di dinding belakang
  const sz = -6.5;
  add(bx(3.8, 2.7, 0.03, 0.4, FL + 1.4, -6.685, DARK));
  for (const s of [-1, 1])
    add(bx(0.06, 2.7, 0.4, 0.4 + s * 1.9, FL + 1.35, sz, WOOD));
  for (let k = 0; k < 5; k++)
    add(bx(3.8, 0.05, 0.4, 0.4, FL + k * 0.62 + 0.03, sz, WOOD));
  const r = prng(7);
  for (let L = 0; L < 4; L++) {
    const base = FL + L * 0.62 + 0.055;
    let x = 0.4 - 1.78 + (L === 2 ? books * 0.43 : 0);
    while (x < 0.4 + 1.78 - 0.1) {
      const w = 0.06 + r() * 0.1;
      const h = 0.35 + r() * 0.2;
      add(
        bx(
          w,
          h,
          0.28,
          x + w / 2,
          base + h / 2,
          sz + (r() - 0.5) * 0.03,
          COVERS[(r() * COVERS.length) | 0],
        ),
      );
      x += w + 0.005;
    }
  }

  // meja album di dinding kanan
  add(bx(1.0, 0.05, 2.0, 11.05, FL + 0.55, -1.2, WOOD));
  for (const sx of [-1, 1])
    for (const s2 of [-1, 1])
      add(
        bx(
          0.06,
          0.52,
          0.06,
          11.05 + sx * 0.4,
          FL + 0.26,
          -1.2 + s2 * 0.9,
          DARK,
        ),
      );

  // ── ruang tamu di lantai bawah ──
  add(bx(3.2, 0.45, 1.0, 3.6, FL + 0.25, 4.0, "#5d6b7a"));
  add(bx(3.2, 0.65, 0.25, 3.6, FL + 0.55, 4.5, "#4f5c6a"));
  for (const s of [-1, 1])
    add(bx(0.25, 0.6, 1.0, 3.6 + s * 1.62, FL + 0.5, 4.0, "#4f5c6a"));
  add(bx(1.7, 0.06, 0.9, 3.6, FL + 0.42, 1.8, WOOD));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bx(0.06, 0.4, 0.06, 3.6 + sx * 0.78, FL + 0.2, 1.8 + sz * 0.38, DARK),
      );
  for (const [ax, az] of [
    [7.8, 2.2],
    [-2.2, 5.0],
  ]) {
    add(bx(0.9, 0.4, 0.9, ax, FL + 0.22, az, "#8a5a3a"));
    add(bx(0.9, 0.55, 0.2, ax, FL + 0.55, az + 0.4, "#7a4c30"));
  }
  plant(-10.8, FL, 6.0, 1.2);
  plant(11.0, FL, 5.8, 1.4);
  plant(-1.6, FL, -5.9, 1.0);
  lampStand(-1.4, FL, 5.8);

  // ── lantai atas ──
  const U = INTERIOR.floor2Y;
  // papan lantai atas, dipotong di void ruang tamu supaya tidak melayang di atas lubang
  for (const r of [
    [-3.7, 4.8, -6.7, 8.3],
    [4.8, 10.6, -5.3, 8.3],
    [10.6, 11.7, -6.7, 8.3],
  ] as [number, number, number, number][])
    for (const [x0, x1, z0, z1] of cutRects(r, [
      [VOID.x0, VOID.x1, VOID.z0, VOID.z1],
    ]))
      add(
        bx(
          x1 - x0,
          0.02,
          z1 - z0,
          (x0 + x1) / 2,
          U + 0.01,
          (z0 + z1) / 2,
          "#9b7650",
        ),
      );
  add(bx(4.4, 0.025, 3.4, -1.5, U + 0.025, 2.6, "#6b3f3f"));
  add(bx(4.0, 0.03, 3.0, -1.5, U + 0.03, 2.6, "#c9b48a"));
  // sofa dan meja rendah
  add(bx(1.0, 0.45, 2.8, -2.6, U + 0.25, 2.6, "#6b7f6a"));
  add(bx(0.25, 0.65, 2.8, -3.2, U + 0.55, 2.6, "#5c6e5b"));
  for (const s of [-1, 1])
    add(bx(1.0, 0.6, 0.25, -2.6, U + 0.5, 2.6 + s * 1.38, "#5c6e5b"));
  add(bx(0.9, 0.06, 1.6, -0.9, U + 0.4, 2.6, WOOD));
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bx(0.06, 0.38, 0.06, -0.9 + sx * 0.4, U + 0.19, 2.6 + sz * 0.7, DARK),
      );
  // rak buku panjang di dinding belakang
  const shX = -0.6;
  add(bx(4.4, 2.5, 0.03, shX, U + 1.25, -6.685, DARK));
  for (const s of [-1, 1])
    add(bx(0.06, 2.5, 0.4, shX + s * 2.2, U + 1.25, -6.5, WOOD));
  for (let k = 0; k < 5; k++)
    add(bx(4.4, 0.05, 0.4, shX, U + k * 0.6 + 0.03, -6.5, WOOD));
  const rr = prng(21);
  for (let L = 0; L < 4; L++) {
    let x = shX - 2.12;
    while (x < shX + 2.05) {
      const w = 0.06 + rr() * 0.1;
      const h = 0.3 + rr() * 0.22;
      if (rr() > 0.12)
        add(
          bx(
            w,
            h,
            0.28,
            x + w / 2,
            U + L * 0.6 + 0.055 + h / 2,
            -6.5,
            COVERS[(rr() * COVERS.length) | 0],
          ),
        );
      x += w + 0.005;
    }
  }
  // teleskop di jendela depan (tepat di depan kaca, tidak menghalangi jalur kamera)
  for (const [tx, tz] of [
    [2.7, 7.15],
    [3.1, 7.15],
    [2.9, 7.65],
  ])
    add(bx(0.05, 1.1, 0.05, tx, U + 0.55, tz, DARK));
  add(
    paint(
      new THREE.CylinderGeometry(0.07, 0.11, 1.3, 12)
        .rotateX(1.0)
        .translate(2.9, U + 1.2, 7.4),
      "#b08a4a",
    ),
  );
  // kursi baca dan lampu berdiri di sudut depan kanan
  add(bx(0.95, 0.4, 0.95, 8.8, U + 0.22, 6.7, "#8a5a3a"));
  add(bx(0.95, 0.7, 0.2, 8.8, U + 0.6, 7.2, "#7a4c30"));
  lampStand(10.4, U, 7.4);
  // bingkai lukisan di dinding kanan: galeri
  const fr = ["#35506b", "#8a3b3b", "#4d6a45", "#8c6b34", "#5a3f63"];
  for (let i = 0; i < 5; i++) {
    const z = -3.2 + i * 1.55;
    const hh = 0.7 + (i % 2) * 0.25;
    add(bx(0.04, hh + 0.1, 1.0, 11.69, U + 1.5, z, DARK));
    add(bx(0.045, hh, 0.9, 11.67, U + 1.5, z, fr[i]));
  }
  // tanaman
  plant(-3.2, U, 7.7, 1.3);
  plant(11.0, U, -2.2, 1.0);
  plant(4.2, U, 7.7, 0.9);
  // ruang jam matahari di teras atap: dua kursi malas
  for (const z of [-3.0, 3.2]) {
    add(bx(0.8, 0.12, 1.8, -8.5, U + 0.36, z, "#a98258"));
    add(bx(0.8, 0.5, 0.1, -8.5, U + 0.65, z - 0.85, "#a98258"));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(
          bx(0.06, 0.3, 0.06, -8.5 + sx * 0.34, U + 0.15, z + sz * 0.8, DARK),
        );
  }

  // ── detail tambahan ──
  // keset di pintu masuk
  add(bx(1.8, 0.02, 0.8, 0, FL + 0.012, 6.1, "#5a4632"));
  // cangkir dan tumpukan buku di meja kerja
  add(
    paint(
      new THREE.CylinderGeometry(0.06, 0.05, 0.1, 10).translate(
        -8.3,
        top + 0.09,
        -5.0,
      ),
      "#e9dcb4",
    ),
  );
  add(bx(0.3, 0.1, 0.2, -10.7, top + 0.09, -6.1, "#35506b"));
  add(bx(0.28, 0.07, 0.19, -10.7, top + 0.18, -6.1, "#8a3b3b"));
  // lampu plafon, sejajar dengan lampu titik di HouseParts
  const cl = FL + HOME.h - 0.25 - 0.05;
  for (const [lx, lz] of [
    [-7, 0],
    [0, 1],
    [7, 0],
  ])
    add(
      paint(
        new THREE.CylinderGeometry(0.38, 0.38, 0.05, 18).translate(lx, cl, lz),
        "#ffcf80",
      ),
    );
  const cu = INTERIOR.floor2Y + HOME.upper.h - 0.05;
  for (const [lx, lz] of [
    [0, 0.5],
    [7, 1.5],
  ])
    add(
      paint(
        new THREE.CylinderGeometry(0.38, 0.38, 0.05, 18).translate(lx, cu, lz),
        "#ffcf80",
      ),
    );

  // ── plafon terang di bawah pelat (supaya langit-langit tidak hitam) ──
  const CEIL = "#efe8da";
  const c0 = FL + HOME.h - 0.25 - 0.015;
  // plafon bawah dipotong di bawah void, supaya ruang tamu terbuka sampai atap lantai atas
  for (const r of [
    [-11.7, 4.8, -6.7, 6.7],
    [10.6, 11.7, -6.7, 6.7],
    [4.8, 10.6, -5.3, 6.7],
  ] as [number, number, number, number][])
    for (const [x0, x1, z0, z1] of cutRects(r, [
      [VOID.x0, VOID.x1, VOID.z0, VOID.z1],
    ]))
      add(bx(x1 - x0, 0.02, z1 - z0, (x0 + x1) / 2, c0, (z0 + z1) / 2, CEIL));
  // lampu gantung di atas void: batang dan dua cincin yang menyala
  const ct = INTERIOR.floor2Y + HOME.upper.h - 0.05;
  add(bx(0.03, 1.1, 0.03, 4.5, ct - 0.55, 2.8, DARK));
  add(
    paint(
      new THREE.CylinderGeometry(0.6, 0.6, 0.06, 24).translate(
        4.5,
        ct - 1.15,
        2.8,
      ),
      "#ffcf80",
    ),
  );
  add(
    paint(
      new THREE.CylinderGeometry(0.32, 0.32, 0.06, 20).translate(
        4.5,
        ct - 1.4,
        2.8,
      ),
      "#ffcf80",
    ),
  );
  const c1 = INTERIOR.floor2Y + HOME.upper.h - 0.015;
  add(bx(15.4, 0.02, 15.0, 4.0, c1, 0.8, CEIL));

  // tiap kelompok bahan digabung terpisah supaya bisa diberi tekstur sendiri
  const FABRIC = new Set([
    "5d6b7a",
    "4f5c6a",
    "6b7f6a",
    "5c6e5b",
    "8a5a3a",
    "7a4c30",
    "6b3f3f",
    "c9b48a",
    "b9a77a",
    "7a5a3a",
    "5a4632",
    "efe8da",
    ...COVERS.map((c) => c.slice(1)),
  ]);
  const groups: Record<
    "wood" | "fabric" | "leaf" | "shade",
    THREE.BufferGeometry[]
  > = {
    wood: [],
    fabric: [],
    leaf: [],
    shade: [],
  };
  for (const g of list) {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes))
      if (!["position", "normal", "uv", "color"].includes(k))
        n.deleteAttribute(k);
    const c = n.attributes.color;
    const hex = new THREE.Color(c.getX(0), c.getY(0), c.getZ(0)).getHexString();
    const kind =
      hex === "ffcf80"
        ? "shade"
        : hex === "4f6b3a"
          ? "leaf"
          : FABRIC.has(hex)
            ? "fabric"
            : "wood";
    groups[kind].push(n);
  }
  return {
    wood: mergeGeometries(groups.wood, false),
    fabric: mergeGeometries(groups.fabric, false),
    leaf: mergeGeometries(groups.leaf, false),
    shade: mergeGeometries(groups.shade, false),
  };
}

function useTexture(draw: Draw, w: number, h: number) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

const textDraw =
  (bg: string, text: string, glyph?: string): Draw =>
  (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff3e0";
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (glyph) {
      g.font = `600 ${h * 0.38}px Georgia, serif`;
      g.fillText(glyph, w / 2, h * 0.38);
      g.font = `italic 500 ${h * 0.17}px Georgia, serif`;
      g.fillText(text, w / 2, h * 0.76);
    } else {
      g.font = `italic 600 ${h * 0.4}px Georgia, serif`;
      g.fillText(text, w / 2, h / 2);
    }
  };

const photoDraw =
  (seed: number): Draw =>
  (g, w, h) => {
    const r = prng(seed * 97 + 3);
    const hue = 190 + r() * 60;
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, `hsl(${hue},45%,62%)`);
    sky.addColorStop(1, `hsl(${hue - 140},55%,78%)`);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,240,200,0.9)";
    g.beginPath();
    g.arc(w * (0.25 + r() * 0.5), h * 0.3, h * 0.09, 0, 7);
    g.fill();
    for (let k = 0; k < 2; k++) {
      g.fillStyle = `hsl(${120 + k * 20},${25 - k * 5}%,${30 - k * 8}%)`;
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, h * (0.62 + k * 0.1));
      for (let i = 1; i <= 4; i++)
        g.lineTo((w * i) / 4, h * (0.5 + k * 0.12 + r() * 0.18));
      g.lineTo(w, h);
      g.fill();
    }
  };

type HotProps = {
  id: string;
  pos: P;
  size: P;
  color: string;
  ry?: number;
  rx?: number;
  draw?: Draw;
  texSize?: [number, number];
  plane?: { at: P; rot: P; w: number; h: number };
  house: MutableRefObject<HouseState>;
  onPick: (id: string) => void;
  onTip: (id: string | null) => void;
};

function Hot({
  id,
  pos,
  size,
  color,
  ry = 0,
  draw,
  texSize = [256, 160],
  plane,
  house,
  onPick,
  onTip,
}: HotProps) {
  const [on, setOn] = useState(false);
  const tex = useTexture(draw ?? (() => {}), texSize[0], texSize[1]);
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  const live = () => house.current.mode === "in";
  return (
    <group position={pos} rotation={[0, ry, 0]} scale={on ? 1.04 : 1}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!live() || e.delta > 6) return;
          e.stopPropagation();
          onPick(id);
        }}
        onPointerOver={(e) => {
          if (!live()) return;
          e.stopPropagation();
          setOn(true);
          onTip(id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setOn(false);
          onTip(null);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive="#ffb866"
          emissiveIntensity={on ? 0.5 : 0}
          roughness={0.7}
        />
      </mesh>
      {draw && plane && (
        <mesh position={plane.at} rotation={plane.rot}>
          <planeGeometry args={[plane.w, plane.h]} />
          <meshBasicMaterial
            map={tex}
            toneMapped={false}
            color={on ? "#ffffff" : "#d9d2c4"}
          />
        </mesh>
      )}
    </group>
  );
}

export default function HouseInterior({
  house,
  books,
  onPick,
  onTip,
}: {
  house: MutableRefObject<HouseState>;
  books: number;
  onPick: (id: string) => void;
  onTip: (id: string | null) => void;
}) {
  const geo = useMemo(() => buildStatic(books), [books]);
  const mats = useMemo(() => {
    const lam = (kind: "wood" | "fabric" | "ground") => {
      const m = new THREE.MeshLambertMaterial({ vertexColors: true });
      applyGrain(m, kind);
      return m;
    };
    return {
      wood: lam("wood"),
      fabric: lam("fabric"),
      leaf: lam("ground"),
      shade: new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      }),
    };
  }, []);
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g?.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geo, mats],
  );
  const base = { house, onPick, onTip };
  const L = HOME_UI.label;
  const deskTop = FL + 0.8;
  const flat = (w: number, d: number) => ({
    at: [0, 0.022, 0] as P,
    rot: [-Math.PI / 2, 0, 0] as P,
    w,
    h: d,
  });

  return (
    <group position={[HOME.x, 0, HOME.z]} rotation={[0, DOOR.yaw, 0]}>
      {(["wood", "fabric", "leaf", "shade"] as const).map((k) =>
        geo[k] ? <mesh key={k} geometry={geo[k]!} material={mats[k]} /> : null,
      )}

      <Hot
        {...base}
        id="cv-writer"
        pos={[-10.4, deskTop + 0.02, -5.4]}
        size={[0.55, 0.04, 0.75]}
        color="#8a3b3b"
        ry={0.2}
        draw={textDraw("#8a3b3b", L.cvWriter)}
        texSize={[320, 200]}
        plane={flat(0.47, 0.3)}
      />
      <Hot
        {...base}
        id="cv-marketing"
        pos={[-9.1, deskTop + 0.02, -5.55]}
        size={[0.55, 0.04, 0.75]}
        color="#2f5f5a"
        ry={-0.15}
        draw={textDraw("#2f5f5a", L.cvMarketing)}
        texSize={[320, 200]}
        plane={flat(0.47, 0.3)}
      />

      <Hot
        {...base}
        id="library"
        pos={[0.4, FL + 2.85, -6.66]}
        size={[1.4, 0.28, 0.05]}
        color={DARK}
        draw={textDraw(DARK, L.library)}
        texSize={[480, 96]}
        plane={{ at: [0, 0, 0.027], rot: [0, 0, 0], w: 1.34, h: 0.22 }}
      />
      {Array.from({ length: books }, (_, i) => (
        <Hot
          {...base}
          key={i}
          id={`book:${i}`}
          pos={[
            0.4 - 1.5 + i * 0.43,
            FL + 1.295 + (0.46 + (i % 3) * 0.04) / 2,
            -6.5,
          ]}
          size={[0.34, 0.46 + (i % 3) * 0.04, 0.28]}
          color={COVERS[i % COVERS.length]}
        />
      ))}

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Hot
          {...base}
          key={i}
          id="album"
          pos={[11.68, FL + (i < 3 ? 1.15 : 1.9), -2.6 + (i % 3) * 1.4]}
          size={[0.8, 0.6, 0.04]}
          color="#2e2218"
          ry={-Math.PI / 2}
          draw={photoDraw(i + 1)}
          texSize={[256, 192]}
          plane={{ at: [0, 0, 0.022], rot: [0, 0, 0], w: 0.68, h: 0.48 }}
        />
      ))}
      <Hot
        {...base}
        id="album"
        pos={[11.05, FL + 0.61, -1.2]}
        size={[0.6, 0.07, 0.8]}
        color="#5b3a2a"
        ry={0.2}
        draw={textDraw("#5b3a2a", L.album)}
        texSize={[300, 400]}
        plane={{ at: [0, 0.037, 0], rot: [-Math.PI / 2, 0, 0], w: 0.4, h: 0.5 }}
      />

      {CONTACTS.map((c, i) => (
        <Hot
          {...base}
          key={c.id}
          id={`contact:${c.id}`}
          pos={[-11.675, FL + 1.5, 1.5 + i * 0.9]}
          size={[0.8, 0.5, 0.05]}
          color="#2b1f15"
          ry={Math.PI / 2}
          draw={textDraw("#2b1f15", c.label, c.glyph)}
          texSize={[400, 250]}
          plane={{ at: [0, 0, 0.028], rot: [0, 0, 0], w: 0.74, h: 0.44 }}
        />
      ))}
    </group>
  );
}
