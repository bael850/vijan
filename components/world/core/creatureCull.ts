import * as THREE from "three";
import { inShadowReach } from "./shadowBus";

// Makhluk berkerangka (naga) dibuat tidak pernah di-cull otomatis (kotak batas hasil skin kadang meleset),
// jadi tanpa ini mereka digambar tiap frame walau di belakang kamera atau jauh di balik kabut,
// juga di peta bayangan. Di sini dicek manual dengan bola yang cukup besar.
// Aturan: tampil kalau bolanya masuk pandangan kamera dan belum lewat kabut, atau kalau bayangannya
// bisa jatuh ke area yang terlihat. Selama loading harus tampil semua (supaya shader dan tekstur terunggah),
// jadi pengecekan baru dinyalakan Boot setelah itu.
let enabled = false;
export function setCreatureCull(on: boolean) {
  enabled = on;
}

// Dinyalakan IndoorHide selagi di dalam rumah: semua makhluk dianggap tidak terlihat.
let hidden = false;
export function setCreatureHidden(on: boolean) {
  hidden = on;
}

const frustum = new THREE.Frustum();
const m = new THREE.Matrix4();
const sph = new THREE.Sphere();
const lastProj = new THREE.Matrix4().set(
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
);
const lastView = new THREE.Matrix4().set(
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
);

export function creatureVisible(
  camera: THREE.Camera,
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  r: number,
) {
  if (hidden) return false;
  if (!enabled) return true;
  sph.center.set(x, y, z);
  sph.radius = r;
  camera.updateMatrixWorld();
  // frustum hanya dihitung ulang kalau kamera berubah (dipanggil sekali per makhluk per frame)
  if (
    !lastProj.equals(camera.projectionMatrix) ||
    !lastView.equals(camera.matrixWorldInverse)
  ) {
    lastProj.copy(camera.projectionMatrix);
    lastView.copy(camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(m.multiplyMatrices(lastProj, lastView));
  }
  const fog = scene.fog as THREE.Fog | null;
  const farEnough = fog
    ? camera.position.distanceTo(sph.center) - r > fog.far
    : false;
  if (!farEnough && frustum.intersectsSphere(sph)) return true;
  return inShadowReach(x, y, z, r);
}

// Animasi makhluk berkerangka tidak perlu dihitung tiap frame kalau tidak terlihat atau jauh.
// Mengembalikan selisih waktu yang harus dimasukkan ke mixer (0 berarti lewati frame ini).
// Waktu yang terlewat dikumpulkan, jadi gerakan tetap pada tempat yang benar saat naga kembali terlihat.
export function animDt(
  s: { acc: number },
  visible: boolean,
  dist: number,
  size: number,
  dt: number,
) {
  let every = 0;
  if (enabled) {
    if (!visible) every = 0.2;
    else if (dist > size * 8) every = 0.1;
    else if (dist > size * 4) every = 0.05;
  }
  s.acc += dt;
  if (s.acc < every) return 0;
  const r = s.acc;
  s.acc = 0;
  return r;
}
