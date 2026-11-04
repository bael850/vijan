"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CASTLE, HOUSE, LAKE, WATER_Y } from "../config/world";
import { PIER } from "../lake/pierLayout";
import { LIGHT } from "../config/light";
import { PALETTE } from "../core/palette";
import { dayState, tickDay } from "../core/dayCycle";
import { groundHeight } from "./heightmap";

// warna pantulan langit siang (dipadukan dengan malam lewat dayState.daylight)
const DAY_SKY = new THREE.Color("#5aa0e0");
const DAY_SKY_DEEP = new THREE.Color("#2a62b8");
const DAY_HORIZON = new THREE.Color("#c0dcdc");
const SUN_GLOW = new THREE.Color("#ffe3a0");

// Angka air. Ubah di sini kalau terlalu tenang / terlalu ganas / terlalu terang.
const WATER = {
  chop: 1.0, // kekuatan gelombang (0 = kaca, 1.5 = berombak)
  glitter: 1.0, // kilau bulan dan bintang di permukaan
  foam: 1.0, // busa di tepian
  bright: 1.0, // pengali terang seluruh air
  encode: true, // true = warna air dikonversi seperti benda lain (tone mapping + sRGB), supaya cocok dengan tanah dan kabut. Kalau air terasa terlalu pucat/terang, coba false.
  maxDepth: 8, // kedalaman (m) yang dikodekan di tekstur
  texW: 256, // resolusi peta kedalaman
};

// Titik di garis pantai terdekat dari sebuah sumber cahaya di darat. Pantulannya mulai dari sini
// dan memanjang ke arah kamera.
function shoreAnchor(lx: number, lz: number): [number, number] {
  const vx = (lx - LAKE.x) / LAKE.rx;
  const vz = (lz - LAKE.z) / LAKE.rz;
  const l = Math.hypot(vx, vz) || 1;
  return [LAKE.x + (vx / l) * LAKE.rx, LAKE.z + (vz / l) * LAKE.rz];
}

// Pantulan lampu di air: [x, z di tepi danau, panjang (m), kekuatan, warna].
// Ubah angka di sini kalau pantulan terlalu kuat atau terlalu pendek.
const REFLECTIONS: {
  at: [number, number];
  len: number;
  k: number;
  color: string;
}[] = [
  {
    at: shoreAnchor(CASTLE.east.x, CASTLE.east.z),
    len: 40,
    k: 0.9,
    color: "#ffe9b0",
  }, // gerbang timur kastil
  { at: shoreAnchor(PIER.x0, PIER.z), len: 28, k: 0.6, color: "#ffb85a" }, // lentera dermaga
  { at: shoreAnchor(HOUSE.x, HOUSE.z), len: 26, k: 0.5, color: "#e9eefa" }, // rumah kita
];

const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

