import * as THREE from "three";
import { COTTAGES, TAVERN, type Cottage } from "../../config/village";
import { routeNearest, routePointAt } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";
import { add, box, cyl, frame, type Bag } from "./villageBag";

// Yaw supaya sisi depan (+z lokal) menghadap titik jalur terdekat.
export function faceRoute(x: number, z: number) {
  const p = routePointAt(routeNearest(x, z).along);
  return Math.atan2(p.x - x, p.z - z);
}

// Yaw supaya sisi depan menghadap titik tertentu.
const faceTo = (x: number, z: number, t: [number, number]) =>
  Math.atan2(t[0] - x, t[1] - z);

// Tinggi tanah terendah dan tertinggi di bawah jejak bangunan.
// Lantai mengikuti titik tertinggi (supaya lereng tidak menembus dinding), fondasi turun sampai titik terendah.
function site(x: number, z: number, w: number, d: number, yaw: number) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  let lo = Infinity;
  let hi = -Infinity;
  for (const a of [-1, -0.5, 0, 0.5, 1])
    for (const b of [-1, -0.5, 0, 0.5, 1]) {
      const lx = (a * (w + 0.6)) / 2;
      const lz = (b * (d + 0.6)) / 2;
      const g = groundHeight(x + lx * c + lz * s, z - lx * s + lz * c);
      lo = Math.min(lo, g);
      hi = Math.max(hi, g);
    }
  return { y0: hi - 0.3, lo };
}

// Fondasi batu: dari bawah tanah terendah sampai lantai.
function footing(
  bag: Bag,
  m: THREE.Matrix4,
  w: number,
  d: number,
  y0: number,
  lo: number,
) {
  const bottom = lo - 0.6;
  const top = y0 + 0.6;
  add(bag, "stone", box(w, top - bottom, d, 0, (top + bottom) / 2, 0), m);
}

// ───────────────────────── bentuk dasar ─────────────────────────

type V = [number, number, number];

// Atap pelana BERTEBAL. Titik nol di tengah bibir atas dinding (y = 0), punggung memanjang di sumbu x.
// Lereng menerus sampai melewati dinding (overhang ox, oz) dan turun, jadi tepi atap selalu menutupi dinding.
// th = tebal atap. Bagian bawah ikut ditutup, jadi dari bawah tidak bolong.
function gableRoof(
  w: number,
  d: number,
  rise: number,
  th: number,
  ox: number,
  oz: number,
) {
  const W = w / 2 + ox;
  const hd = d / 2;
  const D = hd + oz;
  const eY = -rise * (oz / hd);
  const pos: number[] = [];
  const quad = (a: V, b: V, c: V, e: V, out: V) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const flip = n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0;
    const t = flip ? [a, c, b, a, e, c] : [a, b, c, a, c, e];
    for (const p of t) pos.push(p[0], p[1], p[2]);
  };
  for (const s of [1, -1]) {
    const o: V = [0, hd, s * rise];
    const oi: V = [0, -hd, -s * rise];
    // permukaan atas dan bawah
    quad([-W, eY, s * D], [W, eY, s * D], [W, rise, 0], [-W, rise, 0], o);
    quad(
      [-W, eY - th, s * D],
      [W, eY - th, s * D],
      [W, rise - th, 0],
      [-W, rise - th, 0],
      oi,
    );
    // bibir depan atap
    quad(
      [-W, eY, s * D],
      [W, eY, s * D],
      [W, eY - th, s * D],
      [-W, eY - th, s * D],
      [0, 0, s],
    );
    // ujung kiri dan kanan
    for (const e of [1, -1])
      quad(
        [e * W, eY, s * D],
        [e * W, rise, 0],
        [e * W, rise - th, 0],
        [e * W, eY - th, s * D],
        [e, 0, 0],
      );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(pos), 3),
  );
  g.computeVertexNormals();
  return g;
}

