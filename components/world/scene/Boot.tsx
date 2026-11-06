"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import type * as THREE from "three";
import { loader } from "@/content/world";
import { loadStore } from "../loading/loadStore";
import { setCreatureCull } from "../core/creatureCull";

// Nama berkas -> nama yang enak dibaca di layar loading.
function friendly(url: string): string {
  const m = /\/([^/?#]+)\.(glb|gltf)/i.exec(url);
  if (m) return loader.files[m[1].toLowerCase()] ?? m[1];
  return loader.photo;
}

// Urutan persiapan sebelum pengunjung boleh masuk:
// 1. semua model, gambar, dan bagian desa/rumah dimuat (di balik layar loading)
// 2. semua shader dikompilasi
// 3. semua geometri dan tekstur diunggah ke GPU (satu kali gambar tanpa culling)
// Setelahnya tidak ada lagi yang dimuat atau dikompilasi di tengah perjalanan,
// jadi gerakan tidak patah-patah.
function median(a: number[]) {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}

export default function Boot({
  lateDone,
  paused,
  onReady,
  active,
  tiers,
  tier,
  onTier,
  refresh,
  skip,
}: {
  lateDone: boolean;
  paused: React.MutableRefObject<boolean>;
  onReady: () => void;
  active: boolean;
  tiers: number[];
  tier: number;
  onTier: (i: number) => void;
  refresh: React.MutableRefObject<number>;
  skip: React.MutableRefObject<number>;
}) {
  const { gl, scene, camera } = useThree();
  const { active: busy, loaded, total, item } = useProgress();
  const [framed, setFramed] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [phase, setPhase] = useState<
    "load" | "compile" | "upload" | "tune" | "live"
  >("load");
  const frames = useRef(0);
  const culled = useRef<THREE.Object3D[]>([]);
  const bench = useRef({ settle: 12, samples: [] as number[], strikes: 0 });

  // langkah: dunia luar siap setelah beberapa frame pertama tergambar
  useFrame((_, delta) => {
    frames.current += 1;
    if (!framed && frames.current >= 6) {
      setFramed(true);
      loadStore.step("world", "done", "Siap");
    }
    if (phase === "upload" && frames.current >= 4) {
      // kembalikan culling; dunia sudah ada di GPU
      for (const o of culled.current) o.frustumCulled = true;
      culled.current = [];
      gl.shadowMap.needsUpdate = true;
      loadStore.step("gpu", "done", "Siap");
      loadStore.step("tune", "run", "Mengukur…", 0.2);
      loadStore.say(loader.say.tune);
      setPhase("tune");
      return;
    }

    // Sasaran frame sesuai layar: 60 fps, atau refresh rate dibagi kelipatan bulatnya
    const target = Math.max(1000 / (refresh.current / skip.current), 16.7);
    const b = bench.current;
    if (phase === "tune") {
      // uji singkat: kalau tidak sanggup, turunkan resolusi satu tingkat lalu ukur lagi
      if (b.settle > 0) {
        b.settle -= 1;
        return;
      }
      if (delta < 0.25) b.samples.push(delta * 1000);
      if (b.samples.length >= 40) {
        const slow = median(b.samples) > target * 1.35;
        b.samples = [];
        if (slow && tier < tiers.length - 1) {
          onTier(tier + 1);
          b.settle = 12;
          loadStore.step(
            "tune",
            "run",
            "Menyesuaikan resolusi…",
            0.2 + 0.2 * (tier + 1),
          );
        } else {
          setPhase("live");
        }
      }
      return;
    }
    if (phase === "live" && active) {
      // setelah masuk: hanya turun kalau terus-menerus berat (dua jendela berturut-turut)
      if (delta < 0.25) b.samples.push(delta * 1000);
      if (b.samples.length >= 150) {
        const slow = median(b.samples) > target * 1.6;
        b.samples = [];
        b.strikes = slow ? b.strikes + 1 : 0;
        if (b.strikes >= 2 && tier < tiers.length - 1) {
          onTier(tier + 1);
          b.strikes = 0;
        }
      }
    }
  });

  // laporan unduhan
  useEffect(() => {
    loadStore.step(
      "world",
      framed ? "done" : "run",
      framed ? "Siap" : "Membangun…",
    );
    const name = busy && item ? friendly(item) : "";
    if (!assetsReady) {
      if (!framed) loadStore.say(loader.say.world);
      else if (name) loadStore.say(loader.say.file(name));
      else if (!lateDone) loadStore.say(loader.say.village);
      else loadStore.say(loader.say.assets);
    }
    const frac = total > 0 ? loaded / total : 0;
    if (!assetsReady)
      loadStore.step(
        "assets",
        "run",
        total > 0
          ? `${loaded}/${total}${name ? ` · ${name}` : ""}`
          : "Memeriksa…",
        frac * 0.95,
      );
    loadStore.step(
      "village",
      lateDone ? "done" : "run",
      lateDone ? "Siap" : "Memasang desa dan rumah…",
      lateDone ? 1 : 0.4,
    );
  }, [busy, loaded, total, item, framed, lateDone, assetsReady]);

  // semua selesai dimuat? tunggu jeda singkat, antar berkas bisa ada celah
  useEffect(() => {
    if (assetsReady || !framed || !lateDone || busy) return;
    const t = window.setTimeout(() => {
      loadStore.step("assets", "done", total > 0 ? `${total} berkas` : "Siap");
      setAssetsReady(true);
    }, 600);
    return () => window.clearTimeout(t);
  }, [framed, lateDone, busy, assetsReady, total]);

  // kompilasi shader untuk SEMUA benda, termasuk yang sedang tersembunyi (lampu malam, dll).
  // Progres dibaca dari jumlah program yang sudah siap, dan ada batas waktu supaya tidak menggantung.
  const started = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!assetsReady || started.current) return;
    started.current = true;
    setPhase("compile");
    paused.current = true;
    loadStore.step("shaders", "run", "Mengompilasi shader…", 0.05);
    loadStore.say(loader.say.shaders);
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    const t0 = performance.now();
    let mats: Set<THREE.Material> | null = null;
    try {
      mats = gl.compile(scene, camera) as Set<THREE.Material>;
    } catch {}

    const finish = () => {
      for (const o of hidden) o.visible = false;
      if (!alive.current) return;
      loadStore.step("shaders", "done", "Siap", 1);
      loadStore.step("gpu", "run", "Mengunggah model dan tekstur…", 0.3);
      loadStore.say(loader.say.gpu);
      // tahan culling supaya semuanya tergambar sekali dan terunggah
      const list: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.frustumCulled) {
          list.push(o);
          o.frustumCulled = false;
        }
      });
      culled.current = list;
      frames.current = 0;
      paused.current = false;
      setPhase("upload");
    };

    const MAX_WAIT = 15000; // lewat ini lanjut saja; sisanya dikompilasi driver di latar
    const poll = window.setInterval(() => {
      if (!alive.current) {
        // komponen sudah dilepas sungguhan (bukan sekadar StrictMode): bereskan dan berhenti
        window.clearInterval(poll);
        for (const o of hidden) o.visible = false;
        paused.current = false;
        return;
      }
      let ready = 0;
      let count = 0;
      mats?.forEach((m) => {
        count += 1;
        const prog = (
          gl.properties.get(m) as {
            currentProgram?: { isReady?: () => boolean };
          }
        ).currentProgram;
        if (!prog || prog.isReady?.() !== false) ready += 1;
      });
      const waited = performance.now() - t0;
      if (count > 0) {
        loadStore.step(
          "shaders",
          "run",
          `${ready}/${count}`,
          0.05 + 0.9 * (ready / count),
        );
      }
      if (count === 0 || ready >= count || waited > MAX_WAIT) {
        window.clearInterval(poll);
        console.info(
          `[boot] shader ${ready}/${count} siap dalam ${Math.round(waited)} ms`,
        );
        finish();
      }
    }, 120);
  }, [assetsReady, gl, scene, camera, paused]);

  // naga di luar pandangan baru boleh disembunyikan setelah shader dan tekstur semuanya terunggah
  useEffect(() => {
    setCreatureCull(phase === "tune" || phase === "live");
    return () => setCreatureCull(false);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") return;
    loadStore.step("tune", "done", "Siap");
    loadStore.say(loader.say.done);
    onReady();
  }, [phase, onReady]);

  return null;
}
