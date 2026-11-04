"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { HOME, HOME_GLOW as G, HOME_UI } from "../../config/home";
import { buildDoor, DOOR, F, F2, GROUND, local, newBag } from "./homeGeometry";
import type { HouseState } from "./houseState";

const damp = (cur: number, target: number, k: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-k * dt));

function Door({
  house,
  glass,
  metal,
}: {
  house: MutableRefObject<HouseState>;
  glass: THREE.Material;
  metal: THREE.Material;
}) {
  const geo = useMemo(() => {
    const bag = newBag();
    buildDoor(bag);
    const out = {
      glass: mergeGeometries(bag.glass, false),
      metal: mergeGeometries(bag.metal, false),
    };
    bag.glass.forEach((g) => g.dispose());
    bag.metal.forEach((g) => g.dispose());
    return out;
  }, []);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const open = useRef(0);
  useFrame((_, delta) => {
    const want = house.current.mode === "out" ? 0 : 1;
    open.current = damp(open.current, want, 2.2, Math.min(delta, 0.05));
    const x = DOOR.leaf / 2 + open.current * DOOR.slide;
    if (left.current) left.current.position.x = -x;
    if (right.current) right.current.position.x = x;
  });
  const leaf = (
    <>
      {geo.glass && <mesh geometry={geo.glass} material={glass} />}
      {geo.metal && <mesh geometry={geo.metal} material={metal} castShadow />}
    </>
  );
  return (
    <group position={DOOR.at} rotation={[0, DOOR.yaw, 0]}>
      <group ref={left} position={[-DOOR.leaf / 2, 0, 0]}>
        {leaf}
      </group>
      <group ref={right} position={[DOOR.leaf / 2, 0, 0]} scale={[-1, 1, 1]}>
        {leaf}
      </group>
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
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
    g.font = "italic 600 34px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "rgba(40,20,0,0.8)";
    g.shadowBlur = 8;
    g.fillStyle = "#fff3e0";
    g.fillText(HOME_UI.enter, 128, 66);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
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

function RoomLight({ indoor }: { indoor: MutableRefObject<number> }) {
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const fill = useRef<THREE.AmbientLight>(null);
  // tiga lampu di lantai bawah (kiri, tengah, kanan) dan dua di lantai atas
  const spots = useMemo(
    () => [
      local(-7, F + 3.0, 0),
      local(0, F + 3.0, 1),
      local(7, F + 3.0, 0),
      local(0, F2 + 2.8, 0.5),
      local(7, F2 + 2.8, 1.5),
    ],
    [],
  );
  useFrame(() => {
    const v = indoor.current * G.room;
    lights.current.forEach((l) => {
      if (l) l.intensity = v;
    });
    if (fill.current) fill.current.intensity = indoor.current * G.fill;
  });
  return (
    <>
      <ambientLight ref={fill} color="#ffe6c4" intensity={0} />
      {spots.map((p, i) => (
        <pointLight
          key={i}
          ref={(l) => {
            lights.current[i] = l;
          }}
          position={p}
          color="#ffd9a0"
          intensity={0}
          distance={14}
          decay={1.2}
        />
      ))}
    </>
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
      <EnterMarker house={house} onEnter={onEnter} />
      <RoomLight indoor={indoor} />
    </>
  );
}
