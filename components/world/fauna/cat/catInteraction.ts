import { smoothstep } from "../../core/math";
import type { Pose } from "./catPose";

// Interaksi dengan kucing: kursor/jari mendekat -> kucing menoleh dan kuping tegak.
// Diklik/diketuk -> kucing memilih SATU reaksi dari beberapa (pose, gerak, ekspresi) sesuai
// bagian yang disentuh (kepala/badan/ekor), kondisinya (tidur/jalan), dan seberapa sering diklik.
// Murni hitungan. Cat.tsx yang mengirim kejadian dan membaca hasilnya.

export type Reaction =
  | "purr" // kepala disodorkan, mata terpejam, bahagia
  | "hop" // melompat kecil sambil mengeong
  | "lick" // menjilat kaki
  | "bow" // membungkuk mengajak main
  | "stretch" // meregang (setelah dibangunkan)
  | "yawn" // menguap
  | "swat" // mencakar main-main
  | "puff" // kaget, bulu mengembang (ekor disentuh)
  | "sneeze" // bersin
  | "tilt" // memiringkan kepala, penasaran
  | "grumpy" // kesal karena diklik terlalu sering
  | "shake" // menggeleng
  | "paw" // mengangkat kaki depan, "salaman"
  | "zoomies" // klik dua kali: girang lalu berlari
  | "slowblink" // kedip pelan tanda sayang
  | "pounce"; // siap menerkam, pantat bergoyang

export type Region = "head" | "tail" | "body" | "paws";

const DEF: Record<
  Reaction,
  { dur: number; hop?: [number, number]; meow?: boolean }
> = {
  purr: { dur: 2.8 },
  hop: { dur: 1.6, hop: [0.3, 0.55], meow: true },
  lick: { dur: 2.4 },
  bow: { dur: 3, meow: true },
  stretch: { dur: 3 },
  yawn: { dur: 2.4 },
  swat: { dur: 1.8 },
  puff: { dur: 1.8, hop: [0.35, 0.4] },
  sneeze: { dur: 0.9 },
  tilt: { dur: 2.4 },
  grumpy: { dur: 2 },
  shake: { dur: 0.9 },
  paw: { dur: 2.6, meow: true },
  zoomies: { dur: 1.2, hop: [0.4, 0.45], meow: true },
  slowblink: { dur: 2.4 },
  pounce: { dur: 2.2 },
};

// bobot pilihan per bagian yang disentuh
const POOL: Record<Region, [Reaction, number][]> = {
  head: [
    ["purr", 4],
    ["tilt", 2],
    ["lick", 1],
    ["sneeze", 1],
    ["hop", 1],
  ],
  tail: [
    ["puff", 4],
    ["shake", 1],
    ["swat", 2],
    ["tilt", 1],
  ],
  body: [
    ["hop", 3],
    ["purr", 2],
    ["lick", 2],
    ["swat", 2],
    ["tilt", 2],
    ["sneeze", 1],
    ["bow", 1],
    ["paw", 1],
    ["pounce", 1],
  ],
  paws: [
    ["paw", 4],
    ["hop", 2],
    ["swat", 2],
    ["lick", 1],
  ],
};

const MEOW_TIME = 0.8;
const PETS_FOR_BOW = 3;
const PETS_WINDOW = 2; // detik
const CLICKS_FOR_GRUMPY = 6;
const CLICKS_WINDOW = 4;
const HOVER_FOR_TILT = 1.6;
const DOUBLE_CLICK = 0.35; // detik
const HOLD_TIME = 0.5; // tahan sekian detik = dielus terus
const STROKE_MIN = 0.08; // kecepatan kursor (layar/detik) yang dihitung sebagai usapan
const STROKE_MAX = 2.5; // lebih cepat dari ini = mengibas, kucing ingin menerkam

export const POINTER_MEMORY = 2.5; // kucing mengikuti kursor sampai sekian detik setelah kursor diam

