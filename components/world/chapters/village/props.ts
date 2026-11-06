import * as THREE from "three";
import {
  BANNERS,
  BENCHES,
  CART,
  FIELDS,
  FIELD_ROW,
  HAYSTACKS,
  LAMPS,
  MILL,
  MUSHROOMS,
  SCARECROWS,
  STALLS,
  WELL,
} from "../../config/village";
import { routeDist } from "../../core/route";
import { groundHeight } from "../../terrain/heightmap";
import { WINDOW_SPOTS } from "./buildings";
import { add, box, cyl, frame, prism, type Bag } from "./villageBag";

// Badan kincir (diam). Baling-baling dibuat terpisah di buildSails() karena berputar.
export function windmillBody(bag: Bag, seg: number) {
  const M = MILL;
  const y0 = groundHeight(M.x, M.z) - 0.2;
  const m = frame(M.x, 0, M.z, M.yaw);
  const rAt = (y: number) => M.rBase - (M.rBase - M.rTop) * (y / M.h);
  add(
    bag,
    "stone",
    cyl(M.rBase + 0.4, M.rBase + 0.8, 3, seg, 0, y0 + 0.5, 0),
    m,
  );
  add(
    bag,
    "plaster",
    cyl(M.rTop, M.rBase, M.h, seg, 0, y0 + 2 + M.h / 2, 0),
    m,
  );
  add(
    bag,
    "wood",
    cyl(rAt(3) + 0.7, rAt(3) + 0.7, 0.18, seg, 0, y0 + 2 + 3, 0),
    m,
  ); // balkon
  add(
    bag,
    "tile",
    new THREE.ConeGeometry(M.rTop + 0.9, 4.2, seg).translate(
      0,
      y0 + 2 + M.h + 2.1,
      0,
    ),
    m,
  );
  add(bag, "wood", box(1.3, 2.3, 0.3, 0, y0 + 2 + 1.15, rAt(1.2) + 0.1), m); // pintu
  add(
    bag,
    "wood",
    box(0.9, 0.9, 1.6, 0, y0 + 2 + M.hubY, rAt(M.hubY) + 0.6),
    m,
  ); // poros
  // detail: tangga batu ke pintu, bingkai pintu, jendela, pagar balkon, cincin kayu, sak, kincir bertiang
  for (let i = 0; i < 4; i++) {
    const topY = y0 + 0.2 + 0.45 * (i + 1);
    const hgt = topY - (y0 - 0.6);
    add(
      bag,
      "stone",
      box(2.3, hgt, 0.75, 0, y0 - 0.6 + hgt / 2, rAt(1) + 0.4 + (3 - i) * 0.75),
      m,
    );
  }
  for (const sx of [-1, 1])
    add(
      bag,
      "wood",
      box(0.2, 2.5, 0.35, sx * 0.8, y0 + 2 + 1.25, rAt(1.2) + 0.12),
      m,
    );
  add(bag, "stone", box(2.2, 0.35, 0.45, 0, y0 + 2 + 2.55, rAt(2.5) + 0.12), m);
  for (const hh of [6.5, 10]) {
    add(bag, "wood", box(0.95, 1.3, 0.22, 0, y0 + 2 + hh, rAt(hh) + 0.03), m);
    add(bag, "glass", box(0.7, 1.0, 0.25, 0, y0 + 2 + hh, rAt(hh) + 0.06), m);
    const v = new THREE.Vector3(0, y0 + 2 + hh, rAt(hh) + 0.8).applyMatrix4(m);
    WINDOW_SPOTS.push({ x: v.x, y: v.y, z: v.z });
  }
  const rr = rAt(3) + 0.7;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    add(
      bag,
      "wood",
      box(0.1, 1.0, 0.1, Math.cos(a) * rr, y0 + 2 + 3.5, Math.sin(a) * rr),
      m,
    );
  }
  add(
    bag,
    "wood",
    new THREE.TorusGeometry(rr, 0.05, 5, 28)
      .rotateX(Math.PI / 2)
      .translate(0, y0 + 2 + 4, 0),
    m,
  );
  for (const hh of [8, 11.5])
    add(
      bag,
      "wood",
      new THREE.TorusGeometry(rAt(hh) + 0.04, 0.09, 5, 24)
        .rotateX(Math.PI / 2)
        .translate(0, y0 + 2 + hh, 0),
      m,
    );
  add(bag, "wood", cyl(0.07, 0.1, 1.4, 6, 0, y0 + 2 + M.h + 4.9, 0), m); // tiang puncak
  add(bag, "tile", box(0.9, 0.3, 0.05, 0.45, y0 + 2 + M.h + 5.4, 0), m); // bendera kecil
  for (let i = 0; i < 3; i++)
    add(
      bag,
      "fabric",
      cyl(
        0.34,
        0.4,
        0.7,
        8,
        2.1 + i * 0.6,
        y0 + 0.55,
        rAt(1) + 1.4 + (i % 2) * 0.25,
      ),
      m,
    );
  return { y0, m };
}

