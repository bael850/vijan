"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { H, INNER } from "../houseLayout";

type Ctx = CanvasRenderingContext2D;
const S = 256;

function useCanvasTex(paint: (c: Ctx) => void) {
  const tex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => {
    const c = (tex.image as HTMLCanvasElement).getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, S, S);
    paint(c);
    tex.needsUpdate = true;
  }, [tex, paint]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

const badge = (bg: string, draw: (c: Ctx) => void) => (c: Ctx) => {
  c.save();
  c.beginPath();
  c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = bg;
  c.fillRect(0, 0, S, S);
  c.lineCap = "round";
  c.lineJoin = "round";
  draw(c);
  c.restore();
};

const path = (
  c: Ctx,
  d: string,
  s: number,
  x: number,
  y: number,
  fill: string,
) => {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = fill;
  c.fill(new Path2D(d));
  c.restore();
};

const LOGO = {
  next: badge("#000", (c) => {
    c.strokeStyle = "#fff";
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(92, 86);
    c.lineTo(92, 172);
    c.moveTo(92, 86);
    c.lineTo(168, 178);
    c.stroke();
    const g = c.createLinearGradient(0, 84, 0, 150);
    g.addColorStop(0, "#fff");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.strokeStyle = g;
    c.beginPath();
    c.moveTo(168, 84);
    c.lineTo(168, 150);
    c.stroke();
  }),
  react: badge("#20232a", (c) => {
    c.translate(S / 2, S / 2);
    c.strokeStyle = "#61dafb";
    c.lineWidth = 8;
    [0, 60, 120].forEach((a) => {
      c.save();
      c.rotate((a * Math.PI) / 180);
      c.beginPath();
      c.ellipse(0, 0, 88, 32, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    });
    c.fillStyle = "#61dafb";
    c.beginPath();
    c.arc(0, 0, 14, 0, Math.PI * 2);
    c.fill();
  }),
  ts: badge("#3178c6", (c) => {
    c.fillStyle = "#fff";
    c.font = "bold 104px Arial, Helvetica, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("TS", S / 2, S / 2 + 6);
  }),
  tailwind: badge("#0f172a", (c) =>
    path(
      c,
      "M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z",
      3.4,
      (S - 54 * 3.4) / 2,
      (S - 32.4 * 3.4) / 2,
      "#38bdf8",
    ),
  ),
  three: badge("#f4f1ea", (c) => {
    c.strokeStyle = "#1a1a1a";
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(128, 48);
    c.lineTo(200, 196);
    c.lineTo(56, 196);
    c.closePath();
    c.moveTo(92, 122);
    c.lineTo(164, 122);
    c.lineTo(128, 196);
    c.closePath();
    c.stroke();
  }),
  framer: badge("#0a0a0a", (c) =>
    path(
      c,
      "M0 0h14v7H7L0 0zm0 7h7l7 7H0V7zm0 7h7v7L0 14z",
      7.5,
      (S - 14 * 7.5) / 2,
      (S - 21 * 7.5) / 2,
      "#fff",
    ),
  ),
  postgres: badge("#336791", (c) => {
    c.strokeStyle = "#fff";
    c.lineWidth = 9;
    c.beginPath();
    c.ellipse(128, 92, 50, 17, 0, 0, Math.PI * 2);
    c.moveTo(78, 92);
    c.lineTo(78, 168);
    c.moveTo(178, 92);
    c.lineTo(178, 168);
    c.ellipse(128, 168, 50, 17, 0, 0, Math.PI);
    c.moveTo(78, 130);
    c.ellipse(128, 130, 50, 17, 0, Math.PI, 0, true);
    c.stroke();
  }),
  sheets: badge("#ffffff", (c) => {
    c.fillStyle = "#23a566";
    c.beginPath();
    c.roundRect(84, 48, 88, 160, 8);
    c.fill();
    c.fillStyle = "#188a52";
    c.beginPath();
    c.moveTo(146, 48);
    c.lineTo(172, 74);
    c.lineTo(146, 74);
    c.closePath();
    c.fill();
    c.fillStyle = "#fff";
    c.fillRect(102, 112, 52, 66);
    c.strokeStyle = "#23a566";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(128, 112);
    c.lineTo(128, 178);
    c.moveTo(102, 134);
    c.lineTo(154, 134);
    c.moveTo(102, 156);
    c.lineTo(154, 156);
    c.stroke();
  }),
};

// Piring enamel bulat, menempel rata di dinding. Titik asal = permukaan dinding, menghadap +z lokal.
function Plate({
  pos,
  ry,
  r,
  logo,
}: {
  pos: [number, number, number];
  ry: number;
  r: number;
  logo: (c: Ctx) => void;
}) {
  const tex = useCanvasTex(logo);
  return (
    <group position={pos} rotation-y={ry}>
      <mesh position={[0, 0, 0.015]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[r + 0.02, r + 0.02, 0.03, 32]} />
        <meshLambertMaterial color="#4a3626" />
      </mesh>
      <mesh position={[0, 0, 0.032]} raycast={() => null}>
        <circleGeometry args={[r, 40]} />
        <meshBasicMaterial map={tex} color="#e2d9c6" />
      </mesh>
    </group>
  );
}

export default function TechStack({
  reduceMotion: _,
}: {
  reduceMotion?: boolean;
}) {
  void _;
  const fy = H.floorY;
  const zb = INNER.zBack;
  const face = INNER.x0 + 0.7;
  return (
    <group>
      {/* cerobong perapian ruang tamu */}
      <Plate
        pos={[face, fy + 1.85, -128.6]}
        ry={Math.PI / 2}
        r={0.2}
        logo={LOGO.next}
      />
      <Plate
        pos={[face, fy + 1.85, -128]}
        ry={Math.PI / 2}
        r={0.2}
        logo={LOGO.react}
      />
      <Plate
        pos={[face, fy + 1.85, -127.4]}
        ry={Math.PI / 2}
        r={0.2}
        logo={LOGO.ts}
      />

      {/* dinding belakang dapur, di atas toples */}
      <Plate pos={[-3.55, fy + 2.3, zb]} ry={0} r={0.17} logo={LOGO.postgres} />
      <Plate pos={[-2.85, fy + 2.3, zb]} ry={0} r={0.17} logo={LOGO.sheets} />

      {/* ruang kerja, kiri jendela */}
      <Plate
        pos={[-9.3, H.floor2Y + 1.9, zb]}
        ry={0}
        r={0.14}
        logo={LOGO.tailwind}
      />
      <Plate
        pos={[-8.85, H.floor2Y + 1.9, zb]}
        ry={0}
        r={0.14}
        logo={LOGO.three}
      />
      <Plate
        pos={[-8.4, H.floor2Y + 1.9, zb]}
        ry={0}
        r={0.14}
        logo={LOGO.framer}
      />
    </group>
  );
}