export type Interaction = {
  reaction: Reaction | null;
  rT: number; // waktu berjalan reaksi (detik)
  history: Reaction[]; // reaksi terakhir, supaya tidak berulang
  side: 1 | -1; // arah miring kepala
  meowLeft: number;
  hopT: number; // -1 = tidak melompat, 0..1 = sedang melompat
  hopH: number;
  hopDur: number;
  pets: number[]; // waktu klik untuk kombo membungkuk
  clicks: number[]; // waktu klik untuk menghitung kekesalan
  hover: boolean;
  hoverT: number;
  hoverFired: boolean;
  sincePointer: number; // detik sejak kursor terakhir bergerak
  leaveNow: boolean; // kucing pergi setelah kesal
  clock: number;
  affection: number; // 0..1, makin sering dielus makin manja
  petting: number; // 0..1, sedang diusap/ditahan
  pettedFor: number; // lama diusap tanpa putus
  strokeT: number;
  down: boolean; // tombol/jari sedang menekan kucing
  downT: number;
  lastClick: number;
  sweepCool: number;
};

export const newInteraction = (): Interaction => ({
  reaction: null,
  rT: 0,
  history: [],
  side: 1,
  meowLeft: 0,
  hopT: -1,
  hopH: 0.3,
  hopDur: 0.55,
  pets: [],
  clicks: [],
  hover: false,
  hoverT: 0,
  hoverFired: false,
  sincePointer: 99,
  leaveNow: false,
  clock: 0,
  affection: 0,
  petting: 0,
  pettedFor: 0,
  strokeT: 0,
  down: false,
  downT: 0,
  lastClick: -99,
  sweepCool: 0,
});

function pick(region: Region, avoid: Reaction[], aff: number): Reaction {
  const pool = POOL[region].filter(([r]) => !avoid.includes(r));
  const list = (pool.length ? pool : POOL[region]).map(
    ([r, w]) =>
      [r, r === "purr" || r === "tilt" ? w * (1 + 2 * aff) : w] as [
        Reaction,
        number,
      ],
  );
  let n = Math.random() * list.reduce((a, [, w]) => a + w, 0);
  for (const [r, w] of list) {
    n -= w;
    if (n <= 0) return r;
  }
  return list[0][0];
}

function start(i: Interaction, r: Reaction) {
  const d = DEF[r];
  i.reaction = r;
  i.rT = 0;
  i.side = Math.random() < 0.5 ? 1 : -1;
  i.history = [...i.history.slice(-2), r];
  if (d.meow) i.meowLeft = MEOW_TIME;
  if (d.hop && i.hopT < 0) {
    i.hopT = 0;
    i.hopH = d.hop[0];
    i.hopDur = d.hop[1];
  }
}

// Kucing diklik. region = bagian yang kena, sleepy = sedang tidur.
export function pet(
  i: Interaction,
  t: number,
  ctx: { region: Region; sleepy: boolean },
): Reaction {
  const dbl = t - i.lastClick < DOUBLE_CLICK;
  i.lastClick = t;
  i.pets = i.pets.filter((x) => t - x < PETS_WINDOW).concat(t);
  i.clicks = i.clicks.filter((x) => t - x < CLICKS_WINDOW).concat(t);
  i.affection = Math.min(1, i.affection + 0.12);
  let r: Reaction;
  if (ctx.sleepy) {
    r = Math.random() < 0.5 ? "stretch" : "yawn";
  } else if (dbl && i.clicks.length < 3) {
    r = "zoomies";
  } else if (i.clicks.length >= CLICKS_FOR_GRUMPY) {
    r = "grumpy";
    i.clicks = [];
    i.pets = [];
    i.affection = Math.max(0, i.affection - 0.3);
  } else if (i.pets.length >= PETS_FOR_BOW) {
    r = "bow";
    i.pets = [];
  } else if (
    i.affection > 0.5 &&
    Math.random() < i.affection * 0.35 &&
    !i.history.slice(-2).includes("slowblink")
  ) {
    r = "slowblink";
  } else {
    r = pick(ctx.region, i.history.slice(-2), i.affection);
  }
  start(i, r);
  return r;
}

