"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAKE, WATER_Y } from "../config/world";
import { displayFamily } from "../core/canvasFont";
import { getGlow } from "../core/glow";
import { clamp, smoothstep } from "../core/math";
import { lakeDist } from "../terrain/heightmap";
import type { Focus, Wish } from "./wish";

const PLANE_W = 34; // lebar tulisan di dunia (m)
const CW = 2048;
const CH = 768;
const HOVER = 6.5; // tinggi tulisan melayang di atas air (m)
const HOLD = 22; // lama tulisan bertahan (detik)

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Huruf muncul dari kiri-atas ke kanan-bawah dengan kilau terang di tepinya, lalu berkilau pelan.
// uFlip = 1 untuk pantulan di air: bergelombang dan makin pudar ke bawah.
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uReveal;
  uniform float uFade;
  uniform float uTime;
  uniform float uFlip;
  varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec2 uv = vUv;
    if (uFlip > 0.5) {
      uv.x += sin(uv.y * 70.0 + uTime * 1.6) * 0.004 + sin(uv.y * 29.0 - uTime * 1.1) * 0.006;
      uv.y += sin(uv.x * 40.0 + uTime * 1.3) * 0.003;
    }
    vec4 tex = texture2D(uMap, uv);
    float key = (1.0 - uv.y) * 0.6 + uv.x * 0.4;
    float r = uReveal * 1.3 - key + (n(uv * vec2(60.0, 22.0)) - 0.5) * 0.12;
    float rev = smoothstep(0.0, 0.1, r);
    float edge = rev * (1.0 - smoothstep(0.1, 0.35, r));
    float spark = pow(max(0.0, sin(uv.x * 140.0 + n(uv * 50.0) * 6.0 + uTime * 2.5)), 24.0)
      * step(0.6, n(uv * vec2(120.0, 45.0) + uTime * 0.3));
    vec3 col = tex.rgb * (1.0 + edge * 1.4) + vec3(1.0, 0.9, 0.7) * spark * tex.a * 0.8;
    float a = tex.a * rev * uFade;
    if (uFlip > 0.5) a *= 0.38 * (0.35 + 0.65 * (1.0 - uv.y));
    gl_FragColor = vec4(col, a);
  }
