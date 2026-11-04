"use client";

import dynamic from "next/dynamic";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, useProgress } from "@react-three/drei";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import Cat from "../fauna/cat/Cat";
import { AMBIENT } from "../config/ambient";
import { CAMERA } from "../config/scroll";
import { HOUSE } from "../config/world";
import type { ContentItem } from "../house/content/contentLayout";
import type { DeskState } from "../house/content/deskLayout";
import LakeWords from "../lake/LakeWords";
import ShoreMarker from "../lake/ShoreMarker";
import { newFocus, type Wish } from "../lake/wish";
import Door from "../house/Door";
import GateDoors from "../village/GateDoors";
import Yard from "../house/Yard";
import Exterior from "../house/Exterior";
import Smoke from "../house/Smoke";
import Birds from "../fauna/Birds";
import Fireflies from "../effects/Fireflies";
import LakeMist from "../effects/LakeMist";
import Forest from "../flora/Forest";
import Landmarks from "../village/Landmarks";
import Pier from "../village/Pier";
import Sheep from "../fauna/Sheep";
import Guards from "../folk/Guards";
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

// Bagian yang belum terlihat di awal perjalanan dimuat belakangan, setelah layar
// loading selesai: isi rumah, naga, ikan, penduduk, dan kucing liar. Modulnya
// (termasuk unduhan modelnya) baru diambil saat komponennya dipasang.
const Dragons = dynamic(() => import("../fauna/dragon/Dragons"), {
  ssr: false,
});
const StrayCats = dynamic(() => import("../fauna/cat/StrayCats"), {
  ssr: false,
});
const Fish = dynamic(() => import("../fauna/Fish"), { ssr: false });
const Spearmen = dynamic(() => import("../folk/Spearmen"), { ssr: false });
const Villagers = dynamic(() => import("../folk/Villagers"), { ssr: false });
const Interior = dynamic(() => import("../house/rooms/Interior"), {
  ssr: false,
});
const Content = dynamic(() => import("../house/content/Content"), {
  ssr: false,
});
const Stairs = dynamic(() => import("../house/Stairs"), { ssr: false });

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

// Memberi tahu layar loading seberapa siap dunianya: model sudah termuat dan
// beberapa frame pertama sudah tergambar (di sinilah shader dikompilasi).
function LoadWatcher({
  onStatus,
}: {
  onStatus: (pct: number, ready: boolean) => void;
}) {
  const { progress, active } = useProgress();
  const frames = useRef(0);
  const done = useRef(false);
  const [framed, setFramed] = useState(false);

  useFrame(() => {
    if (framed) return;
    frames.current += 1;
    if (frames.current >= 6) setFramed(true);
  });

  useEffect(() => {
    if (done.current) return; // setelah siap, unduhan susulan tidak perlu dilaporkan lagi
    if (!framed || active) {
      onStatus(progress, false);
      return;
    }
    // jeda singkat: antar model bisa ada celah sebelum model berikutnya mulai dimuat
    const t = window.setTimeout(() => {
      done.current = true;
      onStatus(100, true);
    }, 500);
    return () => window.clearTimeout(t);
  }, [framed, active, progress, onStatus]);

  return null;
}

