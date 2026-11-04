"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRAGON, type DragonModel } from "../../config/dragon";
import { clamp, smoothstep } from "../../core/math";
import { getBlob } from "../../core/glow";
import { dayState } from "../../core/dayCycle";
import { groundHeight } from "../../terrain/heightmap";
import { newBrain, stepBrain, type Brain, type Cam } from "./dragonBehavior";

// Nama tulang di GLB: "Bip002 Xtra16_068" (spasi jadi "_" saat dimuat). Kuncinya = tanpa angka urut di ujung.
const key = (n: string) => n.replace(/\s+/g, "_").replace(/_\d+$/, "");

// Sumbu lokal tulang di model Toothless (sudah diuji lewat simulasi rig):
//  sayap  : Z+ = ujung turun; Y+ = menyapu ke belakang di sayap kiri(-x), ke depan di sayap kanan (+x)
//  ekor   : Y+ = melengkung ke kanan (-x); Z+ = naik
//  leher  : Y+ = kepala ke kanan (-x); Z+ = menunduk
//  paha   : Z+ = kaki ke depan; lengan: Z+ = tangan ke belakang
const WING_L = ["Xtra16", "Xtra17", "Xtra18", "Xtra19"];
const WING_R = ["Xtra24", "Xtra25", "Xtra26", "Xtra19Opp"];
const FOLD = [0.4, 0.4, 0.8, 0]; // sayap dilipat ke sisi badan saat tidur
const TAIL = ["Tail", "Tail1", "Tail2", "Tail3", "Tail4", "Tail5", "Tail6"];
const NECK = ["Neck", "Neck1", "Head"];
const SPINE = ["Spine", "Spine1", "Spine2"];

const AZ = new THREE.Vector3(0, 0, 1);
const AY = new THREE.Vector3(0, 1, 0);
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();

type Rig = Map<string, { bone: THREE.Bone; rest: THREE.Quaternion }>;