// Baling-baling dalam kerangka lokal (pusat di poros, bidang xy). Empat lengan + papan kain.
export function buildSails(bag: Bag) {
  const L = MILL.sailLen;
  const I = new THREE.Matrix4();
  add(bag, "sailWood", box(0.35, L * 2, 0.3, 0, 0, 0), I);
  add(bag, "sailWood", box(L * 2, 0.35, 0.3, 0, 0, 0), I);
  add(bag, "sailWood", box(0.8, 0.8, 0.5, 0, 0, 0), I);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const m = new THREE.Matrix4()
      .makeRotationZ(a - Math.PI / 2)
      .setPosition(dx * L * 0.58 - dy * 0.95, dy * L * 0.58 + dx * 0.95, 0.05);
    add(bag, "sailCloth", box(1.7, L * 0.62, 0.08, 0, 0, 0), m);
    for (let j = 0; j < 5; j++)
      add(
        bag,
        "sailWood",
        box(1.8, 0.07, 0.12, 0, (-0.31 + j * 0.155) * L, 0.05),
        m,
      );
  }
}

// Ladang: baris tanaman per ruas pendek supaya mengikuti tanah. Jerami gulung di tepi.
export function fields(bag: Bag) {
  const I = new THREE.Matrix4();
  const { gap, width, seg } = FIELD_ROW;
  for (const f of FIELDS) {
    const key = f.crop;
    const h = key === "wheat" ? 0.75 : 0.45;
    const rows = Math.floor((f.w - 1) / gap);
    const segs = Math.max(1, Math.round((f.d - 1.5) / seg));
    const len = (f.d - 1.5) / segs;
    for (let i = 0; i < rows; i++) {
      const x = f.x - f.w / 2 + 0.8 + i * gap;
      for (let j = 0; j < segs; j++) {
        const z = f.z - (f.d - 1.5) / 2 + len * (j + 0.5);
        const y = groundHeight(x, z) + h / 2 - 0.12;
        add(bag, key, box(width, h, len - 0.25, x, y, z), I);
      }
    }
    for (let i = 0; i < f.hay; i++) {
      const x = f.x - f.w / 2 + 2 + i * 3.2;
      const z = f.z + f.d / 2 + 1.4;
      const g = cyl(0.6, 0.6, 1.2, 10, 0, 0, 0)
        .rotateZ(Math.PI / 2)
        .translate(x, groundHeight(x, z) + 0.55, z);
      add(bag, "wheat", g, I);
    }
  }
}

function rnd(seed: number) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Jamur ajaib: batang krem + topi berwarna yang menyala.
export function mushrooms(bag: Bag, seg: number) {
  const I = new THREE.Matrix4();
  const M = MUSHROOMS;
  M.clusters.forEach((c, ci) => {
    for (let i = 0; i < M.perCluster; i++) {
      const sd = ci * 31 + i * 7;
      const a = rnd(sd) * Math.PI * 2;
      const r = rnd(sd + 1) * M.spread;
      let x = c.x + Math.cos(a) * r;
      let z = c.z + Math.sin(a) * r;
      if (routeDist(x, z) < 4) {
        x += 5;
        z += 5;
      }
      const s = M.size[0] + (M.size[1] - M.size[0]) * rnd(sd + 2);
      const y = groundHeight(x, z);
      add(
        bag,
        "stem",
        cyl(0.2 * s, 0.28 * s, 1.1 * s, 8, x, y + 0.5 * s, z),
        I,
      );
      const cap = new THREE.SphereGeometry(
        0.9 * s,
        seg,
        8,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      );
      cap.scale(1, 0.65, 1);
      cap.translate(x, y + 1.0 * s, z);
      add(bag, `cap${Math.floor(rnd(sd + 3) * 3)}` as "cap0", cap, I);
    }
  });
}

