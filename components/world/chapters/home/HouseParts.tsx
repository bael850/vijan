"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  BALCONY,
  BEDROOM,
  HOME,
  HOME_COLORS,
  HOME_GLOW as G,
  HOME_UI,
  LAMPS,
} from "../../config/home";
import { displayFamily, whenDisplayFont } from "../../core/canvasFont";
import { dayState } from "../../core/dayCycle";
import { addSources, roomMode, type Source } from "../../core/lightPool";
import { buildDoor, DOOR, F, F2, GROUND, local, newBag } from "./homeGeometry";
import { stepLamp } from "./houseLamps";
import type { HouseState } from "./houseState";
import { perfOff } from "../../scene/perfOff";

const damp = (cur: number, target: number, k: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-k * dt));

// Pintu kaca geser dua daun. Daun tertutup berdiri di muka kusen; saat membuka, daun mundur ke luar
// dulu (z lokal), baru bergeser ke samping, jadi tidak menembus aksen batu, kisi kayu, atau lampu di fasad.
function SlideDoor({
  house,
  glass,
  metal,
  at,
  yaw,
  out,
  want,
  rate = 2.2,
}: {
  house: MutableRefObject<HouseState>;
  glass: THREE.Material;
  metal: THREE.Material;
  at: THREE.Vector3;
  yaw: number; // sumbu z lokal pintu menunjuk ke luar rumah
  out: number; // jarak daun mundur ke luar saat membuka (m)
  want: (h: HouseState) => boolean;
  rate?: number;
}) {
  const geo = useMemo(() => {
    const bag = newBag();
    buildDoor(bag);
    const parts = {
      glass: mergeGeometries(bag.glass, false),
      metal: mergeGeometries(bag.metal, false),
    };
    bag.glass.forEach((g) => g.dispose());
    bag.metal.forEach((g) => g.dispose());
    return parts;
  }, []);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const open = useRef(0);
  useFrame((_, delta) => {
    open.current = damp(
      open.current,
      want(house.current) ? 1 : 0,
      rate,
      Math.min(delta, 0.05),
    );
    const o = open.current;
    const z = Math.min(1, o * 3) * out; // fase 1: mundur ke luar
    const x = DOOR.leaf / 2 + Math.max(0, (o - 0.25) / 0.75) * DOOR.slide; // fase 2: geser
    if (left.current) left.current.position.set(-x, 0, z);
    if (right.current) right.current.position.set(x, 0, z);
  });
  const leaf = (
    <>
      {geo.glass && <mesh geometry={geo.glass} material={glass} />}
      {geo.metal && <mesh geometry={geo.metal} material={metal} castShadow />}
    </>
  );
  return (
    <group position={at} rotation={[0, yaw, 0]}>
      <group ref={left} position={[-DOOR.leaf / 2, 0, 0]}>
        {leaf}
      </group>
      <group ref={right} position={[DOOR.leaf / 2, 0, 0]} scale={[-1, 1, 1]}>
        {leaf}
      </group>
    </group>
  );
}

function Door(props: {
  house: MutableRefObject<HouseState>;
  glass: THREE.Material;
  metal: THREE.Material;
}) {
  return (
    <SlideDoor
      {...props}
      at={DOOR.at}
      yaw={DOOR.yaw}
      out={0.22}
      want={(h) => h.mode !== "out"}
    />
  );
}

// Pintu kaca balkon di kamar tidur: membuka sendiri kalau pengunjung dekat (dari dalam maupun dari balkon).
const BALCONY_DOOR = {
  at: local(
    HOME.upper.x0 - 0.1,
    F2 + 0.06 + DOOR.h / 2 + 0.025,
    BALCONY.door.c,
  ),
  // sumbu x daun sejajar z rumah, sumbu z daun menunjuk ke luar (x rumah negatif)
  yaw: DOOR.yaw - Math.PI / 2,
};
function BalconyDoor(props: {
  house: MutableRefObject<HouseState>;
  glass: THREE.Material;
  metal: THREE.Material;
}) {
  return (
    <SlideDoor
      {...props}
      at={BALCONY_DOOR.at}
      yaw={BALCONY_DOOR.yaw}
      out={0.22}
      rate={3.4}
      want={(h) => {
        if (h.mode !== "in" || h.walk.level !== "u") return false;
        return (
          Math.hypot(h.walk.x - HOME.upper.x0, h.walk.z - BALCONY.door.c) < 3.4
        );
      }}
    />
  );
}

