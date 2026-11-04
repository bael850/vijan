"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayState } from "../core/dayCycle";
import { smoothstep } from "../core/math";

// Burung-burung kecil berputar pelan di langit di atas rumah dan danau.
// Gerakannya dihitung di GPU, jadi hampir tidak membebani.
const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCenter;
  attribute vec4 aSeed;
  attribute float aWing;
  void main() {
    float a = uTime * aSeed.w + aSeed.x * 6.2831;
    float r = 60.0 + aSeed.y * 70.0;
    vec3 c = vec3(
      uCenter.x + cos(a) * r,
      aSeed.z + sin(uTime * 0.4 + aSeed.x * 30.0) * 1.2,
      uCenter.z + sin(a) * r * 0.75
    );
    vec3 h = normalize(vec3(-sin(a), 0.0, cos(a) * 0.75));
    vec3 right = vec3(h.z, 0.0, -h.x);
    float flap = sin(uTime * 7.0 + aSeed.x * 60.0) * 0.55 * aWing;
    vec3 local = position * 2.4;
    local.y += flap * 2.4;
    vec3 w = c + right * local.x + h * local.z + vec3(0.0, local.y, 0.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float uShow;
  void main() {
    gl_FragColor = vec4(0.05, 0.1, 0.13, 0.9 * uShow);
  }
`;

export default function Birds({ amount }: { amount: number }) {
  const geo = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    const pos = new Float32Array([
      0, 0, 0.5, -1, 0, -0.3, 0, 0, -0.45, 0, 0, 0.5, 0, 0, -0.45, 1, 0, -0.3,
    ]);
    const wing = new Float32Array([0, 1, 0, 0, 0, 1]);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aWing", new THREE.BufferAttribute(wing, 1));

    const seed = new Float32Array(amount * 4);
    const groups = 3;
    for (let i = 0; i < amount; i++) {
      const k = i % groups;
      seed[i * 4] = k / groups + Math.random() * 0.03;
      seed[i * 4 + 1] = k * 0.35 + Math.random() * 0.1;
      seed[i * 4 + 2] = 32 + k * 9 + Math.random() * 6;
      seed[i * 4 + 3] = 0.07 + k * 0.01 + Math.random() * 0.004;
    }
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 4));
    g.instanceCount = amount;
    return g;
  }, [amount]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uShow: { value: 1 },
          uCenter: { value: new THREE.Vector3(6, 0, -85) },
        },
      }),
    [],
  );

  // burung hanya siang: memudar di sore hari, hilang di malam hari
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    const show = smoothstep(0.35, 0.9, dayState.daylight);
    mat.uniforms.uShow.value = show;
    if (ref.current) ref.current.visible = show > 0.01;
  });

  if (amount <= 0) return null;
  return <mesh ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
