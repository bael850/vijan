"use client";

import { useMemo } from "react";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { DRAGON } from "../../config/dragon";
import type { Brain } from "./dragonBehavior";
import Dragon from "./Dragon";

// Beberapa naga, masing-masing punya kegiatan acak sendiri dan model yang dipilih acak
// dari DRAGON.models. Jumlah menurut kualitas grafis.
export default function Dragons({ quality }: { quality: GraphicsQuality }) {
  const n = DRAGON.count[quality];
  // daftar otak semua naga, supaya mereka saling menjaga jarak
  const peers = useMemo<Brain[]>(() => [], []);
  const picks = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) =>
        i === 0
          ? DRAGON.models[0]
          : DRAGON.models[Math.floor(Math.random() * DRAGON.models.length)],
      ),
    [],
  );
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Dragon key={i} index={i} model={picks[i]} peers={peers} />
      ))}
    </>
  );
}
