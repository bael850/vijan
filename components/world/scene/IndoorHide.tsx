"use client";

import { useRef, type MutableRefObject, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { HouseState } from "../chapters/home/houseState";
import { setCreatureHidden } from "../core/creatureCull";
import { muteShadowActors } from "../core/shadowBus";

// Selagi kamera di dalam rumah, bagian dunia luar yang tidak mungkin terlihat disembunyikan
// (tidak digambar di layar maupun di peta bayangan). Begitu mulai keluar rumah, langsung tampil lagi.
// Hanya aktif di lantai bawah. Di balkon dan lantai atas dunia luar terlihat luas, jadi semuanya tetap tampil.
export default function IndoorHide({
  indoor,
  house,
  creatures,
  children,
}: {
  indoor: MutableRefObject<number>;
  house: MutableRefObject<HouseState>;
  creatures?: boolean; // true: pembungkus ini juga mematikan pengecekan naga/burung
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const was = useRef(false);
  useFrame(() => {
    // hanya di lantai bawah: dari balkon dan lantai atas dunia luar masih terlihat jelas
    const hide = indoor.current > 0.97 && house.current.walk.level === "g";
    if (hide === was.current) return;
    was.current = hide;
    if (ref.current) ref.current.visible = !hide;
    if (creatures) {
      setCreatureHidden(hide);
      muteShadowActors(hide);
    }
  });
  return <group ref={ref}>{children}</group>;
}
