"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { FISH } from "../config/fish";
import { LIGHT } from "../config/light";
import { LAKE } from "../config/world";
import { PALETTE } from "../core/palette";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { splash } from "./splashBus";

const rr = (r: [number, number]) => r[0] + Math.random() * (r[1] - r[0]);

// ---------- ikan yang berenang ----------
// Tiap ikan berputar pelan di lintasan oval dalam danau. Gerak dan liukan ekor dihitung di GPU.
// Ikan digambar setelah air dan tidak menulis kedalaman, jadi tampak "menembus" air dengan samar;
// tanah dan dermaga tetap menutupinya karena benda padat sudah digambar lebih dulu.
const VERT = /* glsl */ `
  uniform float uTime;
  attribute vec4 aOrbit; // pusat x, pusat z, jari-jari, kecepatan sudut (rad/s, bertanda)
  attribute vec4 aFish;  // fase, kedalaman, ukuran, warna
  varying float vTint;
  varying float vU;
  varying float vZ;
  varying float vDist;
  void main() {
    float a = aFish.x + uTime * aOrbit.w;
    float r = aOrbit.z;
    vec2 c = aOrbit.xy + vec2(cos(a) * r, sin(a) * r * 0.7);
    vec2 t = vec2(-sin(a) * r, cos(a) * r * 0.7) * sign(aOrbit.w);
    vec2 fwd = t / max(length(t), 0.0001);
    vec2 right = vec2(fwd.y, -fwd.x);

    vec3 l = position;
    float tail = 1.0 - smoothstep(-0.8, 0.3, l.z);
    l.x += sin(uTime * 9.0 - l.z * 6.0 + aFish.x * 20.0) * 0.11 * tail * tail;
    l *= aFish.z;

    float y = -aFish.y + sin(uTime * 0.7 + aFish.x * 9.0) * 0.07;
    vec3 w = vec3(c.x + right.x * l.x + fwd.x * l.z, y, c.y + right.y * l.x + fwd.y * l.z);
    vTint = aFish.w;
    vU = position.x / 0.17;
    vZ = position.z;
    vDist = distance(cameraPosition, w);
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uA;
  uniform vec3 uB;
  uniform vec3 uC;
  uniform vec3 uWater;
  uniform vec3 uFogColor;
  uniform vec2 uFog;
  uniform float uAlpha;
  uniform float uGlow;
  varying float vTint;
  varying float vU;
  varying float vZ;
  varying float vDist;
  void main() {
    vec3 base = mix(mix(uA, uB, step(0.4, vTint)), uC, step(0.75, vTint));
    float belly = 1.0 - abs(vU);
    vec3 col = base * (0.55 + 0.6 * belly) * uGlow;
    // bercak gelap di punggung, seperti ikan koi
    col *= 1.0 - 0.28 * smoothstep(0.55, 0.9, sin(vZ * 17.0 + vTint * 9.0)) * (1.0 - abs(vU));
    col = mix(col, uWater, 0.3);
    float fogF = smoothstep(uFog.x, uFog.y, vDist) * 0.85;
    col = mix(col, uFogColor, fogF);
    float a = uAlpha * mix(0.5, 1.0, smoothstep(-0.8, -0.5, vZ)) * (1.0 - fogF * 0.6);
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Siluet ikan dari atas: badan lonjong, pangkal ekor sempit, sirip ekor melebar. Panjang total 1.3, hidung di +z.
const OUTLINE: [number, number][] = [
  [0.5, 0],
  [0.44, 0.06],
  [0.3, 0.125],
  [0.1, 0.16],
  [-0.15, 0.135],
  [-0.35, 0.07],
  [-0.48, 0.035],
  [-0.56, 0.04],
  [-0.68, 0.13],
  [-0.8, 0.17],
];

function outlineWidth(z: number) {
  for (let i = 1; i < OUTLINE.length; i++) {
    const [z0, w0] = OUTLINE[i - 1];
    const [z1, w1] = OUTLINE[i];
    if (z <= z0 && z >= z1) return w0 + ((w1 - w0) * (z0 - z)) / (z0 - z1);
  }
  return 0;
}

function buildSwimmers(amount: number) {
  const rows = 26;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < rows; i++) {
    const z = 0.5 - (1.3 * i) / (rows - 1);
    const w = outlineWidth(z);
    pos.push(-w, 0, z, w, 0, z);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);

  const orbit = new Float32Array(amount * 4);
  const info = new Float32Array(amount * 4);
  for (let i = 0; i < amount; i++) {
    let ok = false;
    for (let tries = 0; tries < 60 && !ok; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const k = 0.1 + 0.5 * Math.sqrt(Math.random());
      const cx = LAKE.x + Math.cos(ang) * k * LAKE.rx;
      const cz = LAKE.z + Math.sin(ang) * k * LAKE.rz;
      const r = rr(FISH.orbit);
      const depth = rr(FISH.depth);
      // lintasan harus seluruhnya di air yang cukup dalam
      ok = true;
      for (let s = 0; s < 12 && ok; s++) {
        const a = (s / 12) * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r * 0.7;
        if (lakeDist(x, z) > 0.82 || groundHeight(x, z) > -(depth + 0.35)) {
          ok = false;
        }
      }
      if (!ok) continue;
      const sign = Math.random() < 0.5 ? -1 : 1;
      orbit.set([cx, cz, r, (sign * rr(FISH.speed)) / r], i * 4);
      info.set(
        [Math.random() * 6.283, depth, rr(FISH.size), Math.random()],
        i * 4,
      );
    }
    // gagal menemukan lintasan: ukuran 0 = ikan tidak tampak
  }
  g.setAttribute("aOrbit", new THREE.InstancedBufferAttribute(orbit, 4));
  g.setAttribute("aFish", new THREE.InstancedBufferAttribute(info, 4));
  g.instanceCount = amount;
  return g;
}

// ---------- ikan yang melompat ----------
type Jumper = {
  g: THREE.Group;
  flying: boolean;
  wait: number;
  u: number;
  x: number;
  z: number;
  dx: number;
  dz: number;
  h: number;
  dur: number;
  size: number;
  uUp: number;
  up: boolean;
  down: boolean;
};

function makeJumper(): Jumper {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.12, 0.72, 4, 10),
    new THREE.MeshBasicMaterial({ color: "#cfe3ee" }),
  );
  body.scale.set(0.7, 1, 1);
  const fin = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.32, 3),
    new THREE.MeshBasicMaterial({ color: "#f0a460" }),
  );
  fin.scale.set(0.25, 1, 1);
  fin.position.y = -0.62;
  g.add(body, fin);
  g.visible = false;
  g.frustumCulled = false;
  return {
    g,
    flying: false,
    wait: rr(FISH.jumpEvery),
    u: 0,
    x: 0,
    z: 0,
    dx: 0,
    dz: 0,
    h: 1,
    dur: 1,
    size: 1,
    uUp: 0.2,
    up: false,
    down: false,
  };
}

const UP = new THREE.Vector3(0, 1, 0);
const V = new THREE.Vector3();
const DIR = new THREE.Vector3();
const START_Y = -0.35; // ikan mulai dan berakhir sedikit di bawah permukaan

export default function Fish({
  quality,
  reduceMotion,
}: {
  quality: GraphicsQuality;
  reduceMotion: boolean;
}) {
  const amount = FISH.count[quality];
  const geo = useMemo(() => buildSwimmers(amount), [amount]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uA: { value: new THREE.Color("#ff9a4a") },
          uB: { value: new THREE.Color("#ffe08a") },
          uC: { value: new THREE.Color("#9fe0dc") },
          uWater: { value: new THREE.Color(PALETTE.waterMid) },
          uFogColor: { value: new THREE.Color(LIGHT.fog.colorStart) },
          uFog: {
            value: new THREE.Vector2(LIGHT.fog.nearStart, LIGHT.fog.farStart),
          },
          uAlpha: { value: FISH.alpha },
          uGlow: { value: FISH.glow },
        },
      }),
    [],
  );

  const jumpN = reduceMotion ? 0 : FISH.jumpers[quality];
  const jumpers = useMemo(
    () => Array.from({ length: jumpN }, makeJumper),
    [jumpN],
  );
  const jumpRoot = useMemo(() => {
    const r = new THREE.Group();
    jumpers.forEach((j) => r.add(j.g));
    return r;
  }, [jumpers]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      jumpers.forEach((j) =>
        j.g.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        }),
      );
    },
    [geo, mat, jumpers],
  );

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    mat.uniforms.uTime.value += dt;
    const fog = state.scene.fog as THREE.Fog | null;
    if (fog) {
      mat.uniforms.uFogColor.value.copy(fog.color);
      mat.uniforms.uFog.value.set(fog.near, fog.far);
    }

    const cam = state.camera.position;
    for (const j of jumpers) {
      if (!j.flying) {
        j.wait -= dt;
        if (j.wait > 0) continue;
        // jangan melompat kalau kamera jauh dari danau (misalnya di dalam rumah)
        if (lakeDist(cam.x, cam.z) > 2.4) {
          j.wait = 3;
          continue;
        }
        state.camera.getWorldDirection(DIR);
        const yaw = Math.atan2(DIR.x, DIR.z);
        let found = false;
        for (let i = 0; i < 12 && !found; i++) {
          const a = yaw + (Math.random() - 0.5) * 1.3;
          const d = rr(FISH.jumpRange);
          const x = cam.x + Math.sin(a) * d;
          const z = cam.z + Math.cos(a) * d;
          if (lakeDist(x, z) < 0.7) {
            j.x = x;
            j.z = z;
            found = true;
          }
        }
        if (!found) {
          j.wait = 1.5;
          continue;
        }
        const heading = Math.random() * Math.PI * 2;
        const len = rr(FISH.jumpLength);
        j.dx = Math.sin(heading) * len;
        j.dz = Math.cos(heading) * len;
        j.h = rr(FISH.jumpHeight);
        j.dur = FISH.jumpTime * (0.8 + Math.random() * 0.4);
        j.size = rr(FISH.jumpSize);
        j.u = 0;
        j.up = false;
        j.down = false;
        // saat melewati permukaan: START_Y + (h - START_Y) * 4u(1-u) = 0
        const k = -START_Y / (j.h - START_Y);
        j.uUp = (1 - Math.sqrt(1 - k)) / 2;
        j.flying = true;
      }

      j.u += dt / j.dur;
      const u = j.u;
      const px = j.x + j.dx * Math.min(u, 1);
      const pz = j.z + j.dz * Math.min(u, 1);
      if (!j.up && u >= j.uUp) {
        j.up = true;
        splash(px, pz, 0.8);
      }
      if (!j.down && u >= 1 - j.uUp) {
        j.down = true;
        splash(px, pz, 1.1);
      }
      if (u >= 1) {
        j.flying = false;
        j.g.visible = false;
        j.wait = rr(FISH.jumpEvery);
        continue;
      }
      const lift = (j.h - START_Y) * 4;
      const py = START_Y + lift * u * (1 - u);
      V.set(j.dx, lift * (1 - 2 * u), j.dz).normalize();
      j.g.position.set(px, py, pz);
      j.g.quaternion.setFromUnitVectors(UP, V);
      j.g.scale.setScalar(j.size);
      j.g.visible = true;
    }
  });

  return (
    <>
      {amount > 0 && (
        <mesh
          geometry={geo}
          material={mat}
          frustumCulled={false}
          renderOrder={3}
        />
      )}
      {jumpN > 0 && <primitive object={jumpRoot} />}
    </>
  );
}
