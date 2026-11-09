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
import { Canvas, useThree } from "@react-three/fiber";
import Boot from "./Boot";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import Castle from "../chapters/castle/Castle";
import City from "../chapters/city/City";
import { LightPool } from "../core/lightPool";
import Palace from "../chapters/palace/Palace";
import Home from "../chapters/home/Home";
import type { HouseState } from "../chapters/home/houseState";
import Village from "../chapters/village/Village";
import RuneCircle from "../chapters/RuneCircle";
import Cat from "../fauna/cat/Cat";
import { CAMERA } from "../config/scroll";
import LakeMist from "../lake/LakeMist";
import LakeWords from "../lake/LakeWords";
import Pier from "../lake/Pier";
import ShoreMarker from "../lake/ShoreMarker";
import { newFocus, type Wish } from "../lake/wish";
import Sky from "../sky/Sky";
import Ground from "../terrain/Ground";
import Splash from "../terrain/Splash";
import Water from "../terrain/Water";
import CameraRig from "./CameraRig";
import SoundDriver from "./SoundDriver";
import TimeOfDay from "./TimeOfDay";
import Insights from "./Insights";
import PerfStats from "./PerfStats";
import { perfOff, perfOffList } from "./perfOff";
import IndoorHide from "./IndoorHide";
import JourneyFx from "./JourneyFx";

// Bagian yang belum terlihat di awal perjalanan dimuat belakangan, setelah layar
// loading selesai: ikan dan kucing liar. Modulnya baru diambil saat komponennya dipasang.
const StrayCats = dynamic(() => import("../fauna/cat/StrayCats"), {
  ssr: false,
});
const Fish = dynamic(() => import("../lake/Fish"), { ssr: false });

// Naga gunung: dimuat belakangan dan tidak menahan layar loading (modelnya 1 MB).
const MountainDragon = dynamic(() => import("../fauna/dragon/MountainDragon"), {
  ssr: false,
});

// Wyvern: penguasa langit, dimuat belakangan juga.
const Wyvern = dynamic(() => import("../fauna/dragon/Wyvern"), { ssr: false });

// Burung: kawanan yang menghiasi langit.
const Birds = dynamic(() => import("../fauna/bird/Birds"), { ssr: false });

// Pohon dari model GLB (maple, dst), digandakan dengan variasi ukuran dan warna.
const Trees = dynamic(() => import("../flora/Trees"), { ssr: false });

