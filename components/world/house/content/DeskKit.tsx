"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CONTACTS, CVS } from "@/content/contact";
import { desk as deskText } from "@/content/world";
import { Box, Shade } from "../rooms/parts";
import type { ContentItem } from "./contentLayout";
import {
  DESK_TOP,
  DESK_Z,
  SPOT,
  ZONES,
  type DeskState,
  type DeskStation,
} from "./deskLayout";
import { usePhoto } from "./PhotoWall";
import { Tip, useHover } from "./Tip";

type V3 = [number, number, number];

function openLink(href: string) {
  if (href.startsWith("mailto:")) window.location.href = href;
  else window.open(href, "_blank", "noopener,noreferrer");
}

// Benda yang bisa disentuh: terangkat dan membesar pelan (dihaluskan tiap frame).
function Pop({
  pos,
  yaw = 0,
  hit,
  lift = 0.035,
  grow = 1.07,
  tip,
  tipY = 0.3,
  onClick,
  children,
}: {
  pos: V3;
  yaw?: number;
  hit: V3;
  lift?: number;
  grow?: number;
  tip: string;
  tipY?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const [hover, h] = useHover();
  const g = useRef<THREE.Group>(null);
  const k = useRef(0);
  const press = useRef(0);
  const down = useRef(false);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    // pointerup bisa jatuh di luar benda (mis. setelah menyeret kamera): jangan biarkan "tertekan" menempel
    if (!hover) down.current = false;
    k.current = THREE.MathUtils.damp(k.current, hover ? 1 : 0, 9, d);
    press.current = THREE.MathUtils.damp(
      press.current,
      down.current && hover ? 1 : 0,
      22,
      d,
    );
    if (!g.current) return;
    // terangkat saat disentuh, turun sedikit saat ditekan, dan miring tipis seperti diangkat jari
    g.current.position.y = k.current * lift - press.current * lift * 0.7;
    g.current.rotation.x = -k.current * 0.05;
    g.current.scale.setScalar(
      (1 + (grow - 1) * k.current) * (1 - 0.025 * press.current),
    );
  });
  return (
    <group
      position={pos}
      rotation-y={yaw}
      {...h}
      onPointerDown={(e) => {
        e.stopPropagation();
        down.current = true;
      }}
      onPointerUp={() => {
        down.current = false;
      }}
      onPointerOut={() => {
        down.current = false;
        h.onPointerOut();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh position={[0, hit[1] / 2, 0]}>
        <boxGeometry args={hit} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={g}>{children}</group>
      {hover && <Tip position={[0, tipY, 0]}>{tip}</Tip>}
    </group>
  );
}

// Font dunia 3D = font situs (IM Fell English) lewat variabel CSS next/font. Sebelumnya canvas
// memakai 'Public Sans' dan 'Bodoni Moda' yang tidak pernah dimuat, jadi teks di kartu dan map
// jatuh ke font sistem dan tampil kecil serta tidak seragam.
const face = () => {
  const v =
    typeof document === "undefined"
      ? ""
      : getComputedStyle(document.documentElement)
          .getPropertyValue("--font-fell")
          .trim();
  return `${v ? `${v}, ` : ""}Georgia, serif`;
};

function useCanvasTexture(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const { tex, ctx } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d")!;
    drawRef.current(ctx, w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { tex: t, ctx };
  }, [w, h]);
  // Gambar ulang begitu font benar-benar siap, supaya tidak terkunci di font cadangan.
  useEffect(() => {
    let alive = true;
    const redraw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h);
      tex.needsUpdate = true;
    };
    const f = face();
    Promise.all([
      document.fonts.load(`40px ${f}`),
      document.fonts.load(`italic 40px ${f}`),
    ])
      .then(redraw)
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ctx, tex, w, h]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

// Foto dipotong pas ke bidang, tidak gepeng.
function Cropped({
  url,
  w,
  h,
  pos,
  fallback = "#3a4a6a",
}: {
  url?: string;
  w: number;
  h: number;
  pos: V3;
  fallback?: string;
}) {
  const src = usePhoto(url);
  const fit = useMemo(() => {
    if (!src) return null;
    const img = src.image as { width?: number; height?: number };
    if (!img?.width || !img?.height) return null;
    const a = img.width / img.height;
    const want = w / h;
    const t = src.clone();
    t.needsUpdate = true;
    t.colorSpace = THREE.SRGBColorSpace;
    if (a > want) {
      t.repeat.set(want / a, 1);
      t.offset.set((1 - want / a) / 2, 0);
    } else {
      t.repeat.set(1, a / want);
      t.offset.set(0, (1 - a / want) / 2);
    }
    return t;
  }, [src, w, h]);
  useEffect(() => () => fit?.dispose(), [fit]);
  return (
    <mesh position={pos} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        key={fit ? "foto" : "kosong"}
        color={fit ? "#f3ecdd" : fallback}
        map={fit ?? undefined}
      />
    </mesh>
  );
}

