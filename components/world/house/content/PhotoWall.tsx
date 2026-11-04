"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Box } from "../rooms/parts";
import {
  PHOTO_MAX,
  photoSlots,
  type ContentItem,
  type PhotoSlot,
} from "./contentLayout";
import { Hotspot } from "./Switches";
import { Tip, useHover } from "./Tip";

// Memuat gambar tanpa membuat adegan menunggu. Kalau gagal, bingkai tetap tampil kosong.
const PHOTO_MAX_PX = 1280; // foto lebih besar dari ini diperkecil: tidak terlihat bedanya di bingkai, hemat memori GPU

export function usePhoto(url?: string) {
  const gl = useThree((st) => st.gl);
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
        let out: THREE.Texture = t;
        const img = t.image as { width?: number; height?: number } | undefined;
        const big = Math.max(img?.width ?? 0, img?.height ?? 0);
        if (img && big > PHOTO_MAX_PX) {
          try {
            const k = PHOTO_MAX_PX / big;
            const cv = document.createElement("canvas");
            cv.width = Math.round((img.width ?? 1) * k);
            cv.height = Math.round((img.height ?? 1) * k);
            cv.getContext("2d")?.drawImage(
              img as CanvasImageSource,
              0,
              0,
              cv.width,
              cv.height,
            );
            out = new THREE.CanvasTexture(cv);
            t.dispose();
          } catch {
            out = t;
          }
        }
        out.colorSpace = THREE.SRGBColorSpace;
        out.anisotropy = 4;
        // unggah ke GPU sekarang, bukan saat frame berikutnya, supaya tidak ada sentakan saat dilihat
        try {
          gl.initTexture(out);
        } catch {}
        setTex(out);
      },
      undefined,
      () => {},
    );
    return () => {
      live = false;
    };
  }, [url, gl]);
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
      <Hotspot
        pos={[w / 2 - 0.05, hgt / 2 - 0.05, 0.12]}
        level={1}
        size={0.3}
        near={8}
      />
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
