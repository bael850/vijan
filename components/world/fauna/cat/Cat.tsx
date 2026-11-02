"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CAT } from "../../config/cat";
import { getGlow } from "../../core/glow";
import { dayState } from "../../core/dayCycle";
import { CAMERA } from "../../config/scroll";
import { ROAD_LENGTH, roadPointAt } from "../../path/roadDistance";
import {
  funPose,
  dashHome,
  leaveHome,
  newHome,
  reactHome,
  stepHome,
  type Home,
} from "./catHome";
import { groundHeight } from "../../terrain/heightmap";
import { newBehavior, stepBehavior } from "./catBehavior";
import { gazeTo } from "./catGaze";
import { meow } from "./catSound";
import {
  applyInteraction,
  followsPointer,
  hopOffset,
  newInteraction,
  pet,
  stepInteraction,
  type Region,
} from "./catInteraction";
import { newMotion, stepMotion } from "./catMotion";
import { smoothstep } from "../../core/math";
import { STAIR_SLOPE } from "./catStairs";
import { smoothNormals } from "./catGeometry";
import { approachPose, newPose, writePose, type PoseVel } from "./catPose";
import {
  FRAG,
  FRAG_DECL,
  UNI,
  VERT,
  VERT_DECL,
  tickCatLight,
} from "./CatShader";

