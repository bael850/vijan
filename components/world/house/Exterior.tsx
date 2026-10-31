"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { getBlob, getGlow } from "../core/glow";
import { grainMat, type GrainKind } from "../core/grain";
import {
  DOORWAY,
  H,
  STAIR,
  WINDOWS,
  windowPose,
  type WindowSpec,
} from "./houseLayout";

const PLASTER = "#e8dcc0";
const BEAM = "#4a3626";
const ROOF = "#6b3b36";
const ROOF_RIDGE = "#4d2a27";
const STONE = "#7d776a";
const CHIMNEY = "#8a4a3a";
const GLOW = "#ffd27a";

const KIND: Record<string, GrainKind> = {
  [PLASTER]: "plaster",
  [ROOF]: "roof",
  [ROOF_RIDGE]: "roof",
  [STONE]: "stone",
  [CHIMNEY]: "brick",
  "#9a7b55": "floor",
  "#8a6a45": "floor",
  "#d9c9a6": "plaster",
};

function Box({
  pos,
  size,
  color,
  receive = true,
}: {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  receive?: boolean;
}) {
  return (
    <mesh position={pos} castShadow receiveShadow={receive}>
      <boxGeometry args={size} />
      <primitive
        object={grainMat(color, KIND[color] ?? "wood")}
        attach="material"
      />
    </mesh>
  );
}

let nightTex: THREE.CanvasTexture | null = null;
// Pemandangan malam di balik kaca: langit biru tua ke hijau-teal, bintang, bulan, dan pantulan tipis.
function getNight() {
  if (nightTex) return nightTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, "#0b1634");
  grd.addColorStop(0.6, "#1f4a7a");
  grd.addColorStop(1, "#2f6a6a");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++) {
    const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * 128;
    const y = (Math.sin(i * 47.3 + 2) * 0.5 + 0.5) * 80;
    g.fillStyle = `rgba(255,244,214,${0.4 + (i % 3) * 0.25})`;
    g.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
  }
  const m = g.createRadialGradient(96, 28, 0, 96, 28, 22);
  m.addColorStop(0, "rgba(255,240,190,0.95)");
  m.addColorStop(0.3, "rgba(255,230,160,0.35)");
  m.addColorStop(1, "rgba(255,230,160,0)");
  g.fillStyle = m;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(10,30,30,0.7)";
  g.beginPath();
  g.moveTo(0, 128);
  g.lineTo(0, 108);
  for (let x = 0; x <= 128; x += 16) g.lineTo(x, 104 + Math.sin(x * 0.2) * 6);
  g.lineTo(128, 128);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.10)";
  g.beginPath();
  g.moveTo(10, 0);
  g.lineTo(46, 0);
  g.lineTo(0, 70);
  g.lineTo(0, 34);
  g.fill();
  nightTex = new THREE.CanvasTexture(c);
  nightTex.colorSpace = THREE.SRGBColorSpace;
  return nightTex;
}

