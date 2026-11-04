"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getGlowWhite } from "../../core/glow";
import { houseLamps } from "../../core/houseLamps";
import { dayState } from "../../core/dayCycle";
import { H, INNER } from "../houseLayout";
import {
  Bookshelf,
  Box,
  Cyl,
  GLOW,
  Halo,
  Plant,
  Shade,
  WOOD,
  WOOD_DARK,
} from "./parts";

const FY = H.floor2Y;
type V3 = [number, number, number];

// Batang horizontal (pena, platen mesin ketik, kayu penyangga).
function Rod({
  pos,
  r,
  len,
  color,
  axis = "x",
  tilt = 0,
}: {
  pos: V3;
  r: number;
  len: number;
  color: string;
  axis?: "x" | "z";
  tilt?: number;
}) {
  return (
    <mesh
      position={pos}
      rotation={
        axis === "x" ? [0, 0, Math.PI / 2 + tilt] : [Math.PI / 2, 0, tilt]
      }
      castShadow={false}
    >
      <cylinderGeometry args={[r, r, len, 10]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

function Typewriter({ x, z, y }: { x: number; z: number; y: number }) {
  const keyRows = [0, 1, 2];
  return (
    <group position={[x, y, z]} rotation-y={-0.12}>
      <Box pos={[0, 0.05, 0.02]} size={[0.42, 0.1, 0.36]} color="#25272b" />
      <Box pos={[0, 0.15, -0.08]} size={[0.4, 0.12, 0.18]} color="#2f3238" />
      {/* tuas dan platen */}
      <Rod pos={[0, 0.23, -0.12]} r={0.028} len={0.46} color="#15161a" />
      <Cyl pos={[0.24, 0.23, -0.12]} r={0.025} h={0.02} color="#8a8f96" />
      <Cyl pos={[-0.24, 0.23, -0.12]} r={0.025} h={0.02} color="#8a8f96" />
      {/* kertas yang sedang diketik */}
      <Box
        pos={[0, 0.34, -0.15]}
        size={[0.27, 0.24, 0.004]}
        color="#f4f1ea"
        rot={[-0.1, 0, 0]}
      />
      {[0.4, 0.34, 0.28, 0.22].map((yy, i) => (
        <Box
          key={i}
          pos={[-0.01 - (i === 3 ? 0.04 : 0), yy, -0.1565 + (0.4 - yy) * 0.1]}
          size={[i === 3 ? 0.1 : 0.2, 0.006, 0.002]}
          color="#3a3d46"
          rot={[-0.1, 0, 0]}
        />
      ))}
      {/* barisan tuts */}
      {keyRows.map((r) =>
        Array.from({ length: 8 - r }, (_, i) => (
          <Cyl
            key={`${r}${i}`}
            pos={[
              (i - (7 - r) / 2) * 0.042,
              0.115 + r * 0.01,
              0.08 - r * 0.045,
            ]}
            r={0.014}
            h={0.014}
            color="#d9d6cc"
            seg={8}
          />
        )),
      )}
    </group>
  );
}

// Lampu meja berlengan, kap hijau-abu, cahaya putih netral.
const LAMP_ON = new THREE.Color(GLOW);
const LAMP_OFF = new THREE.Color("#23272d");

function DeskLamp({ x, z, y }: { x: number; z: number; y: number }) {
  const inner = useRef<THREE.MeshBasicMaterial>(null);
  const bulb = useRef<THREE.MeshBasicMaterial>(null);
  // bagian dalam kap dan bohlam ikut saklar: terang saat nyala, gelap saat mati
  useFrame(() => {
    const v = THREE.MathUtils.clamp(houseLamps.v / 0.3, 0, 1);
    inner.current?.color.copy(LAMP_OFF).lerp(LAMP_ON, v);
    bulb.current?.color.copy(LAMP_OFF).lerp(LAMP_ON, v);
  });
  return (
    <group position={[x, y, z]}>
      <Cyl pos={[0, 0.015, 0]} r={0.1} h={0.03} color="#2b2d31" />
      <Box
        pos={[0.02, 0.2, 0]}
        size={[0.02, 0.38, 0.02]}
        color="#2b2d31"
        rot={[0, 0, 0.18]}
      />
      <Box
        pos={[-0.1, 0.43, 0]}
        size={[0.02, 0.34, 0.02]}
        color="#2b2d31"
        rot={[0, 0, -1.05]}
      />
      <mesh position={[-0.27, 0.46, 0]} rotation-z={0.5}>
        <cylinderGeometry args={[0.045, 0.14, 0.17, 20, 1, true]} />
        <meshLambertMaterial color="#33454a" side={2} />
      </mesh>
      <mesh position={[-0.285, 0.455, 0]} rotation-z={0.5}>
        <cylinderGeometry args={[0.04, 0.125, 0.15, 20, 1, true]} />
        <meshBasicMaterial ref={inner} color={GLOW} side={1} />
      </mesh>
      <mesh position={[-0.3, 0.42, 0]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshBasicMaterial ref={bulb} color={GLOW} />
      </mesh>
      <Halo pos={[-0.3, 0.42, 0]} size={1.3} o={0.4} lamp />
    </group>
  );
}

function useReduceMotion() {
  return useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
}

// Cangkir kopi dengan uap tipis yang naik dan memudar.
function Mug({ x, z, y }: { x: number; z: number; y: number }) {
  const reduce = useReduceMotion();
  const map = useMemo(getGlowWhite, []);
  const puffs = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    if (reduce) return;
    const t = clock.elapsedTime;
    puffs.current.forEach((sp, i) => {
      if (!sp) return;
      const ph = (t * 0.22 + i / 3) % 1;
      sp.position.set(
        Math.sin(t * 0.9 + i * 2.1) * 0.012 * ph,
        0.11 + ph * 0.2,
        0,
      );
      sp.scale.setScalar(0.04 + ph * 0.09);
      (sp.material as THREE.SpriteMaterial).opacity =
        Math.sin(ph * Math.PI) * 0.22;
    });
  });
  return (
    <group position={[x, y, z]}>
      <Cyl pos={[0, 0.045, 0]} r={0.04} h={0.09} color="#e8e0d0" seg={16} />
      <Cyl pos={[0, 0.09, 0]} r={0.034} h={0.004} color="#3a2416" seg={16} />
      <mesh position={[0.046, 0.05, 0]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.025, 0.007, 6, 12]} />
        <meshLambertMaterial color="#e8e0d0" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <sprite
          key={i}
          ref={(r) => {
            puffs.current[i] = r;
          }}
          position={[0, 0.12, 0]}
          scale={0.05}
          renderOrder={4}
          raycast={() => null}
        >
          <spriteMaterial
            map={map}
            color="#ffffff"
            transparent
            opacity={reduce ? 0.08 : 0}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}

// Bercak cahaya hangat di alas tulis, murni gambar (tanpa lampu sungguhan), jadi tidak bisa bocor
// ke luar rumah. Cahaya sebenarnya datang dari <Lamp> di Interior.tsx. Hanya tampak di dalam rumah,
// malam hari, dan saat lampu menyala.
function DeskGlow({
  x,
  z,
  y,
  indoor,
}: {
  x: number;
  z: number;
  y: number;
  indoor: MutableRefObject<number>;
}) {
  const pool = useRef<THREE.MeshBasicMaterial>(null);
  const map = useMemo(getGlowWhite, []);
  useFrame(({ camera }) => {
    if (!pool.current) return;
    const up = camera.position.y > H.floor2Y + 0.5 ? 1 : 0;
    const night = 0.15 + 0.85 * dayState.lamps;
    pool.current.opacity = 0.1 * up * indoor.current * houseLamps.v * night;
  });
  return (
    <mesh
      position={[x - 0.85, y + 0.016, z + 0.2]}
      rotation-x={-Math.PI / 2}
      renderOrder={3}
      raycast={() => null}
    >
      <planeGeometry args={[1.5, 1.1]} />
      <meshBasicMaterial
        ref={pool}
        map={map}
        color="#fff0d6"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function Chair() {
  return (
    <group position={[-6.55, FY, INNER.zBack + 1.25]} rotation-y={0.18}>
      <Box
        pos={[0, 0.46, 0]}
        size={[0.5, 0.05, 0.48]}
        color="#8a6a45"
        grain="wood"
      />
      <Box
        pos={[0, 0.5, 0]}
        size={[0.42, 0.05, 0.4]}
        color="#3f5a7a"
        grain="fabric"
      />
      {[-1, 1].map((s) => (
        <Box
          key={s}
          pos={[s * 0.22, 0.8, 0.22]}
          size={[0.04, 0.7, 0.04]}
          color={WOOD_DARK}
          grain="wood"
        />
      ))}
      <Box
        pos={[0, 1.13, 0.22]}
        size={[0.5, 0.07, 0.045]}
        color="#8a6a45"
        grain="wood"
      />
      {[-0.12, 0, 0.12].map((dx) => (
        <Box
          key={dx}
          pos={[dx, 0.86, 0.22]}
          size={[0.05, 0.32, 0.02]}
          color="#8a6a45"
          grain="wood"
        />
      ))}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            pos={[sx * 0.21, 0.22, sz * 0.2]}
            size={[0.045, 0.44, 0.045]}
            color={WOOD_DARK}
            grain="wood"
          />
        )),
      )}
      {[-1, 1].map((s) => (
        <Box
          key={`st${s}`}
          pos={[0, 0.15, s * 0.2]}
          size={[0.38, 0.025, 0.025]}
          color={WOOD_DARK}
        />
      ))}
    </group>
  );
}