// Kalau sebuah model gagal dimuat (kucing, pohon), dunia tetap tampil tanpa model itu.
class SafeBoundary extends Component<
  { children: ReactNode; onSettle?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onSettle?.(); // gagal pun dianggap selesai, supaya loading tidak menggantung
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Penanda: baru terpasang kalau semua saudaranya di dalam <Suspense> yang sama sudah selesai dimuat.
function Settled({ onSettle }: { onSettle: () => void }) {
  useEffect(() => {
    onSettle();
  }, [onSettle]);
  return null;
}

// Resolusi render bertingkat. Dipilih sekali lewat uji singkat saat loading, lalu dikunci:
// tidak ada lagi naik-turun resolusi di tengah perjalanan (itu yang bikin gambar "pecah").
function makeTiers(quality: GraphicsQuality, mobile: boolean): number[] {
  const native = window.devicePixelRatio || 1;
  const cap = mobile
    ? { low: 1.25, medium: 1.5, high: 2 }
    : { low: 1, medium: 1.5, high: 2 };
  let top = Math.min(native, cap[quality]);
  // layar 1x di komputer: render sedikit lebih rapat dari layar supaya tepi benda halus
  if (!mobile && quality === "high") top = Math.min(Math.max(native, 1.25), 2);
  const out: number[] = [];
  for (const k of [1, 0.85, 0.72, 0.6]) {
    const v = Math.max(0.75, Math.round(top * k * 20) / 20);
    if (!out.length || v < out[out.length - 1]) out.push(v);
  }
  return out;
}

// Menjalankan frame sendiri: selama booting tetap jalan walau section belum terlihat,
// berhenti sebentar saat shader dikompilasi, dan di layar 100 Hz ke atas dibatasi
// kira-kira 60 fps (kelipatan bulat refresh rate) supaya ritme frame rata dan HP tidak panas.
function FrameDriver({
  run,
  paused,
  refresh,
  skip,
}: {
  run: boolean;
  paused: MutableRefObject<boolean>;
  refresh: MutableRefObject<number>;
  skip: MutableRefObject<number>;
}) {
  const advance = useThree((st) => st.advance);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let prev = 0;
    let n = 0;
    const samples: number[] = [];
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (prev && samples.length < 60 && !paused.current) {
        const d = t - prev;
        if (d > 3 && d < 50) samples.push(d);
        if (samples.length === 60) {
          const sorted = [...samples].sort((x, y) => x - y);
          const hz = Math.min(240, Math.max(30, 1000 / sorted[30]));
          refresh.current = hz;
          skip.current = hz >= 100 ? Math.round(hz / 60) : 1;
        }
      }
      prev = t;
      // tab tersembunyi: browser biasanya sudah menghentikan rAF, tapi tidak semua (webview, jendela mini);
      // jangan menggambar apa pun selagi halaman tidak terlihat
      if (paused.current || document.hidden) return;
      n += 1;
      if (n % skip.current === 0) advance(t / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [run, advance, paused, refresh, skip]);
  return null;
}

// Peta bayangan tidak digambar ulang otomatis tiap frame; TimeOfDay yang mengaturnya
// berkala (lihat di sana), supaya biaya per frame rata.
function ShadowGovernor() {
  const gl = useThree((st) => st.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  return null;
}

// Merakit seluruh dunia. Tiap bab nanti punya komponennya sendiri di chapters/<bab>/
// dan dipasang di bagian "bab" di bawah.
export default function WorldScene({
  progress,
  quality,
  mobile,
  reduceMotion,
  active,
  wish,
  shore,
  onEnterShore,
  house,
  onEnterHouse,
  books,
  onSpot,
  onTip,
  onReady,
}: {
  progress: MutableRefObject<number>;
  quality: GraphicsQuality;
  mobile: boolean;
  reduceMotion: boolean;
  active: boolean;
  wish: MutableRefObject<Wish>;
  shore: MutableRefObject<boolean>;
  onEnterShore: () => void;
  house: MutableRefObject<HouseState>;
  onEnterHouse: () => void;
  books: number;
  onSpot: (id: string) => void;
  onTip: (id: string | null) => void;
  onReady: () => void;
}) {
  const camDist = useRef(0);
  const indoor = useRef(0); // 0 di luar, 1 di dalam rumah (diatur CameraRig)
  const focus = useRef(newFocus());

  // Resolusi dipilih Boot lewat uji singkat saat loading, lalu dikunci.
  const tiers = useMemo(() => makeTiers(quality, mobile), [quality, mobile]);
  const [tier, setTier] = useState(0);
  const dpr = tiers[Math.min(tier, tiers.length - 1)];
  // MSAA mahal di kartu grafis (isi piksel naik kira-kira 4x di tepi benda). Dipilih per tingkat kualitas:
  // rendah mati; sedang dan tinggi hidup, kecuali layar sangat rapat (render sudah 2x atau lebih, tepi sudah halus).
  // Ini atribut konteks yang hanya terbaca saat kanvas dibuat, jadi kanvas dibuat ulang kalau pilihannya berubah.
  const msaa = quality !== "low" && tiers[0] < 2;
  const refresh = useRef(60);
  const skip = useRef(1);

  // Ikan dan kucing liar dipasang di balik layar loading; Boot menunggu keduanya selesai,
  // lalu kompilasi shader dan unggah ke GPU.
  const [lateParts, setLateParts] = useState(0);
  const markLate = useCallback(() => setLateParts((n) => n + 1), []);
  const lateDone = lateParts >= 2;
  const [booted, setBooted] = useState(false);
  const paused = useRef(false);
  const handleReady = useCallback(() => {
    setBooted(true);
    onReady();
  }, [onReady]);

  return (
    <Canvas
      key={msaa ? "msaa" : "nomsaa"}
      dpr={dpr}
      camera={{ fov: CAMERA.fov, near: 0.1, far: 1600, position: [4, 12, 140] }}
      style={{ touchAction: "pan-y" }}
      gl={{
        antialias: msaa,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      shadows={quality !== "low" && !perfOff("shadow")}
      frameloop="never"
    >
      <ShadowGovernor />
      <PerfStats
        info={`kualitas ${quality}  |  dpr ${dpr}${mobile ? "  |  mobile" : ""}  |  tier ${tier}  |  msaa ${msaa ? "ya" : "tidak"}${perfOffList().length ? `  |  OFF ${perfOffList().join(",")}` : ""}`}
      />
      <FrameDriver
        run={active || !booted}
        paused={paused}
        refresh={refresh}
        skip={skip}
      />
      <Boot
        lateDone={lateDone}
        paused={paused}
        onReady={handleReady}
        active={active}
        tiers={tiers}
        tier={tier}
        onTier={setTier}
        refresh={refresh}
        skip={skip}
      />
      <TimeOfDay
        progress={progress}
        indoor={indoor}
        quality={quality}
        mobile={mobile}
      />
      <CameraRig
        progress={progress}
        camDist={camDist}
        shore={shore}
        focus={focus}
        house={house}
        indoor={indoor}
        reduceMotion={reduceMotion}
      />
      <SoundDriver indoor={indoor} />
      <Insights
        camDist={camDist}
        shore={shore}
        house={house}
        reduceMotion={reduceMotion}
      />

      {/* dunia dasar */}
      <group userData={{ cat: "langit" }}>{!perfOff("sky") && <Sky />}</group>
      {!perfOff("lights") && <LightPool quality={quality} />}
      {!perfOff("fx") && (
        <JourneyFx
          quality={quality}
          camDist={camDist}
          reduceMotion={reduceMotion}
        />
      )}
      <group userData={{ cat: "tanah" }}>
        <Ground quality={quality} />
      </group>
      <group userData={{ cat: "air" }}>{!perfOff("water") && <Water />}</group>
      <group userData={{ cat: "air" }}>
        <Splash />
      </group>

      {/* bab: danau (bab lain menyusul di chapters/) */}
      <group userData={{ cat: "danau" }}>
        <LakeMist quality={quality} reduceMotion={reduceMotion} />
      </group>
      <group userData={{ cat: "danau" }}>
        <LakeWords wish={wish} focus={focus} reduceMotion={reduceMotion} />
      </group>
      <group userData={{ cat: "danau" }}>
        <ShoreMarker progress={progress} shore={shore} onEnter={onEnterShore} />
      </group>
      <group userData={{ cat: "danau" }}>
        <Pier />
      </group>

      <IndoorHide indoor={indoor} house={house}>
        {/* bab: desa luar */}
        <group userData={{ cat: "desa" }}>
          <Village quality={quality} />
        </group>
      </IndoorHide>

      {/* pohon */}
      <SafeBoundary>
        <Suspense fallback={null}>
          <Trees quality={quality} />
        </Suspense>
      </SafeBoundary>

      <IndoorHide indoor={indoor} house={house}>
        {/* bab: kastil */}
        <group userData={{ cat: "kastil" }}>
          <Castle quality={quality} />
        </group>

        {/* bab: kota dalam kastil */}
        <group userData={{ cat: "kota" }}>
          <City quality={quality} />
        </group>

        {/* bab: istana */}
        <group userData={{ cat: "istana" }}>
          <Palace quality={quality} />
        </group>
      </IndoorHide>

      {/* bab: rumah kita */}
      <group userData={{ cat: "rumah" }}>
        <Home
          quality={quality}
          reduceMotion={reduceMotion}
          house={house}
          indoor={indoor}
          onEnter={onEnterHouse}
          books={books}
          onSpot={onSpot}
          onTip={onTip}
        />
      </group>

      <IndoorHide indoor={indoor} house={house}>
        {/* bab: Gerbang Waktu */}
        <SafeBoundary>
          <Suspense fallback={null}>
            <group userData={{ cat: "rune" }}>
              <RuneCircle />
            </group>
          </Suspense>
        </SafeBoundary>
      </IndoorHide>

      <SafeBoundary onSettle={markLate}>
        <Suspense fallback={null}>
          <Settled onSettle={markLate} />
          <group userData={{ cat: "ikan" }}>
            <Fish quality={quality} reduceMotion={reduceMotion} />
          </group>
        </Suspense>
      </SafeBoundary>

      <SafeBoundary>
        <Suspense fallback={null}>
          <group userData={{ cat: "kucing" }}>
            <Cat camDist={camDist} reduceMotion={reduceMotion} />
          </group>
        </Suspense>
      </SafeBoundary>

      <SafeBoundary onSettle={markLate}>
        <Suspense fallback={null}>
          <group userData={{ cat: "kucing" }}>
            <StrayCats quality={quality} reduceMotion={reduceMotion} />
          </group>
          <Settled onSettle={markLate} />
        </Suspense>
      </SafeBoundary>
      {/* naga dan burung: tidak digambar selagi di dalam rumah */}
      <IndoorHide indoor={indoor} house={house} creatures>
        <SafeBoundary>
          <Suspense fallback={null}>
            <group userData={{ cat: "naga" }}>
              <MountainDragon />
            </group>
          </Suspense>
        </SafeBoundary>

        <SafeBoundary>
          <Suspense fallback={null}>
            <group userData={{ cat: "wyvern" }}>
              <Wyvern />
            </group>
          </Suspense>
        </SafeBoundary>

        <SafeBoundary>
          <Suspense fallback={null}>
            <group userData={{ cat: "wyvern" }}>
              <Wyvern variant={1} />
            </group>
          </Suspense>
        </SafeBoundary>

        <SafeBoundary>
          <Suspense fallback={null}>
            <group userData={{ cat: "burung" }}>
              <Birds />
            </group>
          </Suspense>
        </SafeBoundary>
      </IndoorHide>
    </Canvas>
  );
}
