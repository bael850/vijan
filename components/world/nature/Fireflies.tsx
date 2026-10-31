"use client";

import { useMemo, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { smoothstep } from "../core/math";
import { groundHeight } from "../terrain/heightmap";

// Kunang-kunang kecil di sekitar kamera. Menyingkir dari kursor, lalu kembali.
const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCam;
  uniform vec3 uBox;
  uniform float uGround;
  uniform vec2 uPtr;
  uniform float uAspect;
  attribute vec4 aSeed;
  varying float vA;
  void main() {
    vec3 base = aSeed.xyz * uBox;
    vec3 drift = vec3(
      sin(uTime * 0.3 + aSeed.x * 20.0),
      sin(uTime * 0.4 + aSeed.y * 30.0) * 0.5,
      cos(uTime * 0.25 + aSeed.z * 25.0)
    ) * 1.3;
    vec3 w = base + drift;
    w.x = mod(w.x - uCam.x + uBox.x * 0.5, uBox.x) + uCam.x - uBox.x * 0.5;
    w.z = mod(w.z - uCam.z + uBox.z * 0.5, uBox.z) + uCam.z - uBox.z * 0.5;
    w.y = uGround + 0.4 + w.y * 0.22;
    vec4 clip = projectionMatrix * viewMatrix * vec4(w, 1.0);
    vec2 d = clip.xy / clip.w - uPtr;
    d.x *= uAspect;
    float push = smoothstep(0.4, 0.0, length(d));
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec2 dir = normalize(d + 0.0001);
    w += (right * dir.x + up * dir.y) * push * 2.2;
    vec4 mv = viewMatrix * vec4(w, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSeed.w * 70.0 / -mv.z, 1.5, 14.0);
    float dekat = smoothstep(1.0, 4.0, -mv.z);
    vA = (0.45 + 0.55 * sin(uTime * 2.0 + aSeed.x * 50.0)) * dekat
      * (1.0 - smoothstep(22.0, 40.0, -mv.z));
  }
`;

const FRAG = /* glsl */ `
  uniform float uShow;
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r);
    a *= a;
    gl_FragColor = vec4(vec3(1.0, 0.78, 0.4) * a, a * vA * uShow);
  }
`;

export default function Fireflies({
  amount,
  indoor,
  reduceMotion,
}: {
  amount: number;
  indoor: MutableRefObject<number>;
  reduceMotion: boolean;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(amount * 4);
    for (let i = 0; i < amount; i++) {
      seed[i * 4] = Math.random();
      seed[i * 4 + 1] = Math.random();
      seed[i * 4 + 2] = Math.random();
      seed[i * 4 + 3] = 0.5 + Math.random() * 0.9;
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
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uCam: { value: new THREE.Vector3() },
          uBox: { value: new THREE.Vector3(44, 14, 44) },
          uGround: { value: 0 },
          uPtr: { value: new THREE.Vector2(9, 9) },
          uAspect: { value: 1 },
          uShow: { value: 0 },
        },
      }),
    [],
  );

  useFrame(({ camera, clock, pointer, size }) => {
    const u = mat.uniforms;
    const g = groundHeight(camera.position.x, camera.position.z);
    u.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
    u.uCam.value.copy(camera.position);
    u.uGround.value = g;
    u.uPtr.value.set(pointer.x, pointer.y);
    u.uAspect.value = size.width / size.height;
    const low = smoothstep(14, 5, camera.position.y - g);
    u.uShow.value = low * (1 - indoor.current);
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
