"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { INTERIOR } from "./homeGeometry";

// Lukisan dinding di ruang-ruang yang tadinya kosong. Semua digambar lewat canvas (tanpa berkas gambar), bertema dunia
// medieval-fantasi: danau, kastil, naga, peta, kucing berlentera, dan seterusnya.
// Dipasang di dalam grup rumah (kerangka lokal rumah), koordinatnya sama dengan config/home.ts.
// Titik (x, z) = permukaan dinding tempat lukisan menempel; face = arah hadap lukisan (menjauhi dinding).

type R = () => number;
type Draw = (g: CanvasRenderingContext2D, w: number, h: number, r: R) => void;

const rng = (seed: number): R => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

// "#rrggbb" + alfa -> "rgba(...)", supaya gradasi ke transparan tidak menggelap di tepinya
const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function sky(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  stops: [number, string][],
) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}

function glow(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rad: number,
  col: string,
  a = 1,
) {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad);
  gr.addColorStop(0, hexA(col, a));
  gr.addColorStop(1, hexA(col, 0));
  g.fillStyle = gr;
  g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

function disc(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rad: number,
  col: string,
) {
  g.fillStyle = col;
  g.beginPath();
  g.arc(x, y, rad, 0, Math.PI * 2);
  g.fill();
}

// punggung bukit: base = tinggi rata-rata (0..1 dari atas), amp = ayunan
function ridge(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: number,
  amp: number,
  col: string,
  r: R,
) {
  const ph = [r() * 6, r() * 6, r() * 6];
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    const u = x / w;
    const y =
      base * h -
      amp *
        h *
        (0.5 * Math.sin(u * 3 + ph[0]) +
          0.3 * Math.sin(u * 7 + ph[1]) +
          0.2 * Math.sin(u * 15 + ph[2]));
    g.lineTo(x, y);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fill();
}

function stars(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  n: number,
  r: R,
) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.35 + r() * 0.65;
    g.fillStyle = "#fff6dc";
    const s = 0.8 + r() * 1.8;
    g.fillRect(r() * w, r() * h, s, s);
  }
  g.globalAlpha = 1;
}

function pine(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  col: string,
) {
  g.fillStyle = col;
  for (let i = 0; i < 4; i++) {
    const wy = y - s * (0.25 + i * 0.26);
    const ww = s * (0.34 - i * 0.06);
    g.beginPath();
    g.moveTo(x - ww, wy + s * 0.2);
    g.lineTo(x, wy - s * 0.22);
    g.lineTo(x + ww, wy + s * 0.2);
    g.closePath();
    g.fill();
  }
  g.fillRect(x - s * 0.03, y - s * 0.1, s * 0.06, s * 0.12);
}

// ── lukisan ────────────────────────────────────────────────
const moonLake: Draw = (g, w, h, r) => {
  sky(g, w, h, [
    [0, "#0b1738"],
    [0.6, "#1f3a73"],
    [1, "#3b5f9a"],
  ]);
  stars(g, w, h * 0.55, 90, r);
  const mx = w * 0.68;
  const my = h * 0.27;
  glow(g, mx, my, h * 0.55, "#cfe0ff", 0.5);
  disc(g, mx, my, h * 0.085, "#f4f1e0");
  ridge(g, w, h, 0.6, 0.1, "#16264d", r);
  const wy = h * 0.66;
  const wg = g.createLinearGradient(0, wy, 0, h);
  wg.addColorStop(0, "#1f3a6e");
  wg.addColorStop(1, "#0b1735");
  g.fillStyle = wg;
  g.fillRect(0, wy, w, h - wy);
  for (let k = 0; k < 18; k++) {
    const y = wy + 4 + k * ((h - wy) / 19);
    const wd = (8 + k * 3.2) * (0.6 + r() * 0.8);
    g.globalAlpha = Math.max(0.08, 0.6 - k * 0.032);
    g.fillStyle = "#e8eefc";
    g.fillRect(mx + (r() - 0.5) * k * 3 - wd / 2, y, wd, 2);
  }
  g.globalAlpha = 1;
  ridge(g, w, h, 0.93, 0.07, "#0a1226", r);
};

