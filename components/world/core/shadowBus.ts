// Makhluk besar yang bayangannya harus mulus (naga). Tiap makhluk melaporkan posisinya tiap frame;
// TimeOfDay menggambar ulang peta bayangan tiap frame selagi ada yang dekat kamera,
// selain itu tetap berkala (lebih murah).
type Actor = { x: number; y: number; z: number; r: number };
const actors = new Map<object, Actor>();

export function reportShadowActor(
  key: object,
  x: number,
  y: number,
  z: number,
  r: number,
) {
  const a = actors.get(key);
  if (a) {
    a.x = x;
    a.y = y;
    a.z = z;
    a.r = r;
  } else actors.set(key, { x, y, z, r });
}

export function dropShadowActor(key: object) {
  actors.delete(key);
}

// Kotak bayangan saat ini (diatur TimeOfDay tiap frame): pusat datar, jarak jangkauan, dan
// pergeseran bayangan di tanah per meter ketinggian (arah menjauhi cahaya). range < 0 = bayangan mati.
const focus = { x: 0, z: 0, range: -1, slopeX: 0, slopeZ: 0 };

export function setShadowFocus(
  x: number,
  z: number,
  range: number,
  slopeX: number,
  slopeZ: number,
) {
  focus.x = x;
  focus.z = z;
  focus.range = range;
  focus.slopeX = slopeX;
  focus.slopeZ = slopeZ;
}

// Apakah bola (badan makhluk) atau bayangannya di tanah masuk jangkauan kotak bayangan?
export function inShadowReach(x: number, y: number, z: number, r: number) {
  if (focus.range < 0) return false;
  const lim = focus.range + r;
  if (Math.hypot(x - focus.x, z - focus.z) < lim) return true;
  return (
    Math.hypot(x + focus.slopeX * y - focus.x, z + focus.slopeZ * y - focus.z) <
    lim
  );
}

// Di dalam rumah naga tidak digambar, jadi tidak perlu memaksa peta bayangan digambar ulang tiap frame.
let muted = false;
export function muteShadowActors(on: boolean) {
  muted = on;
}

export function shadowActorNear() {
  if (muted) return false;
  for (const a of actors.values()) {
    if (inShadowReach(a.x, a.y, a.z, a.r)) return true;
  }
  return false;
}
