"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { INTERIOR } from "./homeGeometry";

// Hiasan kecil rumah: tirai di 12 jendela, jam dinding di Ruang Tamu, empat lampu dinding (Foyer dan Ruang Tamu),
// dan dua rak pajang kecil di Ruang Makan. Tambahan murni: tidak mengubah dinding, jendela, atau perabot yang ada.
// Dipasang di dalam grup rumah, di samping <WallDecor />. Semua mesh diberi userData.noShadow.
// Jarak tirai dari dinding 0,17 m supaya lolos dari ambang batu jendela (menonjol 0,12 m).

type Face = "+x" | "-x" | "+z" | "-z";
const YAW: Record<Face, number> = {
  "+z": 0,
  "-z": Math.PI,
  "+x": Math.PI / 2,
  "-x": -Math.PI / 2,
};

const FL = INTERIOR.floorY;
const U = INTERIOR.floor2Y;
const F = FL - 0.25; // dasar dinding lantai bawah (tinggi jendela diukur dari sini)

// ── tirai ──────────────────────────────────────────────────
export type Win = {
  face: Face;
  f: number; // muka dinding dalam
  sc: number; // pusat jendela sepanjang dinding
  w: number;
  y1: number; // tepi atas jendela, dari dasar dinding
  up?: boolean;
  bottom?: number; // tinggi ujung bawah tirai dari lantai (default hampir menyentuh lantai)
  color: string;
};

const KERJA = "#c4a35a";
const PERPUS = "#5a3a52";
const TAMU = "#e2d6bd";
const MAKAN = "#d8c9a6";
const BACA = "#5d7690";
const JALAN = "#d9cdb4";

export const WINDOWS: Win[] = [
  { face: "-z", f: 6.7, sc: -7.5, w: 6.2, y1: 3.1, color: KERJA },
  { face: "+x", f: -11.7, sc: 3.0, w: 2.8, y1: 2.9, color: KERJA },
  { face: "+x", f: -11.7, sc: -4.6, w: 2.8, y1: 2.9, color: PERPUS },
  { face: "+z", f: -6.7, sc: -9.5, w: 2.6, y1: 2.9, color: PERPUS },
  { face: "+z", f: -6.7, sc: -4.0, w: 2.2, y1: 2.9, color: PERPUS },
  { face: "-z", f: 6.7, sc: 5.2, w: 3.6, y1: 3.1, color: TAMU },
  { face: "-x", f: 11.7, sc: 4.6, w: 2.8, y1: 3.0, color: TAMU },
  { face: "-x", f: 11.7, sc: -2.4, w: 2.4, y1: 2.9, color: MAKAN },
  // lantai atas (tinggi dari lantai atas). Jendela Ruang Baca di depan: tirai pendek, di atas bangku jendela
  {
    face: "-z",
    f: 8.3,
    sc: -0.8,
    w: 4.0,
    y1: 2.9,
    up: true,
    bottom: 0.62,
    color: BACA,
  },
  { face: "-z", f: 8.3, sc: 7.6, w: 5.2, y1: 2.9, up: true, color: JALAN },
  { face: "+x", f: -3.7, sc: 6.4, w: 2.2, y1: 2.8, up: true, color: BACA },
  { face: "-x", f: 11.7, sc: 5.6, w: 2.8, y1: 2.8, up: true, color: JALAN },
];

const PANEL_W = 0.55;
const OFF = 0.17; // jarak panel dari dinding
const ROD_OFF = 0.22;

function panel(
  cx: number,
  top: number,
  bottom: number,
  color: THREE.Color,
  phase: number,
) {
  const h = top - bottom;
  const segX = 14;
  const g = new THREE.PlaneGeometry(PANEL_W, h, segX, 4);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i); // -h/2 .. h/2
    const low = 0.55 + 0.45 * (0.5 - y / h); // lipatan lebih lebar di bawah
    const s = Math.sin((x / PANEL_W) * Math.PI * 6 + phase);
    pos.setZ(i, s * 0.03 * low);
    const k = 0.9 + 0.1 * s;
    tmp.copy(color).multiplyScalar(k);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.translate(cx, (top + bottom) / 2, OFF);
  return g;
}

