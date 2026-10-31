"use client";

import { H, INNER } from "../houseLayout";
import {
  Bookshelf,
  Box,
  Cyl,
  GLOW,
  Halo,
  Shade,
  WOOD,
  WOOD_DARK,
} from "./parts";

const FY = H.floor2Y;

export default function Study() {
  const zb = INNER.zBack;
  // permukaan meja = FY + 0.75 + 0.03 = FY + 0.78
  const deskTop = FY + 0.78;
  return (
    <group>
      <Shade pos={[-6.5, FY + 0.04, zb + 0.7]} w={4.4} d={2.2} o={0.5} />
      <Shade pos={[-3.0, FY + 0.04, zb + 0.4]} w={2.4} d={1.4} o={0.4} />
      <Box
        pos={[-6.5, FY + 0.75, zb + 0.5]}
        size={[3.6, 0.06, 0.7]}
        color={WOOD}
        grain="wood"
      />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Box
            key={`${sx}${sz}`}
            pos={[-6.5 + sx * 1.7, FY + 0.36, zb + 0.5 + sz * 0.28]}
            size={[0.07, 0.72, 0.07]}
            color={WOOD_DARK}
            grain="wood"
          />
        )),
      )}
      <Box
        pos={[-7.9, FY + 0.5, zb + 0.5]}
        size={[0.7, 0.45, 0.56]}
        color="#6a4c30"
        grain="wood"
      />

      {/* mesin ketik */}
      <Box
        pos={[-5.3, FY + 0.88, zb + 0.5]}
        size={[0.42, 0.18, 0.36]}
        color="#2b2724"
      />
      {/* satu lembar kertas di depan mesin ketik — nempel meja */}
      <Box
        pos={[-5.3, deskTop + 0.005, zb + 0.78]}
        size={[0.28, 0.008, 0.3]}
        color="#f4efe0"
        rot={[0.05, 0, 0]}
      />

      {/* lampu meja */}
      <Cyl
        pos={[-4.95, FY + 0.95, zb + 0.25]}
        r={0.03}
        h={0.4}
        color={WOOD_DARK}
      />
      <Cyl
        pos={[-4.95, FY + 1.2, zb + 0.25]}
        r={0.14}
        h={0.16}
        color={GLOW}
        glow
      />
      <Halo pos={[-4.95, FY + 1.2, zb + 0.25]} size={1.5} o={0.5} />

      {/* tumpukan 2 buku di ujung meja kiri */}
      <Box
        pos={[-8.0, deskTop + 0.02, zb + 0.5]}
        size={[0.2, 0.035, 0.15]}
        color="#6a9a3c"
        rot={[0, 0.15, 0]}
      />
      <Box
        pos={[-8.0, deskTop + 0.055, zb + 0.48]}
        size={[0.18, 0.03, 0.14]}
        color="#7a4a6a"
        rot={[0, 0.4, 0]}
      />
      {/* gelas */}
      <Cyl
        pos={[-7.75, deskTop + 0.06, zb + 0.35]}
        r={0.04}
        h={0.1}
        color="#e8dcc0"
        seg={10}
      />

      {/* alas meja kulit */}
      <Box
        pos={[-6.7, deskTop + 0.006, zb + 0.47]}
        size={[1.5, 0.012, 0.6]}
        color="#2f3a4a"
        grain="fabric"
      />
      <Box
        pos={[-4.75, deskTop + 0.03, zb + 0.6]}
        size={[0.22, 0.05, 0.3]}
        color="#efe6d0"
      />
      <Box
        pos={[-4.75, deskTop + 0.075, zb + 0.6]}
        size={[0.2, 0.04, 0.28]}
        color="#e8dcc0"
        rot={[0, 0.2, 0]}
      />
      {/* kursi: ditarik sedikit dari meja, menghadap meja (sandaran di sisi +z), agak serong */}
      <group position={[-6.6, FY, zb + 1.3]} rotation-y={0.12}>
        <Box
          pos={[0, 0.48, 0]}
          size={[0.5, 0.06, 0.5]}
          color="#8a6a45"
          grain="wood"
        />
        <Box
          pos={[0, 0.8, 0.23]}
          size={[0.5, 0.6, 0.05]}
          color="#8a6a45"
          grain="wood"
        />
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <Box
              key={`${sx}${sz}`}
              pos={[sx * 0.2, 0.23, sz * 0.2]}
              size={[0.05, 0.46, 0.05]}
              color={WOOD_DARK}
              grain="wood"
            />
          )),
        )}
      </group>

      <Bookshelf pos={[-3.4, FY, zb]} rotY={-Math.PI / 2} seed={3} />
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
    </group>
  );
}