// Album foto: foto kebanyakan tidak dipajang satu-satu, cukup satu album. Klik = kamar gelap.
function Album({
  photos,
  onOpen,
}: {
  photos: ContentItem[];
  onOpen: (href: string) => void;
}) {
  const label = useCanvasTexture(384, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f0cf8c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `italic 64px ${face()}`;
    ctx.shadowColor = "rgba(30,15,5,0.7)";
    ctx.shadowBlur = 4;
    ctx.fillText("Album", w / 2, h / 2);
  });
  const polaroids = photos.slice(1, 4);
  const cover = photos[0];
  return (
    <Pop
      pos={[SPOT.album.x, DESK_TOP, SPOT.album.z]}
      yaw={-0.08}
      hit={[0.5, 0.12, 0.5]}
      tip={deskText.tips.album(photos.length)}
      tipY={0.28}
      onClick={() => onOpen("/kage")}
    >
      <Shade pos={[0.01, 0.002, 0.01]} w={0.52} d={0.42} o={0.55} />
      {polaroids.map((p, i) => (
        <group
          key={p.id}
          position={[-0.1 + i * 0.1, 0.004 + i * 0.002, 0.2 - (i % 2) * 0.012]}
          rotation-y={[0.22, -0.1, 0.16][i]}
        >
          <Box pos={[0, 0, 0]} size={[0.105, 0.003, 0.125]} color="#f1ece0" />
          <Cropped url={p.image} w={0.085} h={0.085} pos={[0, 0.0025, -0.01]} />
        </group>
      ))}
      <Box
        pos={[0, 0.026, 0]}
        size={[0.36, 0.05, 0.27]}
        color="#5a3a26"
        grain="fabric"
      />
      <Box pos={[0.005, 0.02, 0]} size={[0.35, 0.036, 0.255]} color="#efe6d0" />
      <Box
        pos={[-0.17, 0.027, 0]}
        size={[0.03, 0.054, 0.272]}
        color="#3f281a"
        grain="fabric"
      />
      <Box
        pos={[0.01, 0.0525, -0.015]}
        size={[0.215, 0.003, 0.155]}
        color="#d9b878"
      />
      <Cropped
        url={cover?.image}
        w={0.2}
        h={0.14}
        pos={[0.01, 0.0545, -0.015]}
      />
      <mesh position={[0.01, 0.0525, 0.1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.2, 0.05]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
    </Pop>
  );
}

// Map CV
function Folder({
  cv,
  index,
  yaw,
  z,
}: {
  cv: (typeof CVS)[number];
  index: number;
  yaw: number;
  z: number;
}) {
  const manila = index === 0 ? "#c8a15e" : "#5d7d70";
  const ink = index === 0 ? "#3b2a12" : "#eef3ee";
  const tex = useCanvasTexture(512, 170, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `84px ${face()}`;
    ctx.fillText(cv.title, 22, 56);
    ctx.font = `italic 52px ${face()}`;
    ctx.fillText(cv.sub, 22, 128, w - 150);
    ctx.textAlign = "right";
    ctx.globalAlpha = 0.75;
    ctx.font = `34px ${face()}`;
    ctx.fillText("PDF", w - 22, 40);
  });
  return (
    <Pop
      pos={[SPOT.cv.x + (index ? 0.03 : -0.03), DESK_TOP + index * 0.014, z]}
      yaw={yaw}
      hit={[0.3, 0.1, 0.36]}
      lift={0.03}
      tip={index === 0 ? deskText.tips.cvWriter : deskText.tips.cvMarketing}
      tipY={0.24}
      onClick={() => openLink(cv.href)}
    >
      <Shade pos={[0.01, 0.002, 0.012]} w={0.38} d={0.46} o={0.5} />
      <Box pos={[0, 0.006, 0]} size={[0.25, 0.012, 0.33]} color={manila} />
      <Box
        pos={[-0.07, 0.006, -0.18]}
        size={[0.1, 0.012, 0.04]}
        color={manila}
      />
      <mesh position={[0, 0.014, -0.095]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.225, 0.075]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
    </Pop>
  );
}

