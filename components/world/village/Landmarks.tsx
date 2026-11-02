"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HOUSE } from "../config/world";
import { getGlow } from "../core/glow";
import { dayState } from "../core/dayCycle";
import { LitMesh } from "../core/nightLights";
import { roadAt } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { LANDMARKS, type LandmarkType } from "./villageLayout";

// Bangunan penanda. Badan dan jendela digabung jadi dua mesh (seperti Village).
// Yang bergerak dipisah: baling-baling kincir, kristal menara, dan cahaya berdenyut.
// Dasar ditanam 0.8 ke tanah. Sisi depan = +z lokal.

type Part = {
  g: THREE.BufferGeometry;
  c: string;
  lit?: boolean;
  stone?: boolean;
};
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
const SLIT = "#14110d";
const IRON_C = "#2b2724";
const FLAME = "#ff8a2a";
const GOLD = "#c9a24a";

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

// Gerbang kerajaan: dua menara, lengkung batu di atas bukaan, dan tembok panjang
// yang mengikuti kontur tanah ke kiri-kanan. Daun pintunya ada di GateDoors.tsx.
// Sisi pendatang = -z lokal. Dasar ditanam dalam supaya tembok menyatu dengan bukit.
const GATE = {
  half: 3.0,
  towerW: 3.2,
  seg: 6, // panjang satu segmen tembok
  nSeg: 8, // 8 x 6 = 48 m per sisi (dulu 30)
  wallH: 6.5, // tinggi tembok di atas titik tanah tertinggi segmen
};
const GATE_WALL_START = GATE.half + GATE.towerW;
// lentera dinding di muka menara, mengapit pintu (tidak lagi menggantung di depan pintu)
const LANTERN_POS = (sx: number): [number, number, number] => [
  sx * 3.7,
  4.3,
  -2.05,
];

// tinggi tanah relatif ke dasar gerbang, pada x lokal tertentu
function gateDy(p: Placed, lx: number) {
  const w = toWorld(p, lx, 0, 0);
  return groundHeight(w[0], w[2]) - p.y;
}
// posisi nyala obor (lokal) di tiap sisi
function torchPos(p: Placed, sx: number): [number, number, number] {
  const x = sx * (GATE_WALL_START + 1.4);
  return [x, gateDy(p, x) + 3.9, -1.25];
}

