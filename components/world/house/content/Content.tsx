"use client";

import PhotoWall from "./PhotoWall";
import RecordPlayer from "./RecordPlayer";
import Writings from "./Writings";
import type { ContentItem } from "./contentLayout";

// Isi rumah yang bisa disentuh: tulisan di meja kerja, foto di dinding, lagu di pemutar piringan.
export default function Content({
  writings,
  photos,
  onOpen,
  reduceMotion,
}: {
  writings: ContentItem[];
  photos: ContentItem[];
  onOpen: (href: string) => void;
  reduceMotion: boolean;
}) {
  return (
    <group>
      <Writings items={writings} onOpen={onOpen} />
      <PhotoWall items={photos} onOpen={onOpen} />
      <RecordPlayer reduceMotion={reduceMotion} />
    </group>
  );
}