// Segitiga dinding di ujung atap (menutup ruang di bawah atap, rata dengan dinding). Berpusat di x = 0.
function gableWall(d: number, rise: number, th: number, side: 1 | -1 = 1) {
  const hd = d / 2;
  const a: V = [0, -th, -hd];
  const b: V = [0, -th, hd];
  const c: V = [0, rise - th - 0.04, 0];
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([...a, ...b, ...c]), 3),
  );
  g.computeVertexNormals();
  // normal harus menghadap +x: balik kalau terbalik
  const n = g.attributes.normal;
  if (n.getX(0) < 0) {
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([...b, ...a, ...c]), 3),
    );
    g.computeVertexNormals();
  }
  if (side === -1) g.rotateY(Math.PI);
  return g;
}

// Balok miring dari (x1,y1) ke (x2,y2) di bidang depan, pada kedalaman z.
function diag(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  z: number,
  t = 0.14,
  dz = 0.12,
) {
  const L = Math.hypot(x2 - x1, y2 - y1);
  const g = new THREE.BoxGeometry(L, t, dz);
  g.rotateZ(Math.atan2(y2 - y1, x2 - x1));
  g.translate((x1 + x2) / 2, (y1 + y2) / 2, z);
  return g;
}

// Rangka kayu pada satu sisi dinding (sisi depan = +z lokal). width = lebar sisi, jarak = dinding keluar.
// Sisi lain dibuat dengan memutar matriks (lihat faces()).
function timberFace(
  bag: Bag,
  m: THREE.Matrix4,
  width: number,
  yBase: number,
  h: number,
  dist: number,
) {
  const z = dist + 0.03;
  const n = Math.max(2, Math.round(width / 1.9));
  const bay = width / n;
  // rel atas dan bawah
  add(bag, "wood", box(width + 0.1, 0.18, 0.14, 0, yBase + 0.09, z), m);
  add(bag, "wood", box(width + 0.1, 0.2, 0.14, 0, yBase + h - 0.1, z), m);
  for (let i = 0; i <= n; i++)
    add(
      bag,
      "wood",
      box(0.16, h, 0.14, -width / 2 + i * bay, yBase + h / 2, z),
      m,
    );
  // dua tiang miring di ujung kiri dan kanan
  add(
    bag,
    "wood",
    diag(-width / 2, yBase + 0.1, -width / 2 + bay, yBase + h * 0.62, z),
    m,
  );
  add(
    bag,
    "wood",
    diag(width / 2, yBase + 0.1, width / 2 - bay, yBase + h * 0.62, z),
    m,
  );
}

// Empat sisi: [sudut putar, lebar sisi, jarak dari tengah]. 0 = depan, PI = belakang, +-PI/2 = samping.
function faces(
  bag: Bag,
  m: THREE.Matrix4,
  w: number,
  d: number,
  yBase: number,
  h: number,
) {
  const list: [number, number, number][] = [
    [0, w, d / 2],
    [Math.PI, w, d / 2],
    [Math.PI / 2, d, w / 2],
    [-Math.PI / 2, d, w / 2],
  ];
  for (const [a, width, dist] of list)
    timberFace(
      bag,
      m.clone().multiply(new THREE.Matrix4().makeRotationY(a)),
      width,
      yBase,
      h,
      dist,
    );
}

// ───────────────────────── jendela, pintu, pernik ─────────────────────────

// Letak jendela di dunia (untuk halo dan lampu malam). Diisi ulang tiap buildBuildings.
export const WINDOW_SPOTS: { x: number; y: number; z: number }[] = [];
// Ujung atas cerobong di dunia (untuk asap). Diisi ulang tiap buildBuildings.
export const CHIMNEY_SPOTS: { x: number; y: number; z: number }[] = [];
const spot = (m: THREE.Matrix4, x: number, y: number, z: number) => {
  const v = new THREE.Vector3(x, y, z).applyMatrix4(m);
  WINDOW_SPOTS.push({ x: v.x, y: v.y, z: v.z });
};

