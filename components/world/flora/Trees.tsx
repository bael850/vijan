"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { ELM, FLORA, GRASS, MAPLE, type TreeDef } from "../config/flora";
import { bakeTree } from "./treeModel";
import { scatter, type Occupied, type Spot } from "./placement";
import { tickWeather, weather } from "../core/weather";
import { applyWind, windDir, windGust, windTime } from "./wind";
import { floraOff, floraStats } from "./floraStats";
import { decimateGeometry } from "./decimate";

// Satu jenis pohon: model dibaca sekali, lalu digandakan ratusan kali (instancing) dengan
// ukuran, lebar, putaran, dan warna daun berbeda. Dunia dibagi petak supaya yang jauh tidak digambar.
function Species({
  name,
  def,
  quality,
  occupied,
  fixed,
}: {
  name: string;
  def: TreeDef;
  quality: GraphicsQuality;
  occupied: Occupied[];
  fixed?: Spot[]; // posisi yang sudah dihitung di <Trees> (dipakai pohon besar yang harus punya prioritas tempat)
}) {
  const { scene } = useGLTF(def.url);

  const group = useMemo(() => {
    const baked = bakeTree(scene, def.leafMatch, def.roundLight, def.lightMode);
    // salinan, supaya pemuatan ulang (mode dev) tidak menganggap pohonnya sendiri sebagai penghalang
    const spots =
      fixed ?? scatter(def, baked.baseRadius, quality, [...occupied]);

    // catatan untuk overlay ?stats
    let tris = 0;
    for (const p of baked.parts)
      tris += (p.geo.index?.count ?? p.geo.attributes.position.count) / 3;
    floraStats[name] = { perTree: tris, count: spots.length };

    // versi ringan daun untuk jarak jauh (hanya jenis yang punya def.meshLod)
    const farGeos = new Map<
      (typeof baked.parts)[number],
      THREE.BufferGeometry
    >();
    if (def.meshLod) {
      let farTris = 0;
      for (const p of baked.parts) {
        const base =
          (p.geo.index?.count ?? p.geo.attributes.position.count) / 3;
        if (p.leaf) {
          const fg = decimateGeometry(p.geo, def.meshLod.keep);
          farGeos.set(p, fg);
          farTris += (fg.index?.count ?? 0) / 3;
        } else farTris += base;
      }
      floraStats[name].far = farTris;
    }

    // bagi ke petak
    const cells = new Map<string, typeof spots>();
    for (const s of spots) {
      const ch = def.chunk ?? FLORA.chunk;
      const key = `${Math.floor(s.x / ch)},${Math.floor(s.z / ch)}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key)!.push(s);
    }

    for (const p of baked.parts)
      applyWind(p.mat, def.sway, p.leaf ? def.flutter : 0);

    const g = new THREE.Group();
    const m4 = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const eul = new THREE.Euler();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();

    cells.forEach((list) => {
      // pusat dan jari-jari petak, untuk pengurangan detail menurut jarak
      let cx = 0;
      let cz = 0;
      for (const s of list) {
        cx += s.x;
        cz += s.z;
      }
      cx /= list.length;
      cz /= list.length;
      let cr = 0;
      for (const s of list)
        cr = Math.max(cr, Math.hypot(s.x - cx, s.z - cz) + 8);
      const make = (
        geo: THREE.BufferGeometry,
        p: (typeof baked.parts)[number],
      ) => {
        const im = new THREE.InstancedMesh(geo, p.mat, list.length);
        list.forEach((s, i) => {
          pos.set(s.x, s.y, s.z);
          eul.set(s.tx, s.yaw, s.tz, "YXZ");
          quat.setFromEuler(eul);
          sc.set(s.h * s.w, s.h, s.h * s.w);
          m4.compose(pos, quat, sc);
          im.setMatrixAt(i, m4);
          if (p.leaf)
            im.setColorAt(i, col.setRGB(s.tint[0], s.tint[1], s.tint[2]));
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.castShadow = def.castShadow !== false;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        return im;
      };
      for (const p of baked.parts) {
        const im = make(p.geo, p);
        im.userData.lod = { x: cx, z: cz, r: cr, n: list.length };
        g.add(im);
        const fg = farGeos.get(p);
        if (fg) {
          const far = make(fg, p);
          far.visible = false;
          g.add(far);
          im.userData.pair = { far, x: cx, z: cz };
        }
      }
    });
    g.userData.baked = baked;
    g.userData.farGeos = [...farGeos.values()];
    g.userData.cat = name;
    return g;
  }, [scene, def, quality, occupied, fixed, name]);

  // Pengurangan detail menurut jarak (hanya jenis yang punya def.lod, yaitu rumput).
  // Petak jauh digambar sebagian sampel saja (urutan tanam sudah acak), lalu hilang sama sekali.
  const tick = useRef(0);
  useFrame(({ camera }) => {
    if (!def.lod && !def.meshLod) return;
    tick.current += 1;
    if (tick.current % 4 !== 0) return;
    const lodRange = def.lod;
    const cx = camera.position.x;
    const cz = camera.position.z;
    if (def.meshLod) {
      for (const ch of group.children) {
        const P = ch.userData.pair as
          | { far: THREE.Object3D; x: number; z: number }
          | undefined;
        if (!P) continue;
        const near = Math.hypot(P.x - cx, P.z - cz) < def.meshLod.dist;
        ch.visible = near;
        P.far.visible = !near;
      }
    }
    if (!lodRange) return;
    const [a, b, c] = lodRange;
    for (const ch of group.children) {
      const L = ch.userData.lod as
        | { x: number; z: number; r: number; n: number }
        | undefined;
      if (!L) continue;
      const d = Math.hypot(L.x - cx, L.z - cz) - L.r;
      const im = ch as THREE.InstancedMesh;
      if (d > c) {
        im.visible = false;
        continue;
      }
      im.visible = true;
      const f = d > b ? 0.25 : d > a ? 0.5 : 1;
      im.count = Math.max(1, Math.ceil(L.n * f));
    }
  });

  useEffect(
    () => () => {
      const baked = group.userData.baked as ReturnType<typeof bakeTree>;
      group.children.forEach((c) => (c as THREE.InstancedMesh).dispose());
      (group.userData.farGeos as THREE.BufferGeometry[]).forEach((fg) =>
        fg.dispose(),
      );
      baked.parts.forEach((p) => {
        p.geo.dispose();
        p.mat.dispose();
      });
    },
    [group],
  );

  return <primitive object={group} />;
}

// Semua tumbuhan dunia (pohon dan rumput). Jenis baru: tambahkan <Species def={...} /> di bawah.
export default function Trees({ quality }: { quality: GraphicsQuality }) {
  // Elm paling besar, jadi tempatnya dipesan lebih dulu (tidak bergantung model mana yang selesai dimuat duluan).
  // Maple dan rumput lalu menghindarinya.
  const { occupied, elmSpots } = useMemo(() => {
    const occ: Occupied[] = [];
    const elm = scatter(ELM, 0, quality, occ);
    return { occupied: occ, elmSpots: elm };
  }, [quality]);
  useFrame(({ clock }) => {
    windTime.value = clock.elapsedTime;
    tickWeather(clock.elapsedTime);
    windGust.value = weather.gust;
    windDir.value.copy(weather.windDir);
  });
  return (
    <>
      {!floraOff("maple") && (
        <Species
          name="maple"
          def={MAPLE}
          quality={quality}
          occupied={occupied}
        />
      )}
      {!floraOff("elm") && (
        <Species
          name="elm"
          def={ELM}
          quality={quality}
          occupied={occupied}
          fixed={elmSpots}
        />
      )}
      {!floraOff("rumput") && (
        <Species
          name="rumput"
          def={GRASS}
          quality={quality}
          occupied={occupied}
        />
      )}
    </>
  );
}

useGLTF.preload(MAPLE.url);
useGLTF.preload(ELM.url);
useGLTF.preload(GRASS.url);
