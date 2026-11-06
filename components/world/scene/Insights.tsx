"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  SKY,
  TRIVIA_SPOTS,
  type TriviaId,
  type TriviaSpot,
} from "../config/trivia";
import { dayState } from "../core/dayCycle";
import { groundHeight } from "../terrain/heightmap";
import { isBlocked } from "../core/solids";
import type { HouseState } from "../chapters/home/houseState";
import { trivia, triviaKinds } from "@/content/trivia";
import { LogoRow, STACK_LOGOS } from "./stackLogos";

// Info yang timbul dari benda di dunia. Syarat muncul ada di config/trivia.ts.
// Tampilannya: titik cahaya kuning (kuning = bisa diklik) di bendanya, lalu melebar jadi teks. Tombol × melipatnya
// kembali jadi titik; klik titik untuk membuka lagi. Tanpa kotak kartu.

const SPOTS: readonly TriviaSpot[] = TRIVIA_SPOTS;

type Live = { id: TriviaId; pos: THREE.Vector3; side: "l" | "r" };

const SHADOW = "0 1px 4px rgba(8,13,34,0.9), 0 2px 22px rgba(8,13,34,0.9)";

// Irama muncul. Satu info saja pada satu waktu; info yang sedang tampil dipertahankan selama syaratnya masih
// terpenuhi, jadi tidak ada rebutan. Setelah sebuah info selesai, ada jeda sebelum info berikutnya boleh muncul.
const GAP_MS = 900; // jeda antar info
const MIN_SHOW_MS = 2500; // info prioritas tinggi baru boleh menggantikan setelah sekian lama
const BLOCK_EVERY = 6; // cek terhalang tiap sekian putaran (satu putaran = 4 frame)
const BLOCK_GRACE = 2; // terhalang sekian kali berturut-turut baru disembunyikan (cegah kedip)

