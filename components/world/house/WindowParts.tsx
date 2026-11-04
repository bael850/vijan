"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { dayState } from "../core/dayCycle";
import { grainMat } from "../core/grain";
import {
  houseLamps,
  toggleHouseLamps,
  useHouseLampsOn,
} from "../core/houseLamps";
import { getSheen } from "../core/glow";
import { GlowPlane, GlowSprite as NightGlow } from "../core/nightLights";
import {
  DOORWAY,
  H,
  WINDOWS,
  windowPose,
  type Face,
  type WindowSpec,
} from "./houseLayout";

const PLASTER = "#e8dcc0";
const BEAM = "#4a3626";
const FRAME = 0.12; // lebar bingkai di sekeliling lubang (m)

// Menggambar garis luar jendela (persegi atau lengkung) di tengah (ox, oy).
// grow = menambah ke segala arah, dipakai untuk garis luar bingkai.
function draw(
  p: THREE.Path,
  spec: Pick<WindowSpec, "style" | "w" | "h">,
  grow = 0,
  ox = 0,
  oy = 0,
) {
  const hw = spec.w / 2 + grow;
  const hh = spec.h / 2 + grow;
  p.moveTo(ox - hw, oy - hh);
  p.lineTo(ox + hw, oy - hh);
  if (spec.style === "arch") {
    // sisi lurus, lalu setengah lingkaran di atas
    p.lineTo(ox + hw, oy + hh - hw);
    p.absarc(ox, oy + hh - hw, hw, 0, Math.PI, false);
  } else {
    p.lineTo(ox + hw, oy + hh);
    p.lineTo(ox - hw, oy + hh);
  }
  p.lineTo(ox - hw, oy - hh);
}

// Titik acuan dinding: permukaan luar di tengah (u = 0), dan putarannya.
// Sumbu x lokal = u (searah windowPose), +z lokal = keluar dari rumah.
function wallBase(face: Face): { pos: [number, number, number]; ry: number } {
  switch (face) {
    case "front":
      return { pos: [H.cx, 0, H.frontZ], ry: 0 };
    case "back":
      return { pos: [H.cx, 0, H.backZ], ry: Math.PI };
    case "right":
      return { pos: [H.cx + H.w / 2, 0, H.cz], ry: Math.PI / 2 };
    default:
      return { pos: [H.cx - H.w / 2, 0, H.cz], ry: -Math.PI / 2 };
  }
}

// Sepotong dinding plester yang berlubang di tempat jendelanya. Lubangnya tembus,
// jadi dari dalam dan luar rumah terlihat dunia di seberang kaca.
export function WallPanel({
  face,
  u0,
  u1,
  y0,
  y1,
}: {
  face: Face;
  u0: number;
  u1: number;
  y0: number;
  y1: number;
}) {
  const mat = useMemo(() => grainMat(PLASTER, "plaster"), []);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(u0, y0);
    s.lineTo(u1, y0);
    s.lineTo(u1, y1);
    s.lineTo(u0, y1);
    s.lineTo(u0, y0);
    WINDOWS.filter(
      (w) => w.face === face && w.u > u0 && w.u < u1 && w.y > y0 && w.y < y1,
    ).forEach((w) => {
      const hole = new THREE.Path();
      draw(hole, w, 0, w.u, w.y);
      s.holes.push(hole);
    });
    const g = new THREE.ExtrudeGeometry(s, {
      depth: H.wallT,
      bevelEnabled: false,
    });
    g.translate(0, 0, -H.wallT); // permukaan luar di z = 0, tebal ke dalam
    return g;
  }, [face, u0, u1, y0, y1]);
  const { pos, ry } = wallBase(face);
  return (
    <mesh
      geometry={geo}
      material={mat}
      position={pos}
      rotation-y={ry}
      castShadow
      receiveShadow
    />
  );
}

