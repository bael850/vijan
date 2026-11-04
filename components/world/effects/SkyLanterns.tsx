"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayState } from "../core/dayCycle";
import { hash, smoothstep } from "../core/math";
import { groundHeight } from "../terrain/heightmap";
import { BUILDINGS } from "../village/villageLayout";

// Lentera langit: dilepas dari sekitar rumah-rumah desa, naik pelan sambil bergoyang,
// lalu menghilang di atas. Hanya titik bercahaya (satu draw call), jadi ringan untuk HP.
const RISE = 70; // tinggi pendakian dari tanah
const PERIOD = 90; // detik untuk satu siklus penuh (paling lambat)

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uRise;
  attribute vec3 aSrc;
  attribute vec4 aSeed; // fase, kecepatan, warna, ukuran
  varying float vA;
  varying float vHue;
  void main() {
    float t = fract(uTime * aSeed.y + aSeed.x);
    float h = t * uRise;
    vec3 w = aSrc;
    w.y += 4.0 + h;
    w.x += sin(uTime * 0.21 + aSeed.x * 40.0) * (1.5 + t * 7.0) + t * 14.0;
    w.z += cos(uTime * 0.17 + aSeed.x * 31.0) * (1.5 + t * 7.0) - t * 6.0;
    vec4 mv = viewMatrix * vec4(w, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSeed.w * 260.0 / -mv.z, 2.0, 22.0);
    float sway = 0.8 + 0.2 * sin(uTime * 1.7 + aSeed.x * 60.0);
    vA = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.7, 1.0, t))
      * (1.0 - smoothstep(160.0, 320.0, -mv.z)) * sway;
    vHue = aSeed.z;
  }
`;

const FRAG = /* glsl */ `
  uniform float uShow;
  varying float vA;
  varying float vHue;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float halo = smoothstep(0.5, 0.0, r);
    halo *= halo;
    float core = smoothstep(0.16, 0.0, r);
    vec3 warm = vec3(1.0, 0.62, 0.25);
    vec3 rose = vec3(1.0, 0.45, 0.4);
    vec3 teal = vec3(0.45, 0.95, 0.85);
    vec3 c = vHue < 0.6 ? warm : (vHue < 0.85 ? rose : teal);
    c = mix(c, vec3(1.0, 0.95, 0.8), core);
    float a = (halo * 0.8 + core) * vA * uShow;
    gl_FragColor = vec4(c * a, a);
  }
`;

export default function SkyLanterns({
  amount,
  reduceMotion,
}: {
  amount: number;
  reduceMotion: boolean;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const src = new Float32Array(amount * 3);
    const seed = new Float32Array(amount * 4);
    const homes = BUILDINGS;
    for (let i = 0; i < amount; i++) {
      const b = homes[Math.floor(hash(i, 11) * homes.length)];
      const x = b.x + (hash(i, 12) - 0.5) * 16;
      const z = b.z + (hash(i, 13) - 0.5) * 16;
      src.set([x, groundHeight(x, z), z], i * 3);
      const c = hash(i, 14);
      seed.set(
        [
          hash(i, 15),
          1 / (PERIOD * (0.55 + hash(i, 16) * 0.45)),
          c,
          0.55 + hash(i, 17) * 0.6,
        ],
        i * 4,
      );
    }
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(amount * 3), 3),
    );
    g.setAttribute("aSrc", new THREE.BufferAttribute(src, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    return g;
  }, [amount]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uRise: { value: RISE },
          uShow: { value: 1 },
        },
      }),
    [],
  );

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
    // lentera dilepas dari sore; di siang terang tidak terlihat
    mat.uniforms.uShow.value = 1 - smoothstep(0.3, 0.8, dayState.daylight);
  });

  if (amount <= 0) return null;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