function buildCurtains() {
  const fabric: THREE.BufferGeometry[] = [];
  const metal: THREE.BufferGeometry[] = [];
  WINDOWS.forEach((win, i) => {
    const floor = win.up ? U : FL;
    const base = win.up ? U : F;
    const rodY = base + win.y1 + 0.2;
    const top = rodY - 0.03;
    const bottom = floor + (win.bottom ?? 0.03);
    const color = new THREE.Color(win.color);
    const M = new THREE.Matrix4().makeRotationY(YAW[win.face]);
    const [px, pz] =
      win.face === "+z" || win.face === "-z"
        ? [win.sc, win.f]
        : [win.f, win.sc];
    M.setPosition(px, 0, pz);
    const len = win.w + 0.9;
    const geos: [THREE.BufferGeometry, boolean][] = [];
    for (const side of [-1, 1]) {
      const cx = side * (win.w / 2 + 0.105);
      geos.push([panel(cx, top, bottom, color, i * 1.7 + side), true]);
      geos.push([
        new THREE.SphereGeometry(0.03, 8, 6).translate(
          side * (len / 2),
          rodY,
          ROD_OFF,
        ),
        false,
      ]);
    }
    geos.push([
      new THREE.CylinderGeometry(0.013, 0.013, len, 8)
        .rotateZ(Math.PI / 2)
        .translate(0, rodY, ROD_OFF),
      false,
    ]);
    for (const [g, isFabric] of geos) {
      g.applyMatrix4(M);
      (isFabric ? fabric : metal).push(g);
    }
  });
  return {
    fabric: mergeGeometries(fabric, false),
    metal: mergeGeometries(metal, false),
  };
}

// ── jam dinding ────────────────────────────────────────────
function clockTexture() {
  const n = 256;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  const m = n / 2;
  g.fillStyle = "#efe6cf";
  g.beginPath();
  g.arc(m, m, m, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#3a2a1c";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const long = i % 3 === 0;
    g.lineWidth = long ? 6 : 3;
    g.beginPath();
    g.moveTo(m + Math.sin(a) * (m - 14), m - Math.cos(a) * (m - 14));
    g.lineTo(
      m + Math.sin(a) * (m - (long ? 34 : 26)),
      m - Math.cos(a) * (m - (long ? 34 : 26)),
    );
    g.stroke();
  }
  // jarum: pukul 10.10
  const hand = (deg: number, len: number, wd: number) => {
    const a = (deg * Math.PI) / 180;
    g.lineWidth = wd;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(m, m);
    g.lineTo(m + Math.sin(a) * len, m - Math.cos(a) * len);
    g.stroke();
  };
  hand(305, 62, 9);
  hand(60, 90, 6);
  g.fillStyle = "#8a3b3b";
  g.beginPath();
  g.arc(m, m, 8, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ── bagian kecil ───────────────────────────────────────────
const WOOD = "#4a3424";
const DARK = "#2b2118";

function B({
  p,
  s,
  c,
  r = 0.6,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c: string;
  r?: number;
}) {
  return (
    <mesh position={p} userData={{ noShadow: true }}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} />
    </mesh>
  );
}

function Sconce({
  face,
  f,
  s,
  y,
}: {
  face: Face;
  f: number;
  s: number;
  y: number;
}) {
  const [px, pz] = face === "+z" || face === "-z" ? [s, f] : [f, s];
  return (
    <group position={[px, y, pz]} rotation={[0, YAW[face], 0]}>
      <B p={[0, 0, 0.012]} s={[0.07, 0.18, 0.024]} c={DARK} r={0.45} />
      <B p={[0, -0.02, 0.06]} s={[0.02, 0.02, 0.08]} c="#b08a3e" r={0.4} />
      <mesh position={[0, 0.03, 0.1]} userData={{ noShadow: true }}>
        <cylinderGeometry args={[0.05, 0.08, 0.15, 14, 1, true]} />
        <meshStandardMaterial
          color="#f4e6c0"
          emissive="#ffcf80"
          emissiveIntensity={0.35}
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Shelf({ x, y, z }: { x: number; y: number; z: number }) {
  // menempel di dinding yang menghadap +z (muka dinding di z)
  return (
    <group position={[x, y, z]}>
      <B p={[0, 0, 0.11]} s={[0.95, 0.035, 0.22]} c={WOOD} />
      <B p={[-0.35, -0.07, 0.04]} s={[0.03, 0.12, 0.06]} c={DARK} r={0.5} />
      <B p={[0.35, -0.07, 0.04]} s={[0.03, 0.12, 0.06]} c={DARK} r={0.5} />
      {/* tumpukan buku */}
      <B p={[-0.3, 0.04, 0.11]} s={[0.2, 0.045, 0.15]} c="#8a3b3b" />
      <B p={[-0.3, 0.085, 0.11]} s={[0.18, 0.04, 0.14]} c="#35506b" />
      <B p={[-0.3, 0.125, 0.11]} s={[0.16, 0.035, 0.13]} c="#d9c48a" />
      {/* vas kecil dengan daun */}
      <mesh position={[0.05, 0.075, 0.11]} userData={{ noShadow: true }}>
        <cylinderGeometry args={[0.04, 0.055, 0.13, 12]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
      </mesh>
      <mesh position={[0.05, 0.19, 0.11]} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.075, 10, 8]} />
        <meshStandardMaterial color="#4d6a45" roughness={0.9} />
      </mesh>
      {/* lilin */}
      <mesh position={[0.3, 0.06, 0.11]} userData={{ noShadow: true }}>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 10]} />
        <meshStandardMaterial color="#efe6cf" roughness={0.8} />
      </mesh>
      <mesh position={[0.3, 0.12, 0.11]} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial
          color="#ffd98a"
          emissive="#ffb347"
          emissiveIntensity={0.9}
        />
      </mesh>
    </group>
  );
}

