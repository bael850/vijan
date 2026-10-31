"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HOUSE } from "../config/world";
import { getGlow } from "../core/glow";
import { roadAt } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { LANDMARKS, type LandmarkType } from "./villageLayout";

// Bangunan penanda. Badan dan jendela digabung jadi dua mesh (seperti Village).
// Yang bergerak dipisah: baling-baling kincir, kristal menara, dan cahaya berdenyut.
// Dasar ditanam 0.8 ke tanah. Sisi depan = +z lokal.

type Part = { g: THREE.BufferGeometry; c: string; lit?: boolean };
type Glow = {
  pos: [number, number, number];
  color: string;
  size: number;
  base: number;
  seed: number;
};

const STONE = "#8a8474";
const STONE_D = "#6f695c";
const PLASTER = "#d8cba8";
const WOOD = "#5a3c28";
const BEAM = "#4a3626";
const RED = "#b8432f";
const WHITE = "#ece4d0";
const NAVY = "#3a3f6b";
const SAIL = "#e8dcc0";
const WARM = "#ffd479";

function put(
  g: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  ry = 0,
  rz = 0,
) {
  const m = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(0, ry, rz),
  );
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  return g;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

// Beri warna per titik, lalu jadikan tak-berindeks supaya bisa digabung.
function paint(g: THREE.BufferGeometry, c: string) {
  const ng = g.index ? g.toNonIndexed() : g;
  const col = new THREE.Color(c);
  const n = ng.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let j = 0; j < n; j++) {
    arr[j * 3] = col.r;
    arr[j * 3 + 1] = col.g;
    arr[j * 3 + 2] = col.b;
  }
  ng.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return ng;
}

// ---------- model ----------

function windmill(s: number): Part[] {
  const H = 8 * s;
  // radius dinding di ketinggian y (menyempit ke atas)
  const rAt = (y: number) => (2.6 - (1.0 * (y + 0.8)) / 8) * s;
  return [
    {
      g: put(
        new THREE.CylinderGeometry(1.6 * s, 2.6 * s, H, 8),
        0,
        H / 2 - 0.8,
        0,
      ),
      c: PLASTER,
    },
    {
      g: put(new THREE.CylinderGeometry(2.8 * s, 2.8 * s, 0.9, 8), 0, -0.4, 0),
      c: STONE,
    },
    {
      g: put(
        new THREE.ConeGeometry(2.1 * s, 2.4 * s, 8),
        0,
        H - 0.8 + 1.1 * s,
        0,
      ),
      c: NAVY,
    },
    { g: put(box(1.0, 1.8, 0.15), 0, 0.9, rAt(0.9) * 0.96), c: WOOD },
    {
      g: put(
        new THREE.CircleGeometry(0.35, 10),
        0,
        3.2 * s,
        rAt(3.2 * s) + 0.03,
      ),
      c: WARM,
      lit: true,
    },
  ];
}

function tower(): Part[] {
  const rAt = (y: number) => 2.4 - (0.6 * (y + 0.8)) / 12;
  const parts: Part[] = [
    {
      g: put(new THREE.CylinderGeometry(1.8, 2.4, 12, 10), 0, 5.2, 0),
      c: STONE,
    },
    {
      g: put(new THREE.CylinderGeometry(3.0, 1.9, 3, 10), 0, 12.7, 0),
      c: "#6b5a48",
    },
    { g: put(new THREE.ConeGeometry(3.4, 6, 10), 0, 17.2, 0), c: NAVY },
    { g: put(box(1.1, 2.0, 0.15), 0, 1.0, 2.35), c: WOOD },
  ];
  // jendela menyala berjenjang naik, lalu dua di ruang atas
  [3.2, 6.2, 9.2].forEach((y, i) => {
    parts.push({
      g: put(
        new THREE.CircleGeometry(0.4, 10),
        i % 2 ? 0.5 : -0.5,
        y,
        rAt(y) + 0.03,
      ),
      c: WARM,
      lit: true,
    });
  });
  for (const sx of [-1, 1]) {
    parts.push({
      g: put(
        new THREE.CircleGeometry(0.5, 10),
        sx * 1.2,
        12.9,
        Math.sqrt(2.5 * 2.5 - 1.44) + 0.12,
        sx * 0.5,
      ),
      c: "#9fe6ff",
      lit: true,
    });
  }
  return parts;
}

