"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA, FREELOOK, SCROLL } from "../config/scroll";
import { SHORE } from "../config/shore";
import { LAKE } from "../config/world";
import { clamp, lerp, smoothstep } from "../core/math";
import { tourAt, type Key } from "../house/tour";
import type { Focus } from "../lake/wish";
import { PIER } from "../village/pierLayout";
import { ROAD_LENGTH, roadPointAt } from "../path/roadDistance";
import { groundHeight } from "../terrain/heightmap";

const D_END = () => Math.max(0, ROAD_LENGTH - CAMERA.stopBeforeDoor);

const LOOK = 9; // titik tatap di depan kamera (m)
const WEAVE = 0.35; // kamera meliuk kiri-kanan jalan (m), halus saja
const UP = new THREE.Vector3(0, 1, 0);

const bump = (s: number, a: number, b: number, c: number, d: number) =>
  smoothstep(a, b, s) * (1 - smoothstep(c, d, s));

// Arah jalan dirata-rata sepanjang +-6 m, supaya tidak patah di sambungan titik jalan.
function smoothNormal(d: number) {
  const a = roadPointAt(d - 6);
  const b = roadPointAt(d + 6);
  const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { nx: -(b.z - a.z) / l, nz: (b.x - a.x) / l };
}

// Pose kamera di jalan; s = 0..1 sepanjang jalan. Mengembalikan jarak (m) dari awal jalan.
function roadPose(s: number, pos: THREE.Vector3, look: THREE.Vector3) {
  const d = s * D_END();
  const here = roadPointAt(d);
  const { nx, nz } = smoothNormal(d);
  // meliuk pelan, naik-turun sedikit, dan turun dari ketinggian di awal (crane)
  const calm = 1 - smoothstep(0.8, 1, s);
  const wv = Math.sin(d * 0.03) * WEAVE * calm;
  const crane = (1 - smoothstep(0, 0.1, s)) * 5;
  const px = here.x + nx * wv;
  const pz = here.z + nz * wv;
  pos.set(
    px,
    groundHeight(px, pz) +
      CAMERA.eye +
      Math.sin(d * 0.08) * 0.05 * calm +
      crane,
    pz,
  );
  const ahead = roadPointAt(Math.min(ROAD_LENGTH, d + LOOK));
  const toDoor = smoothstep(0.85, 1, s);
  look.set(
    ahead.x,
    groundHeight(ahead.x, ahead.z) +
      CAMERA.lookHeight +
      (CAMERA.doorHeight - CAMERA.lookHeight) * toDoor,
    ahead.z,
  );
  // di tepi danau, pandangan sedikit melirik ke air
  const lk = bump(s, 0.6, 0.7, 0.82, 0.92);
  look.x = lerp(look.x, LAKE.x, lk * 0.12);
  look.z = lerp(look.z, LAKE.z, lk * 0.04);
  look.y += lk * 0.2;
  return d;
}

