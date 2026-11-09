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
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import {
  HOME_COLORS as C,
  HOME_GLOW as G,
  PETALS,
  TREE,
} from "../../config/home";
import { WAYPOINTS } from "../../config/route";
import { HOUSE } from "../../config/world";
import { dayState } from "../../core/dayCycle";
import { grainMat } from "../../core/grain";
import HomeEffects from "./HomeEffects";
import HouseInterior from "./HouseInterior";
import HouseParts from "./HouseParts";
import Sakura from "./SakuraModel";
import type { HouseState } from "./houseState";
import {
  buildHome,
  buildTree,
  buildYard,
  GROUND,
  KEYS,
  newBag,
  type Key,
} from "./homeGeometry";

const SEG: Record<GraphicsQuality, number> = { low: 10, medium: 14, high: 20 };

// Bab 6, rumah kita: rumah modern dua lantai dengan halaman, sakura di tepi jalur, dan kelopak yang jatuh pelan.
export default function Home({
  quality,
  reduceMotion,
  house,
  indoor,
  onEnter,
  books,
  onSpot,
  onTip,
}: {
  quality: GraphicsQuality;
  reduceMotion: boolean;
  house: MutableRefObject<HouseState>;
  indoor: MutableRefObject<number>;
  onEnter: () => void;
  books: number;
  onSpot: (id: string) => void;
  onTip: (id: string | null) => void;
}) {
  // sakura dari glb; kalau gagal dimuat, kembali ke sakura buatan kode
  const [modelFailed, setModelFailed] = useState(false);
  const useModel = TREE.model.enabled && !modelFailed;

  const geo = useMemo(() => {
    const bag = newBag();
    // ujung batu pijakan: titik jalur bab rumah yang paling dekat
    const end = WAYPOINTS.find(
      (w) => w.chapter === "rumah" && w.x > TREE.x - 14,
    ) ?? { x: TREE.x - 8, z: TREE.z - 8 };
    buildHome(bag);
    buildYard(bag, { x: end.x, z: end.z + 2 }, SEG[quality]);
    // dengan model glb: kelopak di tanah dan daun gugur dibuat SakuraModel dari kelopak asli pohon
    buildTree(
      bag,
      SEG[quality],
      useModel ? 0 : PETALS.ground[quality],
      !useModel,
    );
    const out = {} as Record<Key, THREE.BufferGeometry | null>;
    for (const k of KEYS) {
      const list = bag[k];
      out[k] = list.length ? mergeGeometries(list, false) : null;
      list.forEach((g) => g.dispose());
    }
    return out;
  }, [quality, useModel]);

  const mats = useMemo(() => {
    const glow = (color: string, g: string) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: g,
        emissiveIntensity: 0,
        roughness: 0.6,
      });
    const bloom = (c: string) =>
      new THREE.MeshLambertMaterial({
        color: c,
        emissive: c,
        emissiveIntensity: G.blossom.day,
        side: THREE.DoubleSide,
      });
    return {
      plaster: grainMat(C.plaster, "plaster"),
      wood: grainMat(C.wood, "deck"),
      roof: grainMat(C.roof, "roof"),
      stone: grainMat(C.stone, "stone"),
      gravel: grainMat(C.gravel, "ground"),
      bark: grainMat(C.bark, "wood"),
      metal: grainMat(C.metal, "roof"),
      paving: grainMat(C.paving, "stone"),
      green: grainMat(C.green, "ground"),
      glass: new THREE.MeshStandardMaterial({
        color: C.glass,
        emissive: C.glassGlow,
        emissiveIntensity: 0,
        roughness: 0.08,
        metalness: 0.3,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      }),
      lamp: glow("#3a2a14", C.lamp),
      blossom0: bloom(C.blossom[0]),
      blossom1: bloom(C.blossom[1]),
      blossom2: bloom(C.blossom[2]),
    } as Record<Key, THREE.Material>;
  }, []);

  // kelopak jatuh: satu InstancedMesh, tiap kelopak bergulir dari tajuk ke tanah lalu mulai lagi
  const count = PETALS.count[quality];
  const petals = useRef<THREE.InstancedMesh>(null);

  // Isi rumah (perabot, rak, buku) hanya kelihatan dari dekat, lewat jendela dan pintu.
  // Dari jauh (rune awal, jalan menuju kastil) tidak digambar: sekitar 350 ribu segitiga terbuang.
  // Ada selisih jarak (110 dan 130 m) supaya tidak berkedip di batasnya.
  const interior = useRef<THREE.Group>(null);
  const interiorOn = useRef(true);
  // Perabot di dalam hanya perlu membuat bayangan kalau pengunjung di dalam rumah. Dari luar, dindingnya
  // sudah menutup, jadi peta bayangan tidak perlu ikut menggambar ratusan ribu segitiga isi rumah.
  const castOn = useRef<boolean | null>(null);
  const castTick = useRef(0);
  useFrame(({ camera, gl }) => {
    const d = Math.hypot(
      camera.position.x - HOUSE.x,
      camera.position.z - HOUSE.z,
    );
    if (interiorOn.current && d > 130) interiorOn.current = false;
    else if (!interiorOn.current && d < 110) interiorOn.current = true;
    const g = interior.current;
    if (!g) return;
    g.visible = interiorOn.current;
    const want = indoor.current > 0.3;
    castTick.current += 1;
    // dicek ulang berkala juga, untuk bagian yang baru selesai dimuat
    if (want !== castOn.current || castTick.current % 120 === 0) {
      const changed = want !== castOn.current;
      castOn.current = want;
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (m.userData.cast0 === undefined) m.userData.cast0 = m.castShadow;
        m.castShadow = want && m.userData.cast0;
      });
      if (changed) gl.shadowMap.needsUpdate = true;
    }
  });
  const params = useMemo(() => {
    let a = 91;
    const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: count }, () => {
      const ang = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * PETALS.spread;
      const speed = PETALS.fall[0] + r() * (PETALS.fall[1] - PETALS.fall[0]);
      // kelopak mulai jatuh dari tajuk: 47%-85% tinggi pohon
      const h0 = TREE.height * (0.47 + r() * 0.38);
      return {
        ox: Math.cos(ang) * rad,
        oz: Math.sin(ang) * rad,
        speed,
        h0,
        life: h0 / speed,
        off: r() * 30,
        ph: r() * 6.28,
      };
    });
  }, [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const m = petals.current;
    if (!m) return;
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) m.setColorAt(i, col.set(C.blossom[i % 3]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(({ clock }) => {
    const night = 1 - dayState.daylight;
    const lerp = (v: { day: number; night: number }) =>
      v.day + (v.night - v.day) * night;
    // jendela hanya berpendar dari luar saat gelap dan lampu dalam benar-benar menyala
    // (siang, interior lebih gelap dari luar; lampu dimatikan, jendela ikut gelap)
    (mats.glass as THREE.MeshStandardMaterial).emissiveIntensity =
      G.glass.night * night * house.current.lamp;
    // lampu berkedip sangat halus, seperti api di dalam kaca
    const flick =
      1 +
      Math.sin(clock.elapsedTime * 7.3) * 0.03 +
      Math.sin(clock.elapsedTime * 13.1) * 0.02;
    (mats.lamp as THREE.MeshStandardMaterial).emissiveIntensity =
      (G.lamp.day + (G.lamp.night - G.lamp.day) * dayState.lamps) * flick;
    for (const k of ["blossom0", "blossom1", "blossom2"] as const)
      (mats[k] as THREE.MeshLambertMaterial).emissiveIntensity = lerp(
        G.blossom,
      );

    const m = petals.current;
    if (!m) return;
    const t = clock.elapsedTime * (reduceMotion ? 0.4 : 1);
    for (let i = 0; i < count; i++) {
      const p = params[i];
      const u = (t + p.off) % p.life;
      dummy.position.set(
        TREE.x + p.ox + Math.sin(u * 1.3 + p.ph) * 0.9 + PETALS.wind.x * u,
        GROUND + p.h0 - p.speed * u,
        TREE.z + p.oz + Math.cos(u * 1.1 + p.ph) * 0.9 + PETALS.wind.z * u,
      );
      dummy.rotation.set(u * 2 + p.ph, u * 1.5, u * 2.5 + p.ph);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g?.dispose();
      for (const k of [
        "glass",
        "lamp",
        "blossom0",
        "blossom1",
        "blossom2",
      ] as Key[])
        mats[k].dispose();
    },
    [geo, mats],
  );

  const flat: Key[] = [
    "glass",
    "lamp",
    "gravel",
    "paving",
    "blossom0",
    "blossom1",
    "blossom2",
  ];
  return (
    <group>
      {KEYS.map((k) =>
        geo[k] ? (
          <mesh
            key={k}
            geometry={geo[k]!}
            material={mats[k]}
            castShadow={!flat.includes(k)}
            receiveShadow={k !== "glass" && k !== "lamp"}
          />
        ) : null,
      )}
      <HouseParts
        house={house}
        indoor={indoor}
        onEnter={onEnter}
        glass={mats.glass}
        metal={mats.metal}
      />
      <group ref={interior}>
        <HouseInterior
          house={house}
          books={books}
          onPick={onSpot}
          onTip={onTip}
        />
      </group>
      <HomeEffects reduceMotion={reduceMotion} />
      {useModel && (
        <Sakura
          quality={quality}
          reduceMotion={reduceMotion}
          onFail={() => setModelFailed(true)}
        />
      )}
      {!useModel && (
        <instancedMesh
          ref={petals}
          args={[undefined, undefined, count]}
          frustumCulled={false}
        >
          <planeGeometry args={[0.16, 0.11]} />
          <meshLambertMaterial color="#ffffff" side={THREE.DoubleSide} />
        </instancedMesh>
      )}
    </group>
  );
}
