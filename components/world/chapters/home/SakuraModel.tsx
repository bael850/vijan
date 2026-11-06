"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GraphicsQuality } from "@/components/providers/GraphicsProvider";
import { PETALS, TREE } from "../../config/home";
import { dayState } from "../../core/dayCycle";
import { GROUND } from "./homeGeometry";

// Sakura dari model glb (public/models/sakura.glb), menggantikan sakura buatan kode.
// - semua gumpalan kelopak digabung jadi SATU mesh (1 draw call, bukan 38),
// - alpha blend diganti alpha test + alpha-to-coverage (tanpa masalah urutan transparan),
// - model diputar tegak, batangnya dipusatkan, diskalakan ke TREE.height meter, lalu
//   ditanam sedikit ke tanah dan diberi bercak tanah gelap di pangkalnya,
// - daun gugur dan kelopak di tanah memakai SATU kelopak asli yang diambil dari pohon ini.

type Built = {
  group: THREE.Group;
  petalMat: THREE.MeshLambertMaterial;
  leaf: THREE.BufferGeometry; // satu kelopak asli dari pohon, rebah, berpusat di titik tengahnya
  scale: number; // skala model -> meter
  owned: THREE.Material[]; // material buatan sini (dibuang saat lepas)
};

function isPetal(mat: THREE.Material) {
  return (
    mat.name === "PETAL" ||
    (mat.transparent && !!(mat as THREE.MeshStandardMaterial).map)
  );
}

// Luas kotak UV sebuah geometri. Gumpalan dengan UV tak berukuran memakai satu titik tekstur
// yang transparan, jadi tidak terlihat: dibuang saja.
function uvArea(g: THREE.BufferGeometry) {
  const uv = g.attributes.uv;
  if (!uv) return 0;
  let u0 = 1e9,
    u1 = -1e9,
    v0 = 1e9,
    v1 = -1e9;
  for (let i = 0; i < uv.count; i++) {
    u0 = Math.min(u0, uv.getX(i));
    u1 = Math.max(u1, uv.getX(i));
    v0 = Math.min(v0, uv.getY(i));
    v1 = Math.max(v1, uv.getY(i));
  }
  return (u1 - u0) * (v1 - v0);
}

// Ambil satu kelopak utuh dari pohon: kumpulan segitiga yang saling tersambung (6 titik)
// dengan UV yang menutup hampir seluruh tekstur kelopak. Hasilnya direbahkan dan dipusatkan.
function extractLeaf(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  for (const g of geos) {
    const index = g.index;
    if (!index) continue;
    const n = g.attributes.position.count;
    const par = Int32Array.from({ length: n }, (_, i) => i);
    const find = (x: number) => {
      while (par[x] !== x) {
        par[x] = par[par[x]];
        x = par[x];
      }
      return x;
    };
    for (let i = 0; i < index.count; i += 3) {
      const a = find(index.getX(i));
      par[find(index.getX(i + 1))] = a;
      par[find(index.getX(i + 2))] = a;
    }
    const groups = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      const list = groups.get(r);
      if (list) list.push(i);
      else groups.set(r, [i]);
    }
    for (const [root, vs] of groups) {
      if (vs.length < 4 || vs.length > 8) continue;
      const sub = new THREE.BufferGeometry();
      const remap = new Map<number, number>();
      const pos: number[] = [];
      const nor: number[] = [];
      const uv: number[] = [];
      const c = new THREE.Vector3();
      vs.forEach((v, k) => {
        remap.set(v, k);
        pos.push(
          g.attributes.position.getX(v),
          g.attributes.position.getY(v),
          g.attributes.position.getZ(v),
        );
        nor.push(
          g.attributes.normal.getX(v),
          g.attributes.normal.getY(v),
          g.attributes.normal.getZ(v),
        );
        uv.push(g.attributes.uv.getX(v), g.attributes.uv.getY(v));
        c.add(new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]));
      });
      c.divideScalar(vs.length);
      const idx: number[] = [];
      for (let i = 0; i < index.count; i += 3) {
        if (find(index.getX(i)) !== root) continue;
        idx.push(
          remap.get(index.getX(i))!,
          remap.get(index.getX(i + 1))!,
          remap.get(index.getX(i + 2))!,
        );
      }
      sub.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      sub.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      sub.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      sub.setIndex(idx);
      if (uvArea(sub) < 0.4) {
        sub.dispose();
        continue;
      }
      sub.translate(-c.x, -c.y, -c.z);
      // rebahkan: rata-rata normal diputar jadi menghadap atas
      const avg = new THREE.Vector3();
      for (let i = 0; i < nor.length; i += 3)
        avg.add(new THREE.Vector3(nor[i], nor[i + 1], nor[i + 2]));
      if (avg.lengthSq() > 1e-6)
        sub.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(
            avg.normalize(),
            new THREE.Vector3(0, 1, 0),
          ),
        );
      return sub;
    }
  }
  // cadangan: satu bidang bertekstur kelopak penuh
  return new THREE.PlaneGeometry(0.07, 0.05).rotateX(-Math.PI / 2);
}

