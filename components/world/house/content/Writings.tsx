"use client";

import { Box } from "../rooms/parts";
import {
  coverOf,
  deskSlots,
  writingKind,
  type ContentItem,
} from "./contentLayout";
import { Tip, useHover } from "./Tip";

const S = 1.3; // dibesarkan supaya mudah terlihat dan diklik dari kejauhan
const TILT = 0.62; // dimiringkan ke arah kamera (sisi belakang terangkat)

function Piece({
  item,
  slot,
  onOpen,
}: {
  item: ContentItem;
  slot: { x: number; y: number; z: number; yaw: number };
  onOpen: (href: string) => void;
}) {
  const [hover, h] = useHover();
  const kind = writingKind(item.label);
  return (
    <group
      position={[slot.x, slot.y, slot.z]}
      rotation-y={slot.yaw}
      {...h}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item.href);
      }}
    >
      {/* area klik tak terlihat, jauh lebih besar dari bendanya */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.46, 0.34, 0.46]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* penyangga kayu kecil di bawah sisi belakang */}
      <Box
        pos={[0, 0.045, -0.1]}
        size={[0.2 * S, 0.09, 0.03]}
        color="#6a4c30"
      />

      <group
        position={[0, 0.1 + (hover ? 0.03 : 0), 0.02]}
        rotation-x={TILT}
        scale={S * (hover ? 1.06 : 1)}
      >
        {kind === "buku" ? (
          <>
            <Box
              pos={[0, 0.03, 0]}
              size={[0.22, 0.06, 0.3]}
              color={coverOf(item.id)}
            />
            <Box
              pos={[0.012, 0.03, 0]}
              size={[0.2, 0.046, 0.29]}
              color="#efe6d0"
            />
            {/* punggung dan label judul di sampul */}
            <Box
              pos={[0, 0.062, 0]}
              size={[0.15, 0.004, 0.1]}
              color="#efe6d0"
            />
          </>
        ) : (
          <>
            <Box pos={[0, 0.01, 0]} size={[0.2, 0.02, 0.28]} color="#efe6d0" />
            {[-0.08, -0.03, 0.02, 0.07].map((zz) => (
              <Box
                key={zz}
                pos={[0, 0.0215, zz]}
                size={[0.15, 0.002, 0.008]}
                color="#6a6f7a"
              />
            ))}
          </>
        )}
      </group>

      {hover && <Tip position={[0, 0.55, 0]}>{item.title}</Tip>}
    </group>
  );
}

// Tulisan di meja kerja: buku untuk cerbung dan rekomendasi, kertas untuk yang lain.
// Diklik = buka tulisannya.
export default function Writings({
  items,
  onOpen,
}: {
  items: ContentItem[];
  onOpen: (href: string) => void;
}) {
  const slots = deskSlots(items);
  return (
    <group>
      {slots.map((s, i) => (
        <Piece key={items[i].id} item={items[i]} slot={s} onOpen={onOpen} />
      ))}
    </group>
  );
}