const cat: Draw = (g, w, h, r) => {
  const bg = g.createRadialGradient(
    w * 0.5,
    h * 0.45,
    h * 0.05,
    w * 0.5,
    h * 0.5,
    h * 0.85,
  );
  bg.addColorStop(0, "#3d2c44");
  bg.addColorStop(1, "#130d1a");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  glow(g, w * 0.74, h * 0.2, h * 0.3, "#9fb8ff", 0.35);
  disc(g, w * 0.74, h * 0.2, h * 0.05, "#eef2ff");
  stars(g, w, h * 0.4, 25, r);
  g.fillStyle = "#1f1626";
  g.fillRect(0, h * 0.82, w, h * 0.18);
  // lentera di kiri
  const lx = w * 0.28;
  const ly = h * 0.74;
  glow(g, lx, ly, h * 0.55, "#ffcf80", 0.75);
  g.fillStyle = "#3a2a14";
  g.fillRect(lx - w * 0.04, ly - h * 0.07, w * 0.08, h * 0.02);
  g.fillRect(lx - w * 0.04, ly + h * 0.07, w * 0.08, h * 0.02);
  g.fillStyle = "#ffd98a";
  g.fillRect(lx - w * 0.03, ly - h * 0.05, w * 0.06, h * 0.12);
  // kucing duduk, tampak dari belakang
  const cx = w * 0.58;
  g.fillStyle = "#14101a";
  g.beginPath();
  g.ellipse(cx, h * 0.68, w * 0.15, h * 0.17, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(cx, h * 0.45, h * 0.1, 0, Math.PI * 2);
  g.fill();
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + s * h * 0.1, h * 0.42);
    g.lineTo(cx + s * h * 0.085, h * 0.3);
    g.lineTo(cx + s * h * 0.02, h * 0.37);
    g.closePath();
    g.fill();
  }
  g.lineWidth = h * 0.03;
  g.strokeStyle = "#14101a";
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx + w * 0.13, h * 0.8);
  g.bezierCurveTo(
    cx + w * 0.3,
    h * 0.82,
    cx + w * 0.26,
    h * 0.6,
    cx + w * 0.2,
    h * 0.58,
  );
  g.stroke();
  // cahaya tepi dari lentera
  g.strokeStyle = hexA("#ffcf80", 0.7);
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(cx, h * 0.45, h * 0.1, Math.PI * 0.62, Math.PI * 1.1);
  g.stroke();
  g.beginPath();
  g.ellipse(
    cx,
    h * 0.68,
    w * 0.15,
    h * 0.17,
    0,
    Math.PI * 0.55,
    Math.PI * 0.95,
  );
  g.stroke();
};

const realmMap: Draw = (g, w, h, r) => {
  const p = g.createLinearGradient(0, 0, w, h);
  p.addColorStop(0, "#e3d2a2");
  p.addColorStop(0.5, "#d6c28d");
  p.addColorStop(1, "#c4ab75");
  g.fillStyle = p;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++)
    glow(g, r() * w, r() * h, 40 + r() * 70, "#8a6a3a", 0.12);
  const ink = "#5a4126";
  g.strokeStyle = ink;
  g.lineWidth = 3;
  g.strokeRect(10, 10, w - 20, h - 20);
  g.lineWidth = 1;
  g.strokeRect(17, 17, w - 34, h - 34);
  // daratan
  g.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const k =
      1 +
      0.16 * Math.sin(a * 3 + 1) +
      0.1 * Math.sin(a * 7) +
      (r() - 0.5) * 0.05;
    const x = w * 0.45 + Math.cos(a) * w * 0.34 * k;
    const y = h * 0.52 + Math.sin(a) * h * 0.32 * k;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
  g.fillStyle = "#dccb96";
  g.fill();
  g.lineWidth = 2;
  g.stroke();
  // danau
  g.beginPath();
  g.ellipse(w * 0.66, h * 0.58, w * 0.08, h * 0.1, 0.3, 0, Math.PI * 2);
  g.fillStyle = "#8fb0b8";
  g.fill();
  g.lineWidth = 1.5;
  g.stroke();
  // gunung dan hutan
  g.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    const x = w * (0.24 + r() * 0.16);
    const y = h * (0.3 + r() * 0.3);
    g.beginPath();
    g.moveTo(x - 9, y + 8);
    g.lineTo(x, y - 9);
    g.lineTo(x + 9, y + 8);
    g.stroke();
  }
  g.fillStyle = "#6b7a4a";
  for (let i = 0; i < 28; i++) {
    g.beginPath();
    g.arc(w * (0.42 + r() * 0.2), h * (0.28 + r() * 0.12), 2.5, 0, Math.PI * 2);
    g.fill();
  }
  // kastil
  const kx = w * 0.5;
  const ky = h * 0.5;
  g.fillStyle = ink;
  g.fillRect(kx - 9, ky - 6, 18, 12);
  g.fillRect(kx - 11, ky - 12, 5, 18);
  g.fillRect(kx + 6, ky - 12, 5, 18);
  // rute
  g.setLineDash([6, 5]);
  g.strokeStyle = "#8a2f2f";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(w * 0.2, h * 0.72);
  g.bezierCurveTo(w * 0.32, h * 0.52, w * 0.42, h * 0.66, kx, ky + 8);
  g.bezierCurveTo(w * 0.56, h * 0.62, w * 0.6, h * 0.46, w * 0.68, h * 0.5);
  g.stroke();
  g.setLineDash([]);
  g.strokeStyle = "#8a2f2f";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(w * 0.2 - 7, h * 0.72 - 7);
  g.lineTo(w * 0.2 + 7, h * 0.72 + 7);
  g.moveTo(w * 0.2 + 7, h * 0.72 - 7);
  g.lineTo(w * 0.2 - 7, h * 0.72 + 7);
  g.stroke();
  // mata angin
  const cx = w * 0.86;
  const cy = h * 0.2;
  g.strokeStyle = ink;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(cx, cy, 24, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = ink;
  g.beginPath();
  g.moveTo(cx, cy - 34);
  g.lineTo(cx + 7, cy);
  g.lineTo(cx, cy + 34);
  g.lineTo(cx - 7, cy);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(cx - 34, cy);
  g.lineTo(cx, cy - 6);
  g.lineTo(cx + 34, cy);
  g.lineTo(cx, cy + 6);
  g.closePath();
  g.globalAlpha = 0.55;
  g.fill();
  g.globalAlpha = 1;
};