// Jendela depan: bingkai kayu, kaca menyala, dua daun jendela, dan kotak bunga di bawahnya.
function windowFront(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  flowers = true,
) {
  add(bag, "wood", box(1.2, 1.2, 0.16, x, y, z), m);
  add(bag, "glass", box(0.9, 0.9, 0.2, x, y, z + 0.02), m);
  add(bag, "wood", box(0.9, 0.07, 0.22, x, y, z + 0.03), m); // palang tengah
  add(bag, "wood", box(0.07, 0.9, 0.22, x, y, z + 0.03), m);
  for (const s of [-1, 1])
    add(bag, "wood", box(0.42, 1.1, 0.07, x + s * 0.8, y, z + 0.1), m); // daun jendela
  if (flowers) {
    add(bag, "wood", box(1.3, 0.25, 0.32, x, y - 0.72, z + 0.2), m);
    add(bag, "green", box(1.2, 0.22, 0.3, x, y - 0.55, z + 0.2), m);
  }
  spot(m, x, y, z + 0.9);
}
function windowSide(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
) {
  add(bag, "wood", box(0.16, 1.15, 1.15, x, y, z), m);
  add(bag, "glass", box(0.2, 0.9, 0.9, x + 0.02, y, z), m);
  spot(m, x + (x < 0 ? -0.9 : 0.9), y, z);
}

// Pintu depan berbingkai, ambang batu, atap kecil, dan lentera.
function door(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  fl: number,
  zf: number,
  stoneStep = true,
  hood = false,
) {
  add(bag, "wood", box(1.15, 2.1, 0.22, x, fl + 1.05, zf + 0.03), m);
  add(bag, "stone", box(0.14, 0.14, 0.24, x + 0.3, fl + 1.05, zf + 0.15), m); // gagang
  for (const s of [-1, 1])
    add(
      bag,
      "wood",
      box(0.18, 2.3, 0.28, x + s * 0.68, fl + 1.15, zf + 0.04),
      m,
    );
  add(bag, "wood", box(1.7, 0.22, 0.3, x, fl + 2.3, zf + 0.05), m);
  if (hood) {
    // atap kecil di atas pintu: diputar di tempatnya sendiri, tiangnya berdiri di ambang batu
    add(
      bag,
      "wood",
      box(1.9, 0.12, 1.1, 0, 0, 0),
      m
        .clone()
        .multiply(new THREE.Matrix4().makeTranslation(x, fl + 2.65, zf + 0.5))
        .multiply(new THREE.Matrix4().makeRotationX(0.14)),
    );
    for (const s of [-1, 1])
      add(
        bag,
        "wood",
        box(0.12, 2.7, 0.12, x + s * 0.85, fl + 1.3, zf + 0.95),
        m,
      );
  }
  if (stoneStep)
    add(bag, "stone", box(1.9, 1.6, 0.9, x, fl - 0.75, zf + 0.5), m); // dalam, supaya menyentuh tanah di lereng
  add(bag, "wood", box(0.06, 0.06, 0.3, x + 1.05, fl + 2.25, zf + 0.12), m); // lengan lentera
  add(bag, "glass", box(0.28, 0.4, 0.28, x + 1.05, fl + 2.0, zf + 0.25), m);
  spot(m, x + 1.05, fl + 2.0, zf + 0.6);
}

// Cerobong batu bertopi, menembus atap.
function chimney(
  bag: Bag,
  m: THREE.Matrix4,
  x: number,
  z: number,
  yFrom: number,
  yTop: number,
) {
  const h = yTop - yFrom;
  const v = new THREE.Vector3(x, yTop + 0.5, z).applyMatrix4(m);
  CHIMNEY_SPOTS.push({ x: v.x, y: v.y, z: v.z });
  add(bag, "stone", box(0.95, h, 0.95, x, yFrom + h / 2, z), m);
  add(bag, "stone", box(1.2, 0.25, 1.2, x, yTop - 0.1, z), m);
  add(bag, "stone", cyl(0.2, 0.26, 0.5, 8, x, yTop + 0.2, z), m);
}

// Titik tanah di dunia untuk koordinat lokal bangunan (untuk benda halaman).
function ground(m: THREE.Matrix4, lx: number, lz: number) {
  const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(m);
  return { x: v.x, z: v.z, y: groundHeight(v.x, v.z) };
}

const I = new THREE.Matrix4();

