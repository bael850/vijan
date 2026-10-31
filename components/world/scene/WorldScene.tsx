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
import Cat from "../fauna/cat/Cat";
import StrayCats from "../fauna/cat/StrayCats";
import Dragons from "../fauna/dragon/Dragons";
import { AMBIENT } from "../config/ambient";
import { CAMERA } from "../config/scroll";
import Content from "../house/content/Content";
import type { ContentItem } from "../house/content/contentLayout";
import LakeWords from "../lake/LakeWords";
import ShoreMarker from "../lake/ShoreMarker";
import { newFocus, type Wish } from "../lake/wish";
import Door from "../house/Door";
import Yard from "../house/Yard";
import Exterior from "../house/Exterior";
import Interior from "../house/rooms/Interior";
import Smoke from "../house/Smoke";
import Stairs from "../house/Stairs";
import Birds from "../fauna/Birds";
import Fish from "../fauna/Fish";
import Fireflies from "../effects/Fireflies";
import Forest from "../flora/Forest";
import Landmarks from "../village/Landmarks";
import Pier from "../village/Pier";
import Sheep from "../fauna/Sheep";
import Guards from "../folk/Guards";
import Spearmen from "../folk/Spearmen";
import Villagers from "../folk/Villagers";
import SkyLanterns from "../effects/SkyLanterns";
import Streetlamps from "../village/Streetlamps";
import Undergrowth from "../flora/Undergrowth";
import Village from "../village/Village";
import PathMesh from "../path/PathMesh";
import SidePaths from "../path/SidePaths";
import Sky from "../sky/Sky";
import Ground from "../terrain/Ground";
import Splash from "../terrain/Splash";
import Water from "../terrain/Water";
import CameraRig from "./CameraRig";
import SoundDriver from "./SoundDriver";
import TimeOfDay from "./TimeOfDay";

// Kalau sebuah model gagal dimuat (kucing, pohon), dunia tetap tampil tanpa model itu.
class SafeBoundary extends Component<
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
  wish,
  shore,
  onEnterShore,
}: {
  progress: MutableRefObject<number>;
  quality: GraphicsQuality;
  reduceMotion: boolean;
  active: boolean;
  writings: ContentItem[];
  photos: ContentItem[];
  onOpen: (href: string) => void;
  wish: MutableRefObject<Wish>;
  shore: MutableRefObject<boolean>;
  onEnterShore: () => void;
}) {
  const camDist = useRef(0);
  const indoor = useRef(0);
  const focus = useRef(newFocus());

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
        shore={shore}
        focus={focus}
        reduceMotion={reduceMotion}
      />

      <SoundDriver indoor={indoor} />
      <Sky />
      <Ground quality={quality} />
      <Water />
      <Fish quality={quality} reduceMotion={reduceMotion} />
      <Splash />
      <LakeWords wish={wish} focus={focus} reduceMotion={reduceMotion} />
      <ShoreMarker progress={progress} shore={shore} onEnter={onEnterShore} />
      <PathMesh />
      <SidePaths />
      <SafeBoundary>
        <Suspense fallback={null}>
          <Forest quality={quality} />
        </Suspense>
      </SafeBoundary>
      <Undergrowth quality={quality} />
      <Pier />
      <Village />
      <Landmarks reduceMotion={reduceMotion} />
      <Sheep reduceMotion={reduceMotion} />
      <SafeBoundary>
        <Suspense fallback={null}>
          <Guards
            amount={AMBIENT.guards[quality]}
            reduceMotion={reduceMotion}
          />
          <Spearmen
            amount={AMBIENT.spearmen[quality]}
            reduceMotion={reduceMotion}
          />
          <Villagers
            amount={AMBIENT.villagers[quality]}
            reduceMotion={reduceMotion}
          />
        </Suspense>
      </SafeBoundary>

      <Exterior />
      <Yard />
      <Streetlamps
        amount={AMBIENT.lamps[quality]}
        reduceMotion={reduceMotion}
      />
      <Smoke amount={AMBIENT.smoke[quality]} reduceMotion={reduceMotion} />
      {!reduceMotion && <Birds amount={AMBIENT.birds[quality]} />}
      <SkyLanterns
        amount={AMBIENT.lanterns[quality]}
        reduceMotion={reduceMotion}
      />
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

      {!reduceMotion && (
        <SafeBoundary>
          <Suspense fallback={null}>
            <Dragons quality={quality} />
          </Suspense>
        </SafeBoundary>
      )}

      <SafeBoundary>
        <Suspense fallback={null}>
          <Cat camDist={camDist} reduceMotion={reduceMotion} />
        </Suspense>
      </SafeBoundary>

      <SafeBoundary>
        <Suspense fallback={null}>
          <StrayCats quality={quality} reduceMotion={reduceMotion} />
        </Suspense>
      </SafeBoundary>
    </Canvas>
  );
}
