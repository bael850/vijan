"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { LIGHT } from "../config/light";
import { START, HOUSE } from "../config/world";
import { HOME } from "../config/home";
import { SCROLL } from "../config/scroll";
import { lerp, smoothstep } from "../core/math";
import { DAY_LIGHT, dayState, tickDay } from "../core/dayCycle";
import { groundHeight } from "../terrain/heightmap";
import { setShadowFocus, shadowActorNear } from "../core/shadowBus";

// Bayangan mengikuti kamera: kotak bayangan selebar 2 x SHADOW_HALF, digeser ke depan SHADOW_LEAD
const SHADOW_HALF_BASE = 60; // medium/low/mobile
const SHADOW_HALF_HIGH = 80; // high desktop: peta 2048 jadi tetap tajam walau area lebih luas
const SHADOW_LEAD = 20;

// Cahaya di dalam rumah. Matahari dan bulan tetap kuat: dinding, pelat, dan atap menahannya lewat peta bayangan,
// jadi sinarnya hanya masuk lewat jendela dan pintu. Yang diredam hanya cahaya langit yang menyebar (hemi dan fill).
// Kotak bayangan dipersempit dan dipusatkan ke kamera supaya bayangan perabot dan kusen jendela tajam.
const INDOOR = { sun: 0.45, moon: 0.3, sky: 0.15, half: 26, lead: 3 };
// Balkon (lantai atas, sisi selatan) ada di bawah langit terbuka: tidak diredam sama sekali.
const BALCONY_Y = HOUSE.padY + 0.6 + HOME.h + HOME.slab - 0.3;