// Bayangan bulan hanya menutup area sekitar rumah dan hampir semua yang menimbulkannya diam.
// Jadi shadow map tidak digambar ulang tiap frame: sering saat dekat rumah, jarang saat
// sedang di jalan, dan berhenti total kalau kamera jauh.
function ShadowGovernor() {
  const gl = useThree((st) => st.gl);
  const n = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  useFrame(({ camera }) => {
    n.current += 1;
    const d = Math.hypot(
      camera.position.x - HOUSE.x,
      camera.position.z - HOUSE.z,
    );
    const every = d < 90 ? 2 : d < 240 ? 6 : 0;
    if (every && n.current % every === 0) gl.shadowMap.needsUpdate = true;
  });
  return null;
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
  desk,
  wish,
  shore,
  onEnterShore,
  onStatus,
}: {
  progress: MutableRefObject<number>;
  quality: GraphicsQuality;
  reduceMotion: boolean;
  active: boolean;
  writings: ContentItem[];
  photos: ContentItem[];
  onOpen: (href: string) => void;
  desk: MutableRefObject<DeskState>;
  wish: MutableRefObject<Wish>;
  shore: MutableRefObject<boolean>;
  onEnterShore: () => void;
  onStatus: (pct: number, ready: boolean) => void;
}) {
  const camDist = useRef(0);
  const indoor = useRef(0);
  const focus = useRef(newFocus());

  // resolusi turun selangkah tiap kali FPS jeblok, naik lagi kalau sudah lega
  // Jangan pernah merender lebih tajam dari layar aslinya (sebelumnya layar 1x dipaksa 1.75x = 3x piksel)
  const maxDpr = quality === "high" ? 1.5 : 1.25;
  const baseDpr = useMemo(
    () => Math.min(window.devicePixelRatio || 1, maxDpr),
    [maxDpr],
  );
  const [drop, setDrop] = useState(0);
  const locked = useRef(false); // setelah PerformanceMonitor menyerah, resolusi tidak dinaikkan lagi (anti bolak-balik)
  const dpr = Math.max(0.75, baseDpr - drop * 0.25);

  // bagian susulan dipasang setelah dunia siap, saat browser sedang senggang
  const [late, setLate] = useState(false);
  const [settled, setSettled] = useState(false);
  const handleStatus = useCallback(
    (pct: number, ready: boolean) => {
      onStatus(pct, ready);
      if (ready) setSettled(true);
    },
    [onStatus],
  );
  useEffect(() => {
    if (!settled) return;
    const idle = window.requestIdleCallback
      ? (cb: () => void) => window.requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 800);
    const id = idle(() => setLate(true));
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [settled]);

  return (
    <Canvas
      dpr={dpr}
      camera={{ fov: CAMERA.fov, near: 0.1, far: 700, position: [0, 50, 160] }}
      gl={{
        antialias: quality !== "low" && baseDpr < 1.5,
        powerPreference: "high-performance",
      }}
      shadows={quality !== "low"}
      frameloop={active ? "always" : "never"}
    >
      <PerformanceMonitor
        flipflops={2}
        onDecline={() => setDrop((d) => Math.min(d + 1, 4))}
        onIncline={() => {
          if (!locked.current) setDrop((d) => Math.max(d - 1, 0));
        }}
        onFallback={() => {
          locked.current = true;
          setDrop((d) => Math.min(d + 1, 4));
        }}
      />
      <ShadowGovernor />
      <LoadWatcher onStatus={handleStatus} />
      <TimeOfDay progress={progress} indoor={indoor} quality={quality} />
      <CameraRig
        progress={progress}
        camDist={camDist}
        indoor={indoor}
        shore={shore}
        focus={focus}
        desk={desk}
        reduceMotion={reduceMotion}
      />

      <SoundDriver indoor={indoor} />
      <Sky />
      <Ground quality={quality} />
      <Water />
      <Splash />
      <LakeMist quality={quality} reduceMotion={reduceMotion} />
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
      <GateDoors progress={progress} />
      <Door progress={progress} />

      {late && (
        <SafeBoundary>
          <Suspense fallback={null}>
            <Fish quality={quality} reduceMotion={reduceMotion} />
            <Spearmen
              amount={AMBIENT.spearmen[quality]}
              reduceMotion={reduceMotion}
            />
            <Villagers
              amount={AMBIENT.villagers[quality]}
              reduceMotion={reduceMotion}
            />
            <Stairs />
            <Content
              writings={writings}
              photos={photos}
              onOpen={onOpen}
              desk={desk}
              reduceMotion={reduceMotion}
            />
            <Interior
              indoor={indoor}
              quality={quality}
              reduceMotion={reduceMotion}
            />
            {!reduceMotion && <Dragons quality={quality} />}
          </Suspense>
        </SafeBoundary>
      )}

      <SafeBoundary>
        <Suspense fallback={null}>
          <Cat camDist={camDist} reduceMotion={reduceMotion} />
        </Suspense>
      </SafeBoundary>

      {late && (
        <SafeBoundary>
          <Suspense fallback={null}>
            <StrayCats quality={quality} reduceMotion={reduceMotion} />
          </Suspense>
        </SafeBoundary>
      )}
    </Canvas>
  );
}