export default function Insights({
  camDist,
  shore,
  house,
  reduceMotion,
}: {
  camDist: MutableRefObject<number>;
  shore: MutableRefObject<boolean>;
  house: MutableRefObject<HouseState>;
  reduceMotion: boolean;
}) {
  const [live, setLive] = useState<Live | null>(null);
  const [on, setOn] = useState(false); // untuk memudar masuk/keluar
  const [folded, setFolded] = useState<Set<TriviaId>>(() => new Set());
  const tick = useRef(0);
  const cur = useRef<TriviaId | null>(null);
  const shownAt = useRef(0);
  const endedAt = useRef(-1e9);
  const blockedRun = useRef(0);
  const blockMemo = useRef(new Map<string, { at: number; v: boolean }>());
  const t = useRef({
    fwd: new THREE.Vector3(),
    to: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    ndc: new THREE.Vector3(),
  });
  const hideTimer = useRef<number | undefined>(undefined);
  // Posisi layar dihaluskan dan dibulatkan ke piksel utuh: teks yang mengikuti titik 3D tidak bergetar
  // oleh goyang halus kamera (bob, sway) dan huruf tetap tajam.
  const scr = useRef({ x: 0, y: 0, t: 0, init: false });
  const tmpV = useRef(new THREE.Vector3());
  const place = useCallback(
    (
      el: THREE.Object3D,
      camera: THREE.Camera,
      size: { width: number; height: number },
    ) => {
      const v = tmpV.current
        .setFromMatrixPosition(el.matrixWorld)
        .project(camera);
      const tx = (v.x * 0.5 + 0.5) * size.width;
      const ty = (-v.y * 0.5 + 0.5) * size.height;
      const q = scr.current;
      const now = performance.now();
      const dt = Math.min(0.05, (now - q.t) / 1000);
      q.t = now;
      if (!q.init || Math.abs(tx - q.x) > size.width) {
        q.x = tx;
        q.y = ty;
        q.init = true;
      } else {
        const k = 1 - Math.exp(-18 * dt);
        q.x += (tx - q.x) * k;
        q.y += (ty - q.y) * k;
      }
      return [Math.round(q.x), Math.round(q.y)];
    },
    [],
  );

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  useFrame(({ camera }) => {
    tick.current += 1;
    if (tick.current % 4 !== 0) return;
    const { fwd, to, pos, ndc } = t.current;
    const away = shore.current || house.current.mode !== "out";
    camera.getWorldDirection(fwd);
    const along = camDist.current;

    const now = performance.now();
    const eligible = (sp: TriviaSpot): number => {
      // skor kecocokan; -1 kalau syarat belum terpenuhi
      if (away) return -1;
      if (sp.along && (along < sp.along[0] || along > sp.along[1])) return -1;
      if (sp.night && dayState.daylight > SKY.night) return -1;
      if (sp.sky) {
        const need = cur.current === sp.id ? SKY.upKeep : SKY.up;
        return fwd.y < need ? -1 : 0.9;
      }
      if (!sp.at) return -1;
      const y = sp.y ?? groundHeight(sp.at[0], sp.at[1]) + (sp.h ?? 2);
      pos.set(sp.at[0], y, sp.at[1]);
      to.copy(pos).sub(camera.position);
      const d = to.length();
      const r = cur.current === sp.id ? sp.r * 1.15 : sp.r; // sudah tampil: sedikit lebih longgar
      if (d > r || d < 0.5) return -1;
      const cos = fwd.dot(to.divideScalar(d));
      const need = (sp.face ?? 0.5) - (cur.current === sp.id ? 0.1 : 0);
      return cos < need ? -1 : cos;
    };

    // terhalang tembok atau rumah? hasilnya diingat sebentar karena pengecekannya paling mahal
    const hidden = (sp: TriviaSpot): boolean => {
      if (sp.sky || !sp.at) return false;
      const m = blockMemo.current.get(sp.id);
      if (m && tick.current - m.at < BLOCK_EVERY) return m.v;
      const y = sp.y ?? groundHeight(sp.at[0], sp.at[1]) + (sp.h ?? 2);
      pos.set(sp.at[0], y, sp.at[1]);
      const v = isBlocked(camera.position, pos);
      blockMemo.current.set(sp.id, { at: tick.current, v });
      return v;
    };

    const prio = (sp: TriviaSpot) => sp.prio ?? 1;
    const curSp = cur.current
      ? SPOTS.find((x) => x.id === cur.current)
      : undefined;

    // 1) info yang sedang tampil: tetap selama masih memenuhi syarat dan tidak terhalang
    let keep = false;
    if (curSp) {
      if (eligible(curSp) >= 0) {
        if (hidden(curSp)) {
          blockedRun.current += 1;
          keep = blockedRun.current < BLOCK_GRACE;
        } else {
          blockedRun.current = 0;
          keep = true;
        }
      }
    }

    // 2) cari penggantinya (atau yang pertama) kalau yang sekarang sudah tidak berlaku
    let bestId: TriviaId | null = keep ? (cur.current as TriviaId) : null;
    if (keep && curSp && now - shownAt.current >= MIN_SHOW_MS) {
      // yang tampil boleh digeser hanya oleh yang prioritasnya lebih tinggi
      for (const sp of SPOTS) {
        if (sp.id === curSp.id || prio(sp) <= prio(curSp)) continue;
        if (eligible(sp) >= 0 && !hidden(sp)) {
          bestId = sp.id as TriviaId;
          break;
        }
      }
    }
    if (!keep && now - endedAt.current >= GAP_MS) {
      let bestScore = -Infinity;
      for (const sp of SPOTS) {
        const s0 = eligible(sp);
        if (s0 < 0) continue;
        const score = prio(sp) * 10 + s0;
        if (score <= bestScore) continue;
        if (hidden(sp)) continue;
        bestScore = score;
        bestId = sp.id as TriviaId;
      }
    }

    if (bestId === cur.current) return;
    if (cur.current) endedAt.current = now;
    cur.current = bestId;
    shownAt.current = now;
    blockedRun.current = 0;
    window.clearTimeout(hideTimer.current);
    if (!bestId) {
      setOn(false);
      hideTimer.current = window.setTimeout(() => setLive(null), 900);
      return;
    }
    const sp = SPOTS.find((x) => x.id === bestId)!;
    const p = new THREE.Vector3();
    if (sp.sky) {
      // titik di langit searah pandangan sekarang, dikunci selama info tampil
      const hl = Math.hypot(fwd.x, fwd.z) || 1;
      p.set(
        (fwd.x / hl) * Math.cos(SKY.lift),
        Math.sin(SKY.lift),
        (fwd.z / hl) * Math.cos(SKY.lift),
      )
        .multiplyScalar(SKY.far)
        .add(camera.position);
    } else if (sp.at) {
      p.set(
        sp.at[0],
        sp.y ?? groundHeight(sp.at[0], sp.at[1]) + (sp.h ?? 2),
        sp.at[1],
      );
    }
    // teks dibuka ke arah tengah layar
    ndc.copy(p).project(camera);
    const side: "l" | "r" = ndc.x > 0.1 ? "l" : "r";
    scr.current.init = false;
    setLive({ id: bestId, pos: p, side });
    setOn(false);
    // memudar masuk di frame berikutnya
    window.setTimeout(() => setOn(true), 30);
  });

  if (!live) return null;
  const open = on && !folded.has(live.id);
  const info = trivia[live.id];
  const kind = SPOTS.find((x) => x.id === live.id)!.kind;
  const left = live.side === "l";
  const dur = reduceMotion ? "0ms" : "900ms";

  const toggle = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setFolded((f) => {
      const n = new Set(f);
      if (n.has(live.id)) n.delete(live.id);
      else n.add(live.id);
      return n;
    });
  };

  return (
    <Html
      key={live.id}
      position={live.pos}
      center
      calculatePosition={place}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        style={{
          opacity: on ? 1 : 0,
          transition: `opacity ${dur} ease-out`,
        }}
      >
        {/* titik cahaya: tombol buka/lipat */}
        <button
          type="button"
          onClick={toggle}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={open ? "Lipat info" : `Buka info: ${info.title}`}
          aria-expanded={open}
          className="pointer-events-auto relative block h-4 w-4 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c04a]"
        >
          {!reduceMotion && !open && (
            <span className="absolute inset-0 animate-ping rounded-full bg-[#f5c04a] opacity-60" />
          )}
          <span
            className="absolute inset-0 rounded-full bg-[#f5c04a]"
            style={{ boxShadow: "0 0 14px 3px rgba(245,192,74,0.75)" }}
          />
        </button>

        {/* teks yang melebar dari titik */}
        <div
          className="absolute top-1/2 w-[17rem] max-w-[calc(100vw-3rem)] -translate-y-1/2 text-[#f3ecd6]"
          style={{
            [left ? "right" : "left"]: "1.6rem",
            textAlign: left ? "right" : "left",
            clipPath: open
              ? "inset(-20px -20px -20px -20px)"
              : left
                ? "inset(0 0 0 100%)"
                : "inset(0 100% 0 0)",
            opacity: open ? 1 : 0,
            transition: `clip-path ${dur} ease-out, opacity ${dur} ease-out`,
            pointerEvents: open ? "auto" : "none",
            textShadow: SHADOW,
          }}
        >
          <div
            aria-hidden
            className="absolute -inset-5 -z-10"
            style={{
              background:
                "radial-gradient(closest-side, rgba(8,13,34,0.72) 55%, transparent)",
            }}
          />
          {STACK_LOGOS[live.id] && (
            <LogoRow ids={STACK_LOGOS[live.id]!} align={live.side} />
          )}
          <p className="mb-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-[#f3ecd6]/70">
            {triviaKinds[kind]}
          </p>
          <h3 className="font-display text-xl font-medium italic leading-tight">
            {info.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-[#f3ecd6]/90">
            {info.body}
          </p>
          <button
            type="button"
            onClick={toggle}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Tutup info"
            className="absolute -top-4 flex h-7 w-7 items-center justify-center rounded-full border border-[#f3ecd6]/80 bg-[#0e1530] text-base leading-none text-[#f3ecd6] shadow-[0_0_0_2px_rgba(8,13,34,0.55)] hover:border-[#f5c04a] hover:text-[#f5c04a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c04a]"
            style={{ [left ? "left" : "right"]: "-0.6rem", textShadow: "none" }}
          >
            ×
          </button>
        </div>
      </div>
    </Html>
  );
}
