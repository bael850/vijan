"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { LIGHT } from "../config/light";
import { START } from "../config/world";
import { SCROLL } from "../config/scroll";
import { lerp, smoothstep } from "../core/math";
import { DAY_LIGHT, dayState, tickDay } from "../core/dayCycle";
import { groundHeight } from "../terrain/heightmap";

// Bayangan mengikuti kamera: kotak bayangan selebar 2 x SHADOW_HALF, digeser ke depan SHADOW_LEAD
const SHADOW_HALF_BASE = 60; // medium/low/mobile
const SHADOW_HALF_HIGH = 80; // high desktop: peta 2048 jadi tetap tajam walau area lebih luas
const SHADOW_LEAD = 20;

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
  const dusk = useMemo(() => new THREE.Color("#c98a6a"), []);
  const hemiNightSky = useMemo(() => new THREE.Color(LIGHT.hemi.sky), []);
  const hemiNightGround = useMemo(() => new THREE.Color(LIGHT.hemi.ground), []);
  const hemiDaySky = useMemo(() => new THREE.Color(DAY_LIGHT.hemiSky), []);
  const hemiDayGround = useMemo(
    () => new THREE.Color(DAY_LIGHT.hemiGround),
    [],
  );
  const moonCol = useMemo(() => new THREE.Color(LIGHT.moon.color), []);
  const sunCol = useMemo(() => new THREE.Color(DAY_LIGHT.sun), []);
  const sunWarm = useMemo(() => new THREE.Color(DAY_LIGHT.sunWarm), []);
  const tmp = useMemo(
    () => ({
      fwd: new THREE.Vector3(),
      p: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      last: new THREE.Vector3(1e9, 0, 0),
      lastDir: new THREE.Vector3(),
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
    const dim = 1 - 0.85 * (indoor?.current ?? 0);
    gl.toneMappingExposure = LIGHT.exposure;

    col.copy(from).lerp(to, k);
    col.lerp(dayFog, dl);
    col.lerp(dusk, twi * 0.3);
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
      hemi.current.color.copy(hemiNightSky).lerp(hemiDaySky, dl);
      hemi.current.groundColor.copy(hemiNightGround).lerp(hemiDayGround, dl);
    }
    // satu cahaya terarah: matahari kalau lebih tinggi dari bulan, kalau tidak bulan
    const m = moon.current;
    if (m) {
      const useSun = dayState.sun.y > dayState.moon.y;
      const d = useSun ? dayState.sun : dayState.moon;
      const sunI =
        DAY_LIGHT.sunIntensity * smoothstep(-0.02, 0.22, dayState.sun.y);
      const moonI =
        lerp(LIGHT.moon.startIntensity, LIGHT.moon.endIntensity, k) *
        smoothstep(-0.02, 0.22, dayState.moon.y) *
        (1 - dl);
      m.intensity = (useSun ? sunI : moonI) * dim;
      if (useSun) {
        m.color
          .copy(sunWarm)
          .lerp(sunCol, smoothstep(0.1, 0.5, dayState.sun.y));
      } else {
        m.color.copy(moonCol);
      }
      // dijaga agar tidak terlalu rendah (0.13): sore tetap punya bayangan panjang, tapi tidak lewat dari kotak bayangan
      const dy = Math.max(d.y, 0.13);
      const dir = tmp.dir.set(d.x, dy, d.z).normalize();

      // pusat bayangan = titik di depan kamera (bukan terkunci di rumah)
      camera.getWorldDirection(tmp.fwd);
      tmp.fwd.y = 0;
      if (tmp.fwd.lengthSq() > 1e-6) tmp.fwd.normalize();
      const fx = camera.position.x + tmp.fwd.x * SHADOW_LEAD;
      const fz = camera.position.z + tmp.fwd.z * SHADOW_LEAD;
      tmp.p.set(fx, groundHeight(fx, fz), fz);

      // tempel ke grid texel di ruang cahaya supaya bayangan tidak bergetar saat kamera bergerak
      tmp.right.set(dir.z, 0, -dir.x).normalize();
      tmp.up.crossVectors(dir, tmp.right);
      const texel = (SHADOW_HALF * 2) / mapSize;
      const pa = tmp.p.dot(tmp.right);
      const pb = tmp.p.dot(tmp.up);
      tmp.p
        .addScaledVector(tmp.right, Math.round(pa / texel) * texel - pa)
        .addScaledVector(tmp.up, Math.round(pb / texel) * texel - pb);

      m.target.position.copy(tmp.p);
      m.target.updateMatrixWorld();
      m.position.copy(tmp.p).addScaledVector(dir, 180);

      // Peta bayangan digambar ulang berkala, bukan tiap frame saat bergerak:
      // biaya per frame jadi rata. Matriks bayangan ikut diperbarui bersamaan dengan petanya,
      // jadi bayangan tidak bergeser-geser di antara dua pembaruan.
      tmp.n += 1;
      if (tmp.n % (quality === "high" && !mobile ? 2 : 3) === 0) {
        gl.shadowMap.needsUpdate = true;
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
