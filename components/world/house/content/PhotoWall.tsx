"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { Box } from "../rooms/parts";
import {
  PHOTO_MAX,
  photoSlots,
  type ContentItem,
  type PhotoSlot,
} from "./contentLayout";
import { Tip, useHover } from "./Tip";

// Memuat gambar tanpa membuat adegan menunggu. Kalau gagal, bingkai tetap tampil kosong.
function usePhoto(url?: string) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) return;
    let live = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (t) => {
        if (!live) {
          t.dispose();
          return;
        }
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      },
      undefined,
      () => {},
    );
    return () => {
      live = false;
    };
  }, [url]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

function Frame({
  item,
  slot,
  onOpen,
}: {
  item: ContentItem;
  slot: PhotoSlot;
  onOpen: (href: string) => void;
}) {
  const [hover, h] = useHover();
  const tex = usePhoto(item.image);
  const img = tex?.image as { width?: number; height?: number } | undefined;
  const aspect =
    img?.width && img?.height
      ? img.width / img.height
      : PHOTO_MAX.w / PHOTO_MAX.h;
  const w = Math.min(PHOTO_MAX.w, PHOTO_MAX.h * aspect);
  const hgt = w / aspect;
  const s = hover ? 1.05 : 1;
  return (
    <group
      position={[slot.x, slot.y, slot.z]}
      rotation-y={slot.ry}
      scale={[s, s, 1]}
      {...h}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item.href);
      }}
    >
      <Box
        pos={[0, 0, 0]}
        size={[w + 0.12, hgt + 0.12, 0.04]}
        color="#4a3626"
      />
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[w, hgt]} />
        <meshBasicMaterial
          key={tex ? "foto" : "kosong"}
          color={tex ? "#f0e8d8" : "#3a4a6a"}
          map={tex ?? undefined}
        />
      </mesh>
      {hover && <Tip position={[0, hgt / 2 + 0.3, 0.2]}>{item.title}</Tip>}
    </group>
  );
}

// Foto-foto di dinding kamar atas. Diklik = buka di kamar gelap.
export default function PhotoWall({
  items,
  onOpen,
}: {
  items: ContentItem[];
  onOpen: (href: string) => void;
}) {
  const slots = photoSlots(items.length);
  return (
    <group>
      {slots.map((s, i) => (
        <Frame key={items[i].id} item={items[i]} slot={s} onOpen={onOpen} />
      ))}
    </group>
  );
}