export default function HomeTrinkets() {
  const built = useMemo(() => {
    const cur = buildCurtains();
    const mats = {
      fabric: new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: "#b08a3e",
        metalness: 0.5,
        roughness: 0.45,
      }),
    };
    return { cur, mats, clock: clockTexture() };
  }, []);

  useEffect(
    () => () => {
      built.cur.fabric?.dispose();
      built.cur.metal?.dispose();
      built.mats.fabric.dispose();
      built.mats.metal.dispose();
      built.clock.dispose();
    },
    [built],
  );

  return (
    <>
      {built.cur.fabric && (
        <mesh
          geometry={built.cur.fabric}
          material={built.mats.fabric}
          userData={{ noShadow: true }}
        />
      )}
      {built.cur.metal && (
        <mesh
          geometry={built.cur.metal}
          material={built.mats.metal}
          userData={{ noShadow: true }}
        />
      )}

      {/* jam dinding: Ruang Tamu, dinding depan di kanan jendela */}
      <group position={[9.3, FL + 2.0, 6.7]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0, 0.012]} userData={{ noShadow: true }}>
          <circleGeometry args={[0.26, 32]} />
          <meshBasicMaterial map={built.clock} />
        </mesh>
        <mesh position={[0, 0, 0.03]} userData={{ noShadow: true }}>
          <torusGeometry args={[0.27, 0.025, 8, 32]} />
          <meshStandardMaterial color={WOOD} roughness={0.5} />
        </mesh>
      </group>

      {/* lampu dinding: dua di sisi cermin Foyer, dua di sisi lukisan naga Ruang Tamu */}
      <Sconce face="-x" f={2.325} s={4.1} y={FL + 1.6} />
      <Sconce face="-x" f={2.325} s={5.9} y={FL + 1.6} />
      <Sconce face="+x" f={2.475} s={3.7} y={FL + 1.95} />
      <Sconce face="+x" f={2.475} s={5.9} y={FL + 1.95} />

      {/* rak pajang: dinding Ruang Makan, di kiri dan kanan lukisan kastil */}
      <Shelf x={5.9} y={FL + 1.45} z={-4.325} />
      <Shelf x={10.2} y={FL + 1.45} z={-4.325} />
    </>
  );
}
