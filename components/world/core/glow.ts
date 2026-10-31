import * as THREE from "three";

let glow: THREE.CanvasTexture | null = null;
let blob: THREE.CanvasTexture | null = null;

function make(stops: [number, string][]) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Lingkaran cahaya hangat (untuk lampu, jendela, kucing). Dibuat sekali, dipakai bersama.
export function getGlow() {
  return (glow ??= make([
    [0, "rgba(255,214,140,1)"],
    [0.25, "rgba(255,190,100,0.45)"],
    [1, "rgba(255,170,80,0)"],
  ]));
}

// Bayangan lembut gelap (untuk bayangan palsu di tanah).
export function getBlob() {
  return (blob ??= make([
    [0, "rgba(0,0,0,0.85)"],
    [0.6, "rgba(0,0,0,0.45)"],
    [1, "rgba(0,0,0,0)"],
  ]));
}