function lighthouse(): Part[] {
  const rAt = (y: number) => 2.4 - (0.8 * (y + 0.8)) / 11;
  const parts: Part[] = [];
  for (let i = 0; i < 4; i++) {
    const y0 = -0.8 + 2.75 * i;
    parts.push({
      g: put(
        new THREE.CylinderGeometry(rAt(y0 + 2.75), rAt(y0), 2.75, 10),
        0,
        y0 + 1.375,
        0,
      ),
      c: i % 2 ? RED : WHITE,
    });
  }
  parts.push(
    {
      g: put(new THREE.CylinderGeometry(2.0, 2.0, 0.3, 10), 0, 10.35, 0),
      c: STONE_D,
    },
    {
      g: put(new THREE.CylinderGeometry(0.85, 0.85, 1.5, 10), 0, 11.25, 0),
      c: WARM,
      lit: true,
    },
    { g: put(new THREE.ConeGeometry(1.3, 1.4, 10), 0, 12.7, 0), c: RED },
    { g: put(box(1.0, 1.8, 0.15), 0, 0.9, rAt(0.9) - 0.02), c: WOOD },
  );
  [4, 7].forEach((y) => {
    parts.push({
      g: put(new THREE.CircleGeometry(0.32, 10), 0, y, rAt(y) + 0.02),
      c: WARM,
      lit: true,
    });
  });
  return parts;
}

function gate(): Part[] {
  const parts: Part[] = [
    { g: put(box(8.2, 0.7, 1.1), 0, 4.75, 0), c: STONE },
    { g: put(box(0.05, 0.9, 0.05), 0, 4.0, 0), c: BEAM },
    { g: put(box(0.5, 0.7, 0.5), 0, 3.35, 0), c: WARM, lit: true },
  ];
  for (const sx of [-1, 1]) {
    parts.push(
      { g: put(box(1.0, 5.2, 1.0), sx * 3.4, 1.8, 0), c: STONE },
      { g: put(box(1.25, 0.35, 1.25), sx * 3.4, 4.5, 0), c: STONE_D },
      {
        g: put(
          new THREE.ConeGeometry(0.9, 1.0, 4),
          sx * 3.4,
          5.5,
          0,
          Math.PI / 4,
        ),
        c: RED,
      },
    );
  }
  return parts;
}

const MAKE: Record<LandmarkType, (s: number) => Part[]> = {
  windmill,
  tower,
  lighthouse,
  gate,
};

// ---------- perakitan ----------

type Placed = {
  t: LandmarkType;
  x: number;
  y: number;
  z: number;
  yaw: number;
  s: number;
};

function toWorld(
  p: Placed,
  lx: number,
  ly: number,
  lz: number,
): [number, number, number] {
  const cs = Math.cos(p.yaw);
  const sn = Math.sin(p.yaw);
  return [p.x + lx * cs + lz * sn, p.y + ly, p.z - lx * sn + lz * cs];
}

function assemble() {
  const placed: Placed[] = [];
  LANDMARKS.forEach((b) => {
    const isGate = b.t === "gate";
    const x = isGate ? roadAt(b.z).x : b.x;
    const y = groundHeight(x, b.z);
    if (!isGate && (y < 0.4 || lakeDist(x, b.z) < (b.minLake ?? 1.25))) return;
    if (Math.hypot(x - HOUSE.x, b.z - HOUSE.z) < 25) return;
    const yaw = isGate ? roadAt(b.z).ang : Math.atan2(b.fx - x, b.fz - b.z);
    placed.push({ t: b.t, x, y, z: b.z, yaw, s: b.s ?? 1 });
  });

  const solid: THREE.BufferGeometry[] = [];
  const lit: THREE.BufferGeometry[] = [];
  const glows: Glow[] = [];
  const mills: Placed[] = [];
  const crystals: Placed[] = [];

  placed.forEach((p, i) => {
    const M = new THREE.Matrix4().makeRotationY(p.yaw);
    M.setPosition(p.x, p.y, p.z);
    for (const part of MAKE[p.t](p.s)) {
      part.g.applyMatrix4(M);
      (part.lit ? lit : solid).push(paint(part.g, part.c));
    }
    if (p.t === "windmill") mills.push(p);
    if (p.t === "tower") {
      crystals.push(p);
      glows.push({
        pos: toWorld(p, 0, 20.9, 0),
        color: "#8fe0ff",
        size: 9,
        base: 0.7,
        seed: i,
      });
    }
    if (p.t === "lighthouse") {
      glows.push({
        pos: toWorld(p, 0, 11.25, 0),
        color: "#ffd479",
        size: 16,
        base: 0.8,
        seed: i,
      });
    }
    if (p.t === "gate") {
      glows.push({
        pos: toWorld(p, 0, 3.35, 0),
        color: "#ffb866",
        size: 4.5,
        base: 0.7,
        seed: i,
      });
    }
  });

  return {
    solid: solid.length ? mergeGeometries(solid, false) : null,
    lit: lit.length ? mergeGeometries(lit, false) : null,
    glows,
    mills,
    crystals,
  };
}