function gate(_s: number, p: Placed): Part[] {
  const parts: Part[] = [];
  const st = (g: THREE.BufferGeometry, c: string = STONE): Part => ({
    g,
    c,
    stone: true,
  });
  const tx = GATE.half + GATE.towerW / 2; // pusat menara

  // lengkung batu di atas bukaan + list profil + lambang
  parts.push(
    st(put(box(GATE.half * 2 + 0.4, 2.4, 2.0), 0, 6.3, 0)),
    st(put(box(GATE.half * 2 + 1.0, 0.45, 2.5), 0, 7.7, 0), STONE_D),
    st(put(box(GATE.half * 2 + 0.7, 0.28, 2.3), 0, 5.2, 0), STONE_D),
    { g: put(box(1.7, 1.2, 0.1), 0, 6.4, -1.05), c: RED },
    { g: put(box(0.55, 0.55, 0.06), 0, 6.4, -1.12), c: GOLD },
  );

  for (const sx of [-1, 1]) {
    // menara (dasar ditanam dalam)
    parts.push(
      st(put(box(GATE.towerW, 18, GATE.towerW), sx * tx, 4.1, 0)),
      st(
        put(box(GATE.towerW + 0.7, 0.5, GATE.towerW + 0.7), sx * tx, 12.4, 0),
        STONE_D,
      ),
      st(
        put(box(GATE.towerW + 0.5, 0.35, GATE.towerW + 0.5), sx * tx, 6.6, 0),
        STONE_D,
      ),
      {
        g: put(
          new THREE.ConeGeometry(2.6, 3.4, 4),
          sx * tx,
          14.7,
          0,
          Math.PI / 4,
        ),
        c: RED,
      },
      // celah jendela menyala di dua sisi
      {
        g: put(box(0.35, 1.2, 0.1), sx * tx, 9.2, -GATE.towerW / 2 - 0.02),
        c: WARM,
        lit: true,
      },
      {
        g: put(box(0.35, 1.2, 0.1), sx * tx, 9.2, GATE.towerW / 2 + 0.02),
        c: WARM,
        lit: true,
      },
      // panji merah di muka menara
      {
        g: put(box(1.3, 3.6, 0.06), sx * tx, 8.0, -GATE.towerW / 2 - 0.06),
        c: RED,
      },
      {
        g: put(box(1.3, 0.25, 0.08), sx * tx, 9.7, -GATE.towerW / 2 - 0.06),
        c: BEAM,
      },
    );
    // celah panah gelap di muka menara
    for (const dx of [-0.8, 0.8]) {
      parts.push({
        g: put(box(0.2, 1.3, 0.06), sx * tx + dx, 4.2, -GATE.towerW / 2 - 0.02),
        c: SLIT,
      });
    }

    // tembok per segmen, mengikuti tanah
    const xs = Array.from(
      { length: GATE.nSeg + 1 },
      (_, j) => GATE_WALL_START + j * GATE.seg,
    );
    const dy = xs.map((x) => gateDy(p, sx * x));
    const base: number[] = [];
    const top: number[] = [];
    for (let i = 0; i < GATE.nSeg; i++) {
      base.push(Math.min(dy[i], dy[i + 1]) - 3);
      top.push(Math.max(dy[i], dy[i + 1]) + GATE.wallH);
    }
    for (let i = 0; i < GATE.nSeg; i++) {
      const cx = sx * (xs[i] + GATE.seg / 2);
      const len = GATE.seg + 0.05;
      parts.push(
        st(put(box(len, top[i] - base[i], 1.8), cx, (top[i] + base[i]) / 2, 0)),
        st(put(box(len, 0.4, 2.1), cx, top[i], 0), STONE_D),
        {
          g: put(box(0.2, 1.1, 0.06), cx, top[i] - 2.6, -0.92),
          c: SLIT,
        },
      );
      // gerigi
      for (const k of [1, 3, 5]) {
        parts.push(
          st(put(box(1.0, 1.1, 1.8), sx * (xs[i] + k), top[i] + 0.75, 0)),
        );
      }
    }
    // penguat di tiap sambungan segmen
    for (let j = 1; j <= GATE.nSeg; j++) {
      const lo = Math.min(base[j - 1], j < GATE.nSeg ? base[j] : base[j - 1]);
      const hi =
        Math.max(top[j - 1], j < GATE.nSeg ? top[j] : top[j - 1]) - 0.8;
      parts.push(
        st(put(box(1.6, hi - lo, 2.8), sx * xs[j], (hi + lo) / 2, 0), STONE_D),
      );
    }

    // obor di dinding dekat menara
    const [ox, oy, oz] = torchPos(p, sx);
    parts.push(
      { g: put(box(0.12, 0.12, 0.4), ox, oy - 0.35, -1.05), c: IRON_C },
      { g: put(box(0.1, 0.8, 0.1), ox, oy - 0.1, oz), c: BEAM },
      { g: put(box(0.22, 0.1, 0.22), ox, oy + 0.32, oz), c: IRON_C },
      {
        g: put(new THREE.ConeGeometry(0.13, 0.42, 5), ox, oy + 0.58, oz),
        c: FLAME,
        lit: true,
      },
    );

    // lentera dinding: lengan besi, rantai, rangka, kaca menyala, atap
    const [lx, ly, lz] = LANTERN_POS(sx);
    parts.push(
      { g: put(box(0.08, 0.08, 0.5), lx, ly + 0.42, -1.85), c: IRON_C },
      { g: put(box(0.03, 0.16, 0.03), lx, ly + 0.34, lz), c: IRON_C },
      {
        g: put(
          new THREE.ConeGeometry(0.26, 0.16, 4),
          lx,
          ly + 0.27,
          lz,
          Math.PI / 4,
        ),
        c: IRON_C,
      },
      { g: put(box(0.36, 0.05, 0.36), lx, ly + 0.19, lz), c: IRON_C },
      { g: put(box(0.36, 0.05, 0.36), lx, ly - 0.19, lz), c: IRON_C },
      { g: put(box(0.23, 0.32, 0.23), lx, ly, lz), c: FLAME, lit: true },
    );
    for (const cx of [-0.15, 0.15]) {
      for (const cz of [-0.15, 0.15]) {
        parts.push({
          g: put(box(0.04, 0.36, 0.04), lx + cx, ly, lz + cz),
          c: IRON_C,
        });
      }
    }
  }

  return parts;
}

const MAKE: Record<LandmarkType, (s: number, p: Placed) => Part[]> = {
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
  const stone: THREE.BufferGeometry[] = [];
  let gateLights: [number, number, number][] = [];
  const lit: THREE.BufferGeometry[] = [];
  const glows: Glow[] = [];
  const mills: Placed[] = [];
  const crystals: Placed[] = [];

  placed.forEach((p, i) => {
    const M = new THREE.Matrix4().makeRotationY(p.yaw);
    M.setPosition(p.x, p.y, p.z);
    for (const part of MAKE[p.t](p.s, p)) {
      if (part.stone) {
        // koordinat & normal lokal disimpan untuk pola batu di shader
        const ng = paint(part.g, part.c);
        ng.setAttribute("aLoc", ng.attributes.position.clone());
        ng.setAttribute("aLn", ng.attributes.normal.clone());
        ng.deleteAttribute("uv");
        ng.applyMatrix4(M);
        stone.push(ng);
        continue;
      }
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
      gateLights = [];
      for (const sx of [-1, 1]) {
        const lp = LANTERN_POS(sx);
        gateLights.push(lp);
        glows.push({
          pos: toWorld(p, lp[0], lp[1], lp[2]),
          color: "#ff9a40",
          size: 2.6,
          base: 0.45,
          seed: i + sx,
        });
      }
      for (const sx of [-1, 1]) {
        const tp = torchPos(p, sx);
        gateLights.push(tp);
        glows.push({
          pos: toWorld(p, tp[0], tp[1] + 0.3, tp[2]),
          color: "#ff9a40",
          size: 2.8,
          base: 0.5,
          seed: i + sx * 3,
        });
      }
    }
  });

  return {
    solid: solid.length ? mergeGeometries(solid, false) : null,
    stone: stone.length ? mergeGeometries(stone, false) : null,
    gateLights,
    lit: lit.length ? mergeGeometries(lit, false) : null,
    glows,
    mills,
    crystals,
  };
}

