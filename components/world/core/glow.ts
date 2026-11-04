import * as THREE from "three";

let glow: THREE.CanvasTexture | null = null;
let blob: THREE.CanvasTexture | null = null;
let glowWhite: THREE.CanvasTexture | null = null;

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

// Lingkaran cahaya putih netral (tanpa kuning) untuk lampu di dalam rumah.
export function getGlowWhite() {
  return (glowWhite ??= make([
    [0, "rgba(255,255,255,1)"],
    [0.25, "rgba(240,246,255,0.4)"],
    [1, "rgba(235,243,255,0)"],
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

let edge: THREE.CanvasTexture | null = null;
// Gradasi linear gelap -> transparan (v=0 gelap), untuk oklusi sudut dinding/lantai/plafon.
export function getEdge() {
  if (edge) return edge;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 64, 0, 0);
  grd.addColorStop(0, "rgba(0,0,0,0.9)");
  grd.addColorStop(0.35, "rgba(0,0,0,0.32)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 64);
  edge = new THREE.CanvasTexture(c);
  edge.colorSpace = THREE.SRGBColorSpace;
  return edge;
}

let pane: THREE.CanvasTexture | null = null;
// Bercak cahaya jendela dengan bayangan palang (salib) di tengahnya, lembut di tepinya.
export function getPaneLight() {
  if (pane) return pane;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.55, "rgba(240,246,255,0.55)");
  grd.addColorStop(1, "rgba(235,243,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = "destination-out";
  g.strokeStyle = "rgba(0,0,0,0.7)";
  g.lineWidth = 7;
  if ("filter" in g) (g as CanvasRenderingContext2D).filter = "blur(2.5px)";
  g.beginPath();
  g.moveTo(64, 0);
  g.lineTo(64, 128);
  g.moveTo(0, 64);
  g.lineTo(128, 64);
  g.stroke();
  pane = new THREE.CanvasTexture(c);
  pane.colorSpace = THREE.SRGBColorSpace;
  return pane;
}

let sheen: THREE.CanvasTexture | null = null;
// Dua garis pantulan miring seperti di kaca sungguhan. Sangat halus, hanya untuk memberi "kaca".
export function getSheen() {
  if (sheen) return sheen;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 128, 128, 0);
  const band = (a: number, b: number, o: number) => {
    grd.addColorStop(a, "rgba(255,255,255,0)");
    grd.addColorStop((a + b) / 2, `rgba(255,255,255,${o})`);
    grd.addColorStop(b, "rgba(255,255,255,0)");
  };
  band(0.2, 0.36, 0.9);
  band(0.46, 0.56, 0.55);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  sheen = new THREE.CanvasTexture(c);
  sheen.colorSpace = THREE.SRGBColorSpace;
  return sheen;
}

let ring: THREE.CanvasTexture | null = null;
// Cincin tipis dengan titik kecil di tengah: penanda "bisa diklik" yang tidak mirip sumber cahaya.
export function getRing() {
  if (ring) return ring;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(64, 64, 40, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.beginPath();
  g.arc(64, 64, 8, 0, Math.PI * 2);
  g.fill();
  ring = new THREE.CanvasTexture(c);
  ring.colorSpace = THREE.SRGBColorSpace;
  return ring;
}