const nightForest: Draw = (g, w, h, r) => {
  sky(g, w, h, [
    [0, "#0a1b2c"],
    [1, "#1b4a56"],
  ]);
  stars(g, w, h * 0.4, 50, r);
  glow(g, w * 0.5, h * 0.72, h * 0.5, "#ffcf80", 0.45);
  const layers: [string, number, number][] = [
    ["#12353f", 0.62, 0.34],
    ["#0c2a33", 0.74, 0.42],
    ["#071c24", 0.9, 0.55],
  ];
  for (const [col, y, s] of layers)
    for (let i = 0; i < 9; i++)
      pine(
        g,
        (i + r() * 0.6) * (w / 8.5) - w * 0.04,
        h * y + r() * 8,
        h * s * (0.8 + r() * 0.4),
        col,
      );
  // jalan dan lentera kecil
  g.fillStyle = hexA("#ffd98a", 0.35);
  g.beginPath();
  g.moveTo(w * 0.46, h);
  g.lineTo(w * 0.5, h * 0.7);
  g.lineTo(w * 0.54, h);
  g.closePath();
  g.fill();
  disc(g, w * 0.5, h * 0.71, 4, "#ffe9b0");
};

const rune: Draw = (g, w, h, r) => {
  const bg = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h);
  bg.addColorStop(0, "#1b2a55");
  bg.addColorStop(1, "#070b1c");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.4;
  glow(g, cx, cy, R * 1.6, "#f2c867", 0.28);
  g.strokeStyle = "#f2c867";
  for (const [k, lw] of [
    [1, 3],
    [0.88, 1.5],
    [0.62, 2],
  ] as const) {
    g.lineWidth = lw;
    g.beginPath();
    g.arc(cx, cy, R * k, 0, Math.PI * 2);
    g.stroke();
  }
  g.lineWidth = 1.5;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94);
    g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    g.stroke();
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const x = cx + Math.cos(a) * R * 0.75;
    const y = cy + Math.sin(a) * R * 0.75;
    g.save();
    g.translate(x, y);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(0, 9);
    if (r() > 0.4) {
      g.moveTo(0, -3);
      g.lineTo(6, -9);
    }
    if (r() > 0.4) {
      g.moveTo(0, 3);
      g.lineTo(-6, 9);
    }
    g.stroke();
    g.restore();
  }
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * 3 * Math.PI * 2) / 8 - Math.PI / 2;
    const x = cx + Math.cos(a) * R * 0.62;
    const y = cy + Math.sin(a) * R * 0.62;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
  g.stroke();
  disc(g, cx, cy, R * 0.07, "#fff0c0");
};

