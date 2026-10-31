"use client";

import { Box } from "../rooms/parts";
import {
  coverOf,
  deskSlots,
  writingKind,
  type ContentItem,
} from "./contentLayout";
import { Tip, useHover } from "./Tip";

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
      position={[slot.x, slot.y + (hover ? 0.04 : 0), slot.z]}
      rotation-y={slot.yaw}
      {...h}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item.href);
      }}
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
        </>
      ) : (
        <Box pos={[0, 0.01, 0]} size={[0.2, 0.02, 0.28]} color="#efe6d0" />
      )}
      {hover && <Tip position={[0, 0.3, 0]}>{item.title}</Tip>}
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
