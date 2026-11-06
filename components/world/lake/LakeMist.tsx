"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { dayState } from "../core/dayCycle";
import { smoothstep } from "../core/math";
import { LAKE, WATER_Y } from "../config/world";

// Kabut tipis yang melayang di atas danau saat fajar. Muncul sebelum matahari terbit,
// menipis saat hari terang. Beberapa lapis datar di ketinggian berbeda supaya terasa tebal.
const LAYERS: Record<GraphicsQuality, number> = { low: 1, medium: 2, high: 3 };
const HEIGHTS = [0.5, 1.3, 2.3]; // tinggi di atas permukaan air (m)
const OPACITY = [0.5, 0.4, 0.3]; // kepekatan tiap lapis
const SPREAD = 1.35; // bidang kabut sekian kali elips dasar, supaya menutup teluk dan tonjolan danau

const VERT = /* glsl */ `
  varying vec3 vW;
  varying float vDist;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uAmt;
  uniform float uWarm;
  uniform float uSeed;
  uniform vec4 uLake; // pusat x, z, setengah lebar, setengah panjang
  varying vec3 vW;
  varying float vDist;

  float h21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
    return s;
  }

  void main() {
    // kabut hanyut pelan ke arah angin
    vec2 p = vW.xz * 0.035 + vec2(uTime * 0.012, uTime * 0.006) + uSeed;
    float n = fbm(p) * 0.75 + fbm(p * 2.1 - uTime * 0.01) * 0.25;
    float cloud = smoothstep(0.32, 0.72, n);

    // memudar ke arah tepi elips danau
    vec2 e = (vW.xz - uLake.xy) / uLake.zw;
    float edge = 1.0 - smoothstep(0.7, 1.3, length(e));

    // jangan memotong layar saat kamera menembus lapisan, dan hilang di kejauhan
    float near = smoothstep(2.0, 14.0, vDist);
    float far = 1.0 - smoothstep(170.0, 320.0, vDist);

    float a = cloud * edge * near * far * uAmt;
    vec3 cool = vec3(0.74, 0.82, 0.86);
    vec3 warm = vec3(1.0, 0.8, 0.66);
    gl_FragColor = vec4(mix(cool, warm, uWarm * 0.55), a);
  }
`;

// 0 di luar fajar, 1 di puncak. Jam virtual dari dayCycle: fajar sekitar 05.00 sampai 09.00.
function mistAmount() {
  const h = dayState.hours;
  return smoothstep(4.6, 5.6, h) * (1 - smoothstep(6.8, 8.6, h));
}

export default function LakeMist({
  quality,
  reduceMotion,
}: {
  quality: GraphicsQuality;
  reduceMotion: boolean;
}) {
  const n = LAYERS[quality];
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(
      LAKE.rx * SPREAD * 2,
      LAKE.rz * SPREAD * 2,
    );
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const mats = useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        return new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          transparent: true,
          depthWrite: false,
          uniforms: {
            uTime: { value: 0 },
            uAmt: { value: 0 },
            uWarm: { value: 0 },
            uSeed: { value: i * 7.3 },
            uLake: {
              value: new THREE.Vector4(LAKE.x, LAKE.z, LAKE.rx, LAKE.rz),
            },
          },
        });
      }),
    [n],
  );

  useEffect(
    () => () => {
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  useFrame(({ clock }) => {
    const m = mistAmount();
    mats.forEach((mat, i) => {
      mat.uniforms.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
      mat.uniforms.uAmt.value = m * OPACITY[i];
      mat.uniforms.uWarm.value = dayState.twilight; // rona hangat saat langit jingga
      const mesh = meshes.current[i];
      if (mesh) mesh.visible = m > 0.01;
    });
  });

  return (
    <group>
      {mats.map((mat, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={geo}
          material={mat}
          position={[LAKE.x, WATER_Y + HEIGHTS[i], LAKE.z]}
          renderOrder={3 + i}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