`;

// Pecah teks jadi baris yang muat selebar maxW.
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = cur ? cur + " " + word : word;
      if (ctx.measureText(test).width <= maxW) {
        cur = test;
        continue;
      }
      if (cur) lines.push(cur);
      cur = word;
      // kata tunggal yang terlalu panjang dipotong per huruf
      while (ctx.measureText(cur).width > maxW && cur.length > 1) {
        let k = cur.length - 1;
        while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
        lines.push(cur.slice(0, k));
        cur = cur.slice(k);
      }
    }
    lines.push(cur);
  }
  return lines;
}

function makeCard(text: string) {
  const cv = document.createElement("canvas");
  cv.width = CW;
  cv.height = CH;
  const ctx = cv.getContext("2d")!;
  const font = displayFamily();
  let size = 150;
  let lines: string[] = [];
  for (; size >= 56; size -= 6) {
    ctx.font = `500 ${size}px ${font}`;
    lines = wrap(ctx, text, CW * 0.84);
    if (lines.length * size * 1.22 <= CH * 0.82) break;
  }
  const lh = size * 1.22;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const y0 = CH / 2 - ((lines.length - 1) * lh) / 2;
  const draw = (blur: number, color: string, fill: string) => {
    ctx.shadowBlur = blur;
    ctx.shadowColor = color;
    ctx.fillStyle = fill;
    lines.forEach((l, i) => ctx.fillText(l, CW / 2, y0 + i * lh));
  };
  draw(46, "rgba(150,195,255,0.95)", "rgba(150,195,255,0.6)"); // halo biru
  draw(18, "rgba(255,207,122,0.95)", "rgba(255,225,170,0.9)"); // cahaya emas
  draw(0, "rgba(0,0,0,0)", "#fff1d0"); // huruf tajam
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

function mat(tex: THREE.Texture, flip: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uMap: { value: tex },
      uReveal: { value: 0 },
      uFade: { value: 0 },
      uTime: { value: 0 },
      uFlip: { value: flip },
    },
  });
}

type W = {
  id: number;
  wid: number; // tulisan keberapa; kartu dari tulisan yang sama punya wid yang sama
  text: string;
  x: number;
  z: number;
  delay: number; // detik menunggu sebelum mulai muncul
  hold: number; // detik bertahan setelah selesai muncul
};

const CHUNK = 190; // huruf per kartu
const GAP = 2.6; // jeda antar kartu (detik), supaya kartu lama sudah pudar

const revealOf = (text: string, reduce: boolean) =>
  reduce ? 0.4 : clamp(0.9 + text.length * 0.06, 2, 7);

// Tulisan panjang dipecah jadi kartu-kartu pendek: per kalimat, digabung sampai sekitar CHUNK huruf.
// Pergantian paragraf dipertahankan sebagai baris baru.
export function splitText(text: string): string[] {
  const units: { s: string; br: boolean }[] = [];
  for (const para of text.split(/\n+/)) {
    const p = para.trim();
    if (!p) continue;
    const sentences = p.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) ?? [p];
    sentences.forEach((raw, i) => {
      let s = raw.trim();
      let br = i === 0;
      while (s.length > CHUNK) {
        let k = s.lastIndexOf(" ", CHUNK);
        if (k < CHUNK * 0.4) k = CHUNK;
        units.push({ s: s.slice(0, k).trim(), br });
        br = false;
        s = s.slice(k).trim();
      }
      if (s) units.push({ s, br });
    });
  }
  const out: string[] = [];
  let cur = "";
  for (const u of units) {
    const sep = !cur ? "" : u.br ? "\n" : " ";
    if (cur && (cur + sep + u.s).length > CHUNK) {
      out.push(cur);
      cur = u.s;
    } else cur += sep + u.s;
  }
  if (cur) out.push(cur);
  return out.length ? out : [text.trim()];
}

function Word({
  w,
  dismissed,
  reduceMotion,
  onDone,
}: {
  w: W;
  dismissed: boolean;
  reduceMotion: boolean;
  onDone: (id: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const front = useRef<THREE.Mesh>(null);
  const t = useRef(-w.delay);
  const finished = useRef(false);
  const glow = useMemo(getGlow, []);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const {
    tex,
    front: mf,
    back: mb,
  } = useMemo(() => {
    const tex = makeCard(w.text);
    return { tex, front: mat(tex, 0), back: mat(tex, 1) };
  }, [w.text]);
  useEffect(
    () => () => {
      tex.dispose();
      mf.dispose();
      mb.dispose();
    },
    [tex, mf, mb],
  );
  const revealDur = revealOf(w.text, reduceMotion);
  const planeH = (PLANE_W * CH) / CW;

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const done = () => {
      if (finished.current) return;
      finished.current = true;
      onDone(w.id);
    };
    t.current += Math.min(delta, 0.05);
    // belum waktunya muncul; kalau tulisan baru datang sebelum itu, kartu ini dibatalkan
    if (t.current < 0) {
      g.visible = false;
      if (dismissed) done();
      return;
    }
    g.visible = true;
    // tulisan baru datang: yang lama langsung mulai memudar
    const end = revealDur + w.hold;
    if (dismissed && t.current < end) t.current = end;
    const fade =
      smoothstep(0, 0.8, t.current) * (1 - smoothstep(end, end + 3, t.current));
    const reveal = clamp(t.current / revealDur, 0, 1);
    for (const m of [mf, mb]) {
      m.uniforms.uReveal.value = reveal;
      m.uniforms.uFade.value = fade;
      m.uniforms.uTime.value = state.clock.elapsedTime;
    }
    // cahaya di air menyala bersama tulisan, berdenyut pelan
    if (glowMat.current)
      glowMat.current.opacity =
        0.32 * fade * (0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 1.3));
    const cam = state.camera.position;
    g.rotation.y = Math.atan2(cam.x - w.x, cam.z - w.z); // selalu menghadap kamera
    if (front.current)
      front.current.position.y =
        HOVER + Math.sin(state.clock.elapsedTime * 0.6) * 0.25;
    if (t.current > end + 3.2) done();
  });

  return (
    <group ref={group} position={[w.x, WATER_Y, w.z]} visible={false}>
      <mesh ref={front} position={[0, HOVER, 0]} material={mf} renderOrder={4}>
        <planeGeometry args={[PLANE_W, planeH]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]} renderOrder={2}>
        <planeGeometry args={[PLANE_W * 1.3, PLANE_W * 1.3]} />
        <meshBasicMaterial
          ref={glowMat}
          map={glow}
          color="#8fb6ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {/* pantulan di air: cermin di bawah permukaan */}
      <mesh
        position={[0, -HOVER, 0]}
        scale={[1, -1, 1]}
        material={mb}
        renderOrder={3}
      >
        <planeGeometry args={[PLANE_W, planeH]} />
      </mesh>
    </group>
  );
}

// Titik di atas air yang terlihat dari kamera: ke arah danau, tapi tidak lebih dari ~35 derajat dari arah pandang.
function spawnPoint(cam: THREE.Camera) {
  const f = new THREE.Vector3();
  cam.getWorldDirection(f);
  const fl = Math.hypot(f.x, f.z) || 1;
  const fa = Math.atan2(f.x / fl, f.z / fl);
  const lx = LAKE.x - LAKE.rx * 0.4;
  const lz = LAKE.z + 20;
  const la = Math.atan2(lx - cam.position.x, lz - cam.position.z);
  let d = la - fa;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const a = fa + clamp(d, -0.6, 0.6);
  for (let dist = 70; dist >= 25; dist -= 5) {
    const x = cam.position.x + Math.sin(a) * dist;
    const z = cam.position.z + Math.cos(a) * dist;
    if (lakeDist(x, z) < 0.9) return { x, z };
  }
  return { x: LAKE.x - LAKE.rx * 0.3, z: LAKE.z };
}

// Butiran cahaya yang naik dari kotak tulis (bawah layar), berputar pelan, lalu menyatu jadi tulisan di danau.
type Burst = {
  id: number;
  from: THREE.Vector3;
  fwd: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
  x: number;
  z: number;
};
const DUST_N = 180;
const DUST_LIFE = 3.6;

function Dust({ b, onDone }: { b: Burst; onDone: () => void }) {
  const mat = useRef<THREE.PointsMaterial>(null);
  const t = useRef(0);
  const finished = useRef(false);
  const glow = useMemo(getGlow, []);
  const d = useMemo(() => {
    const start = new Float32Array(DUST_N * 3);
    const end = new Float32Array(DUST_N * 3);
    const prm = new Float32Array(DUST_N * 3);
    // arah datar dari kamera ke tulisan, dan "kanan"-nya
    const dx = b.x - b.from.x;
    const dz = b.z - b.from.z;
    const dl = Math.hypot(dx, dz) || 1;
    const rx = -dz / dl;
    const rz = dx / dl;
    for (let i = 0; i < DUST_N; i++) {
      const a = (Math.random() - 0.5) * 5.5;
      const h = -2.7 + Math.random() * 0.9;
      start[i * 3] = b.from.x + b.fwd.x * 7 + b.right.x * a + b.up.x * h;
      start[i * 3 + 1] = b.from.y + b.fwd.y * 7 + b.right.y * a + b.up.y * h;
      start[i * 3 + 2] = b.from.z + b.fwd.z * 7 + b.right.z * a + b.up.z * h;
      const ex = (Math.random() - 0.5) * PLANE_W * 0.7;
      end[i * 3] = b.x + rx * ex;
      end[i * 3 + 1] = HOVER + 0.3 + (Math.random() - 0.5) * 5;
      end[i * 3 + 2] = b.z + rz * ex;
      prm[i * 3] = Math.random() * 0.9; // jeda mulai
      prm[i * 3 + 1] = 1 + Math.random() * 3; // lebar pusaran
      prm[i * 3 + 2] = Math.random(); // fase pusaran
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(start.slice(), 3));
    return { start, end, prm, geo };
  }, [b]);
  useEffect(() => () => d.geo.dispose(), [d]);

  useFrame((_, delta) => {
    t.current += Math.min(delta, 0.05);
    const tt = t.current;
    const pos = d.geo.attributes.position.array as Float32Array;
    for (let i = 0; i < DUST_N; i++) {
      const delay = d.prm[i * 3];
      const amp = d.prm[i * 3 + 1];
      const ph = d.prm[i * 3 + 2] * Math.PI * 2;
      const e = smoothstep(0, 1, clamp((tt - delay) / 1.9, 0, 1));
      const sw = Math.sin(e * Math.PI) * amp;
      const ox = Math.cos(ph + tt * 1.5) * sw;
      const oy = Math.sin(ph + tt * 1.5) * sw;
      for (let k = 0; k < 3; k++) {
        const s = d.start[i * 3 + k];
        const en = d.end[i * 3 + k];
        const r = k === 0 ? b.right.x : k === 1 ? b.right.y : b.right.z;
        const u = k === 0 ? b.up.x : k === 1 ? b.up.y : b.up.z;
        pos[i * 3 + k] = s + (en - s) * e + r * ox + u * oy;
      }
    }
    d.geo.attributes.position.needsUpdate = true;
    if (mat.current)
      mat.current.opacity =
        0.9 * smoothstep(0, 0.2, tt) * (1 - smoothstep(2.7, 3.5, tt));
    if (tt > DUST_LIFE && !finished.current) {
      finished.current = true;
      onDone();
    }
  });

  return (
    <points geometry={d.geo} frustumCulled={false} renderOrder={5}>
      <pointsMaterial
        ref={mat}
        map={glow}
        color="#ffe2a0"
        size={16}
        sizeAttenuation={false}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

// Tulisan pengunjung muncul melayang di atas danau, lengkap dengan pantulannya.
// Tulisan panjang dipecah jadi beberapa kartu yang muncul bergantian.
export default function LakeWords({
  wish,
  focus,
  reduceMotion,
}: {
  wish: MutableRefObject<Wish>;
  focus: MutableRefObject<Focus>;
  reduceMotion: boolean;
}) {
  const [words, setWords] = useState<W[]>([]);
  const [burst, setBurst] = useState<Burst | null>(null);
  const seen = useRef(wish.current.seq);
  const latest = words.length ? words[words.length - 1].wid : 0;

  useFrame((state) => {
    const w = wish.current;
    if (w.seq === seen.current) return;
    seen.current = w.seq;
    const cam = state.camera;
    const p = spawnPoint(cam);
    const chunks = splitText(w.text);
    let at = reduceMotion ? 0.3 : 1.6; // kartu pertama menunggu butiran cahaya tiba
    const list: W[] = chunks.map((text, i) => {
      const last = i === chunks.length - 1;
      const hold = last ? HOLD : clamp(4 + text.length * 0.045, 5, 11);
      const item: W = {
        id: w.seq * 100 + i,
        wid: w.seq,
        text,
        x: p.x,
        z: p.z,
        delay: at,
        hold,
      };
      at += revealOf(text, reduceMotion) + hold + GAP;
      return item;
    });
    const L = list[list.length - 1];
    // kamera menatap tulisan sampai kartu terakhir selesai muncul, lalu kembali pelan
    focus.current = {
      x: p.x,
      z: p.z,
      until:
        state.clock.elapsedTime + L.delay + revealOf(L.text, reduceMotion) + 6,
    };
    setWords((all) => [...all, ...list]);
    if (!reduceMotion) {
      const fwd = new THREE.Vector3();
      cam.getWorldDirection(fwd);
      const right = fwd
        .clone()
        .cross(new THREE.Vector3(0, 1, 0))
        .normalize();
      const up = right.clone().cross(fwd).normalize();
      setBurst({
        id: w.seq,
        from: cam.position.clone(),
        fwd,
        right,
        up,
        x: p.x,
        z: p.z,
      });
    }
  });

  return (
    <>
      {words.map((w) => (
        <Word
          key={w.id}
          w={w}
          dismissed={w.wid !== latest}
          reduceMotion={reduceMotion}
          onDone={(id) => setWords((all) => all.filter((x) => x.id !== id))}
        />
      ))}
      {burst && <Dust key={burst.id} b={burst} onDone={() => setBurst(null)} />}
    </>
  );
}