// Jendela menyala hangat: bingkai kayu, kaca bercahaya, dua kayu silang.
function Window({ spec }: { spec: WindowSpec }) {
  const p = windowPose(spec);
  const { w, h } = spec;
  const [on, setOn] = useState(true);
  const glow = useMemo(getGlow, []);
  const night = useMemo(getNight, []);
  return (
    <group position={[p.x, p.y, p.z]} rotation-y={p.ry}>
      <sprite position={[0, 0, 0.35]} scale={[w * 3.4, h * 3.4, 1]}>
        <spriteMaterial
          map={glow}
          color="#ffb866"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={on ? 0.5 : 0}
        />
      </sprite>
      {/* kolam cahaya hangat di tanah di bawah jendela lantai bawah */}
      {p.y < H.floor2Y && (
        <mesh position={[0, H.padY + 0.07 - p.y, 1.7]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[w * 3.2, 3.2]} />
          <meshBasicMaterial
            map={glow}
            color="#ffb866"
            transparent
            opacity={on ? 0.32 : 0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* daun jendela kayu biru di kiri-kanan */}
      {spec.face !== "back" &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * (w / 2 + 0.3), 0, 0.05]}>
            <boxGeometry args={[0.36, h + 0.1, 0.05]} />
            <meshLambertMaterial color="#3a5f7a" />
          </mesh>
        ))}
      {/* kotak bunga di bawah jendela depan lantai bawah */}
      {spec.face === "front" && p.y < H.floor2Y && (
        <group position={[0, -h / 2 - 0.38, 0.22]}>
          <mesh>
            <boxGeometry args={[w + 0.3, 0.18, 0.24]} />
            <meshLambertMaterial color="#6b4a30" />
          </mesh>
          {[-0.5, -0.25, 0, 0.25, 0.5].map((k, i) => (
            <mesh key={i} position={[k * w, 0.15, 0]}>
              <sphereGeometry args={[0.09, 8, 6]} />
              <meshLambertMaterial color={["#c0453a", "#f2d36b", "#e8dcc0", "#b86aa0", "#f2d36b"][i]} />
            </mesh>
          ))}
        </group>
      )}
      <mesh>
        <boxGeometry args={[w + 0.24, h + 0.24, 0.06]} />
        <meshLambertMaterial color={BEAM} />
      </mesh>
      <mesh
        position={[0, 0, 0.035]}
        onClick={(e) => {
          e.stopPropagation();
          setOn((v) => !v);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={on ? GLOW : "#3a3350"} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.05, h, 0.03]} />
        <meshLambertMaterial color={BEAM} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[w, 0.05, 0.03]} />
        <meshLambertMaterial color={BEAM} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.16, 0.08]}>
        <boxGeometry args={[w + 0.4, 0.08, 0.2]} />
        <meshLambertMaterial color={BEAM} />
      </mesh>
      {/* sisi dalam: kaca malam supaya dari dalam rumah jendelanya terlihat */}
      <group position={[0, 0, -(H.wallT + 0.06)]} rotation-y={Math.PI}>
        <mesh>
          <boxGeometry args={[w + 0.24, h + 0.24, 0.06]} />
          <meshLambertMaterial color={BEAM} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={night} toneMapped={false} />
        </mesh>
        <mesh position={[0, -h / 2 - 0.12, 0.1]}>
          <boxGeometry args={[w + 0.4, 0.05, 0.2]} />
          <meshLambertMaterial color={BEAM} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.05, h, 0.03]} />
          <meshLambertMaterial color={BEAM} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[w, 0.05, 0.03]} />
          <meshLambertMaterial color={BEAM} />
        </mesh>
      </group>
    </group>
  );
}

