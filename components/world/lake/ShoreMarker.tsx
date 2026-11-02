"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SHORE } from "../config/shore";
import { clamp, smoothstep } from "../core/math";
import { getGlow } from "../core/glow";
import { dayState } from "../core/dayCycle";

const GLOW = getGlow;
const MOTES = 16;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Bola cahaya tanpa badan padat: inti putih-emas kecil yang menyatu ke pendar lembut,
// riak cincin tipis yang merambat pelan keluar, dan kilau silang halus. Malam: aditif.
// Siang: ditambah lapisan emas tembus pandang supaya tetap terbaca di langit pucat.
const ORB_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uPulse;
  uniform float uVis;
  uniform float uDay;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float edge = 1.0 - smoothstep(0.6, 1.0, r);

    float pin = exp(-pow(r / 0.06, 2.0));
    float core = exp(-pow(r / 0.17, 2.0));
    float glow = exp(-r * 5.5) * (0.85 + 0.15 * uPulse);
    float wide = exp(-r * 2.6) * 0.28;

    // riak cincin tipis yang merambat keluar, dua gelombang bergantian
    float rip = 0.0;
    for (int k = 0; k < 2; k++) {
      float ph = fract(uTime * 0.16 + float(k) * 0.5);
      float rad = 0.14 + ph * 0.7;
      float w = (r - rad) / 0.022;
      rip += exp(-w * w) * pow(1.0 - ph, 1.6) * smoothstep(0.0, 0.12, ph);
    }

    // kilau silang tipis yang berkedip lembut
    float cx = exp(-abs(p.x) * 20.0) * exp(-abs(p.y) * 3.2);
    float cy = exp(-abs(p.y) * 20.0) * exp(-abs(p.x) * 3.2);
    float flare = (cx + cy) * 0.4 * (0.7 + 0.3 * sin(uTime * 2.3)) * (1.0 - smoothstep(0.25, 0.9, r));

    vec3 white = vec3(1.0, 0.96, 0.82);
    vec3 gold = vec3(1.0, 0.80, 0.45);
    vec3 blue = vec3(0.60, 0.80, 1.0);
    vec3 halo = mix(gold, blue, smoothstep(0.1, 0.7, r));

    vec3 add = white * (pin * 1.2 + core * 0.9)
             + halo * (glow * 0.8 + wide + rip * 0.35)
             + mix(white, blue, 0.4) * flare;
    add *= edge * (1.0 - 0.5 * uDay);

    // lapisan emas tembus pandang untuk siang hari
    float a = clamp(core * 0.85 + glow * 0.3, 0.0, 1.0) * edge * uDay;
    vec3 over = vec3(1.0, 0.72, 0.30) * a;

    gl_FragColor = vec4((add + over) * uVis, a * uVis);
  }
`;

// Tiang cahaya: pita tegak, inti tipis + pendar lebar, emas di bawah memudar ke biru pucat.
const BEAM_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uVis;
  uniform float uDay;
  void main() {
    float across = abs(vUv.x - 0.5) * 2.0;
    float along = vUv.y;
    float core = exp(-across * across * 9.0);
    float wide = exp(-across * across * 2.5) * 0.35;
    float f = smoothstep(0.0, 0.05, along) * pow(1.0 - along, 1.8);
    float shimmer = 0.93 + 0.07 * sin(along * 18.0 - uTime * 0.8);
    float a = (core + wide) * f * shimmer;
    vec3 c = mix(vec3(1.0, 0.84, 0.5), vec3(0.62, 0.80, 1.0), smoothstep(0.0, 0.9, along));
    a *= 0.55 * uVis * (1.0 - 0.5 * uDay);
    gl_FragColor = vec4(c * a, 0.0);
  }
`;

function premulMaterial(
  frag: string,
  uniforms: Record<string, THREE.IUniform>,
) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: frag,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    side: THREE.DoubleSide,
  });
}

