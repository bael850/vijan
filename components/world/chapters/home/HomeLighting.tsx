"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAMPS } from "../../config/home";
import { dayState } from "../../core/dayCycle";
import { roomMode } from "../../core/lightPool";
import { INTERIOR } from "./homeGeometry";
import { WINDOWS } from "./HomeTrinkets";

// Cahaya palsu (tanpa lampu titik) supaya ruangan terasa hidup:
//  1. kolam cahaya hangat di lantai di bawah tiap lampu plafon, menyala bersama lampu rumah (roomMode.lamp)
//  2. petak cahaya siang di lantai di depan tiap jendela, kuat saat siang dan hilang saat malam
// Keduanya bidang tipis aditif, tanpa pencahayaan dan tanpa bayangan. Tambahan murni.
// Dipasang di dalam grup rumah, di samping <WallDecor />.

const FL = INTERIOR.floorY;
const U = INTERIOR.floor2Y;

type Face = "+x" | "-x" | "+z" | "-z";
const YAW: Record<Face, number> = {
  "+z": 0,
  "-z": Math.PI,
  "+x": Math.PI / 2,
  "-x": -Math.PI / 2,
};

const POOL_R = 2.1; // jari-jari kolam cahaya lampu (m)
const POOL_STRENGTH = 0.32;
const SUN_DEPTH = 2.2; // seberapa jauh cahaya jendela menjangkau ke dalam ruangan (m)
const SUN_STRENGTH = 0.2;

function poolTexture() {
  const n = 128;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// kuat di tepi atas (dekat jendela), memudar ke bawah (ke dalam ruangan), tepi kiri dan kanan lembut
function sunTexture() {
  const n = 128;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!;
  const v = g.createLinearGradient(0, 0, 0, n);
  v.addColorStop(0, "rgba(255,255,255,1)");
  v.addColorStop(0.5, "rgba(255,255,255,0.4)");
  v.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = v;
  g.fillRect(0, 0, n, n);
  g.globalCompositeOperation = "destination-in";
  const h = g.createLinearGradient(0, 0, n, 0);
  h.addColorStop(0, "rgba(255,255,255,0)");
  h.addColorStop(0.18, "rgba(255,255,255,1)");
  h.addColorStop(0.82, "rgba(255,255,255,1)");
  h.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = h;
  g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default function HomeLighting() {
  const built = useMemo(() => {
    const add = (map: THREE.Texture, color: string) =>
      new THREE.MeshBasicMaterial({
        map,
        color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
    const poolTex = poolTexture();
    const sunTex = sunTexture();
    return {
      poolTex,
      sunTex,
      poolMat: add(poolTex, "#ffd9a0"),
      sunMat: add(sunTex, "#fff1cc"),
    };
  }, []);

  const lit = useRef(false);
  useFrame(() => {
    const pool = POOL_STRENGTH * roomMode.k * roomMode.lamp;
    const sun = SUN_STRENGTH * roomMode.k * dayState.daylight;
    built.poolMat.opacity = pool;
    built.sunMat.opacity = sun;
    lit.current = pool > 0.005 || sun > 0.005;
  });

  useEffect(
    () => () => {
      built.poolTex.dispose();
      built.sunTex.dispose();
      built.poolMat.dispose();
      built.sunMat.dispose();
    },
    [built],
  );

  const pools = useMemo(
    () =>
      LAMPS.filter((L) => L.room !== "tamu").flatMap((L) =>
        L.at.map(([x, z]) => ({
          x,
          z,
          y: (L.floor === 1 ? U : FL) + (L.floor === 1 ? 0.055 : 0.037),
        })),
      ),
    [],
  );

  return (
    <>
      {pools.map((p, i) => (
        <mesh
          key={`p${i}`}
          position={[p.x, p.y, p.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={built.poolMat}
          userData={{ noShadow: true }}
          renderOrder={2}
        >
          <planeGeometry args={[POOL_R * 2, POOL_R * 2]} />
        </mesh>
      ))}
      {WINDOWS.map((w, i) => {
        const [px, pz] =
          w.face === "+z" || w.face === "-z" ? [w.sc, w.f] : [w.f, w.sc];
        const y = (w.up ? U : FL) + (w.up ? 0.056 : 0.038);
        return (
          <group
            key={`w${i}`}
            position={[px, y, pz]}
            rotation={[0, YAW[w.face], 0]}
          >
            <mesh
              position={[0, 0, SUN_DEPTH / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
              material={built.sunMat}
              userData={{ noShadow: true }}
              renderOrder={2}
            >
              <planeGeometry args={[w.w * 0.9, SUN_DEPTH]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