export function stepInteraction(i: Interaction, dt: number, ptrSpeed = 0) {
  i.clock += dt;
  i.sweepCool = Math.max(0, i.sweepCool - dt);
  i.affection = Math.max(0, i.affection - 0.02 * dt);
  i.meowLeft = Math.max(0, i.meowLeft - dt);
  i.sincePointer += dt;
  if (i.reaction) {
    i.rT += dt;
    if (i.rT >= DEF[i.reaction].dur) {
      if (i.reaction === "grumpy") i.leaveNow = true;
      i.reaction = null;
    }
  }
  // kursor menggantung lama di atas kucing -> penasaran, miring kepala
  if (i.hover) {
    i.hoverT += dt;
    if (i.hoverT > HOVER_FOR_TILT && !i.hoverFired && !i.reaction) {
      i.hoverFired = true;
      start(i, "tilt");
    }
  } else {
    i.hoverT = 0;
    i.hoverFired = false;
  }
  // diusap: kursor bergerak pelan di atas kucing, atau ditahan
  if (i.down) i.downT += dt;
  if (i.hover && ptrSpeed > STROKE_MIN && ptrSpeed < STROKE_MAX)
    i.strokeT = Math.min(1.2, i.strokeT + dt * 2);
  else i.strokeT = Math.max(0, i.strokeT - dt * 1.5);
  const stroking =
    i.hover && (i.strokeT > 0.5 || (i.down && i.downT > HOLD_TIME));
  i.petting += ((stroking ? 1 : 0) - i.petting) * (1 - Math.exp(-4 * dt));
  if (stroking) {
    i.pettedFor += dt;
    i.affection = Math.min(1, i.affection + 0.08 * dt);
  } else {
    // selesai diusap cukup lama: kedip pelan terima kasih atau melompat senang
    if (i.pettedFor > 2.5 && !i.reaction)
      start(i, Math.random() < 0.6 ? "slowblink" : "hop");
    i.pettedFor = 0;
  }
  // kursor dikibas cepat di atas kucing: ingin menerkam
  if (
    i.hover &&
    ptrSpeed > STROKE_MAX &&
    i.sweepCool <= 0 &&
    !i.reaction &&
    !stroking
  ) {
    i.sweepCool = 4;
    start(i, "pounce");
  }
  // kucing manja kadang kedip pelan sendiri
  if (i.affection > 0.6 && !i.reaction && !i.hover && Math.random() < 0.03 * dt)
    start(i, "slowblink");
  if (i.hopT >= 0) {
    i.hopT += dt / i.hopDur;
    if (i.hopT > 1) i.hopT = -1;
  }
}

// Tambahan tinggi badan saat melompat (m).
export const hopOffset = (i: Interaction) =>
  i.hopT < 0 ? 0 : 4 * i.hopT * (1 - i.hopT) * i.hopH;

// Kursor baru saja bergerak -> kucing melihat ke kursor, bukan ke kamera.
export const followsPointer = (i: Interaction) =>
  i.sincePointer < POINTER_MEMORY;

const mx = (a: number, b: number) => Math.max(a, b);
const bump = (k: number, a: number, b: number) =>
  smoothstep(a, (a + b) / 2, k) * (1 - smoothstep((a + b) / 2, b, k));