// Penanda di ujung dermaga: cahaya yang berdenyut pelan, titik-titik cahaya kecil
// mengitarinya, dan tiang cahaya tipis ke langit. Tanpa tulisan apa pun: pengunjung dibiarkan
// penasaran, lalu klik untuk pindah ke tepi danau.
export default function ShoreMarker({
  progress,
  shore,
  onEnter,
}: {
  progress: MutableRefObject<number>;
  shore: MutableRefObject<boolean>;
  onEnter: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const orbQuad = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const hit = useRef<THREE.Mesh>(null);
  const motes = useRef<THREE.Points>(null);
  const vis = useRef(0);
  const { x, y, z } = SHORE.marker;

  const orbMat = useMemo(
    () =>
      premulMaterial(ORB_FRAG, {
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uVis: { value: 0 },
        uDay: { value: 0 },
      }),
    [],
  );
  const beamMat = useMemo(
    () =>
      premulMaterial(BEAM_FRAG, {
        uTime: { value: 0 },
        uVis: { value: 0 },
        uDay: { value: 0 },
      }),
    [],
  );
  const beamGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const moteGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3),
    );
    return g;
  }, []);
  const moteMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.16,
        map: GLOW(),
        color: "#ffe2a0",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        toneMapped: false,
      }),
    [],
  );
  const seeds = useMemo(
    () =>
      Array.from({ length: MOTES }, (_, i) => {
        const f = (k: number) => (i * k) % 1;
        return {
          a: i * 2.399,
          r: 0.9 + 0.7 * f(0.618),
          s: (0.25 + 0.2 * f(0.37)) * (i % 2 ? 1 : -1),
          y: (f(0.77) - 0.5) * 1.2,
        };
      }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const p = progress.current;
    const [a, b, c, d] = SHORE.show;
    const want = shore.current
      ? 0
      : smoothstep(a, b, p) * (1 - smoothstep(c, d, p));
    vis.current += (want - vis.current) * (1 - Math.exp(-4 * dt));
    const v = vis.current;
    g.visible = v > 0.01;
    if (!g.visible) return;

    const t = state.clock.elapsedTime;
    const cam = state.camera.position;
    const dist = Math.hypot(cam.x - x, cam.y - y, cam.z - z);
    // dari jauh penanda dibesarkan supaya tetap terlihat di layar
    const far = clamp(dist / 16, 1, 3.4);
    const sq = Math.sqrt(far);
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
    const dl = dayState.daylight;

    g.position.y = y + Math.sin(t * 0.9) * 0.18;

    // bola: bidang selalu menghadap kamera
    const oq = orbQuad.current;
    if (oq) {
      oq.quaternion.copy(state.camera.quaternion);
      oq.scale.setScalar(3.4 * sq);
    }
    orbMat.uniforms.uTime.value = t;
    orbMat.uniforms.uPulse.value = pulse;
    orbMat.uniforms.uVis.value = v;
    orbMat.uniforms.uDay.value = dl;

    // tiang: berputar hanya di sumbu Y supaya tetap tegak
    const bm = beam.current;
    if (bm) {
      bm.rotation.y = Math.atan2(cam.x - x, cam.z - z);
      bm.scale.set(0.9 * sq, 15, 1);
    }
    beamMat.uniforms.uTime.value = t;
    beamMat.uniforms.uVis.value = v;
    beamMat.uniforms.uDay.value = dl;

    // titik cahaya yang mengitari bola
    const pts = motes.current;
    if (pts) {
      const pos = moteGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < MOTES; i++) {
        const s = seeds[i];
        const ang = s.a + t * s.s;
        pos.setXYZ(
          i,
          Math.cos(ang) * s.r * sq,
          s.y * sq + Math.sin(t * 0.7 + s.a) * 0.15,
          Math.sin(ang) * s.r * sq,
        );
      }
      pos.needsUpdate = true;
      moteMat.size = 0.16 * sq;
      moteMat.opacity = v * (0.85 - 0.5 * dl);
    }

    // area klik membesar mengikuti jarak, supaya mudah diklik dari jauh
    if (hit.current) hit.current.scale.setScalar(clamp(dist / 12, 1, 5));
  });

  return (
    <group ref={group} position={[x, y, z]} visible={false}>
      <mesh ref={orbQuad} material={orbMat} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={beam} geometry={beamGeo} material={beamMat} renderOrder={4} />
      <points
        ref={motes}
        geometry={moteGeo}
        material={moteMat}
        frustumCulled={false}
        renderOrder={6}
      />

      {/* area klik tak terlihat */}
      <mesh
        ref={hit}
        onClick={(e) => {
          if (vis.current < 0.3 || shore.current) return;
          e.stopPropagation();
          document.body.style.cursor = "";
          onEnter();
        }}
        onPointerOver={() => {
          if (vis.current > 0.3 && !shore.current)
            document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[1.8, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