// Tumpukan kayu bakar, tong, dan ember di sekitar rumah. Posisi dihitung di dunia supaya menapak tanah.
function yard(bag: Bag, m: THREE.Matrix4, w: number, d: number, side: 1 | -1) {
  // kayu bakar di dinding samping
  const p = ground(m, side * (w / 2 + 0.8), -d * 0.15);
  const yr = new THREE.Euler().setFromRotationMatrix(m).y;
  const ry = new THREE.Matrix4().makeRotationY(yr);
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 4 - r; i++) {
      const g = cyl(0.16, 0.16, 1.6, 7, 0, 0, 0).rotateX(Math.PI / 2);
      g.applyMatrix4(ry);
      const off = new THREE.Vector3(
        (i - (3 - r) / 2) * 0.34,
        0,
        0,
      ).applyMatrix4(ry);
      g.translate(p.x + off.x, p.y + 0.18 + r * 0.3, p.z + off.z);
      add(bag, "wood", g, I);
    }
  // tong di sisi pintu
  const q = ground(m, -side * (w * 0.15 + 1.5), d / 2 + 0.7);
  add(bag, "wood", cyl(0.4, 0.4, 0.85, 10, q.x, q.y + 0.4, q.z), I);
}

// ───────────────────────── tipe bangunan ─────────────────────────

export function cottage(bag: Bag, c: Cottage) {
  const yaw = c.face ? faceTo(c.x, c.z, c.face) : faceRoute(c.x, c.z);
  const { y0, lo } = site(c.x, c.z, c.w, c.d, yaw);
  const m = frame(c.x, 0, c.z, yaw);
  const kind = c.kind ?? "cottage";
  if (kind === "barn") return barn(bag, c, m, yaw, y0, lo);

  const thatch = c.roof === "thatch";
  const fl = y0 + 0.6;
  const two = kind === "house";
  const h1 = c.h;
  const h2 = two ? c.h * 0.88 : 0;
  const jet = two ? 0.45 : 0; // lantai atas menjorok
  const uw = c.w + jet * 2;
  const ud = c.d + jet * 2;
  const f2 = fl + h1;
  const top = two ? f2 + h2 : fl + h1;
  const roofW = two ? uw : c.w;
  const roofD = two ? ud : c.d;

  footing(bag, m, c.w + 0.3, c.d + 0.3, y0, lo);
  add(bag, "plaster", box(c.w, h1, c.d, 0, fl + h1 / 2, 0), m);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bag,
        "wood",
        box(0.3, h1, 0.3, (sx * c.w) / 2, fl + h1 / 2, (sz * c.d) / 2),
        m,
      );
  faces(bag, m, c.w, c.d, fl, h1);

  if (two) {
    // balok penyangga dan penopang di bawah lantai atas
    add(bag, "wood", box(uw + 0.15, 0.35, ud + 0.15, 0, f2, 0), m);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(
          bag,
          "wood",
          box(
            0.3,
            0.6,
            0.3,
            sx * (c.w / 2 + 0.1),
            f2 - 0.45,
            sz * (c.d / 2 + 0.1),
          ),
          m,
        );
    add(bag, "plaster", box(uw, h2, ud, 0, f2 + h2 / 2, 0), m);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(
          bag,
          "wood",
          box(0.3, h2, 0.3, (sx * uw) / 2, f2 + h2 / 2, (sz * ud) / 2),
          m,
        );
    faces(bag, m, uw, ud, f2, h2);
  }

  // pintu dan jendela
  door(bag, m, -c.w * 0.18, fl, c.d / 2);
  windowFront(bag, m, c.w * 0.28, fl + 1.7, c.d / 2 + 0.05);
  windowSide(bag, m, c.w / 2 + 0.05, fl + 1.7, 0);
  windowSide(bag, m, -c.w / 2 - 0.05, fl + 1.7, 0);
  if (two) {
    for (const x of [-uw * 0.26, uw * 0.26])
      windowFront(bag, m, x, f2 + 1.5, ud / 2 + 0.05);
    windowSide(bag, m, uw / 2 + 0.05, f2 + 1.5, 0);
  }

  // atap
  const rise = roofD * 0.55;
  const th = thatch ? 0.5 : 0.22;
  const ox = thatch ? 0.7 : 0.5;
  const oz = thatch ? 0.6 : 0.5;
  const rm = frame(c.x, top, c.z, yaw);
  add(bag, c.roof, gableRoof(roofW, roofD, rise, th, ox, oz), rm);
  for (const s of [-1, 1])
    add(
      bag,
      "plaster",
      gableWall(roofD, rise, th, s).translate(s * (roofW / 2), 0, 0),
      rm,
    );
  // rangka kayu di dinding ujung atap
  for (const s of [-1, 1])
    for (const z of [-roofD * 0.28, 0, roofD * 0.28])
      add(
        bag,
        "wood",
        box(
          0.12,
          rise * (1 - Math.abs(z) / (roofD / 2)) * 0.8,
          0.14,
          s * (roofW / 2 + 0.04),
          rise * (1 - Math.abs(z) / (roofD / 2)) * 0.4 - th,
          z,
        ),
        rm,
      );
  // punggung atap
  if (thatch)
    add(
      bag,
      "thatch",
      cyl(0.38, 0.38, roofW + 2 * ox + 0.3, 8, 0, 0, 0)
        .rotateZ(Math.PI / 2)
        .translate(0, rise + 0.05, 0),
      rm,
    );
  else
    add(
      bag,
      "wood",
      box(roofW + 2 * ox + 0.2, 0.22, 0.4, 0, rise - 0.02, 0),
      rm,
    );

  // jendela loteng kecil di atap depan (rumah 2 lantai dan pondok genteng)
  if (two || !thatch) {
    const dz = roofD * 0.5 * 0.55;
    const dy = rise * (1 - 0.55) - 0.1;
    const dm = rm
      .clone()
      .multiply(new THREE.Matrix4().makeTranslation(0, dy, dz));
    add(bag, "plaster", box(1.5, 1.3, 1.3, 0, 0.55, 0), dm);
    add(
      bag,
      c.roof,
      gableRoof(1.3, 1.5, 0.8, 0.14, 0.3, 0.4).rotateY(Math.PI / 2),
      dm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 1.2, 0)),
    );
    add(bag, "glass", box(0.7, 0.7, 0.2, 0, 0.6, 0.62), dm);
    add(bag, "wood", box(0.9, 0.9, 0.14, 0, 0.6, 0.56), dm);
    spot(dm, 0, 0.6, 1.4);
  }

  chimney(bag, m, c.w * 0.3, -c.d * 0.15, top - 0.5, top + rise + 0.9);
  yard(bag, m, roofW, roofD, c.x < (c.face?.[0] ?? 0) ? 1 : -1);
}

