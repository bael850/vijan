"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { floraStats } from "../flora/floraStats";

// Pengukur performa. Hanya aktif kalau alamat halaman ada ?stats (pengunjung biasa tidak melihat apa-apa).
// Cara membaca:
//   - "JS" kecil tapi ms per frame besar  -> beban ada di kartu grafis (resolusi, bayangan, jumlah segitiga).
//   - "JS" besar                            -> beban ada di hitungan (otak naga, animasi, banyak objek terpisah).
//   - draw calls ratusan ke atas            -> terlalu banyak objek terpisah, perlu digabung/di-instance.
// info: keterangan tambahan yang ditampilkan di baris terakhir (kualitas, resolusi).
const WINDOW = 60;

// Perkiraan segitiga yang terlihat kamera per bagian dunia (bagian diberi userData.cat di WorldScene).
// Tidak termasuk peta bayangan. Meleset sedikit dari angka resmi di atas, tapi urutannya cukup untuk mencari biang berat.
const fr = new THREE.Frustum();
const pm = new THREE.Matrix4();
function breakdown(scene: THREE.Scene, camera: THREE.Camera) {
  camera.updateMatrixWorld();
  fr.setFromProjectionMatrix(
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  const out: Record<string, number> = {};
  const walk = (o: THREE.Object3D, cat: string) => {
    if (!o.visible) return;
    const c = (o.userData?.cat as string) || cat;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      let ok = true;
      if (mesh.frustumCulled) {
        try {
          ok = fr.intersectsObject(mesh);
        } catch {
          ok = true;
        }
      }
      if (ok) {
        const g = mesh.geometry;
        const per =
          (g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3;
        const im = o as THREE.InstancedMesh;
        out[c] = (out[c] ?? 0) + per * (im.isInstancedMesh ? im.count : 1);
      }
    }
    for (const ch of o.children) walk(ch, c);
  };
  walk(scene, "lainnya");
  return Object.entries(out)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([n, v]) => `${n} ${(v / 1000).toFixed(0)}rb`)
    .join("  ");
}

export default function PerfStats({ info }: { info: string }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const infoRef = useRef(info);
  infoRef.current = info;
  const st = useRef({
    el: null as HTMLDivElement | null,
    t0: 0,
    jsMs: 0,
    submitMs: 0,
    deltas: [] as number[],
    last: 0,
  });

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("stats")) return;
    const s = st.current;
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;left:8px;top:8px;z-index:9999;padding:6px 8px;border-radius:6px;" +
      "background:rgba(0,0,0,.72);color:#9fe8a8;font:11px/1.45 ui-monospace,Menlo,Consolas,monospace;" +
      "white-space:pre;pointer-events:none";
    document.body.appendChild(el);
    s.el = el;

    // ukur waktu yang dipakai gl.render (hanya menyerahkan perintah ke GPU, bukan waktu GPU sebenarnya)
    const orig = gl.render.bind(gl);
    gl.render = (scene, camera) => {
      const a = performance.now();
      s.jsMs = a - s.t0; // waktu dari awal frame sampai mulai menggambar = semua hitungan per frame
      orig(scene, camera);
      s.submitMs = performance.now() - a;
    };
    return () => {
      gl.render = orig;
      el.remove();
      s.el = null;
    };
  }, [gl]);

  // prioritas paling awal: tandai awal frame
  useFrame(() => {
    st.current.t0 = performance.now();
  }, -1000);

  useFrame((_, delta) => {
    const s = st.current;
    if (!s.el) return;
    if (delta < 1) s.deltas.push(delta * 1000);
    if (s.deltas.length > WINDOW) s.deltas.shift();
    const now = performance.now();
    if (now - s.last < 500 || s.deltas.length < 10) return;
    s.last = now;
    const sorted = [...s.deltas].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const max = sorted[sorted.length - 1];
    const r = gl.info.render;
    const m = gl.info.memory;
    s.el.textContent =
      `${(1000 / avg).toFixed(0)} fps  ${avg.toFixed(1)} ms  (p95 ${p95.toFixed(1)}, maks ${max.toFixed(1)})\n` +
      `JS ${s.jsMs.toFixed(1)} ms  |  kirim gambar ${s.submitMs.toFixed(1)} ms\n` +
      `draw calls ${r.calls}  |  segitiga ${(r.triangles / 1000).toFixed(0)} rb\n` +
      `geometri ${m.geometries}  |  tekstur ${m.textures}\n` +
      `tumbuhan ${Object.entries(floraStats)
        .map(
          ([n, v]) =>
            `${n} ${v.count}x${(v.perTree / 1000).toFixed(1)}rb${v.far != null ? ` (jauh ${(v.far / 1000).toFixed(1)}rb)` : ""}`,
        )
        .join("  ")}\n` +
      `isi ${breakdown(scene, camera)}\n` +
      infoRef.current;
  });

  return null;
}