const stillLife: Draw = (g, w, h) => {
  sky(g, w, h, [
    [0, "#4b3a2b"],
    [1, "#1f1812"],
  ]);
  glow(g, w * 0.2, h * 0.3, h * 0.9, "#ffcf80", 0.3);
  const ty = h * 0.66;
  g.fillStyle = "#5a3b24";
  g.fillRect(0, ty, w, h - ty);
  g.fillStyle = "#7a3b3b";
  g.beginPath();
  g.moveTo(w * 0.1, ty + 4);
  g.lineTo(w * 0.9, ty + 4);
  g.lineTo(w * 0.96, h);
  g.lineTo(w * 0.04, h);
  g.closePath();
  g.fill();
  // cangkir dan uap
  const cx = w * 0.36;
  g.fillStyle = "#e9e1cf";
  g.beginPath();
  g.ellipse(cx, ty - h * 0.08, w * 0.08, h * 0.03, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(cx - w * 0.08, ty - h * 0.08);
  g.lineTo(cx - w * 0.06, ty + 2);
  g.lineTo(cx + w * 0.06, ty + 2);
  g.lineTo(cx + w * 0.08, ty - h * 0.08);
  g.closePath();
  g.fill();
  g.strokeStyle = "#e9e1cf";
  g.lineWidth = h * 0.025;
  g.beginPath();
  g.arc(cx + w * 0.09, ty - h * 0.04, h * 0.045, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  g.strokeStyle = hexA("#ffffff", 0.35);
  g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(cx - 14 + i * 14, ty - h * 0.12);
    g.bezierCurveTo(
      cx - 24 + i * 14,
      ty - h * 0.2,
      cx - 4 + i * 14,
      ty - h * 0.26,
      cx - 14 + i * 14,
      ty - h * 0.34,
    );
    g.stroke();
  }
  // buah
  const fruits: [number, number, number, string][] = [
    [0.6, 0.06, 0.06, "#b03a2e"],
    [0.7, 0.04, 0.055, "#c9a23a"],
    [0.66, 0.1, 0.05, "#7a9a3a"],
  ];
  for (const [fx, fy, fr, col] of fruits) {
    disc(g, w * fx, ty - h * fy, h * fr, col);
    disc(
      g,
      w * fx - h * fr * 0.35,
      ty - h * fy - h * fr * 0.35,
      h * fr * 0.28,
      "rgba(255,255,255,0.35)",
    );
  }
};

const castleDusk: Draw = (g, w, h, r) => {
  sky(g, w, h, [
    [0, "#2a2350"],
    [0.55, "#8a4a7a"],
    [1, "#f0a060"],
  ]);
  glow(g, w * 0.3, h * 0.72, h * 0.6, "#ffd0a0", 0.6);
  ridge(g, w, h, 0.7, 0.1, "#5a3f78", r);
  ridge(g, w, h, 0.8, 0.08, "#2c2250", r);
  // kastil di tebing kanan
  const bx = w * 0.62;
  const by = h * 0.78;
  g.fillStyle = "#17112e";
  g.fillRect(bx - w * 0.16, by - h * 0.1, w * 0.32, h * 0.3);
  const towers: [number, number, number][] = [
    [-0.13, 0.3, 0.045],
    [-0.04, 0.42, 0.05],
    [0.06, 0.34, 0.045],
    [0.14, 0.26, 0.04],
  ];
  for (const [dx, th, tw] of towers) {
    const x = bx + dx * w;
    g.fillRect(x - tw * w, by - th * h, tw * w * 2, th * h);
    g.beginPath();
    g.moveTo(x - tw * w * 1.25, by - th * h);
    g.lineTo(x, by - th * h - h * 0.14);
    g.lineTo(x + tw * w * 1.25, by - th * h);
    g.closePath();
    g.fill();
  }
  g.fillStyle = "#ffd98a";
  for (const [dx, th] of towers)
    g.fillRect(bx + dx * w - 3, by - th * h + h * 0.06, 6, 9);
  g.fillStyle = "#17112e";
  g.fillRect(0, h * 0.9, w, h * 0.1);
  for (let i = 0; i < 4; i++)
    glow(g, r() * w, h * (0.78 + r() * 0.1), w * 0.25, "#e8d8f0", 0.12);
};

const sakuraLake: Draw = (g, w, h, r) => {
  sky(g, w, h, [
    [0, "#6a78bd"],
    [0.5, "#f0a3b6"],
    [0.72, "#ffd6a0"],
    [1, "#ffd6a0"],
  ]);
  const hy = h * 0.66;
  glow(g, w * 0.55, hy, h * 0.5, "#fff0c0", 0.6);
  disc(g, w * 0.55, hy - h * 0.02, h * 0.07, "#fff6dc");
  ridge(g, w, h, 0.62, 0.09, "#7a6aa0", r);
  const wg = g.createLinearGradient(0, hy, 0, h);
  wg.addColorStop(0, "#f5b7a8");
  wg.addColorStop(1, "#4f5b96");
  g.fillStyle = wg;
  g.fillRect(0, hy, w, h - hy);
  g.fillStyle = hexA("#fff6dc", 0.7);
  for (let k = 0; k < 14; k++) {
    const wd = (10 + k * 5) * (0.6 + r() * 0.7);
    g.fillRect(
      w * 0.55 + (r() - 0.5) * k * 4 - wd / 2,
      hy + 5 + k * ((h - hy) / 15),
      wd,
      2.5,
    );
  }
  // dahan sakura dari pojok kiri atas
  g.strokeStyle = "#3b2a22";
  g.lineCap = "round";
  g.lineWidth = h * 0.035;
  g.beginPath();
  g.moveTo(-10, h * 0.12);
  g.bezierCurveTo(w * 0.2, h * 0.05, w * 0.3, h * 0.25, w * 0.5, h * 0.22);
  g.stroke();
  g.lineWidth = h * 0.015;
  g.beginPath();
  g.moveTo(w * 0.22, h * 0.1);
  g.bezierCurveTo(w * 0.25, h * 0.0, w * 0.35, h * 0.05, w * 0.4, h * 0.0);
  g.stroke();
  const pinks = ["#f7c3d3", "#f2a3bd", "#fbdbe5"];
  for (let i = 0; i < 160; i++) {
    const u = r();
    const x = w * (0.02 + u * 0.5);
    const y =
      h * (0.1 + 0.12 * Math.sin(u * 3.1) * (u > 0.4 ? 1 : 0.5)) +
      (r() - 0.5) * h * 0.18;
    disc(g, x, y, 2 + r() * 4, pinks[(r() * 3) | 0]);
  }
  for (let i = 0; i < 18; i++)
    disc(g, r() * w * 0.6, h * (0.25 + r() * 0.5), 2, "#fbdbe5");
};

const dragonMoon: Draw = (g, w, h, r) => {
  sky(g, w, h, [
    [0, "#0f1a35"],
    [0.6, "#2c3e70"],
    [1, "#7080b0"],
  ]);
  stars(g, w, h * 0.5, 40, r);
  const mx = w * 0.5;
  const my = h * 0.36;
  glow(g, mx, my, h * 0.6, "#dfe8ff", 0.5);
  disc(g, mx, my, h * 0.2, "#f5f2e4");
  for (let i = 0; i < 5; i++) {
    g.globalAlpha = 0.18;
    g.fillStyle = "#cfd8f0";
    g.beginPath();
    g.ellipse(
      r() * w,
      h * (0.5 + r() * 0.2),
      w * 0.18,
      h * 0.03,
      0,
      0,
      Math.PI * 2,
    );
    g.fill();
  }
  g.globalAlpha = 1;
  // naga terbang melintasi bulan: badan, ekor, kepala bertanduk, dan dua sayap berselaput
  g.save();
  g.translate(mx, my);
  const s = h * 0.0048;
  g.scale(s, s);
  g.fillStyle = "#0a0f22";
  g.globalAlpha = 0.7;
  g.beginPath(); // sayap jauh
  g.moveTo(12, -3);
  g.lineTo(40, -62);
  g.quadraticCurveTo(30, -42, 50, -46);
  g.quadraticCurveTo(42, -24, 62, -22);
  g.quadraticCurveTo(34, -8, 15, 6);
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
  g.beginPath(); // badan, leher, kepala, dan ekor
  g.moveTo(66, -10);
  g.quadraticCurveTo(54, -18, 42, -10);
  g.quadraticCurveTo(22, -8, 6, -6);
  g.quadraticCurveTo(-30, -4, -60, 8);
  g.quadraticCurveTo(-90, 20, -128, 14);
  g.quadraticCurveTo(-90, 30, -55, 24);
  g.quadraticCurveTo(-20, 20, 8, 12);
  g.quadraticCurveTo(30, 10, 46, 6);
  g.quadraticCurveTo(60, 4, 66, -10);
  g.closePath();
  g.fill();
  g.beginPath(); // tanduk
  g.moveTo(40, -10);
  g.lineTo(26, -26);
  g.lineTo(46, -14);
  g.closePath();
  g.fill();
  g.beginPath(); // sayap dekat
  g.moveTo(8, -5);
  g.lineTo(-6, -82);
  g.quadraticCurveTo(-20, -52, -36, -66);
  g.quadraticCurveTo(-44, -36, -66, -46);
  g.quadraticCurveTo(-62, -18, -84, -14);
  g.quadraticCurveTo(-48, -6, -20, 6);
  g.closePath();
  g.fill();
  g.restore();
  // puncak gunung
  g.fillStyle = "#0b1226";
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(0, h * 0.82);
  g.lineTo(w * 0.22, h * 0.6);
  g.lineTo(w * 0.34, h * 0.72);
  g.lineTo(w * 0.5, h * 0.86);
  g.lineTo(w * 0.72, h * 0.56);
  g.lineTo(w * 0.88, h * 0.74);
  g.lineTo(w, h * 0.7);
  g.lineTo(w, h);
  g.closePath();
  g.fill();
  g.fillStyle = "#c9d6f0";
  g.beginPath();
  g.moveTo(w * 0.72, h * 0.56);
  g.lineTo(w * 0.69, h * 0.64);
  g.lineTo(w * 0.72, h * 0.62);
  g.lineTo(w * 0.75, h * 0.66);
  g.closePath();
  g.fill();
};

const morningForest: Draw = (g, w, h, r) => {
  sky(g, w, h, [
    [0, "#cfe7b0"],
    [1, "#5e8a4a"],
  ]);
  glow(g, w * 0.7, h * 0.1, h * 0.8, "#fff3c0", 0.6);
  const layers: [string, number, number, number][] = [
    ["#4d7a43", 0.4, 7, 0.35],
    ["#2f5a35", 0.6, 6, 0.5],
    ["#17361f", 1, 5, 0.8],
  ];
  for (const [col, a, n, tw] of layers) {
    g.globalAlpha = a;
    for (let i = 0; i < n; i++) {
      const x = (i + r() * 0.8) * (w / n);
      g.fillStyle = col;
      g.fillRect(x, 0, w * 0.022 * tw * (0.6 + r() * 0.8) + 3, h);
    }
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 12; i++)
    glow(g, r() * w, r() * h * 0.2, h * 0.22, "#2f5a35", 0.55);
  g.fillStyle = hexA("#fff3c0", 0.13);
  for (let i = 0; i < 4; i++) {
    const x = w * (0.35 + i * 0.12);
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + w * 0.03, 0);
    g.lineTo(x - w * 0.2, h);
    g.lineTo(x - w * 0.27, h);
    g.closePath();
    g.fill();
  }
  ridge(g, w, h, 0.92, 0.05, "#0f2a17", r);
};