// Air danau: gelombang berlapis (arah dan panjang berbeda, makin jauh makin halus), pantulan
// langit lewat Fresnel, kilau bulan/bintang yang pecah jadi serpihan, warna menurut kedalaman,
// busa bergelombang di tepian, dan kabut seperti benda lain. Kedalaman dibaca dari peta kecil
// yang dihitung sekali dari heightmap, jadi garis pantainya persis sama dengan tanah.
const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uGlow;
  uniform vec3 uAurora;
  uniform vec3 uSky;
  uniform vec3 uSkyDeep;
  uniform vec3 uTeal;
  uniform vec3 uMoon;
  uniform vec3 uFogColor;
  uniform vec2 uFog;
  uniform sampler2D uDepth;
  uniform vec4 uBox;
  uniform float uMaxDepth;
  uniform float uChop;
  uniform float uGlitter;
  uniform float uFoam;
  uniform float uBright;
  uniform float uTwi;
  uniform vec2 uSunXZ;
  uniform float uLampK;
  uniform vec4 uRefl[3];
  uniform vec3 uReflCol[3];
  varying vec3 vWorld;

  float h21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  // satu gelombang: kemiringan (bukan tinggi), kecepatan menurut panjang gelombang
  vec2 wave(vec2 p, vec2 d, float lam, float slope, float dist) {
    float k = 6.2831853 / lam;
    float w = sqrt(9.8 * k);
    float fade = 1.0 - smoothstep(lam * 4.0, lam * 14.0, dist);
    if (fade <= 0.0) return vec2(0.0);
    return d * (slope * fade) * cos(dot(d, p) * k - uTime * w);
  }

  vec3 waterNormal(vec2 p, float dist) {
    vec2 g = vec2(0.0);
    g += wave(p, vec2(0.96, 0.28), 22.0, 0.050, dist);
    g += wave(p, vec2(0.74, -0.67), 13.0, 0.045, dist);
    g += wave(p, vec2(0.28, 0.96), 7.5, 0.040, dist);
    g += wave(p, vec2(-0.55, 0.83), 4.2, 0.030, dist);
    g += wave(p, vec2(0.87, -0.50), 2.3, 0.022, dist);
    g *= uChop;
    // riak halus yang bergeser pelan ke dua arah
    float e = 0.35;
    if (dist < 70.0) {
      vec2 q = p * 1.7 + vec2(uTime * 0.15, -uTime * 0.10);
      float n0 = vnoise(q);
      g += vec2(vnoise(q + vec2(e, 0.0)) - n0, vnoise(q + vec2(0.0, e)) - n0) / e
           * 0.055 * uChop * (1.0 - smoothstep(10.0, 70.0, dist));
    }
    if (dist < 36.0) {
      vec2 q2 = p * 4.6 + vec2(-uTime * 0.09, uTime * 0.13);
      float m0 = vnoise(q2);
      g += vec2(vnoise(q2 + vec2(e, 0.0)) - m0, vnoise(q2 + vec2(0.0, e)) - m0) / e
           * 0.03 * uChop * (1.0 - smoothstep(6.0, 36.0, dist));
    }
    return normalize(vec3(-g.x, 1.0, -g.y));
  }

  vec3 bigStar(int i) {
    if (i == 0) return normalize(vec3(-0.15, 0.62, -0.77));
    if (i == 1) return normalize(vec3(0.55, 0.50, -0.67));
    if (i == 2) return normalize(vec3(0.10, 0.85, -0.30));
    if (i == 3) return normalize(vec3(-0.70, 0.55, -0.45));
    if (i == 4) return normalize(vec3(0.85, 0.35, -0.40));
    return normalize(vec3(0.25, 0.38, -0.90));
  }

  // langit tiruan untuk dipantulkan: teal di cakrawala -> biru -> biru malam, sedikit goresan
  vec3 skyColor(vec3 R) {
    float e = max(R.y, 0.0);
    vec3 col = mix(uTeal * 0.95 + uGlow * 0.04, uSky, smoothstep(0.0, 0.3, e));
    col = mix(col, uSkyDeep, smoothstep(0.12, 0.65, e));
    vec2 rp = R.xz / (R.y + 0.35) * 1.4;
    float streak = 0.5 + 0.5 * sin(rp.x * 5.0 + sin(rp.y * 4.0 + uTime * 0.15) * 1.6);
    col += (streak - 0.5) * 0.10 * mix(uAurora, uGlow, 0.4);
    col += uAurora * 0.10 * smoothstep(0.0, 0.25, -R.z) * exp(-e * 5.0);
    return col;
  }

  void main() {
    vec2 uv = vec2((vWorld.x - uBox.x) / (uBox.z - uBox.x),
                   (vWorld.z - uBox.y) / (uBox.w - uBox.y));
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    float depth = texture2D(uDepth, uv).r * uMaxDepth;

    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 V = toCam / dist;
    vec3 N = waterNormal(vWorld.xz, dist);
    // dari jauh normal makin datar supaya tidak berkilau-kilau (aliasing)
    N = normalize(mix(N, vec3(0.0, 1.0, 0.0), smoothstep(90.0, 260.0, dist)));

    vec3 R = reflect(-V, N);
    R.y = abs(R.y);

    // warna badan air menurut kedalaman: dangkal toska terang, dalam biru pekat
    vec3 body = mix(uMid * 1.25, uDeep, smoothstep(0.0, 3.2, depth));
    body += uMid * 0.10 * (N.y - 0.9) * 4.0;

    // pantulan: langit + bulan + bintang besar (pecah oleh gelombang jadi serpihan)
    vec3 refl = skyColor(R);
    // semburat jingga senja, sama seperti di langit, supaya danau ikut berwarna saat matahari turun
    vec2 hd = normalize(R.xz + 1e-4);
    float toward = pow(max(dot(hd, uSunXZ), 0.0), 2.0);
    refl += vec3(1.0, 0.55, 0.25) * uTwi * toward * exp(-max(R.y, 0.0) * 4.0) * 0.55;
    float mo = max(dot(R, uMoon), 0.0);
    refl += uGlow * uGlitter * (pow(mo, 700.0) * 3.0 + pow(mo, 70.0) * 0.45 + pow(mo, 9.0) * 0.07);
    for (int i = 0; i < 6; i++) {
      float s = max(dot(R, bigStar(i)), 0.0);
      if (s > 0.994) refl += uGlow * uGlitter * pow(s, 1500.0) * 1.6;
    }

    float cosT = max(dot(N, V), 0.0);
    float F = 0.03 + 0.97 * pow(1.0 - cosT, 5.0);
    vec3 col = mix(body, refl, clamp(F + 0.06, 0.0, 1.0));

    // pantulan lampu di darat: pita cahaya dari tepi danau ke arah kamera, pecah oleh riak
    vec3 streak = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      vec2 a = uRefl[i].xy;
      vec2 tc = cameraPosition.xz - a;
      float dc = length(tc);
      vec2 dir = tc / max(dc, 1e-3);
      vec2 d = vWorld.xz - a;
      float along = dot(d, dir);
      float across = dot(d, vec2(-dir.y, dir.x));
      across += sin(along * 1.7 + uTime * 0.8) * 0.25 + (N.x + N.z) * 6.0;
      float w = 0.8 + dc * 0.012 + max(along, 0.0) * 0.05;
      float len = uRefl[i].z;
      float s = smoothstep(-1.0, 0.5, along) * (1.0 - smoothstep(0.0, len, along)) * exp(-across * across / (w * w));
      s *= 0.5 + 0.5 * vnoise(vec2(along * 1.3 - uTime * 0.4, across * 0.7));
      streak += uReflCol[i] * uRefl[i].w * s;
    }
    col += streak * uLampK;

    // busa di tepian: garis tipis di garis air + pita yang maju-mundur seperti ombak kecil
    float foam = 0.0;
    if (depth < 0.56) { // di luar tepian busa pasti 0, jadi noise-nya tidak perlu dihitung
      float nz = vnoise(vWorld.xz * 0.9 + uTime * 0.05);
      float edge = 1.0 - smoothstep(0.0, 0.55, depth);
      float lap = 0.5 + 0.5 * sin(depth * 16.0 - uTime * 0.9 + nz * 5.0);
      foam = edge * smoothstep(0.35, 0.95, lap) * (0.35 + 0.65 * nz);
      foam += (1.0 - smoothstep(0.0, 0.14, depth)) * (0.55 + 0.45 * nz);
    }
    foam = clamp(foam * uFoam, 0.0, 1.0);
    col = mix(col, vec3(0.80, 0.90, 0.88), foam * 0.55);

    col *= uBright;

    float fogF = smoothstep(uFog.x, uFog.y, dist) * 0.85;
    col = mix(col, uFogColor, fogF);

    float alpha = max(smoothstep(0.0, 0.2, depth), foam * 0.75) * 0.96;
    gl_FragColor = vec4(col, alpha);
    ${WATER.encode ? "#include <tonemapping_fragment>\r\n    #include <colorspace_fragment>" : ""}
  }