// putar tulang di sekitar sumbu lokal Y lalu Z, dari pose diamnya
function turn(rig: Rig, name: string, ry: number, rz: number) {
  const r = rig.get("Bip002_" + name);
  if (!r) return;
  qa.setFromAxisAngle(AY, ry);
  qb.setFromAxisAngle(AZ, rz);
  r.bone.quaternion.copy(r.rest).multiply(qa).multiply(qb);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Gelombang kepak miring: turun cepat dan bertenaga, naik lambat. (+ = ujung sayap turun)
const stroke = (x: number) => Math.sin(x) + 0.28 * Math.sin(2 * x);
const strokeRate = (x: number) => Math.cos(x) + 0.56 * Math.cos(2 * x); // < 0 = sedang naik

function pose(rig: Rig, b: Brain, t: number, look: number, gaze: number) {
  const f = b.flap;
  const c = b.coil;

  // sayap: kepak merambat dari pangkal ke ujung, ujung tertinggal (seperti cambuk).
  // Saat sayap naik, ruas luar menekuk dan menyapu ke belakang; saat turun terentang penuh.
  // Meluncur = sayap terentang, sedikit naik, bergoyang pelan. Tidur = dilipat ke sisi badan.
  const amp = [0.6, 0.5, 0.42, 0.34];
  const lag = [0, 0.55, 1.2, 1.8];
  const fold = [0, 0.15, 0.28, 0.38];
  const rock = 0.035 * Math.sin(t * 0.6 + b.seed) * (1 - f);
  for (let i = 0; i < 4; i++) {
    const x = b.phase - lag[i];
    const glide = -0.1 - 0.05 * i;
    const flapA = glide * (1 - f) + f * (amp[i] * stroke(x) - 0.1);
    const up = clamp(-strokeRate(x), 0, 1.6) / 1.6;
    const bank = b.bank * 0.5 * (i === 0 ? 1 : 0.6);
    const z =
      lerp(flapA, i === 0 ? 0.3 : 0, c) - 0.2 * b.roar * (i < 2 ? 1 : 0.5);
    const y = c * FOLD[i] + f * fold[i] * up * (1 - c);
    turn(rig, WING_L[i], y, z + (bank + rock) * (1 - c));
    turn(rig, WING_R[i], -y, z - (bank + rock) * (1 - c));
  }

  // ekor: satu gelombang pelan merambat pangkal -> ujung (rotasi ruas bertumpuk, jadi tiap ruas
  // dibuat kecil). Ayunan belok memakai bank yang sudah halus, bukan turnRate mentah.
  // Mengikuti kepak sayap dengan lembut dan mencambuk pelan saat meraung. Tidur = melingkar.
  const turnK = -b.bank / 0.66; // belok penuh = 1 (positif = kiri)
  for (let i = 0; i < TAIL.length; i++) {
    const lash = 0.05 * b.roar * Math.sin(t * 2.2 - i * 0.7);
    const side =
      (0.05 * Math.sin(t * 0.55 - i * 0.5 + b.seed) +
        0.015 * Math.sin(t * 0.9 - i * 0.8 + 2) -
        b.bank * 0.035 * (1 + 0.1 * i) +
        lash) *
        (1 - c) +
      c * 0.4 * b.dir;
    const up =
      (0.025 * f * Math.sin(b.phase - i * 0.35 + 1.2) + b.pitch * 0.05) *
      (1 - c);
    turn(rig, TAIL[i], side, up);
  }
  // sirip ekor: getaran sangat halus dan sedikit mengembang saat belok
  const fin = (0.05 * Math.sin(t * 1.1 + b.seed) + 0.1 * turnK) * (1 - c);
  turn(rig, "Xtra12", fin, 0);
  turn(rig, "Xtra14", -fin, 0);

  // tubuh dan leher: tidur = melengkung ke sisi yang sama dengan ekor, kepala menunduk.
  // Terbang = leher berbentuk S (pangkal naik, tengah turun), kepala memimpin belokan,
  // punggung melenting mengikuti kepak. peek = kepala terangkat menoleh ke kamera.
  // look = sudut kamera (rad, kiri positif). gaze = 0..1 makin dekat makin menatap.
  // roar = kepala terlempar ke atas, rahang terbuka, leher bergetar.
  const rest = c * (1 - b.peek);
  const arch = 0.035 * f * Math.sin(b.phase + 0.4) * (1 - c);
  SPINE.forEach((n, i) =>
    turn(rig, n, 0.1 * c * b.dir - turnK * (0.05 + 0.03 * i) * (1 - c), arch),
  );
  const g = gaze * (1 - c);
  const nod =
    0.03 * Math.sin(b.phase + 2) * (1 - c) -
    b.pitch * 0.5 * (1 - c) +
    0.25 * rest +
    0.14 * g;
  const sway = 0.12 * Math.sin(t * 0.5 + b.seed) * (1 - c) * (1 - 0.6 * g);
  // rotasi ruas leher bertumpuk, jadi total tiap gerak dijaga kecil (jumlah tiga ruas)
  const w = [0.15, 0.25, 0.3]; // total menoleh maksimum ~0,7 x look
  const sCurve = [-0.08, 0.1, 0.06]; // bentuk S halus: pangkal naik, tengah menunduk
  const lead = [0.4, 0.7, 1]; // kepala paling dulu masuk belokan
  for (let i = 0; i < NECK.length; i++) {
    const turnHead = -look * w[i] * (b.peek + (1 - c) * (0.35 + 0.65 * gaze));
    const shake = 0.02 * Math.sin(t * 28 + i) * b.roar;
    const lean = -turnK * 0.07 * lead[i] * (1 - c) * (1 - 0.6 * gaze);
    const s = sCurve[i] * (1 - c) * (1 - 0.8 * b.roar);
    turn(
      rig,
      NECK[i],
      sway * 0.4 + 0.3 * rest * b.dir + turnHead + shake + lean,
      nod * 0.4 + s - 0.28 * b.roar,
    );
  }
  // rahang bawah = tulang Xtra01 (engsel di belakang kepala, Z+ = mulut membuka)
  const snarl = 0.12 * g * (0.5 + 0.5 * Math.sin(t * 1.3)) * (1 - b.roar);
  turn(rig, "Xtra01", 0, 0.55 * b.roar + snarl);

  // kaki belakang dan depan dilipat ke belakang saat terbang, setengah saat tidur
  const k = Math.max(b.tuck, c * 0.6);
  for (const s of ["L", "R"]) {
    turn(rig, `${s}_Thigh`, 0, -0.9 * k);
    turn(rig, `${s}_Calf`, 0, -0.8 * k);
    turn(rig, `${s}_UpperArm`, 0, 0.7 * k);
    turn(rig, `${s}_Forearm`, 0, 0.9 * k);
  }
}

export default function Dragon({
  index,
  model: spec,
  peers,
}: {
  index: number;
  model: DragonModel;
  peers: Brain[];
}) {
  const { scene } = useGLTF(spec.url);
  const group = useRef<THREE.Group>(null);
  const brain = useRef<Brain | null>(null);
  const camInfo = useRef<Cam>({ x: 0, y: 0, z: 0, fx: 0, fz: 0 });
  const camDir = useMemo(() => new THREE.Vector3(), []);

  // keluar dari daftar naga saat dilepas
  useEffect(() => {
    return () => {
      const i = brain.current ? peers.indexOf(brain.current) : -1;
      if (i >= 0) peers.splice(i, 1);
    };
  }, [peers]);
  const size = useMemo(
    () =>
      (DRAGON.size[0] + Math.random() * (DRAGON.size[1] - DRAGON.size[0])) *
      spec.scale,
    [spec.scale],
  );

  const { model, rig } = useMemo(() => {
    const s = cloneSkinned(scene);
    const rig: Rig = new Map();
    s.traverse((o) => {
      const bone = o as THREE.Bone;
      if (bone.isBone)
        rig.set(key(bone.name), { bone, rest: bone.quaternion.clone() });
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const old = m.material as THREE.MeshBasicMaterial;
      // model asli unlit: dibuat menerima cahaya, plus terang dasar supaya tidak hilang di malam hari
      m.material = new THREE.MeshLambertMaterial({
        map: old.map,
        side: THREE.DoubleSide,
        emissive: new THREE.Color("#ffffff"),
        emissiveMap: old.map,
        emissiveIntensity: DRAGON.glow,
      });
      m.frustumCulled = false;
      m.castShadow = false;
    });
    const wrap = new THREE.Group();
    wrap.add(s);
    return { model: wrap, rig };
  }, [scene]);
  const lookS = useRef(0);

  // bayangan palsu di tanah: bulatan lembut, jatuh menjauhi cahaya, rebah mengikuti lereng
  const shadowTilt = useRef<THREE.Group>(null);
  const shadowYaw = useRef<THREE.Group>(null);
  const shadowMesh = useRef<THREE.Mesh>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const blob = useMemo(getBlob, []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const nrm = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const cam = state.camera.position;
    // posisi dan arah pandang kamera: naga memilih tempat di depan pandangan
    state.camera.getWorldDirection(camDir);
    const ci = camInfo.current;
    ci.x = cam.x;
    ci.y = cam.y;
    ci.z = cam.z;
    ci.fx = camDir.x;
    ci.fz = camDir.z;
    if (!brain.current) {
      brain.current = newBrain(ci, index);
      peers.push(brain.current);
    }
    const b = brain.current;
    stepBrain(b, ci, dt, peers);

    if (spec.rig === "toothless") {
      // sudut kamera dari arah hadap naga (kiri positif), untuk menoleh
      const dx = cam.x - b.x;
      const dz = cam.z - b.z;
      const lx = dx * Math.cos(b.yaw) - dz * Math.sin(b.yaw);
      const lz = dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw);
      const lookRaw = clamp(Math.atan2(lx, lz), -0.9, 0.9);
      // kamera di belakang naga: kepala tidak ikut menoleh (leher tidak boleh terpuntir)
      const front = smoothstep(-0.2, 0.5, lz / (Math.hypot(lx, lz) || 1));
      // kepala menoleh pelan dan berat, bukan menyentak
      lookS.current +=
        (lookRaw * front - lookS.current) * (1 - Math.exp(-1.2 * dt));
      const gaze =
        smoothstep(DRAGON.gaze[0], DRAGON.gaze[1], Math.hypot(dx, dz)) * front;
      pose(rig, b, state.clock.elapsedTime, lookS.current, gaze);
    }

    // tidur: badan turun menempel tanah
    const drop = b.coil * DRAGON.lieDrop * size;
    // badan terangkat sedikit tiap sayap menghentak turun, hidung ikut bergoyang
    const air = smoothstep(1, 4, b.agl) * (1 - b.coil) * b.flap;
    const heave = size * 0.16 * air * Math.sin(b.phase - 0.2);
    g.position.set(b.x, b.y - drop + heave, b.z);
    g.rotation.order = "YXZ";
    g.rotation.set(b.pitch + 0.03 * air * Math.cos(b.phase), b.yaw, b.bank);
    g.scale.setScalar(size);

    // ---- bayangan di tanah ----
    const sg = shadowTilt.current;
    const sy = shadowYaw.current;
    const sm = shadowMesh.current;
    const mt = shadowMat.current;
    if (sg && sy && sm && mt) {
      const ld =
        dayState.sun.y > dayState.moon.y ? dayState.sun : dayState.moon;
      const ly = Math.max(ld.y, 0.3);
      const h = Math.max(b.agl, 0);
      // geser menjauhi cahaya sejauh tinggi / elevasi, dibatasi supaya tidak terlalu jauh
      let ox = (-ld.x * h) / ly;
      let oz = (-ld.z * h) / ly;
      const ol = Math.hypot(ox, oz);
      if (ol > 45) {
        ox *= 45 / ol;
        oz *= 45 / ol;
      }
      const sx = b.x + ox;
      const sz = b.z + oz;
      const gy = groundHeight(sx, sz);
      const e = 2;
      nrm
        .set(
          groundHeight(sx - e, sz) - groundHeight(sx + e, sz),
          2 * e,
          groundHeight(sx, sz - e) - groundHeight(sx, sz + e),
        )
        .normalize();
      sg.position.set(sx, gy + 0.3, sz);
      sg.quaternion.setFromUnitVectors(up, nrm);
      sy.rotation.y = b.yaw;
      // sayap terentang saat terbang, terlipat saat tidur; makin tinggi makin lebar dan pudar
      const spread = 1 - 0.65 * b.coil;
      const soft = 1 + 0.5 * clamp(h / 60, 0, 1);
      sm.scale.set(8 * size * spread * soft, 5 * size * soft, 1);
      const lightK = clamp((ld.y + 0.02) / 0.24, 0, 1);
      const strength = 0.14 + 0.4 * dayState.daylight;
      mt.opacity = strength * lightK * (1 - 0.6 * smoothstep(10, 80, h));
      sm.visible = mt.opacity > 0.01;
    }
  });

  return (
    <>
      <group ref={group}>
        <primitive object={model} />
      </group>
      <group ref={shadowTilt}>
        <group ref={shadowYaw}>
          <mesh
            ref={shadowMesh}
            rotation-x={-Math.PI / 2}
            renderOrder={2}
            frustumCulled={false}
            visible={false}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              ref={shadowMat}
              map={blob}
              transparent
              opacity={0}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
    </>
  );
}

for (const m of DRAGON.models) useGLTF.preload(m.url);