// Empat bilah kincir + layar kain, berputar di sekitar sumbu z lokalnya.
function bladeGeometry(s: number) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const rz = (i * Math.PI) / 2;
    parts.push(paint(put(box(0.3, 7.2 * s, 0.15), 0, 3.6 * s, 0, 0, rz), BEAM));
    parts.push(
      paint(
        put(box(1.3 * s, 3.2 * s, 0.06), 0.85 * s, 4.4 * s, 0.12, 0, rz),
        SAIL,
      ),
    );
  }
  parts.push(
    paint(put(new THREE.SphereGeometry(0.45 * s, 8, 6), 0, 0, 0.1), BEAM),
  );
  return mergeGeometries(parts, false);
}

function Blades({ p, reduceMotion }: { p: Placed; reduceMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => bladeGeometry(p.s), [p.s]);
  useEffect(() => () => geo?.dispose(), [geo]);
  useFrame((_, dt) => {
    if (!reduceMotion && ref.current) ref.current.rotation.z -= dt * 0.35;
  });
  if (!geo) return null;
  return (
    <group position={[p.x, p.y + 6.8 * p.s - 0.8, p.z]} rotation-y={p.yaw}>
      <mesh
        ref={ref}
        geometry={geo}
        position={[0, 0, 2.1 * p.s]}
        frustumCulled={false}
      >
        <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Crystal({ p, reduceMotion }: { p: Placed; reduceMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    if (reduceMotion || !ref.current) return;
    const t = st.clock.elapsedTime;
    ref.current.position.y = p.y + 20.9 + Math.sin(t * 0.9) * 0.35;
    ref.current.rotation.y = t * 0.6;
  });
  return (
    <mesh ref={ref} position={[p.x, p.y + 20.9, p.z]} scale={[0.6, 0.95, 0.6]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#9fe6ff" />
    </mesh>
  );
}

function GlowSprite({ g, reduceMotion }: { g: Glow; reduceMotion: boolean }) {
  const map = useMemo(getGlow, []);
  const mat = useRef<THREE.SpriteMaterial>(null);
  useFrame((st) => {
    if (reduceMotion || !mat.current) return;
    mat.current.opacity =
      g.base * (0.8 + 0.2 * Math.sin(st.clock.elapsedTime * 1.3 + g.seed * 2));
  });
  return (
    <sprite position={g.pos} scale={[g.size, g.size, 1]}>
      <spriteMaterial
        ref={mat}
        map={map}
        color={g.color}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={g.base}
      />
    </sprite>
  );
}

export default function Landmarks({ reduceMotion }: { reduceMotion: boolean }) {
  const a = useMemo(assemble, []);
  useEffect(
    () => () => {
      a.solid?.dispose();
      a.lit?.dispose();
    },
    [a],
  );

  return (
    <group>
      {a.solid && (
        <mesh geometry={a.solid} frustumCulled={false}>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
      {a.lit && (
        <mesh geometry={a.lit} frustumCulled={false}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
        </mesh>
      )}
      {a.mills.map((p, i) => (
        <Blades key={`m${i}`} p={p} reduceMotion={reduceMotion} />
      ))}
      {a.crystals.map((p, i) => (
        <Crystal key={`c${i}`} p={p} reduceMotion={reduceMotion} />
      ))}
      {a.glows.map((g, i) => (
        <GlowSprite key={`g${i}`} g={g} reduceMotion={reduceMotion} />
      ))}
    </group>
  );
}