// Pintu kayu kamar tidur: berengsel di sisi barat bukaan, membuka ke dalam kamar saat pengunjung dekat.
const BED_DOOR = {
  hinge: local(BEDROOM.door.c - BEDROOM.door.w / 2, F2 + 0.02, BEDROOM.z1),
  w: BEDROOM.door.w - 0.06, // sedikit lebih sempit dari bukaan
  h: BEDROOM.door.h - 0.08,
  swing: 1.7, // sudut buka (radian)
};
function BedroomDoor({ house }: { house: MutableRefObject<HouseState> }) {
  const grp = useRef<THREE.Group>(null);
  const open = useRef(0);
  const mats = useMemo(
    () => ({
      wood: new THREE.MeshStandardMaterial({
        color: HOME_COLORS.wood,
        roughness: 0.7,
      }),
      metal: new THREE.MeshStandardMaterial({
        color: HOME_COLORS.metal,
        roughness: 0.4,
        metalness: 0.6,
      }),
    }),
    [],
  );
  useFrame((_, delta) => {
    const h = house.current;
    const near =
      h.mode === "in" &&
      h.walk.level === "u" &&
      Math.hypot(h.walk.x - BEDROOM.door.c, h.walk.z - BEDROOM.z1) < 1.8;
    open.current = damp(open.current, near ? 1 : 0, 4, Math.min(delta, 0.05));
    if (grp.current)
      grp.current.rotation.y = DOOR.yaw + open.current * BED_DOOR.swing;
  });
  return (
    <group ref={grp} position={BED_DOOR.hinge} rotation={[0, DOOR.yaw, 0]}>
      <mesh
        position={[BED_DOOR.w / 2 + 0.03, BED_DOOR.h / 2, 0]}
        material={mats.wood}
        castShadow
      >
        <boxGeometry args={[BED_DOOR.w, BED_DOOR.h, 0.04]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[BED_DOOR.w - 0.02, 1.0, s * 0.045]}
          material={mats.metal}
        >
          <boxGeometry args={[0.1, 0.03, 0.05]} />
        </mesh>
      ))}
    </group>
  );
}

