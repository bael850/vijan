"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SONGS, SONG_VOLUME } from "../../config/content";
import { H } from "../houseLayout";
import { Box, Cyl, WOOD, WOOD_DARK } from "../rooms/parts";
import { RECORD } from "./contentLayout";
import { Tip, useHover } from "./Tip";
import { record } from "@/content/world";

const FY = H.floorY;

// Pemutar piringan hitam di ruang tamu. Klik pemutarnya untuk memutar atau menjeda lagu,
// klik tombol merah kecil untuk lagu berikutnya. Lagu dari public/music (lihat config/content.ts).
export default function RecordPlayer({
  reduceMotion,
}: {
  reduceMotion: boolean;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const idx = useRef(0);
  const disc = useRef<THREE.Group>(null);
  const [song, setSong] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hoverBodyRaw, bodyH] = useHover();
  const [hoverNextRaw, nextH] = useHover();
  // Pemutar ada di lantai bawah. Dari lantai atas tidak boleh bisa disentuh atau terlihat labelnya
  // (raycast R3F menembus lantai karena lantai tidak punya event handler).
  const [upstairs, setUpstairs] = useState(false);
  const upRef = useRef(false);
  const hoverBody = hoverBodyRaw && !upstairs;
  const hoverNext = hoverNextRaw && !upstairs;
  const guard =
    <E,>(fn: (e: E) => void) =>
    (e: E) => {
      if (upRef.current) return;
      fn(e);
    };

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );

  useFrame(({ camera }, dt) => {
    const up = camera.position.y > H.floor2Y + 0.5;
    if (up !== upRef.current) {
      upRef.current = up;
      setUpstairs(up);
    }
    if (playing && !reduceMotion && disc.current) {
      disc.current.rotation.y -= Math.min(dt, 0.05) * 3.5;
    }
  });

  if (SONGS.length === 0) return null;

  // Mulai memutar lagu ke-i. Harus dipanggil dari klik pengunjung (aturan autoplay browser).
  function start(i: number) {
    idx.current = i;
    setSong(i);
    setFailed(false);
    let a = audio.current;
    if (!a) {
      a = new Audio();
      a.volume = SONG_VOLUME;
      a.onended = () => start((idx.current + 1) % SONGS.length);
      a.onerror = () => {
        setFailed(true);
        setPlaying(false);
      };
      audio.current = a;
    }
    a.src = SONGS[i].src;
    a.play()
      .then(() => setPlaying(true))
      .catch(() => {
        setFailed(true);
        setPlaying(false);
      });
  }

  function toggle() {
    const a = audio.current;
    if (!a || !a.src || failed) return start(idx.current);
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setFailed(true));
    }
  }

  const { x, z } = RECORD;
  const label = failed
    ? record.notFound
    : playing
      ? record.nowPlaying(SONGS[song].title)
      : record.play;

  return (
    <group>
      {/* badan pemutar: lemari kayu, menghadap ke dalam ruangan (-z) */}
      <group
        {...bodyH}
        onPointerOver={guard(bodyH.onPointerOver)}
        onClick={guard((e) => {
          e.stopPropagation();
          toggle();
        })}
      >
        <Box pos={[x, FY + 0.4, z]} size={[1.2, 0.8, 0.7]} color={WOOD} />
        <Box
          pos={[x, FY + 0.38, z - 0.36]}
          size={[0.6, 0.4, 0.02]}
          color="#2b2724"
        />
        <Box
          pos={[x, FY + 0.83, z]}
          size={[1.12, 0.06, 0.62]}
          color={WOOD_DARK}
        />
        <Cyl
          pos={[x - 0.12, FY + 0.87, z]}
          r={0.28}
          h={0.03}
          color="#1a1a1a"
          seg={24}
        />
        <group ref={disc} position={[x - 0.12, FY + 0.89, z]}>
          <Cyl pos={[0, 0, 0]} r={0.26} h={0.012} color="#0d0d0d" seg={32} />
          <Cyl
            pos={[0, 0.003, 0]}
            r={0.075}
            h={0.014}
            color="#b4543a"
            seg={16}
          />
          <Box
            pos={[0.14, 0.01, 0]}
            size={[0.1, 0.004, 0.012]}
            color="#3a3a3a"
          />
        </group>
        {/* lengan jarum */}
        <Cyl
          pos={[x + 0.4, FY + 0.89, z + 0.2]}
          r={0.035}
          h={0.06}
          color="#8a8a8a"
        />
        <Box
          pos={[x + 0.24, FY + 0.93, z + 0.1]}
          size={[0.02, 0.02, 0.36]}
          color="#b8b8b8"
          rot={[0, 0.5, 0]}
        />
        {hoverBody && !hoverNext && (
          <Tip position={[x, FY + 1.35, z]}>{label}</Tip>
        )}
      </group>

      {SONGS.length > 1 && (
        <group
          {...nextH}
          onPointerOver={guard(nextH.onPointerOver)}
          onClick={guard((e) => {
            e.stopPropagation();
            start((idx.current + 1) % SONGS.length);
          })}
        >
          <Box
            pos={[x + 0.45, FY + 0.88, z - 0.22]}
            size={[0.1, 0.04, 0.06]}
            color="#b4543a"
          />
          {hoverNext && (
            <Tip position={[x + 0.45, FY + 1.2, z]}>{record.next}</Tip>
          )}
        </group>
      )}

      {playing && !hoverBody && !upstairs && (
        <Tip position={[x, FY + 1.35, z]}>{label}</Tip>
      )}
    </group>
  );
}
