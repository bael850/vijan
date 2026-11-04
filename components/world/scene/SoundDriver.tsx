"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sound } from "@/components/sound";
import { CASTLE, LAKE } from "../config/world";
import { dayState } from "../core/dayCycle";
import { clamp, smoothstep } from "../core/math";
import { routeDist } from "../core/route";
import { lakeDist } from "../terrain/heightmap";

// Menerjemahkan posisi kamera menjadi keadaan suara: dekat danau, di hutan, dekat rumah, di dalam rumah.
export default function SoundDriver({
  indoor,
}: {
  indoor: MutableRefObject<number>;
}) {
  const acc = useRef(0);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => sound.reset(), []);

  useFrame(({ camera }, dt) => {
    acc.current += dt;
    if (acc.current < 0.1) return;
    acc.current = 0;

    const { x, z } = camera.position;
    camera.getWorldDirection(dir);
    const rx = -dir.z;
    const rz = dir.x;
    const pan = (tx: number, tz: number) => {
      const dx = tx - x;
      const dz = tz - z;
      const n = Math.hypot(dx, dz) || 1;
      return clamp((dx * rx + dz * rz) / n, -1, 1);
    };

    const lake = 1 - smoothstep(1.0, 2.3, lakeDist(x, z));
    const forest = smoothstep(3, 16, routeDist(x, z)) * (1 - lake);
    // "house" = keramaian kota: makin dekat pusat kastil makin ramai
    const house =
      1 - smoothstep(20, 130, Math.hypot(x - CASTLE.x, z - CASTLE.z));

    sound.setState({
      indoor: indoor.current,
      lake,
      lakePan: pan(LAKE.x, LAKE.z),
      forest,
      house,
      housePan: pan(CASTLE.x, CASTLE.z),
      day: dayState.daylight,
    });
  });

  return null;
}