const windmill: Draw = (g, w, h, r) => {
  sky(g, w, h, [
    [0, "#7fb2e6"],
    [1, "#d8ecf7"],
  ]);
  g.fillStyle = hexA("#ffffff", 0.85);
  for (let i = 0; i < 4; i++) {
    const x = r() * w;
    const y = h * (0.1 + r() * 0.25);
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.ellipse(x + k * 14, y + (k % 2) * 4, 22, 11, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  ridge(g, w, h, 0.62, 0.07, "#8fbf72", r);
  ridge(g, w, h, 0.76, 0.06, "#5e9a52", r);
  // kincir
  const mx = w * 0.7;
  const my = h * 0.5;
  g.fillStyle = "#d9c9a8";
  g.beginPath();
  g.moveTo(mx - w * 0.05, h * 0.82);
  g.lineTo(mx - w * 0.03, my);
  g.lineTo(mx + w * 0.03, my);
  g.lineTo(mx + w * 0.05, h * 0.82);
  g.closePath();
  g.fill();
  g.fillStyle = "#7a3b2e";
  g.beginPath();
  g.moveTo(mx - w * 0.04, my);
  g.lineTo(mx, my - h * 0.1);
  g.lineTo(mx + w * 0.04, my);
  g.closePath();
  g.fill();
  g.strokeStyle = "#4a3426";
  g.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const a = 0.3 + (i * Math.PI) / 2;
    g.beginPath();
    g.moveTo(mx, my);
    g.lineTo(mx + Math.cos(a) * h * 0.32, my + Math.sin(a) * h * 0.32);
    g.stroke();
    g.fillStyle = hexA("#f0e6c8", 0.9);
    g.save();
    g.translate(mx, my);
    g.rotate(a);
    g.fillRect(h * 0.08, -h * 0.045, h * 0.24, h * 0.04);
    g.restore();
  }
  disc(g, mx, my, 5, "#4a3426");
  // jalan setapak
  g.fillStyle = "#d8c08a";
  g.beginPath();
  g.moveTo(w * 0.18, h);
  g.bezierCurveTo(w * 0.3, h * 0.9, w * 0.5, h * 0.88, mx - w * 0.04, h * 0.82);
  g.lineTo(mx + w * 0.01, h * 0.83);
  g.bezierCurveTo(w * 0.5, h * 0.94, w * 0.4, h * 0.98, w * 0.34, h);
  g.closePath();
  g.fill();
};

const comet: Draw = (g, w, h, r) => {
  sky(g, w, h, [
    [0, "#050912"],
    [0.7, "#142245"],
    [1, "#2a3f73"],
  ]);
  stars(g, w, h * 0.7, 120, r);
  const cx = w * 0.72;
  const cy = h * 0.22;
  const tail = g.createLinearGradient(cx, cy, w * 0.1, h * 0.62);
  tail.addColorStop(0, hexA("#dff0ff", 0.85));
  tail.addColorStop(1, hexA("#dff0ff", 0));
  g.fillStyle = tail;
  g.beginPath();
  g.moveTo(cx, cy - 7);
  g.lineTo(w * 0.08, h * 0.6);
  g.lineTo(w * 0.15, h * 0.66);
  g.lineTo(cx + 6, cy + 5);
  g.closePath();
  g.fill();
  glow(g, cx, cy, h * 0.2, "#dff0ff", 0.7);
  disc(g, cx, cy, 6, "#ffffff");
  ridge(g, w, h, 0.78, 0.07, "#0c1530", r);
  // kucing dan seorang penonton di bukit
  g.fillStyle = "#050912";
  const px = w * 0.4;
  const py = h * 0.8;
  g.beginPath();
  g.ellipse(px, py - 18, 7, 12, 0, 0, Math.PI * 2);
  g.fill();
  disc(g, px, py - 36, 6, "#050912");
  g.fillRect(px - 5, py - 8, 10, 14);
  g.beginPath();
  g.ellipse(px + 24, py - 1, 7, 5, 0, 0, Math.PI * 2);
  g.fill();
  disc(g, px + 29, py - 8, 4, "#050912");
  g.fillRect(0, h * 0.92, w, h * 0.08);
};

const ART = {
  moon: moonLake,
  cat,
  map: realmMap,
  night: nightForest,
  rune,
  still: stillLife,
  castle: castleDusk,
  lake: sakuraLake,
  dragon: dragonMoon,
  forest: morningForest,
  mill: windmill,
  comet,
} as const;
type ArtId = keyof typeof ART;

// goresan halus, grain kanvas, dan vinyet gelap di tepi supaya tampak seperti lukisan cat minyak
function finish(g: CanvasRenderingContext2D, w: number, h: number, r: R) {
  for (let i = 0; i < w * h * 0.012; i++) {
    g.globalAlpha = 0.045;
    g.fillStyle = r() > 0.5 ? "#ffffff" : "#000000";
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
  g.globalAlpha = 1;
  const v = g.createRadialGradient(
    w / 2,
    h / 2,
    h * 0.35,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.38)");
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
}

type Face = "+x" | "-x" | "+z" | "-z";
const YAW: Record<Face, number> = {
  "+z": 0,
  "-z": Math.PI,
  "+x": Math.PI / 2,
  "-x": -Math.PI / 2,
};

type Spot = {
  art: ArtId;
  floor: 0 | 1;
  face: Face;
  x: number;
  z: number;
  w: number; // lebar lukisan (m)
  h: number; // tinggi lukisan (m)
  cy: number; // tinggi pusat di atas lantai (m)
  seed: number;
};

// Muka dinding: sekat PLAN.t = 0,15 (muka = sumbu ± 0,075), dinding luar sisi dalam di x = ±11,7 dan z = ±6,7.
const SPOTS: Spot[] = [
  // Foyer, di atas bangku sepatu (dinding barat)
  {
    art: "moon",
    floor: 0,
    face: "+x",
    x: -2.325,
    z: 5.0,
    w: 0.9,
    h: 0.62,
    cy: 1.5,
    seed: 11,
  },
  // Lobi, potret kecil di sebelah pintu ke Ruang Kerja
  {
    art: "cat",
    floor: 0,
    face: "+x",
    x: -2.325,
    z: 0.3,
    w: 0.55,
    h: 0.75,
    cy: 1.5,
    seed: 12,
  },
  // Ruang Kerja: peta di atas lemari rendah, dua lukisan di dinding utara
  {
    art: "map",
    floor: 0,
    face: "-x",
    x: -2.475,
    z: 4.9,
    w: 1.5,
    h: 0.85,
    cy: 1.75,
    seed: 13,
  },
  {
    art: "night",
    floor: 0,
    face: "+z",
    x: -4.5,
    z: -0.525,
    w: 1.5,
    h: 0.9,
    cy: 1.8,
    seed: 14,
  },
  {
    art: "rune",
    floor: 0,
    face: "+z",
    x: -9.6,
    z: -0.525,
    w: 1.1,
    h: 0.75,
    cy: 1.7,
    seed: 15,
  },
  // Perpustakaan, dinding barat antara jendela dan rak
  {
    art: "forest",
    floor: 0,
    face: "+x",
    x: -11.7,
    z: -2.1,
    w: 0.9,
    h: 0.65,
    cy: 1.6,
    seed: 16,
  },
  // Dapur, dinding timur di antara dua pintu
  {
    art: "still",
    floor: 0,
    face: "-x",
    x: 4.325,
    z: -4.4,
    w: 1.1,
    h: 0.8,
    cy: 1.6,
    seed: 17,
  },
  // Ruang Makan, di atas bufet
  {
    art: "castle",
    floor: 0,
    face: "+z",
    x: 8.0,
    z: -4.325,
    w: 1.7,
    h: 0.95,
    cy: 1.75,
    seed: 18,
  },
  // Ruang Tamu (dua lantai): lukisan besar di dinding timur, satu lagi di dinding barat
  {
    art: "lake",
    floor: 0,
    face: "-x",
    x: 11.7,
    z: 1.2,
    w: 1.8,
    h: 1.1,
    cy: 2.0,
    seed: 19,
  },
  {
    art: "dragon",
    floor: 0,
    face: "+x",
    x: 2.475,
    z: 4.9,
    w: 1.2,
    h: 0.8,
    cy: 1.7,
    seed: 20,
  },
  // Galeri lantai atas, sisi galeri dari dinding Ruang Album (sisi album sudah berisi bingkai foto)
  {
    art: "mill",
    floor: 1,
    face: "+z",
    x: 5.1,
    z: -0.325,
    w: 0.95,
    h: 0.7,
    cy: 1.5,
    seed: 21,
  },
  {
    art: "comet",
    floor: 1,
    face: "+z",
    x: 6.9,
    z: -0.325,
    w: 0.95,
    h: 0.7,
    cy: 1.5,
    seed: 22,
  },
  {
    art: "moon",
    floor: 1,
    face: "+z",
    x: 8.6,
    z: -0.325,
    w: 0.95,
    h: 0.7,
    cy: 1.5,
    seed: 23,
  },
];

const PX = 420; // piksel per meter
const FRAME = 0.06; // lebar bingkai (m)

export default function WallPaintings() {
  const { textures, frameMat, frameGeo } = useMemo(() => {
    const textures = SPOTS.map((s) => {
      const cw = Math.round(s.w * PX);
      const ch = Math.round(s.h * PX);
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const g = c.getContext("2d")!;
      const r = rng(s.seed * 7919);
      ART[s.art](g, cw, ch, r);
      finish(g, cw, ch, rng(s.seed * 104729));
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    });
    return {
      textures,
      frameMat: new THREE.MeshStandardMaterial({
        color: "#3a2a1c",
        roughness: 0.55,
      }),
      frameGeo: SPOTS.map(
        (s) => new THREE.BoxGeometry(s.w + FRAME * 2, s.h + FRAME * 2, 0.05),
      ),
    };
  }, []);
  useEffect(
    () => () => {
      textures.forEach((t) => t.dispose());
      frameMat.dispose();
      frameGeo.forEach((g) => g.dispose());
    },
    [textures, frameMat, frameGeo],
  );

  return (
    <>
      {SPOTS.map((s, i) => {
        const y = (s.floor ? INTERIOR.floor2Y : INTERIOR.floorY) + s.cy;
        return (
          <group
            key={i}
            position={[s.x, y, s.z]}
            rotation={[0, YAW[s.face], 0]}
          >
            <mesh
              geometry={frameGeo[i]}
              material={frameMat}
              position={[0, 0, 0.025]}
            />
            <mesh position={[0, 0, 0.0515]} renderOrder={2}>
              <planeGeometry args={[s.w, s.h]} />
              <meshBasicMaterial
                map={textures[i]}
                toneMapped={false}
                color="#d9d2c4"
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
