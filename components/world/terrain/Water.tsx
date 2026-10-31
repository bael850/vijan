"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WATER_Y, WORLD } from "../config/world";
import { PALETTE } from "../core/palette";

const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

// Air danau: pusaran bergaya Van Gogh, memantulkan warna langit di sudut landai.
const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uGlow;
  uniform vec3 uAurora;
  uniform vec3 uSky;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz * 0.05;
    float a = sin(p.x * 3.0 + sin(p.y * 4.0 + uTime * 0.35) * 1.6 + uTime * 0.18);
    float b = sin(p.y * 5.0 + sin(p.x * 3.5 - uTime * 0.28) * 1.4);
    float swirl = a * b * 0.5 + 0.5;
    vec3 col = mix(uDeep, uMid, 0.5 + 0.5 * a);
    col += uGlow * smoothstep(0.62, 0.95, swirl) * 0.32;
    col += uAurora * smoothstep(0.7, 1.0, 0.5 + 0.5 * sin(p.x * 1.3 - p.y * 0.9 + uTime * 0.1)) * 0.18;
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(V.y, 0.0), 3.0);
    col = mix(col, uSky, fres * 0.65);
    gl_FragColor = vec4(col, 0.94);
  }
`;

export default function Water() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(PALETTE.waterDeep) },
      uMid: { value: new THREE.Color(PALETTE.waterMid) },
      uGlow: { value: new THREE.Color(PALETTE.skyGlow) },
      uAurora: { value: new THREE.Color(PALETTE.aurora) },
      uSky: { value: new THREE.Color(PALETTE.skyBlue) },
    }),
    [],
  );

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, WATER_Y, WORLD.centerZ]}
      renderOrder={1}
    >
      <planeGeometry args={[WORLD.width, WORLD.length]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
