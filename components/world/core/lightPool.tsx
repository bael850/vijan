"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { NIGHT_GLOW as N } from "../config/nightGlow";
import { dayState } from "./dayCycle";
import { getGlowWhite } from "./glow";

// Sumber cahaya malam yang bisa didaftarkan bab mana pun (kota, desa, kastil, ...).
// Halo digambar semuanya (murah, satu panggilan gambar per kelompok); lampu titik sungguhan
// hanya dipasang di beberapa sumber terdekat dengan kamera, lalu berpindah halus mengikutinya.
export type Source = {
  x: number;
  y: number;
  z: number;
  color: string;
  power: number; // intensitas lampu titik
  flicker?: number; // 0 = tenang, 0.1 = api berkedip
  room?: boolean; // lampu ruangan rumah: dipakai hanya saat di dalam rumah (lampu luar hanya saat di luar)
  distance?: number; // jangkauan cahaya (m), bawaan dari kolam
  decay?: number;
};

// Keadaan rumah, diisi oleh RoomLight: seberapa dalam kamera di rumah (0..1) dan kecerahan lampu rumah (0..1).
export const roomMode = { k: 0, lamp: 0 };

const sources = new Set<Source>();

// Daftarkan sumber selama komponen terpasang. Panggil di useEffect.
export function addSources(list: Source[]) {
  list.forEach((s) => sources.add(s));
  return () => list.forEach((s) => sources.delete(s));
}

type Slot = { src: Source | null; want: Source | null; k: number };

// Pasang SEKALI di dunia (misalnya di dalam bab pertama yang memakainya). Jumlah lampu tetap,
// jadi tidak ada kompilasi ulang shader saat lampu berpindah.
export function LightPool({ quality }: { quality: GraphicsQuality }) {
  const count = N.pool.count[quality];
  const outdoor = N.pool.outdoor[quality];
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const slots = useRef<Slot[]>([]);
  const timer = useRef(0);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  if (slots.current.length !== count)
    slots.current = Array.from({ length: count }, () => ({
      src: null,
      want: null,
      k: 0,
    }));

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const on = dayState.lamps;
    const cp = camera.position;
    const S = slots.current;

    // pilih sumber terdekat tiap 0.25 detik, bukan tiap frame
    timer.current -= dt;
    const inside = roomMode.k > 0.5;
    if (timer.current <= 0 && (on > 0.01 || roomMode.k > 0.01)) {
      timer.current = 0.25;
      const r2 = N.pool.range * N.pool.range;
      const near: { s: Source; d: number }[] = [];
      for (const s of sources) {
        const d = (s.x - cp.x) ** 2 + (s.y - cp.y) ** 2 + (s.z - cp.z) ** 2;
        // di dalam rumah hanya lampu ruangan, di luar hanya lampu luar (dan tidak sama sekali di low)
        if (!!s.room !== inside || (!inside && !outdoor)) continue;
        if (d < r2 || s.room) near.push({ s, d });
      }
      near.sort((a, b) => a.d - b.d);
      const top = near.slice(0, count).map((n) => n.s);
      for (const sl of S)
        sl.want = sl.src && top.includes(sl.src) ? sl.src : null;
      for (const s of top) {
        if (S.some((sl) => sl.want === s)) continue;
        const free = S.find((sl) => sl.want === null);
        if (free) free.want = s;
      }
    }

    S.forEach((sl, i) => {
      const light = lights.current[i];
      if (!light) return;
      const same = sl.want === sl.src;
      // sumber berganti: padamkan dulu, pindahkan saat gelap, lalu nyalakan lagi
      const target = same && sl.src ? 1 : 0;
      sl.k += (target - sl.k) * (1 - Math.exp(-N.pool.fade * dt));
      if (!same && sl.k < 0.03) {
        sl.src = sl.want;
        if (sl.src) {
          light.position.set(sl.src.x, sl.src.y, sl.src.z);
          light.color.copy(tmpColor.set(sl.src.color));
          light.distance = sl.src.distance ?? N.pool.distance;
          light.decay = sl.src.decay ?? N.pool.decay;
        }
      }
      const f = sl.src?.flicker ?? 0;
      const flick = f
        ? 1 +
          f *
            (Math.sin(clock.elapsedTime * 9 + i) * 0.6 +
              Math.sin(clock.elapsedTime * 23 + i * 2) * 0.4)
        : 1;
      const gain = sl.src?.room ? roomMode.k * roomMode.lamp : on;
      light.intensity = sl.src ? sl.src.power * sl.k * gain * flick : 0;
    });
  });

  useEffect(() => () => void (slots.current = []), []);

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <pointLight
          key={i}
          ref={(l) => void (lights.current[i] = l)}
          intensity={0}
          distance={N.pool.distance}
          decay={N.pool.decay}
        />
      ))}
    </>
  );
}

// Halo cahaya aditif untuk sekelompok sumber: satu panggilan gambar, memudar bersama siang.
export function GlowPoints({
  list,
  color,
  size,
  base,
}: {
  list: { x: number; y: number; z: number }[];
  color: string;
  size: number;
  base: number;
}) {
  const map = useMemo(getGlowWhite, []);
  const pts = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        list.flatMap((p) => [p.x, p.y, p.z]),
        3,
      ),
    );
    return g;
  }, [list]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(() => {
    const o = base * dayState.lamps;
    if (mat.current) mat.current.opacity = o;
    if (pts.current) pts.current.visible = o > 0.01;
  });
  return (
    <points ref={pts} geometry={geo} frustumCulled={false}>
      <pointsMaterial
        ref={mat}
        map={map}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