// Timpa target pose dari catBehavior dengan reaksi interaksi.
export function applyInteraction(p: Pose, i: Interaction) {
  const r = i.reaction;
  if (r) {
    const k = Math.min(1, i.rT / DEF[r].dur);
    const env = smoothstep(0, 0.12, k) * (1 - smoothstep(0.8, 1, k));
    const t = i.rT;
    switch (r) {
      case "purr":
        p.happy = mx(p.happy, env);
        p.blink = mx(p.blink, 0.85 * env);
        p.headPitch += 0.28 * env;
        p.headRoll += 0.18 * Math.sin(t * 2.2) * env;
        p.earL = mx(p.earL, 0.4 * env);
        p.earR = mx(p.earR, 0.4 * env);
        break;
      case "hop":
        p.happy = mx(p.happy, env);
        break;
      case "lick":
        p.pawL = mx(p.pawL, env);
        p.tongue = mx(p.tongue, env * (0.6 + 0.4 * Math.sin(t * 8)));
        p.mouth = mx(p.mouth, 0.2 * env);
        p.happy = mx(p.happy, 0.4 * env);
        break;
      case "bow":
        p.bow = mx(p.bow, env);
        p.happy = mx(p.happy, env);
        break;
      case "stretch":
        p.bow = mx(p.bow, 0.8 * env);
        p.mouth = mx(p.mouth, 0.85 * Math.sin(Math.PI * k));
        p.blink = mx(p.blink, env);
        p.headPitch += 0.35 * env;
        break;
      case "yawn":
        p.mouth = mx(p.mouth, Math.pow(Math.sin(Math.PI * k), 0.7));
        p.blink = mx(p.blink, env);
        p.headPitch += 0.3 * env;
        p.earL = mx(p.earL, 0.3 * env);
        p.earR = mx(p.earR, 0.3 * env);
        break;
      case "swat":
        p.pawR = mx(p.pawR, env * (0.5 + 0.5 * Math.sin(t * 13)));
        p.headYaw += 0.25 * Math.sin(t * 6) * env;
        p.happy = mx(p.happy, 0.5 * env);
        p.earL = mx(p.earL, 0.6 * env);
        p.earR = mx(p.earR, 0.6 * env);
        break;
      case "puff": {
        const pe = smoothstep(0, 0.08, k) * (1 - smoothstep(0.55, 1, k));
        p.puff = mx(p.puff, pe);
        p.angry = mx(p.angry, 0.6 * pe);
        p.earL = mx(p.earL, 1.5 * pe);
        p.earR = mx(p.earR, 1.5 * pe);
        p.tailUp = mx(p.tailUp, pe);
        break;
      }
      case "sneeze":
        p.blink = mx(p.blink, bump(k, 0.3, 0.65));
        p.mouth = mx(p.mouth, 0.8 * bump(k, 0.35, 0.6));
        p.headPitch += -0.4 * bump(k, 0.35, 0.7) + 0.15 * bump(k, 0.2, 0.4);
        p.puff = mx(p.puff, 0.3 * bump(k, 0.35, 0.65));
        break;
      case "tilt":
        p.headRoll += 0.38 * env * i.side;
        p.headPitch += 0.08 * env;
        p.earL = mx(p.earL, 0.7 * env);
        p.earR = mx(p.earR, 0.7 * env);
        break;
      case "grumpy":
        p.angry = mx(p.angry, 0.8 * env);
        p.earL = mx(p.earL, 1.4 * env);
        p.earR = mx(p.earR, 1.4 * env);
        p.mouth = mx(p.mouth, 0.5 * env * (0.5 + 0.5 * Math.sin(t * 9)));
        p.puff = mx(p.puff, 0.25 * env);
        break;
      case "paw":
        p.pawR = mx(p.pawR, env * (0.85 + 0.15 * Math.sin(t * 6)));
        p.happy = mx(p.happy, 0.5 * env);
        p.headPitch += 0.1 * env;
        break;
      case "zoomies": {
        const pe = smoothstep(0, 0.1, k) * (1 - smoothstep(0.6, 1, k));
        p.happy = mx(p.happy, pe);
        p.puff = mx(p.puff, 0.3 * pe);
        p.earL = mx(p.earL, 0.8 * pe);
        p.earR = mx(p.earR, 0.8 * pe);
        p.tailUp = mx(p.tailUp, pe);
        break;
      }
      case "slowblink": {
        const sb = smoothstep(0.15, 0.4, k) * (1 - smoothstep(0.6, 0.85, k));
        p.blink = mx(p.blink, sb);
        p.happy = mx(p.happy, 0.25 * env);
        p.headPitch += 0.1 * env;
        p.earL = mx(p.earL, 0.3 * env);
        p.earR = mx(p.earR, 0.3 * env);
        break;
      }
      case "pounce":
        p.bow = mx(p.bow, env);
        p.tailUp = mx(p.tailUp, env * (0.5 + 0.5 * Math.sin(t * 10)));
        p.headYaw += 0.2 * Math.sin(t * 10) * env;
        p.earL = mx(p.earL, 0.8 * env);
        p.earR = mx(p.earR, 0.8 * env);
        p.happy = mx(p.happy, 0.6 * env);
        break;
      case "shake":
        p.headYaw += 0.5 * Math.sin(t * 28) * (1 - k);
        p.earL = mx(p.earL, 0.8 * (1 - k));
        p.earR = mx(p.earR, 0.8 * (1 - k));
        break;
    }
  }
  // sedang diusap / ditahan: bahagia, mata terpejam, kepala menyodor
  if (i.petting > 0.01) {
    const pt = i.petting;
    p.happy = mx(p.happy, 0.9 * pt);
    p.blink = mx(p.blink, 0.8 * pt);
    p.headPitch += 0.25 * pt;
    p.headRoll += 0.15 * Math.sin(i.clock * 2) * pt;
    p.earL = mx(p.earL, 0.4 * pt);
    p.earR = mx(p.earR, 0.4 * pt);
  }
  if (i.hover && !(r === "puff" || r === "grumpy")) {
    p.earL = mx(p.earL, 0.5);
    p.earR = mx(p.earR, 0.5);
  }
}