function build(scene: THREE.Object3D, quality: GraphicsQuality): Built {
  scene.updateMatrixWorld(true);
  const M = TREE.model;
  const owned: THREE.Material[] = [];

  const petals: THREE.BufferGeometry[] = [];
  const solids: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
  let petalMap: THREE.Texture | null = null;

  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const src = Array.isArray(m.material) ? m.material[0] : m.material;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld); // sekalian memutar model jadi tegak
    if (isPetal(src)) {
      petalMap ??= (src as THREE.MeshStandardMaterial).map;
      for (const name of Object.keys(g.attributes))
        if (name !== "position" && name !== "normal" && name !== "uv")
          g.deleteAttribute(name);
      if (uvArea(g) < 0.01) {
        g.dispose(); // gumpalan tak terlihat
        return;
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      petals.push(g);
    } else {
      solids.push({ geo: g, mat: src });
    }
  });

  const leaf = extractLeaf(petals);

  // kualitas rendah/sedang: sebagian gumpalan kelopak dibuang (rata di seluruh tajuk)
  const keep = M.keep[quality];
  const kept = petals.filter(
    (_, i) => Math.floor((i + 1) * keep) !== Math.floor(i * keep),
  );
  petals.forEach((g) => {
    if (!kept.includes(g)) g.dispose();
  });

  // dasar batang = titik terendah; sumbu batang = rata-rata titik-titik terendah itu
  const box = new THREE.Box3();
  for (const s of solids)
    box.union(
      new THREE.Box3().setFromBufferAttribute(
        s.geo.attributes.position as THREE.BufferAttribute,
      ),
    );
  for (const g of kept)
    box.union(
      new THREE.Box3().setFromBufferAttribute(
        g.attributes.position as THREE.BufferAttribute,
      ),
    );
  const baseY = solids.length
    ? Math.min(
        ...solids.map((s) => {
          s.geo.computeBoundingBox();
          return s.geo.boundingBox!.min.y;
        }),
      )
    : box.min.y;
  const height = box.max.y - baseY;
  let cx = 0;
  let cz = 0;
  let n = 0;
  for (const s of solids) {
    const p = s.geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < baseY + height * 0.06) {
        cx += p.getX(i);
        cz += p.getZ(i);
        n++;
      }
    }
  }
  if (n) {
    cx /= n;
    cz /= n;
  } else {
    cx = (box.min.x + box.max.x) / 2;
    cz = (box.min.z + box.max.z) / 2;
  }

  const scale = TREE.height / height;
  const group = new THREE.Group();
  group.scale.setScalar(scale);
  group.rotation.y = M.yaw;
  group.position.set(TREE.x, GROUND - M.sink, TREE.z);

  const move = (g: THREE.BufferGeometry) => g.translate(-cx, -baseY, -cz);

  // batang dan dahan: dilebihkan sedikit cahayanya supaya sisi yang membelakangi matahari
  // tidak hitam pekat
  for (const sd of solids) {
    move(sd.geo);
    const src = sd.mat as THREE.MeshStandardMaterial;
    let mat: THREE.Material;
    if (src.map) {
      const c = src.clone();
      c.emissive = new THREE.Color("#ffffff");
      c.emissiveMap = src.map;
      c.emissiveIntensity = M.barkLift;
      mat = c;
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: M.branch,
        emissive: M.branch,
        emissiveIntensity: M.barkLift * 1.4,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
    }
    owned.push(mat);
    const mesh = new THREE.Mesh(sd.geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const merged = kept.length ? mergeGeometries(kept, false) : null;
  kept.forEach((g) => g.dispose());
  const petalMat = new THREE.MeshLambertMaterial({
    map: petalMap,
    emissive: "#ffffff",
    emissiveMap: petalMap,
    emissiveIntensity: M.glow.day,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    alphaToCoverage: true,
  });
  owned.push(petalMat);
  if (merged) {
    move(merged);
    const mesh = new THREE.Mesh(merged, petalMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true; // kelopak saling menaungi: tajuk jadi punya volume
    group.add(mesh);
  }
  return { group, petalMat, leaf, scale, owned };
}

// Parameter daun gugur, deterministik (tanpa Math.random supaya stabil antar render).
function makeFall(count: number) {
  let a = 91;
  const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => {
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * PETALS.spread;
    const speed = PETALS.fall[0] + r() * (PETALS.fall[1] - PETALS.fall[0]);
    const h0 = TREE.height * (0.47 + r() * 0.38);
    return {
      ox: Math.cos(ang) * rad,
      oz: Math.sin(ang) * rad,
      speed,
      h0,
      life: h0 / speed,
      off: r() * 30,
      ph: r() * 6.28,
      size: 0.85 + r() * 0.5,
      spin: 0.6 + r() * 1.2,
    };
  });
}

// Daun gugur dan kelopak di tanah: satu kelopak asli dari pohon, dipakai ulang lewat InstancedMesh.
function Leaves({
  built,
  quality,
  reduceMotion,
}: {
  built: Built;
  quality: GraphicsQuality;
  reduceMotion: boolean;
}) {
  const fall = useRef<THREE.InstancedMesh>(null);
  const ground = useRef<THREE.InstancedMesh>(null);
  const count = PETALS.count[quality];
  const gcount = PETALS.ground[quality];
  const params = useMemo(() => makeFall(count), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const base = built.scale * TREE.model.leafSize;

  // kelopak di tanah: tersebar di bawah tajuk, makin jarang ke tepi, rebah dengan arah acak
  useEffect(() => {
    const m = ground.current;
    if (!m) return;
    let a = 7;
    const r = () => (a = (a * 16807) % 2147483647) / 2147483647;
    const col = new THREE.Color();
    for (let i = 0; i < gcount; i++) {
      const ang = r() * Math.PI * 2;
      const rad = 0.8 + Math.pow(r(), 0.8) * PETALS.spread * 1.15;
      dummy.position.set(
        TREE.x + Math.cos(ang) * rad,
        GROUND + 0.03 + r() * 0.02,
        TREE.z + Math.sin(ang) * rad,
      );
      dummy.rotation.set(
        (r() - 0.5) * 0.25,
        r() * Math.PI * 2,
        (r() - 0.5) * 0.25,
      );
      dummy.scale.setScalar(base * (0.8 + r() * 0.5));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, col.setScalar(0.8 + r() * 0.2));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [gcount, base, dummy]);

  useEffect(() => {
    const m = fall.current;
    if (!m) return;
    const col = new THREE.Color();
    params.forEach((p, i) =>
      m.setColorAt(i, col.setScalar(0.82 + (p.size - 0.85) * 0.3)),
    );
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [params]);

  useFrame(({ clock }) => {
    const m = fall.current;
    if (!m) return;
    const t = clock.elapsedTime * (reduceMotion ? 0.4 : 1);
    for (let i = 0; i < count; i++) {
      const p = params[i];
      const u = (t + p.off) % p.life;
      dummy.position.set(
        TREE.x + p.ox + Math.sin(u * 1.3 + p.ph) * 0.9 + PETALS.wind.x * u,
        GROUND + 0.05 + p.h0 - p.speed * u,
        TREE.z + p.oz + Math.cos(u * 1.1 + p.ph) * 0.9 + PETALS.wind.z * u,
      );
      // berputar pelan sambil melayang; muncul dan hilang dengan mengecil, tidak tiba-tiba
      dummy.rotation.set(
        u * p.spin * 1.6 + p.ph,
        u * p.spin,
        Math.sin(u * 1.7 + p.ph) * 0.9,
      );
      const k = Math.max(0.001, Math.min(1, u / 0.6, (p.life - u) / 0.7));
      dummy.scale.setScalar(base * p.size * k);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh
        ref={fall}
        args={[built.leaf, built.petalMat, count]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={ground}
        args={[built.leaf, built.petalMat, gcount]}
        frustumCulled={false}
        receiveShadow
      />
    </>
  );
}

// Bercak tanah gelap di pangkal batang: menempelkan pohon ke rumput (seperti oklusi sentuh).
function Soil() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(34,24,15,0.85)");
    gr.addColorStop(0.35, "rgba(46,33,20,0.6)");
    gr.addColorStop(0.7, "rgba(52,40,24,0.22)");
    gr.addColorStop(1, "rgba(52,40,24,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const R = TREE.model.soilRadius;
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[TREE.x, GROUND + 0.03, TREE.z]}
      renderOrder={1}
    >
      <planeGeometry args={[R * 2, R * 2]} />
      <meshBasicMaterial
        map={tex}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
      />
    </mesh>
  );
}

function SakuraModel({
  quality,
  reduceMotion,
}: {
  quality: GraphicsQuality;
  reduceMotion: boolean;
}) {
  const { scene } = useGLTF(TREE.model.url);
  const gl = useThree((s) => s.gl);
  const built = useMemo(() => build(scene, quality), [scene, quality]);

  // peta bayangan tidak digambar ulang otomatis: minta gambar ulang begitu pohon terpasang
  useEffect(() => {
    Object.assign(gl.shadowMap, { needsUpdate: true });
  }, [gl, built]);

  const matRef = useRef<THREE.MeshLambertMaterial | null>(null);
  useEffect(() => {
    matRef.current = built.petalMat;
  }, [built]);
  useFrame(() => {
    const m = matRef.current;
    if (!m) return;
    const night = 1 - dayState.daylight;
    const g = TREE.model.glow;
    m.emissiveIntensity = g.day + (g.night - g.day) * night;
  });

  useEffect(
    () => () => {
      built.leaf.dispose();
      built.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose(); // hasil clone; material asli milik cache useGLTF
      });
      built.owned.forEach((m) => m.dispose());
    },
    [built],
  );

  return (
    <>
      <primitive object={built.group} />
      <Soil />
      <Leaves built={built} quality={quality} reduceMotion={reduceMotion} />
    </>
  );
}

// Kalau glb gagal dimuat, beri tahu Home supaya memakai sakura buatan kode lagi.
class TreeBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Sakura({
  quality,
  reduceMotion,
  onFail,
}: {
  quality: GraphicsQuality;
  reduceMotion: boolean;
  onFail: () => void;
}) {
  return (
    <TreeBoundary onFail={onFail}>
      <Suspense fallback={null}>
        <SakuraModel quality={quality} reduceMotion={reduceMotion} />
      </Suspense>
    </TreeBoundary>
  );
}

useGLTF.preload(TREE.model.url);