// ───────────────────────── lapangan desa, pagar, dan pernik ─────────────────────────

const I = new THREE.Matrix4();
const yawTo = (x: number, z: number, tx: number, tz: number) =>
  Math.atan2(tx - x, tz - z);

// Tinggi tanah tertinggi di sekitar satu titik (supaya benda tidak tenggelam di lereng).
function gTop(x: number, z: number, r: number) {
  let hi = groundHeight(x, z);
  for (const [a, b] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    hi = Math.max(hi, groundHeight(x + a * r, z + b * r));
  return hi;
}

// Balok panjang dari titik A ke titik B di dunia (mengikuti kemiringan tanah).
function rail(
  bag: Bag,
  a: THREE.Vector3,
  b: THREE.Vector3,
  t: number,
  key: "wood" = "wood",
) {
  const dir = b.clone().sub(a);
  const L = dir.length();
  const g = new THREE.BoxGeometry(L, t, t * 0.7);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      dir.normalize(),
    ),
  );
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  add(bag, key, g, I);
}

// Sumur batu beratap: cincin batu, dua tiang, palang, katrol, dan ember.
function well(bag: Bag) {
  const y = gTop(WELL.x, WELL.z, 2);
  const m = frame(WELL.x, y, WELL.z, 0.4);
  add(bag, "stone", cyl(1.15, 1.25, 1.0, 16, 0, 0.35, 0), m);
  add(bag, "stone", cyl(1.3, 1.3, 0.14, 16, 0, 0.86, 0), m); // bibir
  add(bag, "wood", cyl(0.85, 0.85, 0.05, 16, 0, 0.82, 0), m); // gelap = air
  for (const s of [-1, 1])
    add(bag, "wood", box(0.2, 2.8, 0.2, s * 1.15, 1.5, 0), m);
  add(bag, "wood", box(2.8, 0.2, 0.2, 0, 2.85, 0), m);
  add(
    bag,
    "wood",
    cyl(0.12, 0.12, 0.9, 8, 0, 0, 0)
      .rotateZ(Math.PI / 2)
      .translate(0, 2.2, 0),
    m,
  ); // poros katrol
  add(bag, "tile", prism(3.4, 2.6, 1.1), frame(WELL.x, y + 2.95, WELL.z, 0.4));
  add(bag, "wood", cyl(0.2, 0.17, 0.3, 8, 0.3, 1.25, 0), m); // ember
  // lingkaran batu pijakan di sekitar sumur
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.12;
    const r = 2.5 + (i % 3) * 0.45;
    const x = WELL.x + Math.cos(a) * r;
    const z = WELL.z + Math.sin(a) * r;
    add(
      bag,
      "stone",
      cyl(0.55, 0.6, 0.12, 8, x, groundHeight(x, z) + 0.02, z),
      I,
    );
  }
}

