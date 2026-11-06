"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { dayState } from "../../core/dayCycle";
import { getGlowWhite } from "../../core/glow";
import { ROUTE_LENGTH, routePointAt } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";

// Efek hidup di desa, semuanya dihitung di shader (tanpa kerja per frame di CPU selain mengisi waktu):
// asap cerobong, kunang-kunang di malam hari, dan daun yang melayang jatuh.
// Tiap efek satu panggilan gambar. Jumlah titik mengikuti kualitas grafis.

const SMOKE_PER: Record<GraphicsQuality, number> = {
  low: 5,
  medium: 8,
  high: 11,
};
const FLIES: Record<GraphicsQuality, number> = {
  low: 30,
  medium: 70,
  high: 130,
};
const LEAVES: Record<GraphicsQuality, number> = {
  low: 30,
  medium: 70,
  high: 120,
};
const WIND = new THREE.Vector2(0.55, 0.2); // arah angin (x, z), dipakai asap dan daun

function rnd(seed: number) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Sebar titik di sekitar jalur lewat desa (z antara 105 dan -118).
function scatter(n: number, minOff: number, maxOff: number, seed: number) {
  let d0 = 0;
  let d1 = ROUTE_LENGTH;
  for (let d = 0; d < ROUTE_LENGTH; d += 4)
    if (routePointAt(d).z < 105) {
      d0 = d;
      break;
    }
  for (let d = d0; d < ROUTE_LENGTH; d += 4)
    if (routePointAt(d).z < -118) {
      d1 = d;
      break;
    }
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p = routePointAt(d0 + rnd(seed + i * 3) * (d1 - d0));
    const off =
      (rnd(seed + i * 3 + 1) < 0.5 ? -1 : 1) *
      (minOff + rnd(seed + i * 3 + 2) * (maxOff - minOff));
    out.push({ x: p.x - p.tz * off, z: p.z + p.tx * off });
  }
  return out;
}

const COMMON = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform vec2 uWind;
`;

const SMOKE_V = /* glsl */ `${COMMON}
  attribute float aSeed;
  varying float vA;
  void main() {
    float t = fract(uTime * 0.11 + aSeed);
    vec3 p = position;
    p.y += t * 8.5;
    p.xz += uWind * (t * t * 7.0) + vec2(sin(t * 5.0 + aSeed * 40.0), cos(t * 4.0 + aSeed * 33.0)) * 0.35 * t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (0.45 + 2.4 * t) * uScale / -mv.z;
    vA = smoothstep(0.0, 0.07, t) * (1.0 - t) * (1.0 - smoothstep(100.0, 190.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const SPRITE_F = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uAmt;
  varying float vA;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a * vA * uAmt;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

const FLY_V = /* glsl */ `${COMMON}
  attribute float aSeed;
  varying float vA;
  void main() {
    float s = aSeed * 50.0;
    vec3 p = position;
    p += vec3(sin(uTime * 0.4 + s), sin(uTime * 0.55 + s * 1.3) * 0.5, cos(uTime * 0.35 + s * 0.7)) * 1.1;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float blink = smoothstep(0.1, 0.95, sin(uTime * (0.7 + aSeed * 0.8) + s) * 0.5 + 0.5);
    gl_PointSize = 0.3 * uScale / -mv.z * (0.6 + 0.4 * blink);
    vA = blink * (1.0 - smoothstep(60.0, 110.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const LEAF_V = /* glsl */ `${COMMON}
  uniform float uLight;
  attribute float aSeed;
  attribute vec3 aColor;
  varying float vA;
  varying vec3 vC;
  varying float vAng;
  void main() {
    float t = fract(uTime * 0.045 + aSeed);
    vec3 p = position;
    p.y += (1.0 - t) * 13.0 + 0.1;
    p.x += sin(t * 18.0 + aSeed * 40.0) * 1.2 + uWind.x * t * 10.0;
    p.z += cos(t * 15.0 + aSeed * 30.0) * 1.0 + uWind.y * t * 10.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 0.3 * uScale / -mv.z;
    vA = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.94, 1.0, t)) * (1.0 - smoothstep(50.0, 90.0, -mv.z));
    vC = aColor * uLight;
    vAng = uTime * 1.7 + aSeed * 20.0;
    gl_Position = projectionMatrix * mv;
  }
`;

const LEAF_F = /* glsl */ `
  varying float vA;
  varying vec3 vC;
  varying float vAng;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float s = sin(vAng);
    float k = cos(vAng);
    c = vec2(c.x * k - c.y * s, c.x * s + c.y * k);
    if (length(vec2(c.x * 1.0, c.y * 2.6)) > 0.42 || vA < 0.02) discard;
    gl_FragColor = vec4(vC, vA);
  }
