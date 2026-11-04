"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CHIMNEY_POS } from "./houseLayout";

// Asap tipis dari cerobong, naik pelan lalu terbawa angin ke kanan.
const TOP = new THREE.Vector3(
  CHIMNEY_POS.x,
  CHIMNEY_POS.topY + 0.3,
  CHIMNEY_POS.z,
);

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform vec3 uOrigin;
  attribute vec4 aSeed;
  varying float vA;
  void main() {
    float t = fract(uTime * 0.06 + aSeed.x);
    vec3 p = uOrigin;
    p.y += t * 9.0;
    p.x += t * t * 6.0 + sin(uTime * 0.5 + aSeed.y * 6.28 + t * 3.0) * 0.6 * t;
    p.z += (aSeed.z - 0.5) * t * 2.5;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.7 + t * 3.6) * (0.7 + aSeed.w * 0.6);
    gl_PointSize = clamp(size * uScale / -mv.z, 1.0, 140.0);
    vA = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.45, 1.0, t)) * 0.3;
  }
`;

const FRAG = /* glsl */ `
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, r);
    gl_FragColor = vec4(vec3(0.66, 0.67, 0.68), a * vA);
  }
`;

export default function Smoke({
  amount,
  reduceMotion,
}: {
  amount: number;
  reduceMotion: boolean;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(amount * 4);
    for (let i = 0; i < amount; i++) {
      seed[i * 4] = i / amount;
      seed[i * 4 + 1] = Math.random();
      seed[i * 4 + 2] = Math.random();
      seed[i * 4 + 3] = Math.random();
    }
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(amount * 3), 3),
    );
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
        uniforms: {
          uTime: { value: 0 },
          uScale: { value: 400 },
          uOrigin: { value: TOP.clone() },
        },
      }),
    [],
  );

  useFrame(({ camera, clock, size, gl }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const u = mat.uniforms;
    u.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
    u.uScale.value =
      (size.height * gl.getPixelRatio()) /
      (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
  });

  if (amount <= 0) return null;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
