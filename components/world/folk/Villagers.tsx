"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { hash } from "../core/math";
import { roadX } from "../path/road";
import { groundHeight, lakeDist } from "../terrain/heightmap";
import { BUILDINGS, doorOf } from "../village/villageLayout";

// Penduduk desa (biarawan). Jumlahnya sedikit dan tidak semuanya berjalan:
// - satu perkumpulan: 2-3 orang berdiri melingkar, saling menghadap, sesekali mengangguk
// - beberapa orang berdiri diam di depan pintu rumah, menghadap jalan
// - sisanya berjalan bolak-balik di jalan, berhenti lama di ujung rute
// Modelnya public/models/biarawan.glb (±770 segitiga, tinggi 1,7 m, kaki di y=0, hadap +z).
// Sengaja sedikit supaya jatah untuk prajurit dan ksatria tidak terlalu berat.
const MODEL = "/models/biarawan.glb";
const ROAD_TOP = 62; // z paling atas yang dipakai penduduk (dekat gerbang)
const ROAD_END = -114; // jangan sampai ke depan pintu rumah utama
const FIRST_NEIGHBOR = 13; // nomor bangunan tetangga baru di BUILDINGS
const GROUP_HOUSE = 14; // perkumpulan di antara pondok ini dan jalan
const STAND_HOUSES = [13, 15, 16, 17]; // yang berdiri di depan pintu rumah-rumah ini
const SCALE_MIN = 0.86; // tinggi divariasikan: 1,46 m sampai 1,92 m
const SCALE_MAX = 1.13;

type Person = {
  kind: "walk" | "stand" | "group";
  x: number;
  z: number;
  yaw: number; // arah hadap (untuk yang diam)
  scale: number;
  phase: number;
  // khusus pejalan
  pts?: [number, number][];
  cum?: number[];
  len?: number;
  speed?: number;
  pause?: number;
};

const sc = (i: number) => SCALE_MIN + hash(i, 61) * (SCALE_MAX - SCALE_MIN);

function roadPoints(za: number, zb: number, off: number): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.max(2, Math.ceil(Math.abs(zb - za) / 4));
  for (let k = 0; k <= n; k++) {
    const z = za + ((zb - za) * k) / n;
    out.push([roadX(z) + off, z]);
  }
  return out;
}

function walker(i: number): Person | null {
  const off = (hash(i, 31) - 0.5) * 2.2;
  let pts: [number, number][];
  if (i % 2 === 0) {
    const za = ROAD_TOP - hash(i, 32) * 120;
    const zb = Math.max(ROAD_END, za - (40 + hash(i, 33) * 50));
    if (za - zb < 20) return null;
    pts = roadPoints(za, zb, off);
  } else {
    const idx =
      FIRST_NEIGHBOR + ((i * 5) % (BUILDINGS.length - FIRST_NEIGHBOR));
    const [dx, dz] = doorOf(idx);
    if (lakeDist(dx, dz) < 1.3) return null;
    const zr = Math.min(ROAD_TOP, Math.max(ROAD_END, dz));
    const dir = hash(i, 34) > 0.5 ? 1 : -1;
    const ze = Math.min(
      ROAD_TOP,
      Math.max(ROAD_END, zr + dir * (18 + hash(i, 35) * 22)),
    );
    pts = [[dx, dz], ...roadPoints(zr, ze, off)];
  }
  const cum = [0];
  for (let k = 1; k < pts.length; k++)
    cum.push(
      cum[k - 1] +
        Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]),
    );
  return {
    kind: "walk",
    x: pts[0][0],
    z: pts[0][1],
    yaw: 0,
    pts,
    cum,
    len: cum[cum.length - 1],
    speed: 0.8 + hash(i, 36) * 0.4,
    pause: 10 + hash(i, 37) * 14, // berhenti lama di ujung rute
    phase: hash(i, 38) * 400,
    scale: sc(i),
  };
}

// orang berdiri di depan pintu rumah, menghadap keluar (ke arah jalan)
function stander(i: number, house: number): Person | null {
  const b = BUILDINGS[house];
  const [dx, dz] = doorOf(house);
  if (!b || lakeDist(dx, dz) < 1.3) return null;
  const ox = dx - b.x;
  const oz = dz - b.z;
  const l = Math.hypot(ox, oz) || 1;
  const x = dx + (ox / l) * 0.9;
  const z = dz + (oz / l) * 0.9;
  return {
    kind: "stand",
    x,
    z,
    yaw: Math.atan2(ox, oz),
    scale: sc(i),
    phase: hash(i, 62) * 50,
  };
}

// perkumpulan: berdiri melingkar di antara pintu pondok dan jalan, saling menghadap pusat
function circle(count: number, seed: number): Person[] {
  const [dx, dz] = doorOf(GROUP_HOUSE);
  const rx = roadX(dz);
  const cx = dx + (rx - dx) * 0.45;
  const cz = dz;
  const out: Person[] = [];
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + hash(seed, 63) * 1.5;
    const r = 0.95 + hash(seed + k, 64) * 0.25;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    out.push({
      kind: "group",
      x,
      z,
      yaw: Math.atan2(cx - x, cz - z) + (hash(seed + k, 65) - 0.5) * 0.5,
      scale: sc(seed + k),
      phase: hash(seed + k, 66) * 50,
    });
  }
  return out;
}