// Kamera mengikuti scroll: berjalan di jalan setapak, lalu masuk dan berkeliling di dalam rumah,
// dengan goyang halus mengikuti mouse.
// progress = scroll 0..1 (masukan). camDist = posisi kamera sepanjang jalan dalam meter (keluaran,
// dibaca kucing). indoor = 0 di luar, 1 di dalam rumah (keluaran, dibaca cahaya).
// shore = true: kamera meninggalkan jalan dan pindah ke ujung dermaga (adegan tepi danau).
// focus = tulisan yang baru dilepas di danau; kamera menoleh ke sana sampai focus.until.
export default function CameraRig({
  progress,
  camDist,
  indoor,
  shore,
  focus,
  reduceMotion,
}: {
  progress: MutableRefObject<number>;
  camDist: MutableRefObject<number>;
  indoor: MutableRefObject<number>;
  shore: MutableRefObject<boolean>;
  focus: MutableRefObject<Focus>;
  reduceMotion: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const smooth = useRef<number | null>(null);
  const shoreT = useRef(0); // 0 = di jalan, 1 = di tepi danau
  const shorePrev = useRef(false);
  const focusT = useRef(0); // 0 = menatap danau, 1 = menatap tulisan yang baru dilepas
  // pandangan manual: yaw/pitch = yang tampil, ty/tp = target dari seretan
  const free = useRef({
    yaw: 0,
    pitch: 0,
    ty: 0,
    tp: 0,
    idle: 0,
    drag: false,
    swallowClick: false,
    prog: -1,
  });
  const sway = useRef({ x: 0, y: 0 });
  const kickRef = useRef(0);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const start = useMemo<Key>(
    () => ({ x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0 }),
    [],
  );
  const out = useMemo<Key>(
    () => ({ x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0 }),
    [],
  );

  // Seret di kanvas = menoleh. Seretan kecil tetap dianggap klik (kucing, lampu, benda di rumah).
  useEffect(() => {
    const el = gl.domElement;
    const f = free.current;
    el.style.touchAction = "pan-y"; // gerak vertikal di HP tetap scroll halaman
    let id = -1;
    let sx = 0;
    let sy = 0;
    let lx = 0;
    let ly = 0;
    let engaged = false;
    let touch = false;

    const down = (e: PointerEvent) => {
      if (id !== -1) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      id = e.pointerId;
      sx = lx = e.clientX;
      sy = ly = e.clientY;
      engaged = false;
      touch = e.pointerType !== "mouse";
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      if (!engaged) {
        if (Math.hypot(e.clientX - sx, e.clientY - sy) < FREELOOK.dragThreshold)
          return;
        engaged = true;
        f.drag = true;
        try {
          el.setPointerCapture(id);
        } catch {}
        document.body.style.cursor = "grabbing";
        lx = e.clientX;
        ly = e.clientY;
      }
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      f.ty = clamp(
        f.ty + dx * FREELOOK.sensitivity,
        -FREELOOK.maxYaw,
        FREELOOK.maxYaw,
      );
      if (!touch) {
        f.tp = clamp(
          f.tp + dy * FREELOOK.sensitivity,
          -FREELOOK.maxPitch,
          FREELOOK.maxPitch,
        );
      }
      f.idle = 0;
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      if (engaged) {
        document.body.style.cursor = "";
        if (e.type === "pointerup") {
          // klik yang menyusul setelah seretan jangan sampai mengenai kucing/benda
          f.swallowClick = true;
          window.setTimeout(() => (f.swallowClick = false), 60);
        }
      }
      id = -1;
      engaged = false;
      f.drag = false;
    };
    const click = (e: MouseEvent) => {
      if (!f.swallowClick) return;
      f.swallowClick = false;
      e.stopPropagation();
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", click);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.removeEventListener("click", click);
      el.style.touchAction = "";
      document.body.style.cursor = "";
    };
  }, [gl]);

  useFrame(({ camera, pointer, clock, size }, delta) => {
    const dt = Math.min(delta, 0.05);
    const cam = camera as THREE.PerspectiveCamera;
    const target = clamp(progress.current, 0, 1);

    // scroll dihaluskan; frame pertama langsung di posisi scroll (tidak menyapu dari awal)
    if (smooth.current === null) smooth.current = target;
    const rate = reduceMotion ? SCROLL.smoothReduced : SCROLL.smooth;
    smooth.current += (target - smooth.current) * (1 - Math.exp(-rate * dt));
    const s = smooth.current;
    const share = SCROLL.roadShare;

    if (s <= share) {
      camDist.current = roadPose(s / share, pos, look);
    } else {
      // masuk rumah: mulai dari pose di ujung jalan, lalu mengikuti jalur dalam
      camDist.current = roadPose(1, pos, look);
      start.x = pos.x;
      start.y = pos.y;
      start.z = pos.z;
      start.lx = look.x;
      start.ly = look.y;
      start.lz = look.z;
      tourAt((s - share) / (1 - share), start, out);
      pos.set(out.x, out.y, out.z);
      look.set(out.lx, out.ly, out.lz);
    }

    // pindah ke tepi danau: kamera naik sedikit di tengah jalan, lalu mendarat di ujung dermaga
    const goal = shore.current ? 1 : 0;
    if (shore.current !== shorePrev.current) {
      shorePrev.current = shore.current;
      free.current.ty = 0; // pandangan manual dikembalikan ke depan
      free.current.tp = 0;
    }
    const sr = reduceMotion ? SHORE.rateReduced : SHORE.rate;
    shoreT.current += (goal - shoreT.current) * (1 - Math.exp(-sr * dt));
    if (Math.abs(goal - shoreT.current) < 0.0005) shoreT.current = goal;
    const e = smoothstep(0, 1, shoreT.current);
    if (e > 0) {
      const sy = PIER.y + 0.05 + SHORE.eye;
      pos.set(
        lerp(pos.x, SHORE.stand.x, e),
        lerp(pos.y, sy, e) + Math.sin(Math.PI * e) * SHORE.arc,
        lerp(pos.z, SHORE.stand.z, e),
      );
      look.set(
        lerp(look.x, SHORE.look.x, e),
        lerp(look.y, SHORE.look.y, e),
        lerp(look.z, SHORE.look.z, e),
      );
    }

    // setelah tulisan dilepas: kamera pelan menoleh ke tulisan dan mundur sedikit di dermaga
    const wantFocus =
      shore.current && clock.elapsedTime < focus.current.until ? 1 : 0;
    focusT.current += (wantFocus - focusT.current) * (1 - Math.exp(-0.9 * dt));
    const fe = smoothstep(0, 1, focusT.current) * e;
    if (fe > 0.001) {
      look.set(
        lerp(look.x, focus.current.x, fe * 0.9),
        lerp(look.y, 6.2, fe),
        lerp(look.z, focus.current.z, fe * 0.9),
      );
      pos.x -= 2.5 * fe;
      pos.y += 0.35 * fe;
    }

    indoor.current = smoothstep(-122, -126, pos.z);

    if (!reduceMotion) {
      const k = 1 - Math.exp(-3 * dt);
      const amount = CAMERA.sway * (1 - 0.7 * indoor.current); // di dalam rumah goyangnya dikecilkan
      sway.current.x += (pointer.x * amount - sway.current.x) * k;
      sway.current.y += (pointer.y * amount * 0.5 - sway.current.y) * k;
      // geser kiri-kanan relatif arah pandang, bukan sumbu dunia
      const fx = look.x - pos.x;
      const fz = look.z - pos.z;
      const fn = Math.hypot(fx, fz) || 1;
      pos.x += (-fz / fn) * sway.current.x;
      pos.z += (fx / fn) * sway.current.x;
      pos.y += sway.current.y + Math.sin(clock.elapsedTime * 1.2) * CAMERA.bob;
    }

    // pandangan manual: kembali ke depan kalau scroll jalan lagi atau lama dibiarkan
    const f = free.current;
    f.idle += dt;
    if (f.prog < 0) f.prog = target;
    const scrolling = Math.abs(target - f.prog) > 0.0002;
    f.prog = target;
    if (!f.drag) {
      const back = scrolling
        ? FREELOOK.scrollReturn
        : f.idle > FREELOOK.returnAfter
          ? FREELOOK.idleReturn
          : 0;
      if (back > 0) {
        const r = Math.exp(-back * dt);
        f.ty *= r;
        f.tp *= r;
      }
    }
    const fk = 1 - Math.exp(-FREELOOK.smooth * dt);
    f.yaw += (f.ty - f.yaw) * fk;
    f.pitch += (f.tp - f.pitch) * fk;

    cam.position.copy(pos);
    cam.lookAt(look);
    if (Math.abs(f.yaw) > 1e-4 || Math.abs(f.pitch) > 1e-4) {
      cam.rotateOnWorldAxis(UP, f.yaw);
      cam.rotateX(f.pitch);
    }
    if (!reduceMotion) cam.rotateZ(-sway.current.x * 0.02);

    const portrait = size.width / size.height < 0.8;
    // sudut pandang melebar sedikit saat scroll cepat, dihaluskan supaya tidak berdenyut
    const kickTo = reduceMotion
      ? 0
      : Math.min(1, Math.abs(target - s) * 12) * 2;
    kickRef.current += (kickTo - kickRef.current) * (1 - Math.exp(-4 * dt));
    const kick = kickRef.current;
    const fov =
      (portrait ? CAMERA.fovPortrait : CAMERA.fov) +
      CAMERA.fovIndoorBoost * indoor.current +
      SHORE.fovBoost * e +
      kick;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
