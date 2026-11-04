"use client";

import type { MutableRefObject } from "react";
import DeskKit from "./DeskKit";
import PhotoWall from "./PhotoWall";
import RecordPlayer from "./RecordPlayer";
import Switches from "./Switches";
import Writings from "./Writings";
import type { ContentItem } from "./contentLayout";
import type { DeskState } from "./deskLayout";

// Isi rumah yang bisa disentuh: tulisan di meja kerja, foto di dinding, lagu di pemutar piringan,
// serta album, map CV, dan kartu kontak di meja.
export default function Content({
  writings,
  photos,
  onOpen,
  desk,
  reduceMotion,
}: {
  writings: ContentItem[];
  photos: ContentItem[];
  onOpen: (href: string) => void;
  desk: MutableRefObject<DeskState>;
  reduceMotion: boolean;
}) {
  return (
    <group>
      <Writings items={writings} onOpen={onOpen} />
      <PhotoWall items={photos} onOpen={onOpen} />
      <DeskKit photos={photos} desk={desk} onOpen={onOpen} />
      <RecordPlayer reduceMotion={reduceMotion} />
      <Switches />
    </group>
  );
}
