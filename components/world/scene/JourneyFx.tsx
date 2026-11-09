"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import type { ChapterId } from "../config/route";
import { dayState } from "../core/dayCycle";
import { getGlowWhite } from "../core/glow";
import { roomMode } from "../core/lightPool";
import { weather } from "../core/weather";
import { chapterAt } from "../core/route";

// Efek perjalanan: butir cahaya kecil yang melayang di sekitar kamera sepanjang jalur, supaya dunia terasa
// bernapas dan bergerak walau pengunjung diam. Siang berupa serbuk keemasan di sinar matahari, malam berupa
// pijar sihir yang lebih terang. Warna dan kepadatannya berganti pelan di tiap bab.
// Semua gerak dihitung di shader dan titiknya selalu berputar di sekitar kamera: satu panggilan gambar,
// tanpa kerja per titik di CPU. Ubah angka di bagian atas file, jangan di tempat lain.

const COUNT: Record<GraphicsQuality, number> = {
  low: 70,
  medium: 140,
  high: 240,
};
const BOX = 38; // lebar kotak butir di sekitar kamera (m)
const HEIGHT = 12; // tinggi kotak (m), dari 3 m di bawah mata ke atas
const SIZE = [0.05, 0.14] as const; // ukuran butir di dunia (m)
const DAY_ALPHA = 0.34; // seberapa tampak butir di siang hari (0 = hilang)
const NIGHT_ALPHA = 0.85; // dan di malam hari
const FADE = 1.6; // kecepatan warna dan kepadatan berganti saat pindah bab (makin besar makin cepat)

type Look = {
  day: string; // warna siang
  night: string; // warna malam
  density: number; // 0..1, bagian butir yang tampak
};

// Suasana tiap bab. Desa sudah punya kunang-kunang sendiri, jadi butir di sana dibuat lebih jarang.
const LOOK: Record<ChapterId, Look> = {
  gerbangWaktu: { day: "#cfeeff", night: "#7fd6ff", density: 1 },
  desa: { day: "#ffe6a8", night: "#d6ff9a", density: 0.45 },
  gerbangKerajaan: { day: "#fff0c8", night: "#ffd9a0", density: 0.8 },
  kota: { day: "#ffd890", night: "#ffc070", density: 0.8 },
  istana: { day: "#eadaff", night: "#c9a8ff", density: 1 },
  rumah: { day: "#ffe2b0", night: "#ffd29a", density: 0.6 },
  danau: { day: "#d8f0ff", night: "#9ad8ff", density: 1 },
};

const VERT = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform vec3 uCam;
  uniform float uBox;
  uniform float uHeight;
  uniform vec2 uDrift;
  uniform float uScale;
  uniform float uDensity;
  uniform vec2 uSize;
  varying float vAlpha;
  void main() {
    vec2 drift = uDrift
      + vec2(sin(uTime * 0.31 + aSeed.x * 40.0), cos(uTime * 0.27 + aSeed.y * 40.0)) * (0.8 + aSeed.w * 1.4);
    vec2 rel = mod(aSeed.xz * uBox + drift - uCam.xz, uBox) - uBox * 0.5;
    float rise = 0.06 + aSeed.w * 0.16;
    float hy = mod(aSeed.y * uHeight + uTime * rise
      + sin(uTime * 0.5 + aSeed.z * 30.0) * 0.4, uHeight);
    vec3 world = vec3(uCam.x + rel.x, uCam.y - 3.0 + hy, uCam.z + rel.y);
    vec4 mv = viewMatrix * vec4(world, 1.0);
    float dist = -mv.z;
    float edge = 1.0 - smoothstep(0.62, 1.0, length(rel) / (uBox * 0.5));
    float vert = smoothstep(0.0, 1.5, hy) * (1.0 - smoothstep(uHeight - 3.0, uHeight, hy));
    float near = smoothstep(0.7, 2.2, dist);
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed.w * 2.2) + aSeed.x * 60.0);
    float keep = 1.0 - smoothstep(uDensity - 0.04, uDensity, aSeed.z);
    vAlpha = edge * vert * near * twinkle * keep;
    gl_PointSize = (uSize.x + aSeed.w * (uSize.y - uSize.x)) * uScale / max(dist, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vAlpha;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(uColor, t.a * vAlpha * uAlpha);
  }
`;

export default function JourneyFx({
  quality,
  camDist,
  reduceMotion,
}: {
  quality: GraphicsQuality;
  camDist: MutableRefObject<number>;
  reduceMotion: boolean;
}) {
  const { gl } = useThree();
  const pts = useRef<THREE.Points>(null);
  const size = useMemo(() => new THREE.Vector2(), []);
  const built = useMemo(() => {
    const n = COUNT[quality];
    const seed = new Float32Array(n * 4);
    // butir disebar rata dengan angka acak tetap (bukan Math.random) supaya sama tiap muat
    let a = 7;
    const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < seed.length; i++) seed[i] = r();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3),
    );
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uMap: { value: getGlowWhite() },
        uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uBox: { value: BOX },
        uHeight: { value: HEIGHT },
        uDrift: { value: new THREE.Vector2() },
        uScale: { value: 500 },
        uDensity: { value: 1 },
        uSize: { value: new THREE.Vector2(SIZE[0], SIZE[1]) },
        uColor: { value: new THREE.Color("#cfeeff") },
        uAlpha: { value: 0 },
      },
    });
    return { geo, mat };
  }, [quality]);

  useEffect(
    () => () => {
      built.geo.dispose();
      built.mat.dispose();
    },
    [built],
  );

  const col = useMemo(() => new THREE.Color(), []);
  const dayC = useMemo(() => new THREE.Color(), []);
  const nightC = useMemo(() => new THREE.Color(), []);
  const density = useRef(1);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const u = built.mat.uniforms;
    const look = LOOK[chapterAt(camDist.current)];

    // warna dan kepadatan berganti pelan antarbab
    const k = 1 - Math.exp(-FADE * dt);
    dayC.set(look.day);
    nightC.set(look.night);
    col.copy(dayC).lerp(nightC, 1 - dayState.daylight);
    u.uColor.value.lerp(col, k);
    density.current += (look.density - density.current) * k;
    u.uDensity.value = density.current;

    // siang tipis, malam terang. Di dalam rumah hilang (di sana ada debu cahaya sendiri).
    const a = DAY_ALPHA + (NIGHT_ALPHA - DAY_ALPHA) * (1 - dayState.daylight);
    const alpha = a * (1 - roomMode.k);
    u.uAlpha.value = alpha;
    if (pts.current) pts.current.visible = alpha > 0.01;

    u.uTime.value = clock.elapsedTime * (reduceMotion ? 0.3 : 1);
    // hanyut searah angin; diakumulasi supaya tidak melompat saat angin berubah, dan makin cepat saat berhembus
    const dr = dt * 0.7 * (reduceMotion ? 0.3 : 1) * (1 + weather.gust * 1.5);
    u.uDrift.value.x += weather.wind.x * dr;
    u.uDrift.value.y += weather.wind.y * dr;
    u.uCam.value.copy(camera.position);
    gl.getDrawingBufferSize(size);
    u.uScale.value = size.y * 0.5;
  });

  return (
    <points
      ref={pts}
      geometry={built.geo}
      material={built.mat}
      frustumCulled={false}
      renderOrder={5}
      userData={{ noShadow: true }}
    />
  );
}