function barn(
  bag: Bag,
  c: Cottage,
  m: THREE.Matrix4,
  yaw: number,
  y0: number,
  lo: number,
) {
  const fl = y0 + 0.6;
  const top = fl + c.h;
  footing(bag, m, c.w + 0.3, c.d + 0.3, y0, lo);
  add(bag, "wood", box(c.w, c.h, c.d, 0, fl + c.h / 2, 0), m);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      add(
        bag,
        "stone",
        box(0.6, c.h, 0.6, (sx * c.w) / 2, fl + c.h / 2, (sz * c.d) / 2),
        m,
      );
  // tiang tengah dan balok atas
  for (let i = -2; i <= 2; i++) {
    for (const s of [-1, 1])
      add(
        bag,
        "plaster",
        box(0.18, c.h, 0.14, i * (c.w / 5), fl + c.h / 2, s * (c.d / 2 + 0.04)),
        m,
      );
  }
  add(
    bag,
    "plaster",
    box(c.w + 0.1, 0.22, 0.16, 0, top - 0.11, c.d / 2 + 0.04),
    m,
  );
  // pintu besar dengan palang silang
  add(bag, "wood", box(3.4, 3.3, 0.22, 0, fl + 1.65, c.d / 2 + 0.06), m);
  add(
    bag,
    "plaster",
    diag(-1.6, fl + 0.1, 1.6, fl + 3.2, c.d / 2 + 0.2, 0.16, 0.08),
    m,
  );
  add(
    bag,
    "plaster",
    diag(-1.6, fl + 3.2, 1.6, fl + 0.1, c.d / 2 + 0.2, 0.16, 0.08),
    m,
  );
  // pintu gudang jerami di atas
  add(bag, "plaster", box(1.3, 1.1, 0.14, 0, top - 0.9, c.d / 2 + 0.07), m);
  add(bag, "wood", box(1.1, 0.9, 0.2, 0, top - 0.9, c.d / 2 + 0.1), m);

  const rise = c.d * 0.6;
  const th = c.roof === "thatch" ? 0.55 : 0.24;
  const rm = frame(c.x, top, c.z, yaw);
  add(bag, c.roof, gableRoof(c.w, c.d, rise, th, 1.0, 1.2), rm);
  for (const s of [-1, 1])
    add(
      bag,
      "wood",
      gableWall(c.d, rise, th, s).translate(s * (c.w / 2), 0, 0),
      rm,
    );
  add(bag, "wood", box(c.w + 2.2, 0.22, 0.4, 0, rise - 0.02, 0), rm);

  // jerami gulung di samping dan tumpukan di pintu
  for (let i = 0; i < 3; i++) {
    const p = ground(m, c.w / 2 + 1.0 + (i % 2) * 0.2, -c.d * 0.2 + i * 1.3);
    add(
      bag,
      "wheat",
      cyl(0.6, 0.6, 1.2, 10, 0, 0, 0)
        .rotateZ(Math.PI / 2)
        .translate(p.x, p.y + 0.55, p.z),
      I,
    );
  }
  const q = ground(m, -c.w * 0.3, c.d / 2 + 1.8);
  add(
    bag,
    "wood",
    box(1.6, 0.7, 1.0, 0, 0, 0)
      .rotateY(yaw)
      .translate(q.x, q.y + 0.35, q.z),
    I,
  );
}

