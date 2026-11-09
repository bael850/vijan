"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA, FREELOOK, SCROLL } from "../config/scroll";
import { BALCONY, WALK } from "../config/home";
import { SHORE } from "../config/shore";
import { WATER_Y } from "../config/world";
import { clamp, smoothstep } from "../core/math";
import { CHAPTER_SPANS, ROUTE_LENGTH, routePointAt } from "../core/route";
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

// damp untuk sudut: lewat jalan terpendek, dengan batas kecepatan putar (rad/detik)
const dampAngle = (
  cur: number,
  target: number,
  k: number,
  dt: number,
  max: number,
) => {
  const d = Math.atan2(Math.sin(target - cur), Math.cos(target - cur));
  const step = clamp(d * (1 - Math.exp(-k * dt)), -max * dt, max * dt);
  return cur + step;
};

// SmoothDamp (teredam kritis), dari Game Programming Gems 4. Mengembalikan [nilai baru, kecepatan baru].
// smoothTime = kira-kira lama menyusul sasaran (detik); maxSpeed membatasi kecepatan.
function smoothDamp(
  cur: number,
  target: number,
  vel: number,
  smoothTime: number,
  maxSpeed: number,
  dt: number,
): [number, number] {
  const st = Math.max(0.0001, smoothTime);
  const omega = 2 / st;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * st;
  const change = clamp(cur - target, -maxChange, maxChange);
  const tgt = cur - change;
  const temp = (vel + omega * change) * dt;
  let v = (vel - omega * temp) * e;
  let out = tgt + (change + temp) * e;
  if (target - cur > 0 === out > target) {
    out = target;
    v = 0;
  }
  return [out, v];
}
// Pandangan dihitung dari bentuk jalur di depan kamera, bukan dari titik tatap yang tertinggal.
const HEAD_AT = [2, 6, 10, 14, 18];
// Rentang bab istana (m dari awal rute): pembatas kecepatan tikungan hanya aktif di sini.
const PALACE_SPAN = (() => {
  const c = CHAPTER_SPANS.find((x) => x.id === "istana");
  return c
    ? { from: c.from * ROUTE_LENGTH, to: c.to * ROUTE_LENGTH + 3 }
    : { from: Infinity, to: -Infinity };
})();

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
    pIn: 0, // progress scroll pada frame sebelumnya
    still: 0, // sudah berapa detik scroll diam
    v: 0, // kecepatan progress (per detik), sudah dihaluskan dan dibatasi
    hd: null as number | null, // arah pandang di jalur (yaw, rad), sudah dihaluskan
    pt: 0, // kemiringan pandangan di jalur (pitch, rad), sudah dihaluskan
    px: 0, // posisi mouse yang sudah dihaluskan (untuk goyang kamera)
    py: 0,
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
    // Kamera mengejar posisi scroll dengan kecepatan yang DIBATASI (CAMERA.maxSpeed) dan percepatan yang dihaluskan.
    // Scroll kilat, tarik scrollbar, tombol End, atau lompat bab: kamera tetap terbang lewat jalur dengan
    // kecepatan wajar, tidak melompat, tidak menyambar, dan beban gambar per frame tetap terbatas.
    // Saat scroll aktif kamera mengikuti dengan lembut. Begitu scroll diam (sekitar 0,1 detik), laju mengejar naik pelan-pelan
    // sampai SCROLL.settle kali lipat: kamera cepat mengerem dan tidak meluncur jauh, tanpa berhenti mendadak.
    st.still =
      Math.abs(progress.current - st.pIn) > 0.00001 ? 0 : st.still + dt;
    st.pIn = progress.current;
    const span = Math.max(1, ROUTE_LENGTH - CAMERA.stopBeforeEnd);
    const target = clamp(progress.current, 0, 1);
    // Pegas teredam kritis (SmoothDamp): posisi dan kecepatan berubah mulus, tidak ada lonjakan saat scroll berhenti
    // (cara lama menaikkan "gain" mendadak ketika scroll diam, dan itu terasa sebagai dorongan maju sebelum rem).
    // Waktu pegas memendek pelan-pelan saat scroll diam, jadi kamera berhenti lebih cepat tanpa sentakan.
    const g = reduceMotion ? SCROLL.glideReduced : SCROLL.glide;
    const gs = reduceMotion ? SCROLL.glideReduced : SCROLL.glideStop;
    const smoothTime = g + (gs - g) * smoothstep(0.1, 0.7, st.still);
    // Pembatas tikungan (hanya di bab istana): makin tajam tikungan di depan, makin rendah kecepatan maksimum kamera
    // (laju putar <= CAMERA.turnRate). Jarak pandang ke depan membesar saat kamera ngebut, supaya rem mulai sebelum tikungan.
    const dirSign = target >= st.p ? 1 : -1;
    const curveLook = 12 + Math.abs(st.v) * span * 0.5;
    const posD = st.p * span;
    let capV = CAMERA.maxSpeed / span;
    if (
      posD + dirSign * curveLook >= PALACE_SPAN.from &&
      posD <= PALACE_SPAN.to
    ) {
      let kMax = 0;
      let prev = routePointAt(posD);
      for (let o = 4; o <= curveLook; o += 4) {
        const q = routePointAt(posD + dirSign * o);
        let dh = Math.atan2(q.tx, q.tz) - Math.atan2(prev.tx, prev.tz);
        while (dh > Math.PI) dh -= 2 * Math.PI;
        while (dh < -Math.PI) dh += 2 * Math.PI;
        kMax = Math.max(kMax, Math.abs(dh) / 4);
        prev = q;
      }
      capV =
        clamp(
          CAMERA.turnRate / Math.max(kMax, 1e-4),
          CAMERA.minCurveSpeed,
          CAMERA.maxSpeed,
        ) / span;
      if (Math.abs(st.v) > capV)
        st.v = Math.sign(st.v) * damp(Math.abs(st.v), capV, 6, dt);
    }
    const sd = smoothDamp(st.p, target, st.v, smoothTime, capV, dt);
    st.p = clamp(sd[0], 0, 1);
    st.v = sd[1];
    if (Math.abs(target - st.p) < 1e-6) st.v = 0;
    const dist = st.p * span;
    camDist.current = dist;
    const speed = Math.abs(st.v) * span; // m/detik
    const calm = 1 - smoothstep(8, 24, speed); // 1 = pelan, 0 = ngebut

    const here = routePointAt(dist);
    // Tinggi tanah dirata-ratakan di sekitar titik (2 m ke belakang dan depan) supaya tonjolan kecil, tepi jembatan,
    // dan ujung tanjakan tidak terasa sebagai sentakan naik-turun.
    const smoothGround = (d: number, p = routePointAt(d)) => {
      const a = routePointAt(d - 2);
      const c = routePointAt(d + 2);
      return (
        (walkHeight(a.x, a.z) +
          2 * walkHeight(p.x, p.z) +
          walkHeight(c.x, c.z)) /
        4
      );
    };
    const groundHere = smoothGround(dist, here);
    // makin kencang, penghalusan tinggi makin cepat supaya tidak tertinggal jauh dari tanah
    st.y =
      st.y === null ? groundHere : damp(st.y, groundHere, 7 + speed * 0.5, dt);
    // Batas longgar (0,4 m di bawah tanah rata-rata, mata masih 1,3 m di atas tanah) supaya tidak menyentak kamera.
    if (st.y < groundHere - 0.4) st.y = groundHere - 0.4;
    const bob = reduceMotion
      ? 0
      : Math.sin(clock.elapsedTime * 1.3) * CAMERA.bob * calm;
    tmp.pos.set(here.x, st.y + CAMERA.eye + bob, here.z);

    // Arah pandang = rata-rata arah jalan di depan (bentuk jalur, bukan titik yang dikejar). Tidak ada keadaan yang bisa
    // tertinggal jauh, jadi pandangan tidak mungkin menghadap belakang atau menunduk lurus ke tanah.
    // Lalu dihaluskan dengan batas kecepatan putar.
    let hx = 0;
    let hz = 0;
    for (const o of HEAD_AT) {
      const q = routePointAt(dist + o);
      hx += q.tx;
      hz += q.tz;
    }
    const hdT = Math.atan2(hx, hz);
    const aheadH = smoothGround(dist + CAMERA.lookAhead);
    const ptT = clamp(
      Math.atan2(
        aheadH + CAMERA.lookHeight - (groundHere + CAMERA.eye),
        CAMERA.lookAhead,
      ),
      -CAMERA.pitchMax,
      CAMERA.pitchMax,
    );
    if (st.hd === null) {
      st.hd = hdT;
      st.pt = ptT;
    } else {
      const rate = reduceMotion ? 12 : CAMERA.turnSmooth;
      st.hd = dampAngle(st.hd, hdT, rate, dt, CAMERA.turnMax);
      st.pt = damp(st.pt, ptT, rate, dt);
    }
    const cp = Math.cos(st.pt);
    tmp.look.set(
      tmp.pos.x + Math.sin(st.hd) * cp * CAMERA.lookAhead,
      tmp.pos.y + Math.sin(st.pt) * CAMERA.lookAhead,
      tmp.pos.z + Math.cos(st.hd) * cp * CAMERA.lookAhead,
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
    // posisi mouse dihaluskan: pointer hanya berubah saat mouse bergerak, jadi tanpa ini goyangnya berundak
    st.px = damp(st.px, pointer.x, 6, dt);
    st.py = damp(st.py, pointer.y, 6, dt);
    const sway = reduceMotion || inside ? 0 : CAMERA.sway * 0.12 * calm;
    cam.rotateOnWorldAxis(UP, st.yaw - st.px * sway);
    cam.rotateX(st.pitch + st.py * sway * 0.5);

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