function EnterMarker({
  house,
  onEnter,
}: {
  house: MutableRefObject<HouseState>;
  onEnter: () => void;
}) {
  const hit = useRef<THREE.Mesh>(null);
  const sprite = useRef<THREE.Sprite>(null);
  const near = useRef(false);
  const vis = useRef(0);
  const center = useMemo(() => local(0, GROUND + 4.5, HOME.terrace / 2), []);
  const spot = useMemo(
    () => local(0, F + 2.4, HOME.d / 2 + HOME.terrace + 1.2),
    [],
  );
  const mat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 64, 4, 128, 64, 62);
    grad.addColorStop(0, "rgba(255,226,160,0.95)");
    grad.addColorStop(0.35, "rgba(255,200,120,0.35)");
    grad.addColorStop(1, "rgba(255,200,120,0)");
    const paint = () => {
      g.shadowBlur = 0;
      g.clearRect(0, 0, 256, 128);
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 128);
      g.font = `600 34px ${displayFamily()}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = "rgba(40,20,0,0.8)";
      g.shadowBlur = 8;
      g.fillStyle = "#f3ecd6";
      g.fillText(HOME_UI.enter, 128, 66);
    };
    paint();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    whenDisplayFont(() => {
      paint();
      tex.needsUpdate = true;
    });
    return new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      opacity: 0,
    });
  }, []);

  useFrame(({ camera, clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const dist = Math.hypot(
      camera.position.x - center.x,
      camera.position.z - center.z,
    );
    near.current = dist < 65 && house.current.mode === "out";
    vis.current = damp(vis.current, near.current ? 1 : 0, 4, dt);
    const sp = sprite.current;
    if (!sp) return;
    sp.visible = vis.current > 0.01;
    if (!sp.visible) return;
    const far = Math.min(3, Math.max(1, dist / 18));
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.8) * 0.06;
    sp.scale.set(3.2 * far * pulse, 1.6 * far * pulse, 1);
    sp.position.y = spot.y + Math.sin(clock.elapsedTime * 0.9) * 0.1;
    mat.opacity = vis.current * 0.95;
  });

  return (
    <>
      <sprite
        ref={sprite}
        material={mat}
        position={spot}
        renderOrder={5}
        visible={false}
      />
      <mesh
        ref={hit}
        position={center}
        rotation={[0, DOOR.yaw, 0]}
        onClick={(e) => {
          if (!near.current || e.delta > 6) return;
          e.stopPropagation();
          document.body.style.cursor = "";
          onEnter();
        }}
        onPointerOver={() => {
          if (near.current) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[HOME.w + 4, 9, HOME.d + HOME.terrace + 2.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

// Cahaya ruangan. Lampu plafon tertanam (lihat LAMPS) cuma bentuk; cahaya sungguhannya dari kolam
// beberapa pointLight yang selalu dipindah ke ruangan terdekat dari kamera, supaya ringan.
// Lampu ruangan tidak lagi punya lampu titik sendiri: mereka didaftarkan sebagai sumber "room" di kolam lampu dunia
// (core/lightPool), jadi luar dan dalam rumah berbagi jumlah lampu yang sama. Di sini tinggal cahaya rata (ambient)
// dan status lampu rumah.
// Pantulan lantai kayu ke plafon dan kolong: warna lebih gelap dan hangat tipis (sekitar 35% dari cahaya atas).
const FILL_GROUND = "#a69d8f";
const FILL_GAIN = 0.85; // hemisfer: dinding rata-rata sekitar 0,41, lantai 0,6, plafon 0,22 (dulu 0,7 datar)
function RoomLight({
  house,
  indoor,
}: {
  house: MutableRefObject<HouseState>;
  indoor: MutableRefObject<number>;
}) {
  const fill = useRef<THREE.HemisphereLight>(null);
  const sources = useMemo<Source[]>(
    () =>
      LAMPS.map((L) => {
        const p = local(
          L.light[0],
          (L.floor === 0 ? F + HOME.h : F2 + HOME.upper.h) - 0.5,
          L.light[1],
        );
        return {
          x: p.x,
          y: p.y,
          z: p.z,
          color: "#f4f6f8",
          power: G.room,
          room: true,
          distance: 11,
          decay: 1.2,
        };
      }),
    [],
  );
  useEffect(() => addSources(sources), [sources]);
  useFrame((_, delta) => {
    stepLamp(house.current, delta);
    roomMode.k = indoor.current;
    roomMode.lamp = house.current.lamp; // 0 siang atau dimatikan, 1 menyala
    // cahaya rata mengikuti hari: siang terang dari jendela, malam redup (lampu menambah lewat kolam lampu)
    if (fill.current)
      fill.current.intensity =
        indoor.current *
        G.fill *
        FILL_GAIN *
        (G.fillNight + (1 - G.fillNight) * dayState.daylight);
  });
  // cahaya rata berarah: permukaan menghadap atas (lantai, meja) paling terang, dinding sedang, plafon dan kolong paling gelap
  return (
    <hemisphereLight
      ref={fill}
      color="#f6f6f2"
      groundColor={FILL_GROUND}
      intensity={0}
    />
  );
}

export default function HouseParts({
  house,
  indoor,
  onEnter,
  glass,
  metal,
}: {
  house: MutableRefObject<HouseState>;
  indoor: MutableRefObject<number>;
  onEnter: () => void;
  glass: THREE.Material;
  metal: THREE.Material;
}) {
  return (
    <>
      <Door house={house} glass={glass} metal={metal} />
      <BalconyDoor house={house} glass={glass} metal={metal} />
      <BedroomDoor house={house} />
      <EnterMarker house={house} onEnter={onEnter} />
      {!perfOff("lights") && <RoomLight house={house} indoor={indoor} />}
    </>
  );
}