function sample(p: Person, d: number) {
  const pts = p.pts!;
  const cum = p.cum!;
  let k = 1;
  while (k < cum.length - 1 && cum[k] < d) k++;
  const seg = Math.max(1e-6, cum[k] - cum[k - 1]);
  const f = Math.min(1, Math.max(0, (d - cum[k - 1]) / seg));
  const [ax, az] = pts[k - 1];
  const [bx, bz] = pts[k];
  return {
    x: ax + (bx - ax) * f,
    z: az + (bz - az) * f,
    dx: bx - ax,
    dz: bz - az,
  };
}

export default function Villagers({
  amount,
  reduceMotion,
}: {
  amount: number;
  reduceMotion: boolean;
}) {
  const { scene } = useGLTF(MODEL);

  const people = useMemo(() => {
    if (amount <= 0) return [] as Person[];
    const out: Person[] = [];
    const groupSize = amount >= 5 ? 3 : amount >= 3 ? 2 : 0;
    out.push(...circle(groupSize, 100));
    const rest = amount - groupSize;
    const walkers = rest > 0 ? Math.max(1, Math.floor(rest / 2)) : 0;
    const standers = rest - walkers;
    for (let k = 0, got = 0; got < walkers && k < 40; k++) {
      const w = walker(k);
      if (w) {
        out.push(w);
        got++;
      }
    }
    for (let k = 0, got = 0; got < standers && k < STAND_HOUSES.length; k++) {
      const s = stander(200 + k, STAND_HOUSES[k]);
      if (s) {
        out.push(s);
        got++;
      }
    }
    return out;
  }, [amount]);

  // satu salinan model per orang, material dipakai bersama (warna sama)
  const clones = useMemo(
    () =>
      people.map(() => {
        const g = scene.clone(true);
        g.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) o.castShadow = true;
        });
        return g;
      }),
    [scene, people],
  );

  const refs = useRef<(THREE.Group | null)[]>([]);
  const yaws = useRef<number[]>([]);
  const clock = useRef(0);

  const place = (t: number) => {
    people.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      const idleT = t + p.phase;

      if (p.kind !== "walk") {
        // diam: napas pelan; yang berkumpul sesekali mengangguk
        const nod =
          p.kind === "group"
            ? Math.max(0, Math.sin(idleT * 0.7)) ** 3 * 0.09
            : 0;
        const turn =
          p.kind === "group"
            ? Math.sin(idleT * 0.23) * 0.18
            : Math.sin(idleT * 0.15) * 0.05;
        g.position.set(
          p.x,
          groundHeight(p.x, p.z) + Math.sin(idleT * 1.4) * 0.006,
          p.z,
        );
        g.rotation.set(nod, p.yaw + turn, 0, "YXZ");
        g.scale.setScalar(p.scale);
        return;
      }

      const run = p.len! / p.speed!;
      const pause = p.pause!;
      const cycle = 2 * (run + pause);
      const c = idleT % cycle;
      let d: number;
      let dirSign = 1;
      let moving = true;
      if (c < pause) {
        d = 0;
        moving = false;
      } else if (c < pause + run) {
        d = (c - pause) * p.speed!;
      } else if (c < 2 * pause + run) {
        d = p.len!;
        moving = false;
        dirSign = -1;
      } else {
        d = p.len! - (c - 2 * pause - run) * p.speed!;
        dirSign = -1;
      }
      const s = sample(p, d);
      const want = Math.atan2(s.dx * dirSign, s.dz * dirSign);
      const prev = yaws.current[i] ?? want;
      const diff = Math.atan2(Math.sin(want - prev), Math.cos(want - prev));
      const yaw = prev + diff * 0.12;
      yaws.current[i] = yaw;

      const ph = d * 2.6;
      const step = moving ? Math.abs(Math.sin(ph)) : 0;
      g.position.set(s.x, groundHeight(s.x, s.z) + step * 0.06, s.z);
      g.rotation.set(
        moving ? 0.05 : 0,
        yaw + (moving ? Math.sin(ph) * 0.06 : 0),
        moving ? Math.sin(ph) * 0.06 : 0,
        "YXZ",
      );
      g.scale.setScalar(p.scale);
    });
  };

  useFrame((_, dt) => {
    if (reduceMotion) return;
    clock.current += Math.min(dt, 0.1);
    place(clock.current);
  });

  // posisi awal, supaya tidak ada yang muncul di titik (0,0,0)
  useLayoutEffect(() => {
    yaws.current = [];
    place(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, clones]);

  if (people.length === 0) return null;
  return (
    <group>
      {clones.map((g, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <primitive object={g} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload(MODEL);