export default function Study({
  indoor,
}: {
  indoor: MutableRefObject<number>;
}) {
  const zb = INNER.zBack;
  const dz = zb + 0.5; // tengah meja
  const top = FY + 0.78; // permukaan meja (sama dengan DESK_TOP_Y)
  const x0 = INNER.x0;
  return (
    <group>
      {/* bayangan lantai */}
      <Shade pos={[-6.5, FY + 0.04, zb + 0.7]} w={4.4} d={2.2} o={0.5} />
      <Shade pos={[-3.4, FY + 0.04, zb + 0.4]} w={2.4} d={1.4} o={0.4} />
      <Shade pos={[-6.55, FY + 0.04, zb + 1.25]} w={0.9} d={0.9} o={0.45} />

      {/* permadani di bawah meja dan kursi */}
      <Box
        pos={[-7.1, FY + 0.015, zb + 1.5]}
        size={[2.7, 0.03, 2.1]}
        color="#8a4b3a"
        grain="fabric"
      />
      <Box
        pos={[-7.1, FY + 0.03, zb + 1.5]}
        size={[2.3, 0.03, 1.7]}
        color="#d8cdb5"
        grain="fabric"
      />
      {[-1, 1].map((sz) => (
        <Box
          key={`rz${sz}`}
          pos={[-7.1, FY + 0.047, zb + 1.5 + sz * 0.72]}
          size={[2.1, 0.004, 0.035]}
          color="#8a4b3a"
        />
      ))}
      {[-1, 1].map((sx) => (
        <Box
          key={`rx${sx}`}
          pos={[-7.1 + sx * 1.02, FY + 0.047, zb + 1.5]}
          size={[0.035, 0.004, 1.5]}
          color="#8a4b3a"
        />
      ))}
      <Box
        pos={[-4.5, FY + 0.015, -136]}
        size={[2.6, 0.03, 2.2]}
        color="#8a4b3a"
        grain="fabric"
      />
      <Box
        pos={[-4.5, FY + 0.03, -136]}
        size={[2.2, 0.03, 1.8]}
        color="#3f5a7a"
        grain="fabric"
      />

      {/* ── meja tulis ── */}
      <Box
        pos={[-6.5, FY + 0.75, dz]}
        size={[3.6, 0.06, 0.74]}
        color="#9f7a52"
        grain="wood"
      />
      <Box
        pos={[-6.5, FY + 0.7, dz + 0.34]}
        size={[3.5, 0.05, 0.04]}
        color={WOOD}
        grain="wood"
      />
      {/* sisi kanan: panel penuh dan satu kaki */}
      <Box
        pos={[-4.83, FY + 0.36, dz]}
        size={[0.05, 0.72, 0.66]}
        color={WOOD}
        grain="wood"
      />
      <Box
        pos={[-6.5, FY + 0.5, zb + 0.18]}
        size={[2.4, 0.5, 0.03]}
        color={WOOD_DARK}
        grain="wood"
      />
      <Box
        pos={[-8.2, FY + 0.36, dz + 0.3]}
        size={[0.07, 0.72, 0.07]}
        color={WOOD_DARK}
        grain="wood"
      />
      {/* laci di kiri: tiga laci bergagang */}
      <Box
        pos={[-7.9, FY + 0.38, dz]}
        size={[0.7, 0.72, 0.66]}
        color="#6a4c30"
        grain="wood"
      />
      {[0.12, 0.38, 0.64].map((yy) => (
        <group key={yy}>
          <Box
            pos={[-7.9, FY + yy, dz + 0.335]}
            size={[0.62, 0.22, 0.02]}
            color="#7f5f3e"
            grain="wood"
          />
          <Box
            pos={[-7.9, FY + yy, dz + 0.355]}
            size={[0.14, 0.025, 0.03]}
            color="#a8a294"
          />
        </group>
      ))}

      {/* alas kulit tempat tulisan */}
      <Box
        pos={[-6.6, top + 0.006, dz - 0.02]}
        size={[1.7, 0.012, 0.6]}
        color="#42567a"
        grain="fabric"
      />
      {/* jahitan tepi alas: garis tipis lebih terang supaya bentuknya terbaca */}
      {[-1, 1].map((sz) => (
        <Box
          key={`mz${sz}`}
          pos={[-6.6, top + 0.0135, dz - 0.02 + sz * 0.27]}
          size={[1.6, 0.002, 0.008]}
          color="#8ea2c4"
        />
      ))}
      {[-1, 1].map((sx) => (
        <Box
          key={`mx${sx}`}
          pos={[-6.6 + sx * 0.8, top + 0.0135, dz - 0.02]}
          size={[0.008, 0.002, 0.54]}
          color="#8ea2c4"
        />
      ))}

      {/* mesin ketik di ujung kiri (hiasan), lampu di ujung kanan */}
      <Typewriter x={-8.02} z={zb + 0.34} y={top} />
      <DeskLamp x={-4.98} z={zb + 0.28} y={top} />
      <DeskGlow x={-4.98} z={zb + 0.28} y={top} indoor={indoor} />
      <Mug x={-5.98} z={zb + 0.17} y={top} />

      {/* wadah pensil di belakang, dekat mesin ketik */}
      <Cyl
        pos={[-7.68, top + 0.05, zb + 0.2]}
        r={0.04}
        h={0.1}
        color="#7a8a9a"
        seg={12}
      />
      {[-0.015, 0.012, 0.02].map((dx, i) => (
        <Rod
          key={i}
          pos={[-7.68 + dx, top + 0.15, zb + 0.2]}
          r={0.006}
          len={0.15}
          color={["#c0453a", "#e8dcc0", "#3f5a7a"][i]}
          axis="z"
          tilt={0}
        />
      ))}

      {/* tumpukan buku kecil di belakang album */}
      <Box
        pos={[-5.5, top + 0.02, zb + 0.2]}
        size={[0.24, 0.035, 0.17]}
        color="#6a9a3c"
        rot={[0, 0.15, 0]}
      />
      <Box
        pos={[-5.5, top + 0.055, zb + 0.2]}
        size={[0.22, 0.032, 0.16]}
        color="#7a4a6a"
        rot={[0, 0.4, 0]}
      />

      <Chair />

      {/* keranjang sampah berisi kertas remuk di samping meja */}
      <Cyl
        pos={[-8.1, FY + 0.16, zb + 1.1]}
        r={0.13}
        h={0.32}
        color="#b6a88e"
        seg={14}
      />
      {[
        [-8.05, 0.34, 1.12],
        [-8.15, 0.33, 1.06],
        [-7.9, 0.04, 1.2],
        [-7.82, 0.04, 0.98],
      ].map(([dx, dy, ddz], i) => (
        <mesh
          key={i}
          position={[dx, FY + dy, zb + ddz]}
          rotation={[i, i * 2, 0]}
        >
          <icosahedronGeometry args={[0.055 + (i % 2) * 0.008, 1]} />
          <meshLambertMaterial color="#f1ede2" flatShading />
        </mesh>
      ))}

      {/* rak dinding kecil di sudut kiri: buku, tanaman, pigura */}
      <Box
        pos={[x0 + 0.12, FY + 1.55, -138.9]}
        size={[0.24, 0.04, 1.0]}
        color={WOOD}
        grain="wood"
      />
      {[-0.4, 0.4].map((dzz) => (
        <Box
          key={dzz}
          pos={[x0 + 0.08, FY + 1.49, -138.9 + dzz]}
          size={[0.16, 0.1, 0.03]}
          color={WOOD_DARK}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          pos={[x0 + 0.14, FY + 1.72, -139.25 + i * 0.075]}
          size={[0.17, 0.3 - (i % 2) * 0.04, 0.06]}
          color={["#8e2a2a", "#27437a", "#4a6b4a", "#a8573a"][i]}
        />
      ))}
      <Plant
        pos={[x0 + 0.17, FY + 1.57, -138.55]}
        s={0.35}
        seed={21}
        leaves={5}
      />
      <Box
        pos={[x0 + 0.1, FY + 1.65, -138.1]}
        size={[0.03, 0.2, 0.15]}
        color={WOOD_DARK}
        rot={[0, 0, 0.1]}
      />

      {/* rak buku + tumpukan buku di lantai */}
      <Bookshelf pos={[-3.4, FY, zb]} rotY={-Math.PI / 2} seed={3} />
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          pos={[-4.55, FY + 0.03 + i * 0.055, zb + 0.35]}
          size={[0.3 - i * 0.015, 0.05, 0.22]}
          color={["#6a4a2a", "#3f5a7a", "#8e2a2a", "#4a6b4a"][i]}
          rot={[0, 0.2 * i - 0.2, 0]}
        />
      ))}
    </group>
  );
}
