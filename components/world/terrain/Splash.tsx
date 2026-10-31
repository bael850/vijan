"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WATER_Y } from "../config/world";
import { takeSplashes } from "../effects/splashBus";

// Riak melingkar dan butiran air yang muncul di tempat splash(x, z, power) dipanggil.
// Dipakai ikan melompat sekarang, dan nanti sayap naga yang menyentuh danau.
const SLOTS = 6; // jumlah percikan yang boleh tampil bersamaan
const DROPS = 14;
const LIFE = 1.9; // lama riak (detik)
const GRAVITY = 9.8;

type Slot = {
  active: boolean;
  age: number;
  x: number;
  z: number;
  power: number;
  rings: THREE.Mesh[];
  drops: THREE.InstancedMesh;
  vel: Float32Array; // vx, vy, vz per butir
  size: Float32Array;
};

const dummy = new THREE.Object3D();

export default function Splash() {
  const { root, slots } = useMemo(() => {
    const root = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(0.88, 1, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const dropGeo = new THREE.SphereGeometry(1, 6, 4);
    const dropMat = new THREE.MeshBasicMaterial({
      color: "#dff3f3",
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const slots: Slot[] = [];
    for (let s = 0; s < SLOTS; s++) {
      const rings = [0, 1].map(() => {
        const m = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({
            color: "#d8f0f0",
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        m.visible = false;
        m.renderOrder = 4;
        m.frustumCulled = false;
        root.add(m);
        return m;
      });
      const drops = new THREE.InstancedMesh(dropGeo, dropMat, DROPS);
      drops.visible = false;
      drops.renderOrder = 4;
      drops.frustumCulled = false;
      root.add(drops);
      slots.push({
        active: false,
        age: 0,
        x: 0,
        z: 0,
        power: 1,
        rings,
        drops,
        vel: new Float32Array(DROPS * 3),
        size: new Float32Array(DROPS),
      });
    }
    return { root, slots };
  }, []);

  useEffect(
    () => () => {
      const seen = new Set<THREE.BufferGeometry | THREE.Material>();
      root.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
          seen.add(o.geometry);
          seen.add(o.material as THREE.Material);
        }
      });
      seen.forEach((d) => d.dispose());
    },
    [root],
  );

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1);

    for (const e of takeSplashes()) {
      // pakai slot yang kosong, kalau penuh timpa yang paling tua
      let slot = slots.find((s) => !s.active);
      if (!slot) slot = slots.reduce((a, b) => (b.age > a.age ? b : a));
      slot.active = true;
      slot.age = 0;
      slot.x = e.x;
      slot.z = e.z;
      slot.power = e.power;
      const p = Math.sqrt(e.power);
      for (let i = 0; i < DROPS; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.4 + Math.random() * 1.4) * p;
        slot.vel[i * 3] = Math.cos(a) * sp;
        slot.vel[i * 3 + 1] = (1.6 + Math.random() * 1.6) * p;
        slot.vel[i * 3 + 2] = Math.sin(a) * sp;
        slot.size[i] = (0.04 + Math.random() * 0.05) * (0.7 + 0.5 * p);
      }
      slot.drops.visible = true;
    }

    for (const s of slots) {
      if (!s.active) continue;
      s.age += dt;
      if (s.age > LIFE + 0.3) {
        s.active = false;
        s.rings.forEach((r) => (r.visible = false));
        s.drops.visible = false;
        continue;
      }
      s.rings.forEach((ring, i) => {
        const a = s.age - i * 0.28;
        if (a < 0) {
          ring.visible = false;
          return;
        }
        const t = Math.min(1, a / LIFE);
        const ease = 1 - (1 - t) * (1 - t);
        const size =
          (0.25 + 3.4 * ease) * (0.55 + 0.45 * s.power) * (i ? 0.75 : 1);
        ring.visible = true;
        ring.position.set(s.x, WATER_Y + 0.04, s.z);
        ring.scale.setScalar(size);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          0.65 * Math.pow(1 - t, 1.6) * (i ? 0.7 : 1);
      });
      for (let i = 0; i < DROPS; i++) {
        const t = s.age;
        const y = s.vel[i * 3 + 1] * t - 0.5 * GRAVITY * t * t;
        if (y < 0) {
          dummy.scale.setScalar(0);
        } else {
          dummy.scale.setScalar(s.size[i]);
        }
        dummy.position.set(
          s.x + s.vel[i * 3] * t,
          WATER_Y + Math.max(y, 0),
          s.z + s.vel[i * 3 + 2] * t,
        );
        dummy.updateMatrix();
        s.drops.setMatrixAt(i, dummy.matrix);
      }
      s.drops.instanceMatrix.needsUpdate = true;
    }
  });

  return <primitive object={root} />;
}
