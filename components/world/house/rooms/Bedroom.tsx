"use client";

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

const FY = H.floor2Y; // 4.75

export const BED_LAMP = {
  x: INNER.x0 + 0.55,
  y: FY + 0.92,
  z: -125.35,
};

/**
 * Ranjang dibangun dari bawah ke atas:
 * kaki → rangka → kasur → bantal → selimut
 * Semua y dihitung dari permukaan sebelumnya, bukan angka magis.
 */
export default function Bedroom() {
  const x0 = INNER.x0; // -9.7
  const bedZ = -127.2;
  const bedX = x0 + 1.35; // pusat kasur

  // ── geometri ranjang ──
  const frameH = 0.28;
  const frameTop = FY + frameH; // permukaan rangka
  const mattH = 0.16;
  const mattTop = frameTop + mattH; // permukaan kasur
  const mattW = 1.55;
  const mattL = 2.05;

  // meja malam
  const nsH = 0.52;
  const nsTop = FY + nsH;
  const nsX = x0 + 0.55;
  const nsZ = -125.35;

  return (
    <group>
      {/* karpet di bawah ranjang */}
      <Box
        pos={[bedX + 0.3, FY + 0.01, bedZ]}
        size={[3.0, 0.02, 3.0]}
        color="#d4a93c"
        grain="fabric"
      />
      <Box
        pos={[bedX + 0.3, FY + 0.018, bedZ]}
        size={[2.7, 0.02, 2.7]}
        color="#3a4a5a"
        grain="fabric"
      />
      <Box
        pos={[bedX + 0.3, FY + 0.026, bedZ]}
        size={[1.8, 0.02, 1.8]}
        color="#4a6a8a"
        grain="fabric"
      />
      <Shade pos={[bedX, FY + 0.04, bedZ]} w={3.0} d={2.6} o={0.5} />
      <Shade pos={[x0 + 0.6, FY + 0.04, -131.4]} w={1.4} d={2.2} o={0.45} />
      <Shade pos={[nsX, FY + 0.04, nsZ]} w={0.9} d={0.9} o={0.45} />

      {/* ── kaki ranjang (4) ── */}
      {(
        [
          [bedX - mattL / 2 + 0.12, bedZ - mattW / 2 + 0.12],
          [bedX - mattL / 2 + 0.12, bedZ + mattW / 2 - 0.12],
          [bedX + mattL / 2 - 0.12, bedZ - mattW / 2 + 0.12],
          [bedX + mattL / 2 - 0.12, bedZ + mattW / 2 - 0.12],
        ] as const
      ).map(([x, z], i) => (
        <Box
          key={i}
          pos={[x, FY + frameH / 2, z]}
          size={[0.1, frameH, 0.1]}
          color={WOOD_DARK}
          grain="wood"
        />
      ))}

      {/* ── rangka / platform ── */}
      <Box
        pos={[bedX, FY + frameH / 2, bedZ]}
        size={[mattL + 0.08, frameH * 0.55, mattW + 0.08]}
        color="#5a4630"
        grain="wood"
      />
      {/* papan kepala (headboard) di dinding kiri = -x */}
      <Box
        pos={[x0 + 0.08, FY + 0.95, bedZ]}
        size={[0.08, 1.15, mattW + 0.15]}
        color={WOOD_DARK}
        grain="wood"
      />
      <Box
        pos={[x0 + 0.1, FY + 1.56, bedZ]}
        size={[0.12, 0.07, mattW + 0.27]}
        color="#3a2a1c"
        grain="wood"
      />
      {[0, 1, 2, 3].map((k) => (
        <Box
          key={`hp${k}`}
          pos={[x0 + 0.125, FY + 0.95, bedZ + (k - 1.5) * 0.4]}
          size={[0.02, 0.85, 0.34]}
          color="#5a4630"
          grain="wood"
        />
      ))}
      {[-1, 1].map((s) => (
        <Box
          key={`hk${s}`}
          pos={[x0 + 0.1, FY + 0.86, bedZ + s * (mattW / 2 + 0.07)]}
          size={[0.1, 1.72, 0.1]}
          color="#3a2a1c"
          grain="wood"
        />
      ))}

      {/* ── kasur ── */}
      <Box
        pos={[bedX, frameTop + mattH / 2, bedZ]}
        size={[mattL, mattH, mattW]}
        color="#d8d0c4"
        grain="fabric"
      />
      {/* seprai tipis di atas kasur (sedikit lebih lebar, lebih terang) */}
      <Box
        pos={[bedX, mattTop + 0.012, bedZ]}
        size={[mattL - 0.04, 0.024, mattW - 0.04]}
        color="#efe8dc"
        grain="fabric"
      />

      {/* ── bantal (2) — duduk di atas seprai, di sisi kepala ── */}
      <Box
        pos={[bedX - mattL / 2 + 0.38, mattTop + 0.07, bedZ - 0.32]}
        size={[0.42, 0.12, 0.5]}
        color="#f7f2e8"
        grain="fabric"
      />
      <Box
        pos={[bedX - mattL / 2 + 0.38, mattTop + 0.07, bedZ + 0.32]}
        size={[0.42, 0.12, 0.5]}
        color="#f2ebe0"
        grain="fabric"
      />

      {/* ── selimut — menutupi dari tengah ke kaki, sedikit lebih tebal ── */}
      <Box
        pos={[bedX + 0.25, mattTop + 0.04, bedZ]}
        size={[mattL * 0.55, 0.07, mattW - 0.08]}
        color="#a84838"
        grain="fabric"
      />
      {/* bantal kecil di atas bantal, miring */}
      <Box
        pos={[bedX - mattL / 2 + 0.4, mattTop + 0.17, bedZ - 0.3]}
        size={[0.34, 0.08, 0.4]}
        color="#d9b36a"
        grain="fabric"
        rot={[0.08, 0.2, 0.1]}
      />
      {/* garis selimut dan kerutan */}
      {[-1, 0, 1].map((k) => (
        <Box
          key={`st${k}`}
          pos={[bedX + 0.25 + k * 0.2, mattTop + 0.076, bedZ]}
          size={[0.045, 0.006, mattW - 0.1]}
          color="#d98a6a"
        />
      ))}
      {[0, 1, 2].map((k) => (
        <Box
          key={`wr${k}`}
          pos={[bedX + 0.05 + k * 0.28, mattTop + 0.085, bedZ + (k - 1) * 0.3]}
          size={[0.3, 0.03, 0.07]}
          color="#9a3f30"
          grain="fabric"
          rot={[0.15, 0.5 - k * 0.45, 0]}
        />
      ))}
      {/* lipatan selimut di ujung kaki */}
      <Box
        pos={[bedX + mattL / 2 - 0.2, mattTop + 0.06, bedZ]}
        size={[0.35, 0.05, mattW - 0.12]}
        color="#8f3c30"
        grain="fabric"
      />

      {/* ── meja malam ── */}
      <Box
        pos={[nsX, FY + nsH / 2, nsZ]}
        size={[0.48, nsH, 0.48]}
        color="#6a4c30"
        grain="wood"
      />
      {/* kaki tipis meja biar tidak solid block */}
      {(
        [
          [-0.18, -0.18],
          [-0.18, 0.18],
          [0.18, -0.18],
          [0.18, 0.18],
        ] as const
      ).map(([dx, dz], i) => (
        <Box
          key={i}
          pos={[nsX + dx, FY + 0.12, nsZ + dz]}
          size={[0.06, 0.24, 0.06]}
          color={WOOD_DARK}
          grain="wood"
        />
      ))}

      <Box
        pos={[nsX, FY + nsH, nsZ]}
        size={[0.53, 0.025, 0.53]}
        color="#5a4630"
        grain="wood"
      />
      <Box
        pos={[nsX + 0.245, FY + 0.38, nsZ]}
        size={[0.012, 0.2, 0.38]}
        color="#7a5a3a"
        grain="wood"
      />
      <Box
        pos={[nsX + 0.245, FY + 0.15, nsZ]}
        size={[0.012, 0.2, 0.38]}
        color="#7a5a3a"
        grain="wood"
      />
      <Box
        pos={[nsX + 0.265, FY + 0.38, nsZ]}
        size={[0.03, 0.03, 0.03]}
        color="#c9a24a"
        rot={[0.78, 0, 0]}
      />
      <Box
        pos={[nsX + 0.265, FY + 0.15, nsZ]}
        size={[0.03, 0.03, 0.03]}
        color="#c9a24a"
        rot={[0.78, 0, 0]}
      />
      {/* lampu duduk di atas meja */}
      <Cyl
        pos={[nsX, nsTop + 0.08, nsZ]}
        r={0.045}
        h={0.16}
        color={WOOD_DARK}
      />
      <Cyl
        pos={[BED_LAMP.x, BED_LAMP.y, BED_LAMP.z]}
        r={0.13}
        h={0.2}
        color={GLOW}
        glow
      />
      <Halo pos={[BED_LAMP.x, BED_LAMP.y, BED_LAMP.z]} size={1.6} o={0.5} />
      {/* bola lampu kaca menggantung di atas ranjang */}
      <Halo pos={[bedX, FY + 2.3, bedZ]} size={1.2} o={0.35} />

      {/* buku di meja malam — y = nsTop + setengah tebal */}
      <Box
        pos={[nsX - 0.12, nsTop + 0.02, nsZ + 0.08]}
        size={[0.16, 0.035, 0.12]}
        color="#3f5a7a"
        rot={[0, 0.25, 0]}
      />

      {/* ── lemari ── */}
      <Box
        pos={[x0 + 0.32, FY + 1.05, -131.4]}
        size={[0.55, 2.1, 1.5]}
        color="#5a4630"
        grain="wood"
      />
      {/* garis pintu lemari + mahkota kayu */}
      <Box
        pos={[x0 + 0.6, FY + 1.05, -131.4]}
        size={[0.012, 2.0, 0.012]}
        color="#2b2724"
      />
      <Box
        pos={[x0 + 0.32, FY + 2.14, -131.4]}
        size={[0.64, 0.08, 1.6]}
        color={WOOD_DARK}
        grain="wood"
      />
      {/* gagang */}
      <Box
        pos={[x0 + 0.6, FY + 1.05, -131.4]}
        size={[0.03, 0.2, 0.03]}
        color="#2b2724"
      />
      <Box
        pos={[x0 + 0.6, FY + 1.05, -131.25]}
        size={[0.03, 0.2, 0.03]}
        color="#2b2724"
      />

      <Box
        pos={[x0 + 0.32, FY + 0.05, -131.4]}
        size={[0.6, 0.1, 1.58]}
        color="#3a2a1c"
        grain="wood"
      />
      <Box
        pos={[x0 + 0.32, FY + 2.21, -131.4]}
        size={[0.7, 0.05, 1.7]}
        color="#3a2a1c"
        grain="wood"
      />
      {[-1, 1].flatMap((s) =>
        [0, 1].map((r) => (
          <Box
            key={`wp${s}${r}`}
            pos={[x0 + 0.6, r ? FY + 0.5 : FY + 1.45, -131.4 + s * 0.38]}
            size={[0.014, r ? 0.62 : 1.0, 0.56]}
            color="#6a5238"
            grain="wood"
          />
        )),
      )}
      <Box
        pos={[x0 + 0.32, FY + 0.97, -131.4]}
        size={[0.6, 0.03, 1.55]}
        color="#3a2a1c"
      />

      {/* ── lemari rias + cermin di dinding kiri, di antara ranjang dan lemari ── */}
      <Shade pos={[x0 + 0.5, FY + 0.04, -129.35]} w={1.2} d={2.0} o={0.45} />
      <Box
        pos={[x0 + 0.28, FY + 0.43, -129.35]}
        size={[0.5, 0.86, 1.4]}
        color="#6a4c30"
        grain="wood"
      />
      <Box
        pos={[x0 + 0.29, FY + 0.87, -129.35]}
        size={[0.56, 0.04, 1.48]}
        color="#5a4630"
        grain="wood"
      />
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <Box
            pos={[x0 + 0.535, FY + 0.16 + i * 0.25, -129.35]}
            size={[0.016, 0.21, 1.28]}
            color="#7a5a3a"
            grain="wood"
          />
          {[-1, 1].map((s) => (
            <Box
              key={s}
              pos={[x0 + 0.56, FY + 0.16 + i * 0.25, -129.35 + s * 0.35]}
              size={[0.035, 0.035, 0.035]}
              color="#c9a24a"
              rot={[0.78, 0, 0]}
            />
          ))}
        </group>
      ))}
      <Box
        pos={[x0 + 0.05, FY + 1.6, -129.35]}
        size={[0.05, 1.05, 0.85]}
        color={WOOD_DARK}
        grain="wood"
      />
      <Box
        pos={[x0 + 0.09, FY + 1.6, -129.35]}
        size={[0.02, 0.93, 0.73]}
        color="#8aa0c0"
      />
      {[0, 1, 2].map((i) => (
        <Cyl
          key={i}
          pos={[x0 + 0.3, FY + 0.97, -129.85 + i * 0.28]}
          r={0.045}
          h={0.18 + i * 0.05}
          color={["#2a7a6a", "#e0c070", "#7a4a6a"][i]}
        />
      ))}

      {/* ── pojok santai di tengah: permadani bundar, pouf, meja bulat ── */}
      <Cyl
        pos={[-4.2, FY + 0.012, -129.6]}
        r={1.45}
        h={0.022}
        color="#d4a93c"
        seg={32}
      />
      <Cyl
        pos={[-4.2, FY + 0.018, -129.6]}
        r={1.3}
        h={0.022}
        color="#7a2f3a"
        seg={32}
      />
      <Cyl
        pos={[-4.2, FY + 0.024, -129.6]}
        r={0.8}
        h={0.022}
        color="#3f5a7a"
        seg={32}
      />
      <Shade pos={[-4.2, FY + 0.04, -129.6]} w={3.4} d={3.4} o={0.4} />
      <Cyl
        pos={[-4.2, FY + 0.3, -129.6]}
        r={0.34}
        h={0.04}
        color="#8a6a45"
        seg={20}
      />
      <Cyl pos={[-4.2, FY + 0.15, -129.6]} r={0.06} h={0.3} color={WOOD_DARK} />
      <Cyl
        pos={[-4.2, FY + 0.27, -129.6]}
        r={0.28}
        h={0.03}
        color={WOOD_DARK}
        seg={20}
      />
      <Cyl
        pos={[-4.2, FY + 0.02, -129.6]}
        r={0.2}
        h={0.03}
        color={WOOD_DARK}
        seg={16}
      />
      <Cyl
        pos={[-4.2, FY + 0.325, -129.6]}
        r={0.345}
        h={0.012}
        color="#9a7a55"
        seg={20}
      />
      <Cyl
        pos={[-4.35, FY + 0.35, -129.55]}
        r={0.045}
        h={0.08}
        color="#efe6d0"
      />
      <Box
        pos={[-4.05, FY + 0.34, -129.7]}
        size={[0.22, 0.03, 0.16]}
        color="#8e2a2a"
        rot={[0, 0.4, 0]}
      />
      {[
        [-3.1, -130.3, "#3f5a7a"],
        [-5.2, -128.9, "#b4543a"],
        [-4.8, -130.9, "#e0c070"],
      ].map(([x, z, c], i) => (
        <group key={i}>
          <Cyl
            pos={[x as number, FY + 0.2, z as number]}
            r={0.3}
            h={0.4}
            color={c as string}
            seg={16}
          />
          <Cyl
            pos={[x as number, FY + 0.41, z as number]}
            r={0.26}
            h={0.04}
            color="#efe6d0"
            seg={16}
          />
          <Cyl
            pos={[x as number, FY + 0.015, z as number]}
            r={0.31}
            h={0.03}
            color="#3a2a1c"
            seg={16}
          />
          <Cyl
            pos={[x as number, FY + 0.2, z as number]}
            r={0.307}
            h={0.025}
            color="#2b2724"
            seg={16}
          />
          <Cyl
            pos={[x as number, FY + 0.385, z as number]}
            r={0.305}
            h={0.02}
            color="#efe6d0"
            seg={16}
          />
          <Cyl
            pos={[x as number, FY + 0.434, z as number]}
            r={0.022}
            h={0.012}
            color="#5a4630"
            seg={8}
          />
        </group>
      ))}

      {/* ── kursi baca di dekat jendela kanan, lampu lantai, meja kecil ── */}
      <Shade pos={[-1.2, FY + 0.04, -126.4]} w={1.8} d={1.8} o={0.45} />
      <group position={[-1.2, FY, -126.4]} rotation-y={-Math.PI / 2 + 0.35}>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <Box
              key={`${sx}${sz}`}
              pos={[sx * 0.3, 0.07, sz * 0.3]}
              size={[0.07, 0.14, 0.07]}
              color={WOOD_DARK}
              grain="wood"
            />
          )),
        )}
        <Box
          pos={[0, 0.28, 0]}
          size={[0.76, 0.2, 0.74]}
          color="#4a6a8a"
          grain="fabric"
        />
        <Box
          pos={[0, 0.68, -0.32]}
          size={[0.76, 0.7, 0.12]}
          color="#4a6a8a"
          grain="fabric"
        />
        {[-1, 1].map((s) => (
          <Box
            key={s}
            pos={[s * 0.34, 0.42, 0]}
            size={[0.1, 0.3, 0.74]}
            color="#3f5a7a"
            grain="fabric"
          />
        ))}
        <Box
          pos={[0.1, 0.5, -0.15]}
          size={[0.3, 0.3, 0.1]}
          color="#d4a93c"
          grain="fabric"
          rot={[0.3, 0.2, 0.1]}
        />
      </group>
      <Cyl
        pos={[-1.5, FY + 0.25, -124.95]}
        r={0.24}
        h={0.5}
        color="#8a6a45"
        seg={18}
      />
      <Cyl
        pos={[-1.5, FY + 0.53, -124.95]}
        r={0.27}
        h={0.04}
        color={WOOD_DARK}
        seg={18}
      />
      <Box
        pos={[-1.6, FY + 0.58, -124.95]}
        size={[0.22, 0.06, 0.16]}
        color="#3f5a7a"
        rot={[0, 0.3, 0]}
      />
      <Box
        pos={[-1.6, FY + 0.63, -124.95]}
        size={[0.2, 0.05, 0.15]}
        color="#b4543a"
        rot={[0, -0.2, 0]}
      />
      <Cyl pos={[-1.38, FY + 0.6, -125.0]} r={0.04} h={0.08} color="#e8dcc0" />
      <Cyl
        pos={[0.55, FY + 0.85, -124.85]}
        r={0.02}
        h={1.7}
        color={WOOD_DARK}
      />
      <Cyl
        pos={[0.55, FY + 1.7, -124.85]}
        r={0.22}
        h={0.32}
        color={GLOW}
        glow
      />
      <Halo pos={[0.55, FY + 1.7, -124.85]} size={2.0} o={0.45} />
      <Plant pos={[1.4, FY, -124.8]} s={1.2} seed={12} leaves={8} />

      {/* ── rak buku di dinding kanan ── */}
      <Bookshelf pos={[INNER.x1, FY, -126.4]} rotY={Math.PI} seed={5} />
      <Shade pos={[1.2, FY + 0.04, -126.4]} w={1.2} d={2.2} o={0.4} />

      {/* ── lukisan di antara jendela depan ── */}
      {[-5.8, -2.2].map((x, i) => (
        <group key={i} position={[x, FY + 1.5, INNER.zFront - 0.04]}>
          <Box
            pos={[0, 0, 0]}
            size={[0.6, 0.76, 0.04]}
            color={WOOD_DARK}
            grain="wood"
          />
          <Box
            pos={[0, 0, -0.025]}
            size={[0.5, 0.66, 0.02]}
            color={i ? "#2a7a6a" : "#27407a"}
          />
          <mesh position={[i ? -0.1 : 0.1, 0.15, -0.04]}>
            <circleGeometry args={[0.07, 14]} />
            <meshBasicMaterial color="#ffe9a8" side={2} />
          </mesh>
          <Box
            pos={[0, -0.2, -0.04]}
            size={[0.5, 0.2, 0.01]}
            color={i ? "#1f4a38" : "#17264a"}
          />
        </group>
      ))}

      {/* ── peti di kaki ranjang, sandal, tumpukan buku ── */}
      <Box
        pos={[bedX + mattL / 2 + 0.45, FY + 0.22, bedZ]}
        size={[0.5, 0.44, 1.2]}
        color={WOOD_DARK}
        grain="wood"
      />
      <Box
        pos={[bedX + mattL / 2 + 0.45, FY + 0.46, bedZ]}
        size={[0.44, 0.05, 1.1]}
        color="#a84838"
        grain="fabric"
      />
      {[-1, 1].map((s) => (
        <Box
          key={`cs${s}`}
          pos={[bedX + mattL / 2 + 0.45, FY + 0.22, bedZ + s * 0.42]}
          size={[0.52, 0.46, 0.035]}
          color="#2b2724"
        />
      ))}
      <Box
        pos={[bedX + mattL / 2 + 0.72, FY + 0.34, bedZ]}
        size={[0.03, 0.1, 0.07]}
        color="#c9a24a"
      />
      <Shade
        pos={[bedX + mattL / 2 + 0.45, FY + 0.04, bedZ]}
        w={1.1}
        d={1.8}
        o={0.4}
      />
      {[0, 1].map((i) => (
        <Box
          key={i}
          pos={[bedX + 0.2, FY + 0.04, bedZ + 1.05 + i * 0.16]}
          size={[0.26, 0.06, 0.1]}
          color="#8a4b3a"
          grain="fabric"
          rot={[0, 0.2, 0]}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          pos={[bedX + 0.5, FY + 0.03 + i * 0.05, bedZ - 1.1]}
          size={[0.3 - i * 0.03, 0.05, 0.22]}
          color={["#3f5a7a", "#6a9a3c", "#b4543a"][i]}
          rot={[0, 0.3 * i, 0]}
        />
      ))}
    </group>
  );
}