export function tavern(bag: Bag) {
  const t = TAVERN;
  const yaw = faceRoute(t.x, t.z);
  const { y0, lo } = site(t.x, t.z, t.w, t.d, yaw);
  const m = frame(t.x, 0, t.z, yaw);
  const f1 = y0 + 0.6; // lantai bawah mulai
  const f2 = f1 + t.lower; // lantai atas mulai
  const top = f2 + t.upper;
  const uw = t.w + 1.2; // lantai atas sedikit menjorok
  const ud = t.d + 1.2;

  footing(bag, m, t.w + 0.4, t.d + 0.4, y0, lo);
  add(bag, "plaster", box(t.w, t.lower, t.d, 0, f1 + t.lower / 2, 0), m);
  add(bag, "wood", box(uw + 0.15, 0.4, ud + 0.15, 0, f2, 0), m); // balok penyangga lantai atas
  add(bag, "plaster", box(uw, t.upper, ud, 0, f2 + t.upper / 2, 0), m);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      add(
        bag,
        "wood",
        box(
          0.35,
          t.lower,
          0.35,
          (sx * t.w) / 2,
          f1 + t.lower / 2,
          (sz * t.d) / 2,
        ),
        m,
      );
      add(
        bag,
        "wood",
        box(
          0.35,
          t.upper,
          0.35,
          (sx * uw) / 2,
          f2 + t.upper / 2,
          (sz * ud) / 2,
        ),
        m,
      );
      add(
        bag,
        "wood",
        box(
          0.35,
          0.7,
          0.35,
          sx * (t.w / 2 + 0.2),
          f2 - 0.55,
          sz * (t.d / 2 + 0.2),
        ),
        m,
      );
    }
  faces(bag, m, t.w, t.d, f1, t.lower);
  faces(bag, m, uw, ud, f2, t.upper);

  // pintu ganda dan jendela
  door(bag, m, 0, f1, t.d / 2, true, true);
  for (const sx of [-1, 1])
    windowFront(bag, m, sx * t.w * 0.32, f1 + 1.8, t.d / 2 + 0.05);
  for (const x of [-t.w * 0.33, 0, t.w * 0.33])
    windowFront(bag, m, x, f2 + 1.7, ud / 2 + 0.1, false);
  for (const sx of [-1, 1]) {
    windowSide(bag, m, sx * (t.w / 2 + 0.05), f1 + 1.8, 0);
    windowSide(bag, m, sx * (uw / 2 + 0.1), f2 + 1.8, 0);
  }

  // atap genteng, dua jendela loteng, dua cerobong
  const rise = ud * 0.58;
  const rm = frame(t.x, top, t.z, yaw);
  add(bag, "tile", gableRoof(uw, ud, rise, 0.25, 0.8, 1.0), rm);
  for (const s of [-1, 1])
    add(
      bag,
      "plaster",
      gableWall(ud, rise, 0.25, s).translate(s * (uw / 2), 0, 0),
      rm,
    );
  add(bag, "wood", box(uw + 1.8, 0.24, 0.45, 0, rise - 0.02, 0), rm);
  for (const x of [-uw * 0.25, uw * 0.25]) {
    const dm = rm
      .clone()
      .multiply(
        new THREE.Matrix4().makeTranslation(x, rise * 0.4, ud * 0.5 * 0.6),
      );
    add(bag, "plaster", box(1.6, 1.5, 1.4, 0, 0.6, 0), dm);
    add(
      bag,
      "tile",
      gableRoof(1.4, 1.6, 0.9, 0.14, 0.3, 0.4).rotateY(Math.PI / 2),
      dm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 1.35, 0)),
    );
    add(bag, "glass", box(0.8, 0.8, 0.2, 0, 0.7, 0.72), dm);
    spot(dm, 0, 0.7, 1.5);
  }
  chimney(bag, m, uw * 0.32, -ud * 0.12, top - 0.5, top + rise + 1.0);
  chimney(bag, m, -uw * 0.32, -ud * 0.12, top - 0.5, top + rise + 0.6);

  // papan nama menggantung, tong, bangku
  add(
    bag,
    "wood",
    box(0.15, 0.15, 1.8, t.w * 0.44, f1 + 3.3, t.d / 2 + 0.9),
    m,
  );
  add(
    bag,
    "wood",
    box(0.12, 0.9, 1.2, t.w * 0.44, f1 + 2.65, t.d / 2 + 1.1),
    m,
  );
  // lambang papan nama: cangkir bir di kedua sisi, rantai penggantung
  for (const s of [-1, 1]) {
    add(
      bag,
      "tile",
      cyl(0.2, 0.18, 0.4, 8, 0, 0, 0)
        .rotateZ(Math.PI / 2)
        .translate(t.w * 0.44 + s * 0.1, f1 + 2.7, t.d / 2 + 1.1),
      m,
    );
    add(
      bag,
      "stone",
      box(0.04, 0.4, 0.04, t.w * 0.44, f1 + 3.15, t.d / 2 + 1.1 + s * 0.5),
      m,
    );
  }
  // tong dan bangku: tiap kaki mengikuti tinggi tanah di tempatnya (kerangka m hanya diputar, jadi y lokal = y dunia)
  const gb = (lx: number, lz: number) => ground(m, lx, lz).y;
  for (const dx of [0.8, 1.7]) {
    const lx = -t.w / 2 + dx;
    const lz = t.d / 2 + 0.8;
    add(bag, "wood", cyl(0.42, 0.42, 1.0, 10, lx, gb(lx, lz) + 0.4, lz), m);
  }
  {
    const bx = t.w * 0.2;
    const bz = t.d / 2 + 1.3;
    const seat = Math.max(gb(bx - 1, bz), gb(bx + 1, bz)) + 0.55;
    add(bag, "wood", box(2.4, 0.15, 0.5, bx, seat, bz), m);
    for (const dx of [-1, 1]) {
      const g = gb(bx + dx, bz) - 0.1;
      const hgt = seat - 0.075 - g;
      add(bag, "wood", box(0.15, hgt, 0.4, bx + dx, g + hgt / 2, bz), m);
    }
  }
}

export function buildBuildings(bag: Bag) {
  WINDOW_SPOTS.length = 0;
  CHIMNEY_SPOTS.length = 0;
  for (const c of COTTAGES) cottage(bag, c);
  tavern(bag);
}
