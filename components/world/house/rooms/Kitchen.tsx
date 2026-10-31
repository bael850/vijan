"use client";

import { H, INNER } from "../houseLayout";
import { Box, Cyl, GLOW, Halo, Plant, Shade, WOOD, WOOD_DARK } from "./parts";

const FY = H.floorY;
const TOP = "#d8d0c0";

export default function Kitchen() {
  const x0 = INNER.x0;
  const zb = INNER.zBack;
  // permukaan counter = FY + 0.92 + 0.025 ≈ FY + 0.945
  const counterY = FY + 0.95;
  const stools = [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    return [-7 + Math.cos(a) * 1.1, -135.6 + Math.sin(a) * 1.1] as const;
  });

  return (
    <group>
      {/* keramik dinding di atas counter */}
      <Box
        pos={[x0 + 2.4, FY + 1.3, zb + 0.012]}
        size={[4.8, 0.7, 0.02]}
        color="#dfe6e0"
        grain="plaster"
      />
      <Box
        pos={[x0 + 0.012, FY + 1.3, -136.3]}
        size={[0.02, 0.7, 5.5]}
        color="#dfe6e0"
        grain="plaster"
      />
      <Shade pos={[x0 + 2.4, FY + 0.04, zb + 0.9]} w={5.4} d={2.0} o={0.4} />
      <Shade pos={[x0 + 0.9, FY + 0.04, -136.3]} w={2.0} d={5.8} o={0.4} />
      <Shade pos={[-7, FY + 0.04, -135.6]} w={3.2} d={3.2} o={0.5} />
      {/* karpet lari */}
      <Box
        pos={[-6.2, FY + 0.012, zb + 1.25]}
        size={[3.4, 0.022, 0.8]}
        color="#a8573a"
        grain="fabric"
      />
      <Box
        pos={[-6.2, FY + 0.018, zb + 1.25]}
        size={[3.2, 0.022, 0.6]}
        color="#e0c070"
        grain="fabric"
      />
      {/* counter belakang: alas, badan lemari, papan atas. Ditumpuk, tidak saling menembus. */}
      <Box
        pos={[x0 + 2.4, FY + 0.05, zb + 0.3]}
        size={[4.7, 0.1, 0.56]}
        color={WOOD_DARK}
      />
      <Box
        pos={[x0 + 2.4, FY + 0.4975, zb + 0.33]}
        size={[4.8, 0.795, 0.66]}
        color={WOOD}
        grain="wood"
      />
      <Box
        pos={[x0 + 2.4, FY + 0.92, zb + 0.35]}
        size={[4.8, 0.05, 0.7]}
        color={TOP}
      />
      {[1, 2, 3, 4, 5].map((k) => (
        <Box
          key={`bs${k}`}
          pos={[x0 + 0.8 * k, FY + 0.5, zb + 0.665]}
          size={[0.014, 0.74, 0.01]}
          color="#3a2a1c"
        />
      ))}
      {[0, 1, 2, 3, 4, 5].map((j) => (
        <Box
          key={`bh${j}`}
          pos={[x0 + 0.8 * j + 0.68, FY + 0.75, zb + 0.675]}
          size={[0.02, 0.16, 0.025]}
          color={WOOD_DARK}
        />
      ))}
      <Box
        pos={[x0 + 1.5, FY + 1.95, zb + 0.2]}
        size={[3, 0.8, 0.4]}
        color="#6a4c30"
        grain="wood"
      />

      {/* counter kiri: mulai tepat di depan counter belakang, jadi sudutnya tidak tumpang tindih */}
      <Box
        pos={[x0 + 0.3, FY + 0.05, -136.3]}
        size={[0.56, 0.1, 5.4]}
        color={WOOD_DARK}
      />
      <Box
        pos={[x0 + 0.33, FY + 0.4975, -136.295]}
        size={[0.66, 0.795, 5.49]}
        color={WOOD}
        grain="wood"
      />
      <Box
        pos={[x0 + 0.35, FY + 0.92, -136.275]}
        size={[0.7, 0.05, 5.45]}
        color={TOP}
      />
      {[1, 2, 3, 4, 5, 6].map((k) => (
        <Box
          key={`ls${k}`}
          pos={[x0 + 0.665, FY + 0.5, -139.04 + 0.784 * k]}
          size={[0.01, 0.74, 0.014]}
          color="#3a2a1c"
        />
      ))}
      {[0, 1, 2, 3, 4, 5, 6].map((j) => (
        <Box
          key={`lh${j}`}
          pos={[x0 + 0.675, FY + 0.75, -139.04 + 0.784 * j + 0.7]}
          size={[0.025, 0.16, 0.02]}
          color={WOOD_DARK}
        />
      ))}

      {/* kompor */}
      <Box
        pos={[-8.2, FY + 0.96, zb + 0.35]}
        size={[0.7, 0.04, 0.6]}
        color="#1a1a1a"
      />
      <Cyl
        pos={[-8.35, counterY + 0.14, zb + 0.35]}
        r={0.14}
        h={0.22}
        color="#7a7a7a"
        seg={14}
      />
      <Cyl
        pos={[-8.05, FY + 0.99, zb + 0.35]}
        r={0.07}
        h={0.02}
        color="#ff8a3a"
        glow
      />

      {/* bak cuci */}
      <Box
        pos={[-6.2, FY + 0.95, zb + 0.35]}
        size={[0.8, 0.03, 0.5]}
        color="#8aa0a8"
      />
      <Cyl
        pos={[-6.2, FY + 1.12, zb + 0.15]}
        r={0.02}
        h={0.32}
        color="#b8b8b8"
      />

      {/* toples di counter belakang — duduk di TOP */}
      <Cyl
        pos={[-4.9, counterY + 0.1, zb + 0.4]}
        r={0.07}
        h={0.2}
        color="#b4543a"
        seg={10}
      />
      <Cyl
        pos={[-4.9, counterY + 0.22, zb + 0.4]}
        r={0.072}
        h={0.04}
        color={WOOD_DARK}
        seg={10}
      />
      <Cyl
        pos={[-4.55, counterY + 0.09, zb + 0.38]}
        r={0.06}
        h={0.18}
        color="#e0c070"
        seg={10}
      />
      <Cyl
        pos={[-4.55, counterY + 0.2, zb + 0.38]}
        r={0.062}
        h={0.035}
        color={WOOD_DARK}
        seg={10}
      />

      {/* talenan di counter */}
      <Box
        pos={[-7.3, counterY + 0.01, zb + 0.4]}
        size={[0.32, 0.02, 0.22]}
        color="#9a7a55"
        grain="wood"
        rot={[0, 0.25, 0]}
      />

      {/* meja makan */}
      <Cyl
        pos={[-7, FY + 0.75, -135.6]}
        r={0.75}
        h={0.06}
        color={WOOD}
        seg={20}
      />
      <Cyl pos={[-7, FY + 0.38, -135.6]} r={0.08} h={0.75} color={WOOD_DARK} />
      {/* gelas di meja makan — permukaan FY+0.78 */}
      <Cyl
        pos={[-7.2, FY + 0.84, -135.45]}
        r={0.045}
        h={0.11}
        color="#e8dcc0"
        seg={10}
      />
      <Cyl
        pos={[-6.85, FY + 0.81, -135.7]}
        r={0.08}
        h={0.05}
        color="#d8cdb5"
        seg={12}
      />

      {stools.map(([x, z], i) => (
        <group key={i}>
          <Cyl pos={[x, FY + 0.46, z]} r={0.2} h={0.05} color="#8a6a45" />
          <Cyl pos={[x, FY + 0.495, z]} r={0.17} h={0.03} color="#a8573a" />
          <Cyl pos={[x, FY + 0.2505, z]} r={0.04} h={0.369} color={WOOD_DARK} />
          <Cyl pos={[x, FY + 0.051, z]} r={0.16} h={0.03} color={WOOD_DARK} />
          {/* alas makan dan piring di depan tiap bangku */}
          <Box
            pos={[-7 + (x + 7) * 0.5, FY + 0.795, -135.6 + (z + 135.6) * 0.5]}
            size={[0.34, 0.01, 0.24]}
            color="#2a7a6a"
            grain="fabric"
            rot={[0, -Math.atan2(z + 135.6, x + 7), 0]}
          />
          <Cyl
            pos={[-7 + (x + 7) * 0.5, FY + 0.8075, -135.6 + (z + 135.6) * 0.5]}
            r={0.09}
            h={0.015}
            color="#efe6d0"
          />
        </group>
      ))}
      {/* permadani bundar di bawah meja makan */}
      <Box
        pos={[-7, FY + 0.012, -135.6]}
        size={[3.2, 0.022, 3.2]}
        color="#d4a93c"
        grain="fabric"
      />
      <Box
        pos={[-7, FY + 0.018, -135.6]}
        size={[2.9, 0.022, 2.9]}
        color="#8a4b3a"
        grain="fabric"
      />
      <Box
        pos={[-7, FY + 0.024, -135.6]}
        size={[2.2, 0.022, 2.2]}
        color="#3f5a7a"
        grain="fabric"
      />
      {/* kain meja kecil di tengah */}
      <Cyl pos={[-7, FY + 0.785, -135.6]} r={0.5} h={0.012} color="#efe6d0" />
      {/* lemari gantung di sisi kiri */}
      <Box
        pos={[x0 + 0.2, FY + 1.95, -136.9]}
        size={[0.4, 0.8, 2.6]}
        color="#6a4c30"
        grain="wood"
      />
      {[-1, 0, 1].map((k) => (
        <Box
          key={k}
          pos={[x0 + 0.42, FY + 1.95, -136.9 + k * 0.85]}
          size={[0.02, 0.7, 0.02]}
          color={WOOD_DARK}
        />
      ))}
      {/* mangkuk buah, talenan, pisau, keranjang roti, tanaman di meja sisi kiri */}
      <Cyl
        pos={[x0 + 0.35, FY + 0.99, -134.2]}
        r={0.15}
        h={0.08}
        color="#efe6d0"
      />
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[x0 + 0.3 + i * 0.06, FY + 1.06, -134.2 + (i - 1) * 0.06]}
        >
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshLambertMaterial color={["#c0453a", "#e08a3a", "#6a9a3c"][i]} />
        </mesh>
      ))}
      <Box
        pos={[x0 + 0.3, FY + 1.1, -137.8]}
        size={[0.2, 0.22, 0.14]}
        color={WOOD_DARK}
        grain="wood"
      />
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          pos={[x0 + 0.3, FY + 1.23, -137.84 + i * 0.04]}
          size={[0.015, 0.06, 0.012]}
          color="#2b2724"
        />
      ))}
      <Cyl
        pos={[x0 + 0.35, FY + 1.0, -136.2]}
        r={0.18}
        h={0.12}
        color="#b08a5c"
      />
      <Box
        pos={[x0 + 0.35, FY + 1.1, -136.2]}
        size={[0.28, 0.1, 0.12]}
        color="#d8b890"
        rot={[0, 0.5, 0]}
      />
      <Plant pos={[x0 + 0.35, FY + 0.95, -138.6]} s={0.5} seed={4} leaves={6} />
      {/* rel panci gantung di dinding belakang */}
      <Box
        pos={[-5.9, FY + 2.0, zb + 0.06]}
        size={[1.0, 0.03, 0.03]}
        color="#2b2724"
      />
      {[-0.3, 0, 0.3].map((dx, i) => (
        <group key={i}>
          <Box
            pos={[-5.9 + dx, FY + 1.85, zb + 0.06]}
            size={[0.012, 0.28, 0.012]}
            color="#2b2724"
          />
          <Cyl
            pos={[-5.9 + dx, FY + 1.66, zb + 0.08]}
            r={0.09 + i * 0.01}
            h={0.1}
            color={["#7a7a7a", "#b4543a", "#3f5a7a"][i]}
          />
        </group>
      ))}
      {/* tanaman besar di sudut dan keranjang cucian */}
      <Plant pos={[-4.0, FY, -138.8]} s={1.2} seed={8} leaves={9} />
      <Shade pos={[-4.0, FY + 0.04, -138.8]} w={0.9} d={0.9} o={0.4} />

      <Cyl pos={[-7, FY + 3.3, -135.6]} r={0.008} h={2.4} color={WOOD_DARK} />
      <Cyl pos={[-7, FY + 2.1, -135.6]} r={0.22} h={0.2} color={GLOW} glow />
      <Halo pos={[-7, FY + 2.0, -135.6]} size={2.4} o={0.5} />
    </group>
  );
}