// Lapak pasar: empat tiang, meja, atap kain bergaris, dan dagangan.
function stalls(bag: Bag) {
  for (const st of STALLS) {
    const yaw = yawTo(st.x, st.z, WELL.x, WELL.z);
    const y = gTop(st.x, st.z, 1.8);
    const m = frame(st.x, y, st.z, yaw);
    const hw = st.w / 2;
    const hd = st.d / 2;
    for (const sx of [-1, 1]) {
      add(bag, "wood", box(0.16, 2.3, 0.16, sx * hw, 1.15, hd), m);
      add(bag, "wood", box(0.16, 2.2, 0.16, sx * hw, 1.1, -hd), m);
      add(bag, "stone", box(0.3, 0.2, 0.3, sx * hw, 0.05, hd), m);
      add(bag, "stone", box(0.3, 0.2, 0.3, sx * hw, 0.05, -hd), m);
    }
    add(bag, "wood", box(st.w, 0.9, 0.7, 0, 0.45, hd - 0.2), m); // meja
    add(bag, "wood", box(st.w + 0.1, 0.1, 0.9, 0, 0.92, hd - 0.2), m);
    // atap kain miring ke depan, belang-belang
    const n = 7;
    const sw = (st.w + 0.8) / n;
    const slope = new THREE.Matrix4().makeRotationX(0.22);
    for (let i = 0; i < n; i++) {
      const x = -((st.w + 0.8) / 2) + sw * (i + 0.5);
      add(
        bag,
        i % 2 ? "tile" : "fabric",
        box(sw, 0.06, st.d + 0.9, x, 0, 0),
        m
          .clone()
          .multiply(new THREE.Matrix4().makeTranslation(0, 2.45, 0.1))
          .multiply(slope),
      );
    }
    add(bag, "fabric", box(st.w + 0.8, 0.4, 0.05, 0, 2.28, hd + 0.35), m); // kain pinggir depan
    // dagangan
    for (let i = 0; i < 4; i++) {
      const x = -hw + 0.6 + i * ((st.w - 1.2) / 3);
      add(bag, "wood", box(0.65, 0.3, 0.5, x, 1.12, hd - 0.2), m);
      add(
        bag,
        st.goods === "veg" ? "green" : "wheat",
        box(0.58, 0.14, 0.42, x, 1.3, hd - 0.2),
        m,
      );
    }
    // keranjang dan peti di samping
    add(bag, "thatch", cyl(0.4, 0.3, 0.5, 10, hw + 0.8, 0.25, 0.3), m);
    add(bag, "wood", box(0.8, 0.5, 0.6, -hw - 0.8, 0.25, 0.4), m);
    add(
      bag,
      "wood",
      box(0.7, 0.45, 0.55, 0, 0, 0)
        .rotateY(0.4)
        .translate(-hw - 0.7, 0.72, 0.4),
      m,
    );
  }
}

// Gerobak kayu berisi jerami, terparkir miring.
function cart(bag: Bag) {
  const y = gTop(CART.x, CART.z, 1.4);
  const m = frame(CART.x, y, CART.z, CART.yaw);
  add(bag, "wood", box(2.6, 0.14, 1.5, 0, 0.75, 0), m);
  for (const s of [-1, 1]) {
    add(bag, "wood", box(2.6, 0.5, 0.1, 0, 1.05, s * 0.75), m);
    add(bag, "wood", box(0.1, 0.5, 1.5, s * 1.3, 1.05, 0), m);
    add(
      bag,
      "wood",
      cyl(0.7, 0.7, 0.14, 12, 0, 0, 0)
        .rotateX(Math.PI / 2)
        .translate(0, 0, s * 0.85),
      frame(CART.x, y + 0.7, CART.z, CART.yaw),
    );
  }
  add(bag, "wheat", box(2.3, 0.5, 1.3, 0, 1.15, 0), m);
  for (const s of [-1, 1]) // tongkat penarik
    add(
      bag,
      "wood",
      box(2.4, 0.08, 0.08, 0, 0, 0)
        .rotateZ(0.12)
        .translate(2.2, 0.55, s * 0.5),
      m,
    );
}

function benches(bag: Bag) {
  for (const b of BENCHES) {
    const yaw = yawTo(b.x, b.z, WELL.x, WELL.z);
    const m = frame(b.x, gTop(b.x, b.z, 0.8), b.z, yaw);
    add(bag, "wood", box(1.8, 0.1, 0.45, 0, 0.5, 0), m);
    add(bag, "wood", box(1.8, 0.5, 0.08, 0, 0.9, -0.22), m);
    for (const s of [-1, 1])
      add(bag, "wood", box(0.1, 0.5, 0.4, s * 0.8, 0.25, 0), m);
  }
}

// Tiang lampu: kacanya menyala dan jadi sumber cahaya malam.
function lamps(bag: Bag) {
  for (const l of LAMPS) {
    const y = groundHeight(l.x, l.z);
    add(bag, "wood", box(0.16, 3.2, 0.16, l.x, y + 1.6, l.z), I);
    add(bag, "wood", box(0.7, 0.1, 0.1, l.x + 0.3, y + 3.1, l.z), I);
    add(bag, "stone", box(0.35, 0.3, 0.35, l.x, y + 0.1, l.z), I);
    add(bag, "glass", box(0.3, 0.42, 0.3, l.x + 0.6, y + 2.85, l.z), I);
    add(bag, "tile", box(0.4, 0.08, 0.4, l.x + 0.6, y + 3.1, l.z), I);
    WINDOW_SPOTS.push({ x: l.x + 0.6, y: y + 2.85, z: l.z });
  }
}