`;

// Peta kedalaman air di sekitar danau: satu kali hitung dari heightmap yang sama dengan tanah.
function useDepthMap() {
  return useMemo(() => {
    const m = 1.45; // margin di luar elips danau
    const x0 = LAKE.x - LAKE.rx * m;
    const x1 = LAKE.x + LAKE.rx * m;
    const z0 = LAKE.z - LAKE.rz * m;
    const z1 = LAKE.z + LAKE.rz * m;
    const w = WATER.texW;
    const h = Math.round((w * (z1 - z0)) / (x1 - x0));
    const data = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) {
      const z = z0 + ((j + 0.5) / h) * (z1 - z0);
      for (let i = 0; i < w; i++) {
        const x = x0 + ((i + 0.5) / w) * (x1 - x0);
        const d = WATER_Y - groundHeight(x, z);
        data[j * w + i] = Math.round(
          Math.min(1, Math.max(0, d / WATER.maxDepth)) * 255,
        );
      }
    }
    const tex = new THREE.DataTexture(
      data,
      w,
      h,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    return { tex, box: new THREE.Vector4(x0, z0, x1, z1) };
  }, []);
}

export default function Water() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { tex, box } = useDepthMap();
  const uniforms = useMemo(() => {
    const moon = new THREE.Vector3(...LIGHT.moon.position).normalize();
    return {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(PALETTE.waterDeep) },
      uMid: { value: new THREE.Color(PALETTE.waterMid) },
      uGlow: { value: new THREE.Color(PALETTE.skyGlow) },
      uAurora: { value: new THREE.Color(PALETTE.aurora) },
      uSky: { value: new THREE.Color(PALETTE.skyBlue) },
      uSkyDeep: { value: new THREE.Color(PALETTE.skyDeep) },
      uTeal: { value: new THREE.Color(PALETTE.teal) },
      uMoon: { value: moon },
      uFogColor: { value: new THREE.Color(LIGHT.fog.colorStart) },
      uFog: {
        value: new THREE.Vector2(LIGHT.fog.nearStart, LIGHT.fog.farStart),
      },
      uDepth: { value: tex },
      uBox: { value: box },
      uMaxDepth: { value: WATER.maxDepth },
      uChop: { value: WATER.chop },
      uGlitter: { value: WATER.glitter },
      uFoam: { value: WATER.foam },
      uBright: { value: WATER.bright },
      uTwi: { value: 0 },
      uSunXZ: { value: new THREE.Vector2(0, -1) },
      uLampK: { value: 0 },
      uRefl: {
        value: REFLECTIONS.map(
          (r) => new THREE.Vector4(r.at[0], r.at[1], r.len, r.k),
        ),
      },
      uReflCol: { value: REFLECTIONS.map((r) => new THREE.Color(r.color)) },
    };
  }, [tex, box]);

  useFrame((state, dt) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime.value += dt;
    // langit yang dipantulkan ikut siang/malam
    tickDay(state.clock.elapsedTime);
    const u = m.uniforms;
    const dl = dayState.daylight;
    u.uSky.value.set(PALETTE.skyBlue).lerp(DAY_SKY, dl);
    u.uSkyDeep.value.set(PALETTE.skyDeep).lerp(DAY_SKY_DEEP, dl);
    u.uTeal.value.set(PALETTE.teal).lerp(DAY_HORIZON, dl);
    u.uAurora.value.set(PALETTE.aurora).multiplyScalar(1 - dl);
    u.uGlow.value.set(PALETTE.skyGlow).lerp(SUN_GLOW, dl);
    u.uTwi.value = dayState.twilight;
    u.uSunXZ.value.set(dayState.sun.x, dayState.sun.z).normalize();
    u.uLampK.value = dayState.lamps;
    // kilau matahari di siang jauh lebih kuat daripada kilau bulan
    u.uGlitter.value = WATER.glitter * (1 + 1.2 * dl);
    u.uMoon.value.copy(
      dayState.sun.y > dayState.moon.y ? dayState.sun : dayState.moon,
    );
    // kabut air ikut kabut adegan (berubah sepanjang perjalanan)
    const fog = state.scene.fog as THREE.Fog | null;
    if (fog) {
      m.uniforms.uFogColor.value.copy(fog.color);
      m.uniforms.uFog.value.set(fog.near, fog.far);
    }
  });

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[(box.x + box.z) / 2, WATER_Y, (box.y + box.w) / 2]}
      renderOrder={1}
    >
      <planeGeometry args={[box.z - box.x, box.w - box.y]} />
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