// Dinding depan, belakang, dan samping, lengkap dengan lubang jendela.
export function HouseWalls() {
  const halfW = H.w / 2;
  const side = H.d / 2 - H.wallT; // dinding samping berhenti di tiang sudut
  return (
    <group>
      {/* depan: kiri dan kanan pintu (lantai bawah), lalu seluruh lantai atas */}
      <WallPanel
        face="front"
        u0={-halfW}
        u1={-DOORWAY.halfW}
        y0={H.floorY}
        y1={H.floorY + H.h1}
      />
      <WallPanel
        face="front"
        u0={DOORWAY.halfW}
        u1={halfW}
        y0={H.floorY}
        y1={H.floorY + H.h1}
      />
      <WallPanel
        face="front"
        u0={-halfW}
        u1={halfW}
        y0={H.floor2Y}
        y1={H.wallTop}
      />
      {/* belakang dan samping, penuh dari lantai sampai atap */}
      <WallPanel
        face="back"
        u0={-halfW}
        u1={halfW}
        y0={H.floorY}
        y1={H.wallTop}
      />
      <WallPanel
        face="left"
        u0={-side}
        u1={side}
        y0={H.floorY}
        y1={H.wallTop}
      />
      <WallPanel
        face="right"
        u0={-side}
        u1={side}
        y0={H.floorY}
        y1={H.wallTop}
      />
    </group>
  );
}

const DAY_TINT = new THREE.Color("#a8cce0");
const NIGHT_TINT = new THREE.Color("#6f8fb8");

