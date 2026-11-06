"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { displayFamily, whenDisplayFont } from "../../core/canvasFont";
import { BEDROOM } from "../../config/home";
import { LOGOS, type LogoKey } from "../../scene/stackLogos";
import { INTERIOR } from "./homeGeometry";

// Hiasan dinding "mural" di kamar tidur: logo teknologi dilukis seperti cat di tembok, di atas kepala kasur.
// Dipasang di dalam grup rumah (kerangka lokal rumah), jadi koordinatnya sama dengan config/home.ts.
// Kasur ada di x = 2,8 menempel dinding belakang (lihat blok kamar di HouseInterior.buildStatic).

const ROW: readonly LogoKey[] = [
  "threejs",
  "react",
  "typescript",
  "nextjs",
  "vercel",
  "postgresql",
  "claude",
];

const W = 1.9; // lebar mural (m)
const H = 0.7; // tinggi mural (m)
const PX = 800; // piksel per meter
const INK = "rgba(58, 42, 28, 0.82)"; // cokelat tua seperti cat di dinding krem

function draw(g: CanvasRenderingContext2D, w: number, h: number) {
  g.clearRect(0, 0, w, h);
  const size = h * 0.36;
  const gap = (w - ROW.length * size) / (ROW.length + 1);
  g.fillStyle = INK;
  ROW.forEach((k, i) => {
    g.save();
    g.translate(gap + i * (size + gap), h * 0.14);
    g.scale(size / 24, size / 24);
    g.fill(new Path2D(LOGOS[k].path));
    g.restore();
  });
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `500 ${h * 0.14}px ${displayFamily()}`;
  g.fillText("Bahan-bahan rumah ini", w / 2, h * 0.8);
}

export default function WallArt() {
  const tex = useMemo(() => {
    const w = Math.round(W * PX);
    const h = Math.round(H * PX);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    // gambar ulang setelah font selesai dimuat
    whenDisplayFont(() => {
      draw(g, w, h);
      t.needsUpdate = true;
    });
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);

  return (
    <mesh
      position={[2.8, INTERIOR.floor2Y + 1.95, BEDROOM.z0 + 0.02 + 0.012]}
      renderOrder={2}
    >
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial
        map={tex}
        transparent
        depthWrite={false}
        toneMapped={false}
        color="#d9d2c4"
      />
    </mesh>
  );
}
