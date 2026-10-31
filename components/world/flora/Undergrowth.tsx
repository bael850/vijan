"use client";

import { useEffect, useMemo } from "react";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { PROPS } from "../core/colors";
import Part, { pick, type Place } from "../core/Part";
import {
  bushGeometry,
  mushroomGeometry,
  rockGeometry,
  stumpGeometry,
} from "../village/propGeometry";
import { propSpots } from "../village/propSpots";
import { TREE_STEP } from "../core/scatter";

const bush: Place = (s, o, c) => {
  o.position.set(s.x, s.y - 0.05, s.z);
  o.rotation.y = s.r;
  o.scale.set(s.s, s.s * (0.85 + s.k * 0.4), s.s);
  c.set(pick(PROPS.bush, s.k));
};
// batu dipipihkan dan dimiringkan sedikit; k menentukan bentuk (lonjong atau bulat)
const rock: Place = (s, o, c) => {
  o.position.set(s.x, s.y + s.s * 0.15, s.z);
  o.rotation.set((s.k - 0.5) * 0.4, s.r, (s.r % 1) * 0.3 - 0.15);
  o.scale.set(s.s * (1 + s.k * 0.5), s.s * 0.65, s.s * (1.3 - s.k * 0.4));
  c.set(pick(PROPS.rock, s.k));
};
const stump: Place = (s, o, c) => {
  o.position.set(s.x, s.y - 0.08, s.z);
  o.rotation.y = s.r;
  o.scale.set(s.s, s.s * (0.8 + s.k * 0.6), s.s);
  c.set(PROPS.stump).multiplyScalar(0.85 + s.k * 0.3);
};
const mushroom: Place = (s, o, c) => {
  o.position.set(s.x, s.y - 0.02, s.z);
  o.rotation.y = s.r;
  o.scale.setScalar(s.s);
  c.set(pick(PROPS.mushroomTint, s.k)); // hanya menggeser rona; warna asli ada di geometri
};

// Hiasan kecil di tanah: semak, batu, tunggul, dan jamur. Tanpa bayangan supaya ringan.
export default function Undergrowth({ quality }: { quality: GraphicsQuality }) {
  const spots = useMemo(() => propSpots(TREE_STEP[quality]), [quality]);
  const geos = useMemo(
    () => ({
      bush: bushGeometry(),
      rock: rockGeometry(),
      stump: stumpGeometry(),
      mushroom: mushroomGeometry(),
    }),
    [],
  );
  useEffect(
    () => () => Object.values(geos).forEach((g) => g.dispose()),
    [geos],
  );

  return (
    <group>
      <Part geo={geos.bush} spots={spots.bush} place={bush} />
      <Part geo={geos.rock} spots={spots.rock} place={rock} />
      <Part geo={geos.stump} spots={spots.stump} place={stump} />
      <Part
        geo={geos.mushroom}
        spots={spots.mushroom}
        place={mushroom}
        vertexColors
      />
    </group>
  );
}