// Satu jendela: bingkai di dua sisi dinding, kaca bening di tengah tebal dinding,
// palang kayu menurut gaya, dan hiasan luar (daun jendela, kotak bunga) kalau diminta.
// Malam: kaca luar memancarkan warna hangat dari dalam rumah; klik untuk mematikan lampunya.
export function Window({ spec }: { spec: WindowSpec }) {
  const p = windowPose(spec);
  const { w, h, style = "simple", shutters = false, box = false } = spec;
  const on = useHouseLampsOn();
  const tint = useRef<THREE.MeshBasicMaterial>(null);
  const warm = useRef<THREE.MeshBasicMaterial>(null);
  const zMid = -H.wallT / 2; // kaca di tengah tebal dinding

  const glass = useMemo(() => {
    const s = new THREE.Shape();
    draw(s, { style, w, h });
    return new THREE.ShapeGeometry(s);
  }, [style, w, h]);

  // salinan kaca dengan UV 0..1 supaya tekstur pantulan pas di bentuk persegi maupun lengkung
  const sheenGeo = useMemo(() => {
    const g = glass.clone();
    g.computeBoundingBox();
    const b = g.boundingBox!;
    const pos = g.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - b.min.x) / (b.max.x - b.min.x);
      uv[i * 2 + 1] = (pos.getY(i) - b.min.y) / (b.max.y - b.min.y);
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, [glass]);
  useEffect(() => () => sheenGeo.dispose(), [sheenGeo]);
  const sheenMap = useMemo(getSheen, []);
  const sheen = useRef<THREE.MeshBasicMaterial>(null);

  const ring = useMemo(() => {
    const s = new THREE.Shape();
    draw(s, { style, w, h }, FRAME);
    const hole = new THREE.Path();
    draw(hole, { style, w, h });
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.06,
      bevelEnabled: false,
    });
    g.translate(0, 0, -0.03);
    return g;
  }, [style, w, h]);

  useFrame(() => {
    const dl = dayState.daylight;
    if (tint.current) {
      tint.current.opacity = THREE.MathUtils.lerp(0.06, 0.15, dl);
      tint.current.color.copy(NIGHT_TINT).lerp(DAY_TINT, dl);
    }
    // pantulan lebih jelas siang hari, nyaris hilang malam
    if (sheen.current) sheen.current.opacity = 0.03 + 0.09 * dl;
    if (warm.current)
      warm.current.opacity = 0.28 * dayState.lamps * houseLamps.v;
  });

  // palang kayu: [pusat x, pusat y, lebar, tinggi]
  const bars: [number, number, number, number][] =
    style === "wide"
      ? [
          [-w / 6, 0, 0.05, h],
          [w / 6, 0, 0.05, h],
          [0, h / 2 - 0.32, w, 0.05],
        ]
      : style === "arch"
        ? [
            [0, 0, 0.05, h],
            [0, -h / 2 + h * 0.4, w, 0.05],
          ]
        : [
            [0, 0, 0.05, h],
            [0, 0, w, 0.05],
          ];

  return (
    <group position={[p.x, p.y, p.z]} rotation-y={p.ry}>
      <NightGlow
        position={[0, 0, 0.35]}
        scale={[w * 3.4, h * 3.4, 1]}
        color="#e6edfb"
        base={0.5}
        on={on}
      />
      {/* kolam cahaya hangat di tanah di bawah jendela lantai bawah */}
      {p.y < H.floor2Y && (
        <GlowPlane
          position={[0, H.padY + 0.07 - p.y, 1.7]}
          size={[w * 3.2, 3.2]}
          color="#e6edfb"
          base={0.32}
          on={on}
        />
      )}

      {/* daun jendela kayu biru di kiri-kanan */}
      {shutters &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * (w / 2 + 0.3), 0, 0.05]}>
            <boxGeometry args={[0.36, h + 0.1, 0.05]} />
            <meshLambertMaterial color="#3a5f7a" />
          </mesh>
        ))}
      {/* kotak bunga di bawah jendela */}
      {box && (
        <group position={[0, -h / 2 - 0.38, 0.22]}>
          <mesh>
            <boxGeometry args={[w + 0.3, 0.18, 0.24]} />
            <meshLambertMaterial color="#6b4a30" />
          </mesh>
          {[-0.5, -0.25, 0, 0.25, 0.5].map((k, i) => (
            <mesh key={i} position={[k * w, 0.15, 0]}>
              <sphereGeometry args={[0.09, 8, 6]} />
              <meshLambertMaterial
                color={
                  ["#c0453a", "#f2d36b", "#e8dcc0", "#b86aa0", "#f2d36b"][i]
                }
              />
            </mesh>
          ))}
        </group>
      )}

      {/* bingkai luar dan dalam */}
      <mesh geometry={ring}>
        <meshLambertMaterial color={BEAM} />
      </mesh>
      <mesh geometry={ring} position={[0, 0, -(H.wallT + 0.06)]}>
        <meshLambertMaterial color={BEAM} />
      </mesh>

      {/* kaca bening: tipis memantulkan langit, tidak menutupi pemandangan */}
      <mesh geometry={glass} position={[0, 0, zMid]} raycast={() => null}>
        <meshBasicMaterial
          ref={tint}
          color={DAY_TINT}
          transparent
          opacity={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* pantulan miring tipis di kaca */}
      <mesh
        geometry={sheenGeo}
        position={[0, 0, zMid + 0.005]}
        raycast={() => null}
        renderOrder={3}
      >
        <meshBasicMaterial
          ref={sheen}
          map={sheenMap}
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* pendar hangat dari dalam rumah, hanya terlihat dari luar */}
      <mesh
        geometry={glass}
        position={[0, 0, zMid + 0.01]}
        onClick={(e) => {
          e.stopPropagation();
          toggleHouseLamps();
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <meshBasicMaterial
          ref={warm}
          color="#e6edfb"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* palang kayu di tengah tebal dinding, terlihat dari dua sisi */}
      {bars.map(([bx, by, bw, bh], i) => (
        <mesh key={i} position={[bx, by, zMid]}>
          <boxGeometry args={[bw, bh, 0.05]} />
          <meshLambertMaterial color={BEAM} />
        </mesh>
      ))}

      {/* ambang luar dan ambang dalam */}
      <mesh position={[0, -h / 2 - 0.16, 0.08]}>
        <boxGeometry args={[w + 0.4, 0.08, 0.2]} />
        <meshLambertMaterial color={BEAM} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.1, -(H.wallT + 0.1)]}>
        <boxGeometry args={[w + 0.4, 0.05, 0.2]} />
        <meshLambertMaterial color={BEAM} />
      </mesh>
    </group>
  );
}