// Dinding, atap, cerobong, jendela, dan lampu. Pintu dan tangga ada di file sendiri.
export default function Exterior() {
  const { cx, cz, w, d, wallT } = H;
  const halfW = w / 2;
  const halfD = d / 2;
  const wallH = H.wallTop - H.floorY;

  // atap: dua bidang miring (bubungan sejajar sumbu x) dan dua segitiga di sisi
  const eaveHalf = halfD + H.overhang;
  const slopeLen = Math.hypot(
    eaveHalf,
    H.roofRise + H.overhang * (H.roofRise / halfD),
  );
  const roofAng = Math.atan2(
    H.roofRise + H.overhang * (H.roofRise / halfD),
    eaveHalf,
  );
  const eaveY = H.wallTop - H.overhang * (H.roofRise / halfD);
  const gableGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-halfD, 0);
    s.lineTo(halfD, 0);
    s.lineTo(0, H.roofRise);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [halfD]);

  const blob = useMemo(getBlob, []);
  const doorL = cx - DOORWAY.halfW;
  const doorR = cx + DOORWAY.halfW;
  const frontOuterZ = H.frontZ - wallT / 2;

  return (
    <group>
      {/* bayangan palsu di kaki rumah */}
      <mesh
        position={[cx, H.padY + 0.04, cz]}
        rotation-x={-Math.PI / 2}
        renderOrder={1}
      >
        <planeGeometry args={[w + 9, d + 9]} />
        <meshBasicMaterial
          map={blob}
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      {/* pondasi batu */}
      <Box
        pos={[cx, (H.padY - 0.4 + H.floorY - 0.1) / 2, cz]}
        size={[w + 0.4, H.floorY - H.padY + 0.3, d + 0.4]}
        color={STONE}
      />

      {/* lantai bawah dan lantai atas */}
      <Box
        pos={[cx, H.floorY - 0.05, cz]}
        size={[w, 0.1, d]}
        color="#9a7b55"
        receive={false}
      />
      {/* lantai atas, dengan lubang untuk tangga */}
      <Box
        pos={[(cx - halfW + STAIR.x0) / 2, H.floorY + H.h1 + H.slab / 2, cz]}
        size={[STAIR.x0 - (cx - halfW), H.slab, d]}
        color="#8a6a45"
        receive={false}
      />
      <Box
        pos={[
          (STAIR.x0 + cx + halfW) / 2,
          H.floorY + H.h1 + H.slab / 2,
          (H.frontZ + STAIR.zBottom) / 2,
        ]}
        size={[cx + halfW - STAIR.x0, H.slab, H.frontZ - STAIR.zBottom]}
        color="#8a6a45"
        receive={false}
      />
      <Box
        pos={[
          (STAIR.x0 + cx + halfW) / 2,
          H.floorY + H.h1 + H.slab / 2,
          (STAIR.zBottom - STAIR.length + H.backZ) / 2,
        ]}
        size={[
          cx + halfW - STAIR.x0,
          H.slab,
          STAIR.zBottom - STAIR.length - H.backZ,
        ]}
        color="#8a6a45"
        receive={false}
      />
      <Box
        pos={[cx, H.wallTop - 0.05, cz]}
        size={[w, 0.1, d]}
        color="#d9c9a6"
        receive={false}
      />

      {/* dinding depan: kiri dan kanan pintu, di atas pintu, lalu lantai atas */}
      <Box
        pos={[(cx - halfW + doorL) / 2, H.floorY + H.h1 / 2, frontOuterZ]}
        size={[doorL - (cx - halfW), H.h1, wallT]}
        color={PLASTER}
      />
      <Box
        pos={[(cx + halfW + doorR) / 2, H.floorY + H.h1 / 2, frontOuterZ]}
        size={[cx + halfW - doorR, H.h1, wallT]}
        color={PLASTER}
      />
      <Box
        pos={[cx, H.floorY + DOORWAY.h + (H.h1 - DOORWAY.h) / 2, frontOuterZ]}
        size={[DOORWAY.halfW * 2, H.h1 - DOORWAY.h, wallT]}
        color={PLASTER}
      />
      <Box
        pos={[cx, H.floor2Y + H.h2 / 2, frontOuterZ]}
        size={[w, H.h2, wallT]}
        color={PLASTER}
      />

      {/* dinding belakang dan samping, penuh dari lantai sampai atap */}
      <Box
        pos={[cx, H.floorY + wallH / 2, H.backZ + wallT / 2]}
        size={[w, wallH, wallT]}
        color={PLASTER}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[cx + s * (halfW - wallT / 2), H.floorY + wallH / 2, cz]}
          size={[wallT, wallH, d - wallT * 2]}
          color={PLASTER}
        />
      ))}

      {/* rangka kayu: empat tiang sudut dan pita di pertemuan lantai */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            pos={[
              cx + sx * (halfW - 0.05),
              H.floorY + wallH / 2,
              cz + sz * (halfD - 0.05),
            ]}
            size={[0.3, wallH, 0.3]}
            color={BEAM}
          />
        )),
      )}
      <Box
        pos={[cx, H.floorY + H.h1 + H.slab / 2, H.frontZ + 0.01]}
        size={[w, H.slab + 0.1, 0.06]}
        color={BEAM}
      />
      <Box
        pos={[cx, H.floorY + H.h1 + H.slab / 2, H.backZ - 0.01]}
        size={[w, H.slab + 0.1, 0.06]}
        color={BEAM}
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[cx + s * (halfW + 0.01), H.floorY + H.h1 + H.slab / 2, cz]}
          size={[0.06, H.slab + 0.1, d]}
          color={BEAM}
        />
      ))}

      {/* segitiga dinding di ujung atap */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={gableGeo}
          position={[cx + s * (halfW + 0.005), H.wallTop, cz]}
          rotation-y={s * (Math.PI / 2)}
          castShadow
        >
          <primitive
            object={grainMat(PLASTER, "plaster", true)}
            attach="material"
          />
        </mesh>
      ))}

      {/* atap */}
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[
            cx,
            eaveY + (H.ridgeY - eaveY) / 2,
            cz + s * (eaveHalf / 2),
          ]}
          rotation-x={s * roofAng}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w + H.overhang * 2, 0.24, slopeLen]} />
          <primitive object={grainMat(ROOF, "roof")} attach="material" />
        </mesh>
      ))}
      <Box
        pos={[cx, H.ridgeY + 0.05, cz]}
        size={[w + H.overhang * 2 + 0.1, 0.16, 0.34]}
        color={ROOF_RIDGE}
      />

      {/* cerobong batu (asapnya nanti di langkah 5) */}
      <Box
        pos={[cx + halfW - 1.6, H.ridgeY - 0.2, cz - 2]}
        size={[1.1, 3.4, 1.1]}
        color={CHIMNEY}
      />
      <Box
        pos={[cx + halfW - 1.6, H.ridgeY + 1.55, cz - 2]}
        size={[1.4, 0.2, 1.4]}
        color={BEAM}
      />

      {/* tepi atap: papan tepi, talang, pipa turun, dan papan miring di ujung atap */}
      {[1, -1].map((t) => (
        <group key={t}>
          <Box
            pos={[cx, eaveY - 0.04, cz + t * (eaveHalf + 0.02)]}
            size={[w + H.overhang * 2, 0.22, 0.08]}
            color={BEAM}
          />
          <Box
            pos={[cx, eaveY - 0.22, cz + t * (eaveHalf + 0.08)]}
            size={[w + H.overhang * 2, 0.08, 0.12]}
            color="#3a3f44"
          />
          {[-1, 1].map((s) => (
            <Box
              key={s}
              pos={[cx + s * (halfW + 0.12), (H.floorY + eaveY) / 2, cz + t * (halfD + 0.14)]}
              size={[0.08, eaveY - H.floorY, 0.08]}
              color="#3a3f44"
            />
          ))}
          {[-1, 1].map((s) => (
            <mesh
              key={s}
              position={[
                cx + s * (halfW + H.overhang),
                eaveY + (H.ridgeY - eaveY) / 2 + 0.06,
                cz + t * (eaveHalf / 2),
              ]}
              rotation-x={t * roofAng}
              castShadow
            >
              <boxGeometry args={[0.1, 0.34, slopeLen]} />
              <primitive object={grainMat(BEAM, "wood")} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* jendela bundar di ujung atap, menyala hangat */}
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[cx + s * (halfW + 0.04), H.wallTop + 1.0, cz]}
          rotation-y={s * (Math.PI / 2)}
        >
          <mesh>
            <circleGeometry args={[0.42, 20]} />
            <meshBasicMaterial color={GLOW} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <torusGeometry args={[0.45, 0.05, 6, 20]} />
            <meshLambertMaterial color={BEAM} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.04, 0.9, 0.03]} />
            <meshLambertMaterial color={BEAM} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[0.9, 0.04, 0.03]} />
            <meshLambertMaterial color={BEAM} />
          </mesh>
          <sprite position={[0, 0, 0.4]} scale={[2.2, 2.2, 1]}>
            <spriteMaterial
              map={getGlow()}
              color="#ffb866"
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.4}
            />
          </sprite>
        </group>
      ))}

      {/* kanopi kecil di atas pintu */}
      <mesh
        position={[cx, H.floorY + DOORWAY.h + 0.6, H.frontZ + 0.5]}
        rotation-x={0.14}
        castShadow
      >
        <boxGeometry args={[3.0, 0.1, 1.2]} />
        <primitive object={grainMat(ROOF, "roof")} attach="material" />
      </mesh>
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[cx + s * 1.3, H.floorY + DOORWAY.h + 0.4, H.frontZ + 0.5]}
          size={[0.1, 0.1, 0.9]}
          color={BEAM}
        />
      ))}
      {/* lampu teras kedua di kiri pintu (cahaya dari sprite) */}
      <mesh position={[cx - 1.7, H.floorY + 2.3, H.frontZ + 0.35]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshBasicMaterial color="#ffe3a0" />
      </mesh>
      <Box
        pos={[cx - 1.7, H.floorY + 2.1, H.frontZ + 0.2]}
        size={[0.05, 0.4, 0.3]}
        color={BEAM}
      />
      <sprite
        position={[cx - 1.7, H.floorY + 2.3, H.frontZ + 0.5]}
        scale={[2.6, 2.6, 1]}
      >
        <spriteMaterial
          map={getGlow()}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.6}
        />
      </sprite>

      {WINDOWS.map((spec, i) => (
        <Window key={i} spec={spec} />
      ))}

      {/* lampu teras di sisi pintu */}
      <mesh position={[cx + 1.7, H.floorY + 2.3, H.frontZ + 0.35]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshBasicMaterial color="#ffe3a0" />
      </mesh>
      <Box
        pos={[cx + 1.7, H.floorY + 2.1, H.frontZ + 0.2]}
        size={[0.05, 0.4, 0.3]}
        color={BEAM}
      />
      <sprite
        position={[cx + 1.7, H.floorY + 2.3, H.frontZ + 0.5]}
        scale={[2.6, 2.6, 1]}
      >
        <spriteMaterial
          map={getGlow()}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.7}
        />
      </sprite>
      <pointLight
        color="#ffcf8a"
        intensity={6}
        distance={14}
        position={[cx + 1.7, H.floorY + 2.3, H.frontZ + 0.8]}
      />
      {/* cahaya dari dalam rumah, jatuh ke pintu yang terbuka */}
      <pointLight
        color="#ffb86b"
        intensity={8}
        distance={13}
        position={[cx, H.floorY + 2.2, H.frontZ - 3]}
      />
    </group>
  );
}