`;

type Spot = { x: number; y: number; z: number };

export default function VillageFx({
  quality,
  chimneys,
}: {
  quality: GraphicsQuality;
  chimneys: Spot[];
}) {
  const map = useMemo(getGlowWhite, []);

  const shared = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: 800 },
      uWind: { value: WIND },
    }),
    [],
  );

  const smoke = useMemo(() => {
    const per = SMOKE_PER[quality];
    const pos: number[] = [];
    const seed: number[] = [];
    chimneys.forEach((c, ci) => {
      for (let i = 0; i < per; i++) {
        pos.push(c.x, c.y, c.z);
        seed.push((i + rnd(ci * 11 + i)) / per);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    return g;
  }, [quality, chimneys]);

  const flies = useMemo(() => {
    const pts = scatter(FLIES[quality], 5, 26, 101);
    const pos: number[] = [];
    const seed: number[] = [];
    pts.forEach((p, i) => {
      pos.push(p.x, groundHeight(p.x, p.z) + 0.6 + rnd(i + 5) * 1.8, p.z);
      seed.push(rnd(i + 77));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    return g;
  }, [quality]);

  const leaves = useMemo(() => {
    const pts = scatter(LEAVES[quality], 3, 34, 303);
    const palette = ["#d9b43c", "#c8742f", "#8fae3c", "#b4452f"].map(
      (c) => new THREE.Color(c),
    );
    const pos: number[] = [];
    const seed: number[] = [];
    const col: number[] = [];
    pts.forEach((p, i) => {
      pos.push(p.x, groundHeight(p.x, p.z), p.z);
      seed.push(rnd(i + 9));
      const c = palette[Math.floor(rnd(i + 31) * palette.length)];
      col.push(c.r, c.g, c.b);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [quality]);

  const mats = useMemo(() => {
    const smokeMat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uMap: { value: map },
        uColor: { value: new THREE.Color("#cfc8bc") },
        uAmt: { value: 0.5 },
      },
      vertexShader: SMOKE_V,
      fragmentShader: SPRITE_F,
      transparent: true,
      depthWrite: false,
    });
    const flyMat = new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uMap: { value: map },
        uColor: { value: new THREE.Color("#d8ff7a") },
        uAmt: { value: 0 },
      },
      vertexShader: FLY_V,
      fragmentShader: SPRITE_F,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const leafMat = new THREE.ShaderMaterial({
      uniforms: { ...shared, uLight: { value: 1 } },
      vertexShader: LEAF_V,
      fragmentShader: LEAF_F,
      transparent: true,
      depthWrite: false,
    });
    return { smokeMat, flyMat, leafMat };
  }, [shared, map]);

  const flyRef = useRef<THREE.Points>(null);

  useFrame(({ clock, gl, camera }) => {
    const cam = camera as THREE.PerspectiveCamera;
    shared.uTime.value = clock.elapsedTime;
    shared.uScale.value =
      (gl.domElement.height * 0.5) / Math.tan((cam.fov * Math.PI) / 360);
    const night = dayState.lamps;
    mats.flyMat.uniforms.uAmt.value = night;
    mats.leafMat.uniforms.uLight.value = 0.3 + 0.7 * dayState.daylight;
    // asap lebih gelap dan tipis saat malam
    mats.smokeMat.uniforms.uAmt.value = 0.22 + 0.3 * dayState.daylight;
    if (flyRef.current) flyRef.current.visible = night > 0.02;
  });

  useEffect(
    () => () => {
      smoke.dispose();
      flies.dispose();
      leaves.dispose();
      mats.smokeMat.dispose();
      mats.flyMat.dispose();
      mats.leafMat.dispose();
    },
    [smoke, flies, leaves, mats],
  );

  return (
    <>
      <points
        geometry={smoke}
        material={mats.smokeMat}
        frustumCulled={false}
        renderOrder={2}
      />
      <points
        ref={flyRef}
        geometry={flies}
        material={mats.flyMat}
        frustumCulled={false}
        renderOrder={3}
      />
      <points
        geometry={leaves}
        material={mats.leafMat}
        frustumCulled={false}
        renderOrder={2}
      />
    </>
  );
}