// Tiang bendera dengan dua kain belang.
function banners(bag: Bag) {
  for (const b of BANNERS) {
    const y = groundHeight(b.x, b.z);
    add(bag, "wood", cyl(0.1, 0.16, b.h, 8, b.x, y + b.h / 2, b.z), I);
    add(bag, "stone", cyl(0.4, 0.5, 0.35, 8, b.x, y + 0.1, b.z), I);
    add(bag, "fabric", box(1.7, 0.7, 0.05, b.x + 0.95, y + b.h - 0.55, b.z), I);
    add(bag, "tile", box(1.7, 0.3, 0.06, b.x + 0.95, y + b.h - 0.55, b.z), I);
    add(bag, "tile", cyl(0.0, 0.14, 0.45, 8, b.x, y + b.h + 0.2, b.z), I);
  }
}

function haystacks(bag: Bag) {
  for (const h of HAYSTACKS) {
    const y = groundHeight(h.x, h.z);
    add(
      bag,
      "wheat",
      new THREE.ConeGeometry(h.r, h.h, 12).translate(
        h.x,
        y + h.h / 2 - 0.1,
        h.z,
      ),
      I,
    );
    add(
      bag,
      "wheat",
      cyl(h.r * 0.98, h.r, h.h * 0.25, 12, h.x, y + h.h * 0.1, h.z),
      I,
    );
  }
}

// Orang-orangan sawah: tiang, lengan, badan kain, kepala, dan topi.
function scarecrows(bag: Bag) {
  for (const sc of SCARECROWS) {
    const y = groundHeight(sc.x, sc.z);
    const m = frame(sc.x, y, sc.z, sc.yaw);
    add(bag, "wood", box(0.12, 2.6, 0.12, 0, 1.3, 0), m);
    add(bag, "wood", box(2.0, 0.1, 0.1, 0, 1.9, 0), m);
    add(bag, "fabric", box(0.6, 0.9, 0.3, 0, 1.55, 0), m);
    add(bag, "tile", box(0.62, 0.3, 0.32, 0, 1.0, 0), m);
    add(
      bag,
      "stem",
      new THREE.SphereGeometry(0.22, 8, 6).translate(0, 2.35, 0),
      m,
    );
    add(bag, "wood", cyl(0.12, 0.38, 0.1, 10, 0, 2.55, 0), m);
    add(bag, "wood", cyl(0.0, 0.22, 0.3, 10, 0, 2.72, 0), m);
  }
}

// Pagar kayu mengelilingi ladang, dengan celah di sisi yang menghadap desa.
function fences(bag: Bag) {
  const step = 2.4;
  for (const f of FIELDS) {
    const hw = f.w / 2 + 1.2;
    const hd = f.d / 2 + 1.2;
    const gapSide = f.x < 0 ? "e" : "w";
    const corners: [number, number][] = [
      [f.x - hw, f.z - hd],
      [f.x + hw, f.z - hd],
      [f.x + hw, f.z + hd],
      [f.x - hw, f.z + hd],
    ];
    for (let k = 0; k < 4; k++) {
      const [ax, az] = corners[k];
      const [bx, bz] = corners[(k + 1) % 4];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / step));
      // sisi barat (k=3) dan timur (k=1)
      const isGap =
        (k === 3 && gapSide === "w") || (k === 1 && gapSide === "e");
      let prev: THREE.Vector3 | null = null;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = ax + (bx - ax) * u;
        const z = az + (bz - az) * u;
        const inGap = isGap && Math.abs(u - 0.5) < 0.1;
        const y = groundHeight(x, z);
        if (!inGap) {
          add(bag, "wood", box(0.14, 1.15, 0.14, x, y + 0.5, z), I);
          if (prev) {
            for (const hgt of [0.45, 0.85])
              rail(
                bag,
                prev.clone().setY(prev.y + hgt),
                new THREE.Vector3(x, y + hgt, z),
                0.1,
              );
          }
          prev = new THREE.Vector3(x, y, z);
        } else {
          prev = null;
        }
      }
    }
  }
}

// Semua pernik desa. Dipanggil sekali dari Village.tsx.
export function commons(bag: Bag) {
  well(bag);
  stalls(bag);
  cart(bag);
  benches(bag);
  lamps(bag);
  banners(bag);
  haystacks(bag);
  scarecrows(bag);
  fences(bag);
}