// Cahaya, kabut, dan warna latar. Makin dekat rumah, suasana makin teduh dan hangat.
// progress = posisi scroll 0..1 (ref, bukan state, supaya tidak render ulang).
export default function TimeOfDay({
  progress,
  indoor,
  quality = "medium",
  mobile = false,
}: {
  progress: MutableRefObject<number>;
  indoor?: MutableRefObject<number>; // 0 di luar, 1 di dalam rumah
  quality?: GraphicsQuality;
  mobile?: boolean;
}) {
  const fill = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const from = useMemo(() => new THREE.Color(LIGHT.fog.colorStart), []);
  const to = useMemo(() => new THREE.Color(LIGHT.fog.colorEnd), []);
  const col = useMemo(() => new THREE.Color(), []);
  const dayFog = useMemo(() => new THREE.Color(DAY_LIGHT.fog), []);
  const dusk = useMemo(() => new THREE.Color(DAY_LIGHT.duskFog), []);
  const duskHemiSky = useMemo(() => new THREE.Color(DAY_LIGHT.duskHemiSky), []);
  const duskHemiGround = useMemo(
    () => new THREE.Color(DAY_LIGHT.duskHemiGround),
    [],
  );
  const sunStops = useMemo(
    () => DAY_LIGHT.sunStops.map(([e, c]) => ({ e, c: new THREE.Color(c) })),
    [],
  );
  const hemiNightSky = useMemo(() => new THREE.Color(LIGHT.hemi.sky), []);
  const hemiNightGround = useMemo(() => new THREE.Color(LIGHT.hemi.ground), []);
  const hemiDaySky = useMemo(() => new THREE.Color(DAY_LIGHT.hemiSky), []);
  const hemiDayGround = useMemo(
    () => new THREE.Color(DAY_LIGHT.hemiGround),
    [],
  );
  const moonCol = useMemo(() => new THREE.Color(LIGHT.moon.color), []);
  const tmp = useMemo(
    () => ({
      fwd: new THREE.Vector3(),
      p: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      last: new THREE.Vector3(1e9, 0, 0),
      lastDir: new THREE.Vector3(),
      drawP: new THREE.Vector3(1e9, 0, 0), // letak pusat bayangan saat peta terakhir digambar
      drawDir: new THREE.Vector3(),
      drawT: 0,
      drawHalf: 0,
      open: 0, // 0 = di bawah atap, 1 = di balkon (langit terbuka)
      n: 0,
    }),
    [],
  );

  // bayangan fokus di sekitar kamera (digeser tiap frame); low = mati
  const shadowOn = quality !== "low";
  const mapSize = quality === "high" && !mobile ? 2048 : 1024;
  const SHADOW_HALF =
    quality === "high" && !mobile ? SHADOW_HALF_HIGH : SHADOW_HALF_BASE;
  // arah bulan match skyShader; jarak 180 cukup untuk ortho frustum besar
  const moonPos = useMemo(() => {
    const v = new THREE.Vector3(...LIGHT.moon.position)
      .normalize()
      .multiplyScalar(180);
    return [START.x + v.x, v.y, START.z + v.z] as [number, number, number];
  }, []);
  const { scene: sc, gl } = useThree();
  useEffect(() => {
    const m = moon.current;
    if (!m) return;
    m.target.position.set(START.x, 0, START.z);
    sc.add(m.target);
    // PCF soft default sering terlalu blur di map 1024; radius kecil lebih tajam
    if (m.shadow) {
      m.shadow.radius = quality === "high" ? 2.5 : 1.5;
      m.shadow.blurSamples = 8;
    }
    return () => void sc.remove(m.target);
  }, [sc, quality]);

  useFrame(({ scene, clock, camera }) => {
    tickDay(clock.elapsedTime);
    const dl = dayState.daylight;
    const twi = dayState.twilight;
    const k = smoothstep(
      SCROLL.roadShare * 0.5,
      SCROLL.roadShare,
      progress.current,
    );
    // di dalam rumah cahaya langit dan bulan diredupkan, lampu rumah yang menerangi
    // balkon: dari kerangka rumah, x lokal = selatan (z dunia - pusat), z lokal = timur
    const lx = -(camera.position.z - HOME.z);
    const lz = camera.position.x - HOME.x;
    const onBalcony =
      lx < HOME.upper.x0 - 0.1 &&
      lx > -12.4 &&
      Math.abs(lz) < 7.5 &&
      camera.position.y > BALCONY_Y;
    tmp.open += ((onBalcony ? 1 : 0) - tmp.open) * 0.15;
    const inK = (indoor?.current ?? 0) * (1 - tmp.open);
    const dim = 1 - (1 - INDOOR.sky) * inK; // cahaya langit
    const dimSun = lerp(1, INDOOR.sun, inK);
    const dimMoon = lerp(1, INDOOR.moon, inK);
    const half = lerp(SHADOW_HALF, INDOOR.half, inK);
    const lead = lerp(SHADOW_LEAD, INDOOR.lead, inK);
    gl.toneMappingExposure = LIGHT.exposure;

    col.copy(from).lerp(to, k);
    col.lerp(dayFog, dl);
    col.lerp(dusk, twi * DAY_LIGHT.duskFogMix);
    scene.background = col;
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(col);
      fog.near = lerp(LIGHT.fog.nearStart, LIGHT.fog.nearEnd, k);
      fog.far = lerp(LIGHT.fog.farStart, LIGHT.fog.farEnd, k);
    }
    if (hemi.current) {
      const hn = lerp(LIGHT.hemi.startIntensity, LIGHT.hemi.endIntensity, k);
      hemi.current.intensity = lerp(hn, DAY_LIGHT.hemi, dl) * dim;
      hemi.current.color
        .copy(hemiNightSky)
        .lerp(hemiDaySky, dl)
        .lerp(duskHemiSky, twi * 0.6);
      hemi.current.groundColor
        .copy(hemiNightGround)
        .lerp(hemiDayGround, dl)
        .lerp(duskHemiGround, twi * 0.6);
    }
    // satu cahaya terarah: matahari kalau lebih tinggi dari bulan, kalau tidak bulan
    const m = moon.current;
    if (m) {
      const useSun = dayState.sun.y > dayState.moon.y;
      const d = useSun ? dayState.sun : dayState.moon;
      // matahari memudar tepat di cakrawala, dan lebih lemah saat rendah (sore keemasan, bukan silau)
      const e = dayState.sun.y;
      const sunI =
        DAY_LIGHT.sunIntensity *
        smoothstep(-0.04, 0.05, e) *
        lerp(DAY_LIGHT.sunLowFactor, 1, smoothstep(0.0, 0.4, e));
      const moonI =
        lerp(LIGHT.moon.startIntensity, LIGHT.moon.endIntensity, k) *
        smoothstep(-0.02, 0.22, dayState.moon.y) *
        (1 - dl);
      m.intensity = useSun ? sunI * dimSun : moonI * dimMoon;
      if (useSun) {
        // warna mengikuti ketinggian lewat daftar titik warna
        let i = 0;
        while (i < sunStops.length - 1 && e > sunStops[i + 1].e) i++;
        const a = sunStops[i];
        const b = sunStops[Math.min(i + 1, sunStops.length - 1)];
        const u = b.e > a.e ? smoothstep(a.e, b.e, e) : 1;
        m.color.copy(a.c).lerp(b.c, u);
      } else {
        m.color.copy(moonCol);
      }
      // dijaga agar tidak terlalu rendah (0.09): sore tetap punya bayangan panjang, tapi tidak lewat dari kotak bayangan
      const dy = Math.max(d.y, 0.09);
      const dir = tmp.dir.set(d.x, dy, d.z).normalize();

      // pusat bayangan = titik di depan kamera (bukan terkunci di rumah)
      camera.getWorldDirection(tmp.fwd);
      tmp.fwd.y = 0;
      if (tmp.fwd.lengthSq() > 1e-6) tmp.fwd.normalize();
      const fx = camera.position.x + tmp.fwd.x * lead;
      const fz = camera.position.z + tmp.fwd.z * lead;
      tmp.p.set(fx, groundHeight(fx, fz), fz);

      // tempel ke grid texel di ruang cahaya supaya bayangan tidak bergetar saat kamera bergerak
      tmp.right.set(dir.z, 0, -dir.x).normalize();
      tmp.up.crossVectors(dir, tmp.right);
      const sh = m.shadow.camera as THREE.OrthographicCamera;
      if (Math.abs(sh.right - half) > 0.01) {
        sh.left = -half;
        sh.right = half;
        sh.top = half;
        sh.bottom = -half;
        sh.updateProjectionMatrix();
      }
      const texel = (half * 2) / mapSize;
      const pa = tmp.p.dot(tmp.right);
      const pb = tmp.p.dot(tmp.up);
      tmp.p
        .addScaledVector(tmp.right, Math.round(pa / texel) * texel - pa)
        .addScaledVector(tmp.up, Math.round(pb / texel) * texel - pb);

      // Bayangan menyesuaikan sudut cahaya: makin rendah matahari/bulan, bias naik (anti bintik di atap miring),
      // tepi makin lembut, dan bayangan sedikit lebih tipis karena cahaya langit lebih dominan.
      const low = 1 - smoothstep(0.1, 0.55, d.y);
      m.shadow.normalBias = texel * lerp(1.3, 3.2, low) * lerp(1, 0.7, inK);
      m.shadow.radius = (quality === "high" ? 2.2 : 1.5) * lerp(1, 1.8, low);
      m.shadow.intensity = useSun ? lerp(0.92, 0.7, low) : 0.8;

      m.target.position.copy(tmp.p);
      m.target.updateMatrixWorld();
      m.position.copy(tmp.p).addScaledVector(dir, 180);

      // Peta bayangan digambar ulang berkala, bukan tiap frame saat bergerak:
      // biaya per frame jadi rata. Matriks bayangan ikut diperbarui bersamaan dengan petanya,
      // jadi bayangan tidak bergeser-geser di antara dua pembaruan.
      tmp.n += 1;
      // selagi ada naga di dekat kotak bayangan: gambar ulang tiap frame supaya bayangannya semulus badannya
      setShadowFocus(
        tmp.p.x,
        tmp.p.z,
        half * 1.42,
        -dir.x / dir.y,
        -dir.z / dir.y,
      );
      const nearDragon = shadowActorNear();
      // Kamera diam dan tidak ada naga di dekat: peta bayangan cukup digambar ulang 10 kali per detik
      // (untuk kucing dan siklus hari), bukan tiap 2 frame. Frame berat selang-seling pun hilang.
      // Kamera bergerak: tetap tiap 2-3 frame seperti sebelumnya.
      const now = performance.now();
      const moved =
        tmp.p.distanceToSquared(tmp.drawP) > 1e-4 ||
        tmp.dir.distanceToSquared(tmp.drawDir) > 4e-6 ||
        Math.abs(half - tmp.drawHalf) > 0.05;
      const every = quality === "high" && !mobile ? 2 : 3;
      if (
        (nearDragon && (every === 2 || tmp.n % 2 === 0)) ||
        (moved && tmp.n % every === 0) ||
        (!moved && now - tmp.drawT > 100)
      ) {
        gl.shadowMap.needsUpdate = true;
        tmp.drawP.copy(tmp.p);
        tmp.drawDir.copy(tmp.dir);
        tmp.drawT = now;
        tmp.drawHalf = half;
      }
      tmp.last.copy(tmp.p);
      tmp.lastDir.copy(tmp.dir);
    }
    if (fill.current)
      fill.current.intensity = LIGHT.fill.intensity * dim * (1 - 0.75 * dl);
  });

  return (
    <>
      <color attach="background" args={[LIGHT.fog.colorStart]} />
      <fog
        attach="fog"
        args={[LIGHT.fog.colorStart, LIGHT.fog.nearStart, LIGHT.fog.farStart]}
      />
      <hemisphereLight
        ref={hemi}
        args={[LIGHT.hemi.sky, LIGHT.hemi.ground, LIGHT.hemi.startIntensity]}
      />
      <directionalLight
        ref={moon}
        color={LIGHT.moon.color}
        intensity={LIGHT.moon.startIntensity}
        position={moonPos}
        castShadow={shadowOn}
        shadow-mapSize={[mapSize, mapSize]}
        // sebelumnya ±30 terlalu sempit: pohon & jalan di luar rumah tanpa bayangan
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
        shadow-camera-near={20}
        shadow-camera-far={380}
        // bias terlalu agresif = shadow acne di atap miring; normalBias tinggi = bayangan melayang
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
      />
      <directionalLight
        ref={fill}
        color={LIGHT.fill.color}
        intensity={LIGHT.fill.intensity}
        position={LIGHT.fill.position}
      />
    </>
  );
}