// Material batu gerbang: pola susunan bata, variasi nada, lumut di bawah,
// gelap di dasar, dan cahaya hangat obor/lentera (posisi lokal, 3 sumber).
function makeStoneMat(lights: [number, number, number][]) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const L = [0, 1, 2, 3].map((i) => {
    const l = lights[i] ?? [0, -99, 0];
    return new THREE.Vector3(l[0], l[1], l[2]);
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uL = { value: L };
    sh.uniforms.uLamp = { value: 1 };
    mat.userData.sh = sh;
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec3 aLoc;\nattribute vec3 aLn;\nvarying vec3 vLoc;\nvarying vec3 vLn;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvLoc=aLoc;vLn=aLn;",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vLoc;
varying vec3 vLn;
uniform vec3 uL[4];
uniform float uLamp;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  vec3 an=abs(vLn);
  vec2 uv=(an.z>=an.x&&an.z>=an.y)?vLoc.xy:(an.x>=an.y?vLoc.zy:vLoc.xz);
  float rowH=0.6; float bw=1.3;
  float row=floor(uv.y/rowH);
  float x=uv.x/bw+0.5*mod(row,2.0);
  vec2 id=vec2(floor(x),row);
  vec2 f=vec2(fract(x),fract(uv.y/rowH));
  float edge=min(min(f.x,1.0-f.x)*bw,min(f.y,1.0-f.y)*rowH);
  float mortar=1.0-smoothstep(0.02,0.07,edge);
  float tone=0.78+0.40*h21(id);
  float grain=0.92+0.16*h21(floor(uv*14.0));
  diffuseColor.rgb*=tone*grain;
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*0.45,mortar);
  float moss=smoothstep(2.2,-1.0,vLoc.y)*(0.5+0.5*h21(floor(uv*5.0)+7.0));
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.22,0.30,0.12),moss*0.55*(1.0-mortar*0.5));
  diffuseColor.rgb*=0.72+0.28*smoothstep(-1.5,3.5,vLoc.y);
}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
for(int i=0;i<4;i++){
  vec3 d=uL[i]-vLoc; float dist=length(d);
  float fac=clamp(dot(normalize(d),normalize(vLn)),0.0,1.0);
  float att=1.0/(1.0+0.35*dist*dist);
  totalEmissiveRadiance+=vec3(1.0,0.62,0.28)*diffuseColor.rgb*fac*att*(i<2?0.9:1.3)*uLamp;
}`,
      );
  };
  return mat;
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
  const sp = useRef<THREE.Sprite>(null);
  useFrame((st) => {
    if (!mat.current) return;
    const flick = reduceMotion
      ? 1
      : 0.8 + 0.2 * Math.sin(st.clock.elapsedTime * 1.3 + g.seed * 2);
    const o = g.base * flick * dayState.lamps;
    mat.current.opacity = o;
    if (sp.current) sp.current.visible = o > 0.01;
  });
  return (
    <sprite ref={sp} position={g.pos} scale={[g.size, g.size, 1]}>
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
  const stoneMat = useMemo(() => makeStoneMat(a.gateLights), [a]);
  useFrame(() => {
    const sh = stoneMat.userData.sh as
      | THREE.WebGLProgramParametersWithUniforms
      | undefined;
    if (sh) sh.uniforms.uLamp.value = dayState.lamps;
  });
  useEffect(
    () => () => {
      a.stone?.dispose();
      stoneMat.dispose();
      a.solid?.dispose();
      a.lit?.dispose();
    },
    [a],
  );

  return (
    <group>
      {a.solid && (
        <mesh geometry={a.solid} frustumCulled={false} castShadow receiveShadow>
          <meshLambertMaterial vertexColors />
        </mesh>
      )}
      {a.stone && (
        <mesh
          geometry={a.stone}
          material={stoneMat}
          frustumCulled={false}
          castShadow
          receiveShadow
        />
      )}
      {a.lit && <LitMesh geometry={a.lit} />}
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