function CvFolders() {
  return (
    <group>
      <Folder cv={CVS[0]} index={0} yaw={0.12} z={SPOT.cv.z - 0.07} />
      <Folder cv={CVS[1]} index={1} yaw={-0.09} z={SPOT.cv.z + 0.07} />
    </group>
  );
}

// Kartu kontak
function ContactCard({ c, x }: { c: (typeof CONTACTS)[number]; x: number }) {
  const tex = useCanvasTexture(384, 576, (ctx, w, h) => {
    ctx.fillStyle = "#f4ecda";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#b09a74";
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, w - 56, h - 56);
    ctx.fillStyle = "#1c1730";
    ctx.beginPath();
    ctx.arc(w / 2, 220, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffc27a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${c.glyph.length > 1 ? 104 : 128}px ${face()}`;
    ctx.fillText(c.glyph, w / 2, 226);
    ctx.fillStyle = "#1c1730";
    ctx.font = `italic 78px ${face()}`;
    ctx.fillText(c.label, w / 2, 410, w - 64);
    ctx.fillStyle = "#4a4234";
    ctx.font = `38px ${face()}`;
    ctx.fillText(c.handle, w / 2, 490, w - 64);
  });
  return (
    <Pop
      pos={[x, DESK_TOP, SPOT.cards.z]}
      hit={[0.14, 0.15, 0.2]}
      lift={0.03}
      grow={1.1}
      tip={deskText.tips.contact(c.label)}
      tipY={0.22}
      onClick={() => openLink(c.href)}
    >
      <mesh position={[0, 0.062, -0.012]} rotation-x={-1.0}>
        <planeGeometry args={[0.112, 0.168]} />
        <meshBasicMaterial map={tex} color="#efe9da" side={THREE.DoubleSide} />
      </mesh>
    </Pop>
  );
}

function Contacts() {
  const xs = CONTACTS.map((_, i) => SPOT.cards.x + (i - 1.5) * 0.14);
  return (
    <group>
      <Shade
        pos={[SPOT.cards.x, DESK_TOP + 0.002, SPOT.cards.z + 0.01]}
        w={0.78}
        d={0.34}
        o={0.5}
      />
      <Box
        pos={[SPOT.cards.x, DESK_TOP + 0.012, SPOT.cards.z + 0.045]}
        size={[0.6, 0.024, 0.045]}
        color="#6a4c30"
        grain="wood"
      />
      <Box
        pos={[SPOT.cards.x, DESK_TOP + 0.006, SPOT.cards.z - 0.01]}
        size={[0.6, 0.012, 0.15]}
        color="#4a3626"
        grain="wood"
      />
      {CONTACTS.map((c, i) => (
        <ContactCard key={c.id} c={c} x={xs[i]} />
      ))}
    </group>
  );
}

// Label zona melayang di atas meja, hanya saat melihat seluruh meja di layar lebar.
function ZoneLabels({ desk }: { desk: MutableRefObject<DeskState> }) {
  const wide = useThree((s) => s.size.width / s.size.height >= 1.15);
  const [show, setShow] = useState(false);
  const last = useRef(false);
  useFrame(() => {
    const d = desk.current;
    const v = d.active && d.station === "overview" && d.w > 0.95;
    if (v !== last.current) {
      last.current = v;
      setShow(v);
    }
  });
  const zones: DeskStation[] = ["cv", "tulisan", "foto", "kontak"];
  return (
    <group>
      {zones.map((id) => (
        <Html
          key={id}
          position={[ZONES[id].x, DESK_TOP + 0.34, DESK_Z]}
          center
          zIndexRange={[4, 0]}
          style={{
            opacity: show && wide ? 1 : 0,
            pointerEvents: show && wide ? "auto" : "none",
            transition: "opacity 0.6s ease",
          }}
        >
          <button
            type="button"
            tabIndex={show && wide ? 0 : -1}
            onClick={() => {
              desk.current.station = id;
            }}
            className="whitespace-nowrap rounded-full border border-[#fff3e0]/45 bg-[#120d24]/75 px-4 py-1.5 font-display text-base italic text-[#fff3e0] shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-colors hover:border-[#ffb866] hover:text-[#ffb866] focus-visible:border-[#ffb866]"
          >
            {ZONES[id].label}
          </button>
        </Html>
      ))}
    </group>
  );
}

export default function DeskKit({
  photos,
  desk,
  onOpen,
}: {
  photos: ContentItem[];
  desk: MutableRefObject<DeskState>;
  onOpen: (href: string) => void;
}) {
  return (
    <group>
      <Album photos={photos} onOpen={onOpen} />
      <CvFolders />
      <Contacts />
      <ZoneLabels desk={desk} />
    </group>
  );
}
