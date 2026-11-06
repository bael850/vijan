"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA, FREELOOK, SCROLL } from "../config/scroll";
import { BALCONY, WALK } from "../config/home";
import { SHORE } from "../config/shore";
import { WATER_Y } from "../config/world";
import { clamp, smoothstep } from "../core/math";
import { ROUTE_LENGTH, routePointAt } from "../core/route";
import type { HouseState } from "../chapters/home/houseState";
import { PORCH, walkCamera } from "../chapters/home/houseTour";
import { spawnWalk, stepWalk } from "../chapters/home/houseWalk";
import type { Focus } from "../lake/wish";
import { walkHeight } from "../terrain/heightmap";

const SCOPE_FOV = 16; // sudut pandang lewat teleskop (derajat)
const UP = new THREE.Vector3(0, 1, 0);
// damp: mendekati target dengan laju k, tidak bergantung frame rate
const damp = (cur: number, target: number, k: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-k * dt));

// Kamera satu jalur: posisi sepanjang rute ditentukan scroll, pandangan boleh digeser
// (seret mouse/jari) lalu pelan-pelan kembali ke depan. Di ujung rute, kamera pindah ke dermaga.
// camDist = posisi kamera sepanjang rute (m), dibaca kucing.
export default function CameraRig({
  progress,
  camDist,
  shore,
  focus,
  house,
  indoor,
  reduceMotion,
}: {
  progress: MutableRefObject<number>;
  camDist: MutableRefObject<number>;
  shore: MutableRefObject<boolean>;
  focus: MutableRefObject<Focus>;
  house: MutableRefObject<HouseState>;
  indoor: MutableRefObject<number>;
  reduceMotion: boolean;
}) {
  const { gl, camera, size } = useThree();
  const s = useRef({
    p: 0, // progress yang sudah dihaluskan
    y: null as number | null, // tinggi mata yang sudah dihaluskan
    yaw: 0,
    pitch: 0,
    yawT: 0,
    pitchT: 0,
    idle: 0,
    sk: 0, // 0 = di jalan, 1 = di dermaga
    fk: 0, // 0 = tatap ke depan, 1 = tatap tulisan di danau
    lastP: 0,
    ak: 0, // 0 = di jalan, 1 = di teras rumah
    wy: 0, // arah pandang di dalam rumah (yaw), sudah dihaluskan
    wp: 0, // mendongak di dalam rumah (pitch), sudah dihaluskan
    wyT: 0, // sasaran yaw dari seretan
    wpT: 0,
    touch: false,
    scoped: false,
    fov: CAMERA.fov,
  });
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0, id: -1 });
  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      stand: new THREE.Vector3(),
      standLook: new THREE.Vector3(),
      focusLook: new THREE.Vector3(),
    }),
    [],
  );

  // seret untuk menoleh. Mouse: segala arah. Layar sentuh: kiri-kanan saja (atas-bawah = scroll halaman).
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = {
        on: true,
        x: e.clientX,
        y: e.clientY,
        moved: 0,
        id: e.pointerId,
      };
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      d.moved += Math.abs(dx) + Math.abs(dy);
      if (d.moved < FREELOOK.dragThreshold) return;
      const st = s.current;
      if (house.current.mode === "in") {
        // di dalam rumah: menoleh bebas ke segala arah, tidak kembali sendiri
        // saat mengintip, seretan dibuat pelan karena sudut pandangnya sempit
        const sens = WALK.sens * (house.current.scope ? 0.3 : 1);
        st.wyT += dx * sens;
        st.wpT = clamp(st.wpT + dy * sens, -WALK.maxPitch, WALK.maxPitch);
        return;
      }
      st.yawT = clamp(
        st.yawT + dx * FREELOOK.sensitivity,
        -FREELOOK.maxYaw,
        FREELOOK.maxYaw,
      );
      if (e.pointerType === "mouse")
        st.pitchT = clamp(
          st.pitchT + dy * FREELOOK.sensitivity,
          -FREELOOK.maxPitch,
          FREELOOK.maxPitch,
        );
      st.idle = 0;
    };
    const up = () => {
      drag.current.on = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl, house]);

  useFrame(({ clock, pointer }, delta) => {
    const dt = Math.min(delta, 0.05);
    const st = s.current;
    const cam = camera as THREE.PerspectiveCamera;

    // ── posisi sepanjang rute ──────────────────────────────
    const follow = reduceMotion ? SCROLL.smoothReduced : SCROLL.smooth;
    st.p = damp(st.p, progress.current, follow, dt);
    const dist =
      clamp(st.p, 0, 1) * Math.max(1, ROUTE_LENGTH - CAMERA.stopBeforeEnd);
    camDist.current = dist;

    const here = routePointAt(dist);
    const ahead = routePointAt(dist + CAMERA.lookAhead);
    const groundHere = walkHeight(here.x, here.z);
    st.y = st.y === null ? groundHere : damp(st.y, groundHere, 8, dt);
    const bob = reduceMotion
      ? 0
      : Math.sin(clock.elapsedTime * 1.3) * CAMERA.bob;
    tmp.pos.set(here.x, st.y + CAMERA.eye + bob, here.z);
    tmp.look.set(
      ahead.x,
      walkHeight(ahead.x, ahead.z) + CAMERA.lookHeight,
      ahead.z,
    );

    // ── dermaga ────────────────────────────────────────────
    st.sk = damp(
      st.sk,
      shore.current ? 1 : 0,
      SHORE.rate * (reduceMotion ? SHORE.rateReduced : 1.4),
      dt,
    );
    if (st.sk > 0.001) {
      tmp.stand.set(SHORE.stand.x, 0.5 + SHORE.eye, SHORE.stand.z);
      tmp.standLook.set(SHORE.look.x, SHORE.look.y, SHORE.look.z);
      const arc = Math.sin(st.sk * Math.PI) * SHORE.arc;
      const k = smoothstep(0, 1, st.sk);
      tmp.pos.lerp(tmp.stand, k);
      tmp.pos.y += arc;
      tmp.look.lerp(tmp.standLook, k);
    }

    // ── rumah: mampir ke teras, lalu tur di dalam ──────────
    const hs = house.current;
    if (hs.mode !== "in") hs.scope = false;
    if (hs.snap) {
      st.ak = hs.mode === "out" ? 0 : 1;
      st.yawT = st.pitchT = st.yaw = st.pitch = 0;
      if (hs.mode === "in") {
        spawnWalk(hs.walk);
        hs.move.push = 0;
        st.wy = st.wyT = hs.walk.yaw;
        st.wp = st.wpT = hs.walk.pitch;
      }
      hs.snap = false;
    }
    st.ak = damp(st.ak, hs.mode === "out" ? 0 : 1, reduceMotion ? 6 : 1.7, dt);
    if (st.ak > 0.001 && hs.mode !== "in") {
      const k = smoothstep(0, 1, st.ak);
      tmp.pos.lerp(PORCH.pos, k);
      tmp.pos.y += Math.sin(st.ak * Math.PI) * 1.2;
      tmp.look.lerp(PORCH.look, k);
    }
    // Jalan bebas di dalam rumah: maju, mundur, geser, dan menoleh ke mana saja.
    if (hs.mode === "in") {
      const mv = hs.move;
      // teleskop: berdiri di belakang lensa menghadap danau; gerak atau Esc untuk turun
      if (hs.scope && !st.scoped) {
        st.scoped = true;
        const w = hs.walk;
        w.x = BALCONY.eye.x;
        w.z = BALCONY.eye.z;
        w.vx = w.vz = 0;
        w.level = "u";
        mv.push = 0;
        st.wy = st.wyT = w.yaw = 0;
        st.wp = st.wpT = w.pitch = 0.02;
      }
      if (
        hs.scope &&
        (Math.abs(mv.fwd) + Math.abs(mv.side) > 0.1 || Math.abs(mv.push) > 0.05)
      )
        hs.scope = false;
      if (!hs.scope) st.scoped = false;
      st.wyT += mv.turn * WALK.turn * dt * (hs.scope ? 0.3 : 1);
      st.wy = damp(st.wy, st.wyT, WALK.look, dt);
      st.wp = damp(st.wp, st.wpT, WALK.look, dt);
      hs.walk.yaw = st.wy;
      hs.walk.pitch = st.wp;
      if (!hs.scope) stepWalk(hs.walk, mv, dt);
      walkCamera(hs.walk, tmp.pos, tmp.look);
    }
    indoor.current = damp(indoor.current, hs.mode === "in" ? 1 : 0, 3, dt);

    // ── tatap tulisan di danau setelah dilepas ─────────────
    const f = focus.current;
    const focusOn = shore.current && clock.elapsedTime < f.until;
    st.fk = damp(st.fk, focusOn ? 1 : 0, 1.6, dt);
    if (st.fk > 0.001) {
      tmp.focusLook.set(f.x, WATER_Y + 0.5, f.z);
      tmp.look.lerp(tmp.focusLook, st.fk);
    }

    cam.position.copy(tmp.pos);
    cam.lookAt(tmp.look);

    // ── geser pandangan: seret + goyang halus mengikuti mouse ──
    const moving = Math.abs(progress.current - st.lastP) > 0.00002;
    st.lastP = progress.current;
    // di dalam rumah layar sentuh dipakai penuh untuk menoleh (tanpa scroll halaman)
    const inside = hs.mode === "in";
    if (inside !== st.touch) {
      st.touch = inside;
      gl.domElement.style.touchAction = inside ? "none" : "";
    }
    if (drag.current.on && drag.current.moved >= FREELOOK.dragThreshold)
      st.idle = 0;
    else st.idle += dt;
    if (st.sk > 0.5) {
      st.yawT = 0;
      st.pitchT = 0;
    } else if (!drag.current.on) {
      const back = moving
        ? FREELOOK.scrollReturn
        : st.idle > FREELOOK.returnAfter
          ? FREELOOK.idleReturn
          : 0;
      if (back > 0) {
        st.yawT = damp(st.yawT, 0, back, dt);
        st.pitchT = damp(st.pitchT, 0, back, dt);
      }
    }
    st.yaw = damp(st.yaw, st.yawT, FREELOOK.smooth, dt);
    st.pitch = damp(st.pitch, st.pitchT, FREELOOK.smooth, dt);
    const sway = reduceMotion || inside ? 0 : CAMERA.sway * 0.12;
    cam.rotateOnWorldAxis(UP, st.yaw - pointer.x * sway);
    cam.rotateX(st.pitch + pointer.y * sway * 0.5);

    // ── sudut pandang ──────────────────────────────────────
    const portrait = size.width / size.height < 0.8;
    const fovT = hs.scope
      ? SCOPE_FOV
      : (portrait ? CAMERA.fovPortrait : CAMERA.fov) + SHORE.fovBoost * st.sk;
    st.fov = damp(st.fov, fovT, 4, dt);
    if (Math.abs(cam.fov - st.fov) > 0.01) {
      cam.fov = st.fov;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
