"use client";

import {
  Component,
  Suspense,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import Cat from "../cat/Cat";
import { AMBIENT } from "../config/ambient";
import { CAMERA } from "../config/scroll";
import Content from "../house/content/Content";
import type { ContentItem } from "../house/content/contentLayout";
import Door from "../house/Door";
import Yard from "../house/Yard";
import Exterior from "../house/Exterior";
import Interior from "../house/rooms/Interior";
import Smoke from "../house/Smoke";
import Stairs from "../house/Stairs";
import Birds from "../nature/Birds";
import Fireflies from "../nature/Fireflies";
import Flowers from "../nature/Flowers";
import Forest from "../nature/Forest";
import Landmarks from "../nature/Landmarks";
import Pier from "../nature/Pier";
import Sheep from "../nature/Sheep";
import Streetlamps from "../nature/Streetlamps";
import Village from "../nature/Village";
import PathMesh from "../path/PathMesh";
import SidePaths from "../path/SidePaths";
import Sky from "../sky/Sky";
import Ground from "../terrain/Ground";
import Water from "../terrain/Water";
import CameraRig from "./CameraRig";
import SoundDriver from "./SoundDriver";
import TimeOfDay from "./TimeOfDay";

// Kalau model kucing gagal dimuat, dunia tetap tampil tanpa kucing.
class CatBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Merakit seluruh dunia luar, termasuk bagian luar rumah. Isi rumah ada di house/rooms.
export default function WorldScene({
  progress,
  quality,
  reduceMotion,
  active,
  writings,
  photos,
  onOpen,
}: {
  progress: MutableRefObject<number>;
  quality: GraphicsQuality;
  reduceMotion: boolean;
  active: boolean;
  writings: ContentItem[];
  photos: ContentItem[];
  onOpen: (href: string) => void;
}) {
  const camDist = useRef(0);
  const indoor = useRef(0);

  return (
    <Canvas
      dpr={[1, quality === "high" ? 1.75 : 1.25]}
      camera={{ fov: CAMERA.fov, near: 0.1, far: 700, position: [0, 50, 160] }}
      gl={{ antialias: quality !== "low", powerPreference: "high-performance" }}
      shadows={quality !== "low"}
      frameloop={active ? "always" : "never"}
    >
      <TimeOfDay progress={progress} indoor={indoor} quality={quality} />
      <CameraRig
        progress={progress}
        camDist={camDist}
        indoor={indoor}
        reduceMotion={reduceMotion}
      />

      <SoundDriver indoor={indoor} />
      <Sky />
      <Ground quality={quality} />
      <Water />
      <PathMesh />
      <SidePaths />
      <Forest quality={quality} />
      <Flowers quality={quality} />
      <Pier />
      <Village />
      <Landmarks reduceMotion={reduceMotion} />
      <Sheep reduceMotion={reduceMotion} />

      <Exterior />
      <Yard />
      <Streetlamps
        amount={AMBIENT.lamps[quality]}
        reduceMotion={reduceMotion}
      />
      <Smoke amount={AMBIENT.smoke[quality]} reduceMotion={reduceMotion} />
      {!reduceMotion && <Birds amount={AMBIENT.birds[quality]} />}
      <Fireflies
        amount={AMBIENT.fireflies[quality]}
        indoor={indoor}
        reduceMotion={reduceMotion}
      />
      <Stairs />
      <Door progress={progress} />
      <Content
        writings={writings}
        photos={photos}
        onOpen={onOpen}
        reduceMotion={reduceMotion}
      />
      <Interior indoor={indoor} quality={quality} reduceMotion={reduceMotion} />

      <CatBoundary>
        <Suspense fallback={null}>
          <Cat camDist={camDist} reduceMotion={reduceMotion} />
        </Suspense>
      </CatBoundary>
    </Canvas>
  );
}