// selisih sudut a - b dalam -PI..PI
const angleDiff = (a: number, b: number) => {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

// Kucing oranye yang berjalan di depan kamera, menoleh ke kamera atau kursor, duduk,
// kedip, mengeong, dan bereaksi saat dielus.
// camDist = posisi kamera sepanjang jalan (meter), diisi oleh CameraRig.
export default function Cat({
  camDist,
  reduceMotion,
}: {
  camDist: MutableRefObject<number>;
  reduceMotion: boolean;
}) {
  const { scene } = useGLTF(CAT.modelUrl);
  const group = useRef<THREE.Group>(null);
  const motion = useRef(newMotion());
  const behavior = useRef(newBehavior());
  const inter = useRef(newInteraction());
  const meowing = useRef({ idle: false, pet: false });
  const pose = useRef(newPose());
  const yaw = useRef<number | null>(null);
  const home = useRef<Home | null>(null);
  const homeScale = useRef(1);
  const pitch = useRef(0);
  const poseVel = useRef<PoseVel>({});
  const wasPetting = useRef(false);
  const bend = useRef(0);
  const squash = useRef(0);
  const lastYaw = useRef<number | null>(null);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const lastPointer = useRef(new THREE.Vector2(9, 9));
  const aim = useMemo(() => new THREE.Vector3(), []);
  const shadow = useRef<THREE.Group>(null);
  const glow = useMemo(getGlow, []);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const shadowTex = useMemo(() => {
    // bayangan lembut ala gaussian: inti gelap, tepi hilang halus
    const N = 128;
    const cv = document.createElement("canvas");
    cv.width = cv.height = N;
    const x = cv.getContext("2d");
    if (x) {
      const img = x.createImageData(N, N);
      const edge = Math.exp(-4.5);
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const r = Math.hypot((i + 0.5) / N - 0.5, (j + 0.5) / N - 0.5) * 2;
          const a = Math.max(0, Math.exp(-r * r * 4.5) - edge) / (1 - edge);
          img.data[(j * N + i) * 4 + 3] = Math.round(255 * a);
        }
      x.putImageData(img, 0, 0);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const selfLight = useRef<THREE.PointLight>(null);
  const selfGlow = useRef<THREE.SpriteMaterial>(null);
  const homeK = useRef(0);
  const shadowY = useRef<number | null>(null);
  const shadowSize = useRef({ l: 1, w: 1 });

  // Model asli = satu mesh tanpa tulang. Semua gerak ada di shader (CatShader.ts).
  const model = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      // model asli unlit (tanpa normal). Dibuat menerima cahaya: normal dihitung,
      // material Lambert, plus cahaya dasar tipis supaya tidak gelap total di malam/dalam rumah.
      const old = m.material as THREE.MeshBasicMaterial;
      m.geometry = smoothNormals(m.geometry);
      const mat = new THREE.MeshLambertMaterial({ map: old.map });
      mat.color.set(CAT.tint);
      m.receiveShadow = true;
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, UNI);
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
          .replace("#include <begin_vertex>", VERT);
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", `#include <common>\n${FRAG_DECL}`)
          .replace(
            "#include <map_fragment>",
            `#include <map_fragment>\n${FRAG}\n  totalEmissiveRadiance = diffuseColor.rgb * mix(${CAT.ambientDay.toFixed(3)}, ${CAT.ambient.toFixed(3)}, uNight);`,
          )
          // tepi bulu sedikit bersinar hangat (rim), memberi kesan berbulu
          .replace(
            "#include <opaque_fragment>",
            `float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
  outgoingLight += diffuseColor.rgb * vec3(1.0, 0.78, 0.55) * rim * mix(${CAT.rimDay.toFixed(3)}, ${CAT.rim.toFixed(3)}, uNight);
  #include <opaque_fragment>`,
          );
      };
      mat.customProgramCacheKey = () => "kucing-vijan-4";
      m.material = mat;
      // bayangan cahaya bulan memakai gerak kaki/kepala yang sama
      const depth = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
      });
      depth.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, UNI);
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", `#include <common>\n${VERT_DECL}`)
          .replace("#include <begin_vertex>", VERT);
      };
      depth.customProgramCacheKey = () => "kucing-vijan-depth-1";
      m.customDepthMaterial = depth;
      m.castShadow = true;
      m.frustumCulled = false;
    });
    // kaki tepat di lantai, badan di tengah
    const box = new THREE.Box3().setFromObject(s);
    const c = box.getCenter(new THREE.Vector3());
    s.position.set(-c.x, -box.min.y, -c.z);
    const wrap = new THREE.Group();
    wrap.add(s);
    return wrap;
  }, [scene]);

  // kursor kembali normal kalau kucing hilang dari layar
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const { clock, camera, pointer, raycaster } = state;
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    tickCatLight();
    const night = dayState.lamps; // 0 siang, 1 malam
    const m = motion.current;
    const it = inter.current;

    // masuk rumah begitu kamera tiba di pintu; keluar lagi kalau kamera mundur jauh
    const enterAt = ROAD_LENGTH - CAMERA.stopBeforeDoor - 0.5;
    if (!home.current && m.init && camDist.current >= enterAt) {
      home.current = newHome(
        g.position.x,
        g.position.y - hopOffset(it),
        g.position.z,
      );
    } else if (home.current && camDist.current < enterAt - 4) {
      home.current = null;
      m.d = ROAD_LENGTH - 0.5;
      m.v = 0;
      yaw.current = null;
    }
    const hm = home.current;
    const ptrSpeed =
      lastPointer.current.distanceTo(pointer) / Math.max(dt, 0.001);
    stepInteraction(it, dt, ptrSpeed);
    // mulai diusap: kucing yang sedang jalan berhenti (yang tidur tetap tidur sambil mendengkur)
    const pettingNow = it.petting > 0.5;
    if (
      pettingNow &&
      !wasPetting.current &&
      home.current &&
      !home.current.sleepy
    )
      reactHome(home.current);
    wasPetting.current = pettingNow;
    if (it.leaveNow) {
      it.leaveNow = false;
      if (home.current) leaveHome(home.current);
    }

    let px: number;
    let py: number;
    let pz: number;
    let target: number;
    let ground: number;
    if (hm) {
      camera.getWorldDirection(fwd);
      const fl = Math.hypot(fwd.x, fwd.z) || 1;
      stepHome(hm, dt, {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        fx: fwd.x / fl,
        fz: fwd.z / fl,
      });
      const sp = Math.abs(hm.speed);
      m.v = hm.speed;
      m.walk = smoothstep(0.08, 0.5, sp);
      m.run = smoothstep(2.6, 3.8, sp);
      m.phase += sp * CAT.stride * dt;
      m.stillFor = sp < 0.05 ? m.stillFor + dt : 0;
      if (hm.sleepy && hm.mode === "idle")
        m.stillFor = Math.max(m.stillFor, 21);
      px = hm.x;
      py = hm.y + hopOffset(it);
      pz = hm.z;
      target = hm.yaw;
      ground = hm.ground;
    } else {
      stepMotion(m, camDist.current, dt);
      const p = roadPointAt(m.d);
      px = p.x;
      pz = p.z;
      ground = groundHeight(p.x, p.z);
      py = ground + hopOffset(it);
      target = Math.atan2(-p.tz * m.dir, p.tx * m.dir);
    }
    // miring badan mengikuti tangga (hidung naik saat mendaki, turun saat menuruni)
    const pitchT = hm
      ? STAIR_SLOPE * 0.85 * Math.sin(hm.yaw) * hm.stair + hm.tilt
      : 0;
    pitch.current += (pitchT - pitch.current) * (1 - Math.exp(-10 * dt));
    py +=
      CAT.scale * homeScale.current * 0.3 * Math.abs(Math.sin(pitch.current));
    g.position.set(px, py, pz);
    homeScale.current +=
      ((hm ? 0.6 : 1) - homeScale.current) * (1 - Math.exp(-3 * dt));
    if (yaw.current === null) yaw.current = target;
    yaw.current +=
      angleDiff(target, yaw.current) * (1 - Math.exp(-(hm ? 6 : 8) * dt));
    g.rotation.order = "YXZ";
    g.rotation.y = yaw.current;
    g.rotation.z = pitch.current;

    const sh = shadow.current;
    if (sh) {
      // bayangan jatuh di permukaan yang menahan kucing (lantai, tangga, kasur)
      if (shadowY.current === null) shadowY.current = ground;
      shadowY.current += (ground - shadowY.current) * (1 - Math.exp(-22 * dt));
      const sy = Math.min(shadowY.current, py);
      const hop = Math.max(0, py - sy);
      const ps = pose.current;
      const stair = hm ? hm.stair : 0;
      // bentuk ikut pose: duduk = ringkas, meringkuk = lebar, jalan = agak panjang
      const tl =
        1 - 0.28 * ps.sit - 0.2 * ps.loaf + 0.06 * m.walk + 0.1 * m.run;
      const tw = 1 + 0.12 * ps.loaf - 0.08 * ps.sit - 0.1 * stair;
      const sz = shadowSize.current;
      sz.l += (tl - sz.l) * (1 - Math.exp(-6 * dt));
      sz.w += (tw - sz.w) * (1 - Math.exp(-6 * dt));
      // makin tinggi: makin kecil, makin kabur, makin pudar
      const fall = 1 / (1 + hop * 3);
      const grow = 1 + hop * 0.5;
      sh.position.set(px, sy + 0.02, pz);
      sh.rotation.y = yaw.current;
      sh.scale.set(
        sz.l * fall * grow * homeScale.current,
        1,
        sz.w * fall * grow * homeScale.current,
      );
      if (shadowMat.current)
        shadowMat.current.opacity =
          (hm ? 0.55 : 0.4) * fall * fall * (1 - 0.25 * stair);
    }
    g.scale.setScalar(CAT.scale * homeScale.current);

    // lentera kucing terang di luar; di dalam rumah diredupkan supaya cahaya lampu rumah yang berperan
    homeK.current += ((hm ? 1 : 0) - homeK.current) * (1 - Math.exp(-2.5 * dt));
    // dan hanya menyala di malam hari: siang hari intensitasnya 0 (lampu tetap ada supaya shader tidak dikompilasi ulang)
    if (selfLight.current) {
      selfLight.current.intensity =
        CAT.lanternLight * (1 - 0.8 * homeK.current) * night;
      selfLight.current.distance = 7 - 3.5 * homeK.current;
    }
    if (selfGlow.current)
      selfGlow.current.opacity =
        CAT.lanternGlow * (1 - 0.73 * homeK.current) * night;

    // kursor bergerak -> kucing melihat ke arah kursor; kalau tidak, ke kamera
    if (lastPointer.current.distanceTo(pointer) > 0.002) {
      lastPointer.current.copy(pointer);
      it.sincePointer = 0;
    }
    const toCam = Math.hypot(camera.position.x - px, camera.position.z - pz);
    if (followsPointer(it)) {
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.at(toCam, aim);
    } else {
      aim.copy(camera.position);
    }
    const gz = gazeTo(
      g.position.x,
      g.position.y,
      g.position.z,
      yaw.current,
      CAT.scale * homeScale.current * 0.8,
      aim.x,
      aim.y,
      aim.z,
    );
    const gaze = {
      yaw: gz.yaw,
      pitch: gz.pitch,
      w: (toCam < 30 ? 1 : 0) * (1 - 0.5 * m.walk),
    };

    const targetPose = stepBehavior(behavior.current, m, gaze, t, dt);

    const near = Math.max(0, 1 - toCam / 22) ** 1.5;
    const idleNow = behavior.current.meowT >= 0;
    const petNow = it.meowLeft > 0;
    if (idleNow && !meowing.current.idle) meow("idle", near);
    if (petNow && !meowing.current.pet) meow("pet", Math.max(near, 0.6));
    meowing.current.idle = idleNow;
    meowing.current.pet = petNow;
    if (hm) {
      const fun = funPose(hm) as Record<string, number>;
      for (const k of Object.keys(fun)) {
        const key = k as keyof typeof targetPose;
        targetPose[key] = Math.max(targetPose[key], fun[k]);
      }
    }
    applyInteraction(targetPose, it);
    approachPose(pose.current, targetPose, dt, poseVel.current);
    writePose(UNI, pose.current);

    // lentur badan: melengkung saat belok, jongkok/meregang saat melompat, napas
    const yawRate =
      lastYaw.current === null || dt <= 0
        ? 0
        : angleDiff(yaw.current, lastYaw.current) / dt;
    lastYaw.current = yaw.current;
    const bendT = Math.max(
      -1,
      Math.min(1, yawRate * 0.25 * (0.35 + 0.65 * m.walk)),
    );
    bend.current += (bendT - bend.current) * (1 - Math.exp(-9 * dt));
    squash.current +=
      ((hm ? hm.squash : 0) - squash.current) * (1 - Math.exp(-16 * dt));
    const sleepy = !!hm && hm.sleepy && hm.mode === "idle";
    UNI.uBend.value = bend.current;
    UNI.uSquash.value = squash.current;
    UNI.uBreath.value =
      Math.sin(t * (sleepy ? 1.7 : 2.8)) *
      (1 - 0.6 * m.walk) *
      (sleepy ? 1.5 : 1);

    UNI.uT.value = t;
    UNI.uPhase.value = m.phase;
    UNI.uWalk.value = m.walk;
    UNI.uRun.value = m.run;
    UNI.uAmp.value = 0.4 + 0.25 * m.run + (hm ? 0.12 * hm.stair : 0);
    UNI.uTail.value = reduceMotion ? 0.2 : 0.7 - 0.2 * m.walk;
  });

  return (
    <>
      <group ref={shadow}>
        <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
          <planeGeometry args={[CAT.scale * 1.9, CAT.scale * 1.0]} />
          <meshBasicMaterial
            ref={shadowMat}
            map={shadowTex}
            transparent
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
            toneMapped={false}
          />
        </mesh>
      </group>
      <group
        ref={group}
        onPointerOver={(e) => {
          e.stopPropagation();
          inter.current.hover = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          inter.current.hover = false;
          document.body.style.cursor = "";
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          inter.current.down = true;
          inter.current.downT = 0;
        }}
        onPointerUp={() => {
          inter.current.down = false;
        }}
        onClick={(e) => {
          e.stopPropagation();
          const it = inter.current;
          // ditahan lama = mengusap, bukan klik
          const held = it.downT > 0.5;
          it.downT = 0;
          if (held) return;
          // bagian yang disentuh (koordinat model: x -0.5..0.5 depan-belakang, y 0..1 tinggi)
          const lp = group.current
            ? group.current.worldToLocal(e.point.clone())
            : null;
          const region: Region =
            lp && lp.x > 0.22 && lp.y > 0.35
              ? "head"
              : lp && lp.x < -0.2 && lp.y > 0.4
                ? "tail"
                : lp && lp.y < 0.25
                  ? "paws"
                  : "body";
          const hm = home.current;
          const r = pet(it, performance.now() / 1000, {
            region,
            sleepy: !!hm && hm.sleepy && hm.mode === "idle",
          });
          motion.current.stillFor = 0;
          if (hm) {
            reactHome(hm);
            if (r === "zoomies") dashHome(hm);
          }
        }}
      >
        <pointLight
          ref={selfLight}
          color="#ffc27a"
          intensity={3.5}
          distance={7}
          position={[0, 1.1, 0]}
        />
        <sprite position={[0, 0.55, 0]} scale={[3.2, 3.2, 1]}>
          <spriteMaterial
            ref={selfGlow}
            map={glow}
            color="#ffb870"
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.3}
          />
        </sprite>
        <primitive object={model} />
      </group>
    </>
  );
}

useGLTF.preload(CAT.modelUrl);
