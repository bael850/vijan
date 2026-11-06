"use client";

import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { displayFamily, whenDisplayFont } from "../../core/canvasFont";
import { applyGrain } from "../../core/grain";
import {
  BALCONY,
  BEDROOM,
  HOME,
  HOME_GLOW,
  HOME_UI,
  LAMP_FIT,
  LAMPS,
  VOID,
} from "../../config/home";

import { cutRects, DOOR, INTERIOR } from "./homeGeometry";
import type { HouseState } from "./houseState";

const FL = INTERIOR.floorY;
type P = [number, number, number];
type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}
const bx = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), color);

function leaf(g: THREE.BufferGeometry) {
  return paint(g, "#4f6b3a");
}
const WOOD = "#6b4a2e";
const DARK = "#3a2a1c";
const COVERS = [
  "#8a3b3b",
  "#35506b",
  "#4d6a45",
  "#8c6b34",
  "#5a3f63",
  "#2f5f5a",
  "#7a4a2a",
  "#3d3d52",
];

function buildStatic() {
  const list: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry) => list.push(g);
  const plant = (x: number, y: number, z: number, h: number) => {
    add(
      paint(
        new THREE.CylinderGeometry(0.26, 0.2, 0.4, 10).translate(x, y + 0.2, z),
        "#8a5a3a",
      ),
    );
    add(
      leaf(
        new THREE.IcosahedronGeometry(0.32 * h, 1).translate(
          x,
          y + 0.45 + 0.35 * h,
          z,
        ),
      ),
    );
    add(
      leaf(
        new THREE.IcosahedronGeometry(0.24 * h, 1).translate(
          x + 0.15,
          y + 0.4 + 0.8 * h,
          z - 0.1,
        ),
      ),
    );
  };

  // ── lantai bawah (slice 1c): furnitur per ruang, koordinat kerangka rumah, y di atas permukaan lantai FL ──
  {
    // oy = tambahan tinggi dasar (0 = lantai bawah; diisi saat mengisi lantai atas)
    let oy = 0;
    // kotak menurut rentang: x0..x1, z0..z1, tinggi y0..y1 di atas lantai
    const gB = (
      x0: number,
      x1: number,
      z0: number,
      z1: number,
      y0: number,
      y1: number,
      c: string,
    ) =>
      add(
        bx(
          x1 - x0,
          y1 - y0,
          z1 - z0,
          (x0 + x1) / 2,
          FL + oy + (y0 + y1) / 2,
          (z0 + z1) / 2,
          c,
        ),
      );
    type Face = "+z" | "-z" | "+x" | "-x";
    const legs4 = (
      x0: number,
      x1: number,
      z0: number,
      z1: number,
      h: number,
      inset = 0.05,
      th = 0.05,
    ) => {
      for (const x of [x0 + inset, x1 - inset])
        for (const z of [z0 + inset, z1 - inset])
          gB(x - th / 2, x + th / 2, z - th / 2, z + th / 2, 0, h, DARK);
    };
    const table = (
      x0: number,
      x1: number,
      z0: number,
      z1: number,
      h: number,
      c = WOOD,
    ) => {
      gB(x0, x1, z0, z1, h - 0.05, h, c);
      legs4(x0, x1, z0, z1, h - 0.05, 0.08, 0.07);
    };
    const chair = (x: number, z: number, f: Face, c = WOOD) => {
      gB(x - 0.22, x + 0.22, z - 0.22, z + 0.22, 0.43, 0.48, c);
      legs4(x - 0.22, x + 0.22, z - 0.22, z + 0.22, 0.43, 0.03, 0.04);
      if (f === "+z") gB(x - 0.22, x + 0.22, z - 0.23, z - 0.19, 0.48, 0.92, c);
      else if (f === "-z")
        gB(x - 0.22, x + 0.22, z + 0.19, z + 0.23, 0.48, 0.92, c);
      else if (f === "+x")
        gB(x - 0.23, x - 0.19, z - 0.22, z + 0.22, 0.48, 0.92, c);
      else gB(x + 0.19, x + 0.23, z - 0.22, z + 0.22, 0.48, 0.92, c);
    };
    // sofa dan kursi malas: len = sisi lebar, dep = kedalaman, f = arah hadap
    const lounge = (
      cx: number,
      cz: number,
      len: number,
      dep: number,
      f: Face,
      c1 = "#5d6b7a",
      c2 = "#4f5c6a",
    ) => {
      const zf = f === "+z" || f === "-z";
      const x0 = cx - (zf ? len : dep) / 2;
      const x1 = cx + (zf ? len : dep) / 2;
      const z0 = cz - (zf ? dep : len) / 2;
      const z1 = cz + (zf ? dep : len) / 2;
      gB(x0, x1, z0, z1, 0.1, 0.45, c1);
      legs4(x0, x1, z0, z1, 0.1, 0.07, 0.06);
      if (zf) {
        if (f === "+z") gB(x0, x1, z0, z0 + 0.2, 0.45, 0.95, c2);
        else gB(x0, x1, z1 - 0.2, z1, 0.45, 0.95, c2);
        gB(x0, x0 + 0.15, z0, z1, 0.45, 0.68, c2);
        gB(x1 - 0.15, x1, z0, z1, 0.45, 0.68, c2);
      } else {
        if (f === "+x") gB(x0, x0 + 0.2, z0, z1, 0.45, 0.95, c2);
        else gB(x1 - 0.2, x1, z0, z1, 0.45, 0.95, c2);
        gB(x0, x1, z0, z0 + 0.15, 0.45, 0.68, c2);
        gB(x0, x1, z1 - 0.15, z1, 0.45, 0.68, c2);
      }
    };
    const rug = (
      x0: number,
      x1: number,
      z0: number,
      z1: number,
      edge: string,
      mid: string,
    ) => {
      gB(x0, x1, z0, z1, 0.004, 0.022, edge);
      gB(x0 + 0.18, x1 - 0.18, z0 + 0.18, z1 - 0.18, 0.004, 0.028, mid);
    };
    // rak buku sepanjang dinding z = zw, tebal 0,35 ke arah dir (-1 = menghadap -z, 1 = menghadap +z), isi buku acak
    const shelfZ = (
      x0: number,
      x1: number,
      zw: number,
      seed: number,
      dir: 1 | -1 = -1,
    ) => {
      const r = prng(seed);
      const top = 2.3;
      const zr = (a: number, b: number): [number, number] => [
        Math.min(a, b),
        Math.max(a, b),
      ];
      const [bk0, bk1] = zr(zw, zw + dir * 0.04);
      const [s0, s1] = zr(zw, zw + dir * 0.35);
      const [k0, k1] = zr(zw + dir * 0.06, zw + dir * 0.29);
      gB(x0, x1, bk0, bk1, 0, top, WOOD); // panel belakang
      for (const x of [x0, x1 - 0.04]) gB(x, x + 0.04, s0, s1, 0, top, WOOD);
      const levels = [0.05, 0.5, 0.95, 1.4, 1.85];
      for (const y of [...levels, top - 0.03])
        gB(x0, x1, s0, s1, y, y + 0.03, WOOD);
      for (const y of levels) {
        let x = x0 + 0.07;
        while (x < x1 - 0.12) {
          const w = 0.035 + r() * 0.05;
          const h = 0.24 + r() * 0.16;
          if (r() < 0.07) {
            x += 0.12; // celah kosong
            continue;
          }
          gB(
            x,
            x + w,
            k0,
            k1,
            y + 0.03,
            y + 0.03 + h,
            COVERS[Math.floor(r() * COVERS.length)],
          );
          x += w + 0.004;
        }
      }
    };

    // ── Foyer: bangku sepatu di dinding barat, konsol dan cermin di dinding timur ──
    gB(-2.4 + 0.075, -2.4 + 0.5, 4.3, 5.7, 0.38, 0.45, WOOD);
    legs4(-2.325, -1.9, 4.3, 5.7, 0.38, 0.05, 0.05);
    gB(-2.325, -1.95, 4.4, 5.6, 0.1, 0.16, DARK); // rak sepatu bawah bangku
    gB(2.4 - 0.075 - 0.4, 2.325, 4.4, 5.6, 0.75, 0.8, WOOD); // konsol
    legs4(1.925, 2.325, 4.4, 5.6, 0.75, 0.05, 0.05);
    gB(2.3, 2.325, 4.55, 5.45, 1.1, 2.0, "#a9cbd8"); // cermin
    gB(2.295, 2.325, 4.5, 5.5, 1.05, 2.05, DARK); // bingkai (di belakang cermin)
    plant(2.05, FL + 0.8, 6.2 - 1.0, 0.45);

    // ── Lobi ──
    rug(-1.2, 1.2, 0.2, 3.0, "#6b3f3f", "#c9b48a");
    plant(-1.9, FL, 3.25, 1.1);
    plant(1.9, FL, 3.25, 0.9);

    // ── Ruang Kerja: meja CV menghadap jendela depan, pojok baca di jendela barat ──
    table(-8.7, -6.3, 5.7, 6.4, 0.75);
    chair(-7.5, 5.0, "+z", "#a98258");
    // laptop, lampu meja, cangkir
    gB(-7.13, -6.77, 5.95, 6.2, 0.75, 0.765, DARK);
    gB(-7.13, -6.77, 6.2, 6.215, 0.765, 0.98, DARK);
    gB(-8.65, -8.55, 6.25, 6.35, 0.75, 0.77, DARK);
    gB(-8.61, -8.59, 6.29, 6.31, 0.77, 1.05, DARK);
    gB(-8.7, -8.5, 6.2, 6.38, 1.05, 1.15, "#ffcf80");
    rug(-9.8, -5.2, 2.6, 5.3, "#5a4632", "#b9a77a");
    lounge(-10.75, 3.0, 0.9, 0.9, "+x", "#6b7f6a", "#5c6e5b");
    table(-10.85, -10.35, 4.05, 4.55, 0.5);
    plant(-11.2, FL, 1.2, 1.3);
    // lemari rendah di dinding timur ruang
    gB(-2.4 - 0.075 - 0.4, -2.475, 3.9, 5.9, 0, 0.8, WOOD);

    // ── Perpustakaan: dua rak sepanjang dinding utara, meja baca, kursi malas di jendela ──
    shelfZ(-11.55, -7.75, -0.675, 11);
    shelfZ(-6.25, -2.65, -0.675, 23);
    table(-9.6, -7.6, -4.1, -2.9, 0.75);
    chair(-8.6, -4.5, "+z");
    chair(-8.6, -2.5, "-z");
    rug(-10.2, -7.0, -4.9, -2.1, "#6b3f3f", "#c9b48a");
    lounge(-4.0, -5.8, 1.0, 0.9, "+z", "#6b7f6a", "#5c6e5b");
    gB(-3.2, -2.9, -6.2, -5.9, 0, 1.55, DARK); // tiang lampu baca
    gB(-3.35, -2.75, -6.35, -5.75, 1.55, 1.75, "#ffcf80");
    plant(-11.2, FL, -6.2, 1.2);

    // ── Dapur: lemari es, meja dapur di dinding belakang, pulau dengan dua bangku ──
    gB(-2.35, -1.65, -6.65, -5.95, 0, 1.85, "#cfcac0"); // lemari es
    gB(-2.35, -1.65, -5.95, -5.93, 1.0, 1.1, DARK);
    gB(-1.6, 3.0, -6.7, -6.1, 0, 0.88, WOOD); // lemari bawah
    gB(-1.65, 3.05, -6.75, -6.05, 0.88, 0.92, "#d8d2c6"); // blat
    gB(1.9, 2.5, -6.55, -6.2, 0.9, 0.915, "#8d8f86"); // bak cuci
    gB(2.16, 2.24, -6.6, -6.4, 0.915, 1.15, DARK); // keran
    for (const bxn of [-0.9, -0.4])
      for (const bzn of [-6.55, -6.3])
        gB(bxn - 0.08, bxn + 0.08, bzn - 0.08, bzn + 0.08, 0.92, 0.935, DARK); // kompor
    // lemari gantung hanya di kiri dan kanan jendela belakang (jendela x -0,3..2,3)
    gB(-1.6, -0.4, -6.7, -6.4, 1.55, 2.2, WOOD);
    gB(2.4, 2.9, -6.7, -6.4, 1.55, 2.2, WOOD);
    gB(0.0, 1.8, -3.85, -2.95, 0, 0.9, WOOD); // pulau
    gB(-0.05, 1.85, -3.9, -2.9, 0.9, 0.94, "#d8d2c6");
    for (const sx of [0.5, 1.3]) {
      gB(sx - 0.17, sx + 0.17, -2.75, -2.45, 0.6, 0.65, "#a98258");
      gB(sx - 0.02, sx + 0.02, -2.62, -2.58, 0, 0.6, DARK);
    }
    gB(0.4, 0.9, -3.55, -3.25, 0.94, 1.0, "#e9dcb4"); // mangkuk buah
    plant(3.9, FL, -1.0, 0.9);

    // ── Ruang Makan: meja enam kursi, bufet di dinding tangga ──
    rug(6.0, 10.0, -3.7, -1.3, "#5a4632", "#b9a77a");
    table(7.0, 9.0, -3.0, -2.0, 0.76);
    for (const cx of [7.5, 8.5]) {
      chair(cx, -3.4, "+z");
      chair(cx, -1.6, "-z");
    }
    chair(6.5, -2.5, "+x");
    chair(9.5, -2.5, "-x");
    gB(7.2, 8.8, -4.3, -3.9, 0, 0.85, WOOD); // bufet
    gB(7.2, 8.8, -4.3, -3.9, 0.85, 0.88, "#d8d2c6");
    gB(7.85, 8.0, -4.2, -4.0, 0.88, 1.15, "#8a5a3a"); // vas
    plant(11.2, FL, -1.0, 1.0);

    // ── Lorong Tangga ──
    plant(11.1, FL, -4.9, 1.0);

    // ── Ruang Tamu: sofa menghadap jendela depan, dua kursi malas, meja kopi, meja samping untuk album ──
    rug(4.8, 9.4, 1.0, 4.2, "#6b3f3f", "#c9b48a");
    lounge(7.0, 0.6, 2.6, 0.95, "+z");
    lounge(4.4, 2.7, 1.0, 0.9, "+x", "#6b7f6a", "#5c6e5b");
    lounge(9.8, 2.7, 1.0, 0.9, "-x", "#6b7f6a", "#5c6e5b");
    table(6.4, 7.6, 2.2, 2.8, 0.42);
    gB(8.5, 9.1, 0.1, 0.7, 0.5, 0.55, WOOD); // meja samping
    legs4(8.5, 9.1, 0.1, 0.7, 0.5, 0.05, 0.05);
    gB(9.6, 9.65, 0.3, 0.35, 0, 1.6, DARK); // lampu lantai
    gB(9.45, 9.8, 0.15, 0.5, 1.6, 1.8, "#ffcf80");
    plant(3.1, FL, 6.1, 1.4);
    plant(11.0, FL, 6.2, 1.2);

    // ───────── lantai atas (slice 2b): semua y di bawah ini relatif ke permukaan lantai atas ─────────
    oy = INTERIOR.floor2Y - FL;

    // ── Ruang Album: meja pajang dengan album besar, bingkai foto di dinding selatan dan timur ──
    rug(5.2, 9.2, -4.6, -0.9, "#5a4632", "#b9a77a");
    table(6.2, 8.4, -3.2, -2.3, 0.75);
    chair(6.8, -1.85, "-z");
    chair(7.8, -1.85, "-z");
    plant(4.75, FL + oy, -0.9, 1.3);
    gB(4.7, 4.75, -4.75, -4.7, 0, 1.55, DARK); // lampu lantai
    gB(4.55, 4.9, -4.9, -4.55, 1.55, 1.75, "#ffcf80");
    gB(11.3, 11.65, -0.95, -0.6, 0, 0.5, WOOD); // meja samping di pojok
    legs4(11.3, 11.65, -0.95, -0.6, 0.5, 0.03, 0.04);

    // ── Ruang Baca: rak panjang di sekat kamar, dua kursi malas, bangku jendela ──
    shelfZ(-3.55, -0.25, -0.325, 41, 1);
    shelfZ(1.15, 2.3, -0.325, 57, 1);
    rug(-3.0, 1.4, 1.8, 5.2, "#6b3f3f", "#c9b48a");
    lounge(-2.2, 3.5, 0.95, 0.95, "+x", "#6b7f6a", "#5c6e5b");
    lounge(0.7, 3.5, 0.95, 0.95, "-x", "#6b7f6a", "#5c6e5b");
    table(-1.05, -0.45, 3.2, 3.8, 0.45);
    gB(-3.35, -3.3, 1.9, 1.95, 0, 1.55, DARK); // lampu baca
    gB(-3.5, -3.15, 1.75, 2.1, 1.55, 1.75, "#ffcf80");
    gB(-2.75, 1.15, 7.55, 8.25, 0, 0.38, WOOD); // bangku jendela
    gB(-2.7, 1.1, 7.6, 8.2, 0.38, 0.46, "#6b7f6a");
    plant(-3.3, FL + oy, 4.9, 1.2);

    // ── Galeri, Jalan Timur, Jalan Depan ──
    rug(3.2, 11.2, 0.15, 1.75, "#5a4632", "#b9a77a");
    plant(11.25, FL + oy, 1.55, 0.9);
    gB(5.2, 8.6, 7.5, 7.95, 0.4, 0.46, WOOD); // bangku pemandangan menghadap danau
    legs4(5.2, 8.6, 7.5, 7.95, 0.4, 0.2, 0.06);
    plant(11.2, FL + oy, 7.7, 1.1);
  }

  // ── lantai atas ──
  const U = INTERIOR.floor2Y;
  // papan lantai atas, dipotong di void ruang tamu supaya tidak melayang di atas lubang
  for (const r of [
    [-3.7, 4.8, -6.7, 8.3],
    [4.8, 9.8, -5.3, 8.3],
    [9.8, 11.7, -6.7, 8.3],
  ] as [number, number, number, number][])
    for (const [x0, x1, z0, z1] of cutRects(r, [
      [VOID.x0, VOID.x1, VOID.z0, VOID.z1],
    ]))
      add(
        bx(
          x1 - x0,
          0.02,
          z1 - z0,
          (x0 + x1) / 2,
          U + 0.01,
          (z0 + z1) / 2,
          "#9b7650",
        ),
      );
  add(bx(4.4, 0.025, 3.4, -1.5, U + 0.025, 2.6, "#6b3f3f"));
  add(bx(4.0, 0.03, 3.0, -1.5, U + 0.03, 2.6, "#c9b48a"));
  // ── kamar tidur (lantai atas, di dalam BEDROOM) ──
  {
    const { x0, x1, z0, z1 } = BEDROOM;
    const w0 = x0 + 0.02; // dinding barat
    const wb = z0 + 0.02; // dinding belakang
    // karpet tengah kamar
    add(bx(3.4, 0.02, 2.6, 0.4, U + 0.03, -3.0, "#5a4632"));
    add(bx(3.0, 0.025, 2.2, 0.4, U + 0.035, -3.0, "#b9a77a"));
    // kasur: kepala di dinding belakang, sisi timur kamar
    const bxc = 2.8,
      bzc = wb + 1.15;
    add(bx(1.7, 0.28, 2.3, bxc, U + 0.2, bzc, WOOD)); // rangka
    add(bx(1.6, 0.22, 2.2, bxc, U + 0.45, bzc, "#e9e3d3")); // kasur
    add(bx(1.62, 0.1, 1.3, bxc, U + 0.61, bzc + 0.4, "#5d6b7a")); // selimut
    add(bx(1.7, 0.95, 0.08, bxc, U + 0.62, wb + 0.04, DARK)); // papan kepala
    for (const s of [-1, 1])
      add(bx(0.6, 0.12, 0.35, bxc + s * 0.4, U + 0.62, wb + 0.4, "#f3eee3")); // bantal
    // nakas dan lampu tidur
    add(bx(0.45, 0.5, 0.4, bxc - 1.2, U + 0.25, wb + 0.22, WOOD));
    add(bx(0.14, 0.02, 0.14, bxc - 1.2, U + 0.51, wb + 0.22, DARK));
    add(bx(0.16, 0.14, 0.16, bxc - 1.2, U + 0.6, wb + 0.22, "#ffcf80"));
    // lemari pakaian di sekat timur (dinding barat dikosongkan: di sana ada pintu kaca ke balkon)
    const wx = x1 - 0.075 - 0.3; // pusat lemari, menempel di sisi dalam sekat
    add(bx(0.6, 2.2, 2.0, wx, U + 1.1, -2.9, WOOD));
    for (const s of [-1, 1]) {
      add(bx(0.02, 2.0, 0.96, wx - 0.31, U + 1.1, -2.9 + s * 0.5, "#8a6a44"));
      add(bx(0.04, 0.2, 0.03, wx - 0.33, U + 1.1, -2.9 + s * 0.08, DARK));
    }
    // meja kerja (kosong dulu), di bawah jendela belakang
    const DK = BEDROOM.window.c;
    add(bx(2.4, 0.06, 1.2, DK, U + 0.75, wb + 0.62, WOOD)); // meja lebih dalam supaya penuh saat close-up dari atas
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(
          bx(
            0.06,
            0.72,
            0.06,
            DK + sx * 1.14,
            U + 0.36,
            wb + 0.62 + sz * 0.55,
            DARK,
          ),
        );
    add(bx(2.2, 0.2, 0.02, DK, U + 0.6, wb + 0.07, DARK)); // panel belakang
    // kursi kerja menghadap meja
    add(bx(0.5, 0.06, 0.5, DK, U + 0.46, wb + 1.55, "#a98258"));
    add(bx(0.5, 0.5, 0.05, DK, U + 0.74, wb + 1.8, "#a98258"));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        add(
          bx(
            0.05,
            0.44,
            0.05,
            DK + sx * 0.2,
            U + 0.22,
            wb + 1.55 + sz * 0.2,
            DARK,
          ),
        );
    // tanaman di sudut barat-selatan
    plant(w0 + 0.4, U, z1 - 0.5, 1.0);
    // ── detail di atas meja kerja (benda interaktif ada di komponen, ini hiasannya) ──
    const T = U + 0.78; // permukaan meja
    const dz = wb + 0.62; // pusat meja (z)
    // lampu meja di sudut kiri belakang
    add(bx(0.18, 0.03, 0.18, DK - 1.05, T + 0.015, dz - 0.2, DARK));
    add(bx(0.03, 0.42, 0.03, DK - 1.05, T + 0.23, dz - 0.2, DARK));
    add(bx(0.26, 0.12, 0.22, DK - 1.05, T + 0.48, dz - 0.14, "#ffcf80"));
    // papan sirkuit (breadboard) dan kabel jumper di dekat Arduino
    add(bx(0.2, 0.02, 0.08, DK - 0.55, T + 0.01, dz - 0.3, "#e9e3d3"));
    for (const [i, c] of ["#8a3b3b", "#35506b", "#4d6a45", "#8c6b34"].entries())
      add(
        bx(0.012, 0.012, 0.14, DK - 0.62 + i * 0.045, T + 0.026, dz - 0.18, c),
      );
    // cangkir kopi dan wadah pulpen
    add(
      paint(
        new THREE.CylinderGeometry(0.055, 0.045, 0.1, 12).translate(
          DK + 0.55,
          T + 0.05,
          dz + 0.2,
        ),
        "#e9dcb4",
      ),
    );
    add(
      paint(
        new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12).translate(
          DK + 0.4,
          T + 0.06,
          dz - 0.3,
        ),
        "#8a5a3a",
      ),
    );
    for (const [i, c] of ["#8a3b3b", "#35506b", "#3a2a1c"].entries())
      add(
        bx(
          0.01,
          0.16,
          0.01,
          DK + 0.38 + i * 0.02,
          T + 0.17,
          dz - 0.3 + (i - 1) * 0.015,
          c,
        ),
      );
    // mesin fax: kerangka, gagang, dan kertas keluar
    const fx = DK + 0.98,
      fz = dz - 0.05;
    add(bx(0.3, 0.045, 0.07, fx, T + 0.145, fz - 0.1, DARK)); // gagang
    add(bx(0.2, 0.006, 0.1, fx, T + 0.004, fz + 0.2, "#f4f1ea")); // kertas keluar
    // tempel catatan kuning di panel belakang meja
    for (const [i, c] of ["#f2d95c", "#f2a3bd"].entries())
      add(bx(0.1, 0.1, 0.005, DK - 0.9 + i * 0.7, U + 0.62, wb + 0.085, c));
  }

  // ── balkon (teras atap): bangku di dekat dinding belakang, meja kecil, dan pot tanaman ──
  {
    const D = U + 0.06; // permukaan dek
    const bz = BALCONY.z0 + 0.45;
    add(bx(1.8, 0.07, 0.5, -8.0, D + 0.46, bz, WOOD)); // dudukan
    add(bx(1.8, 0.4, 0.06, -8.0, D + 0.7, bz - 0.22, WOOD)); // sandaran
    for (const sx of [-1, 1])
      add(bx(0.07, 0.43, 0.46, -8.0 + sx * 0.82, D + 0.215, bz, DARK));
    add(bx(0.45, 0.04, 0.45, -6.2, D + 0.5, bz + 0.05, WOOD)); // meja kecil
    add(bx(0.05, 0.48, 0.05, -6.2, D + 0.25, bz + 0.05, DARK));
    add(
      paint(
        new THREE.CylinderGeometry(0.05, 0.04, 0.09, 12).translate(
          -6.2,
          D + 0.565,
          bz + 0.05,
        ),
        "#e9dcb4",
      ),
    );
    plant(BALCONY.x0 + 0.45, D, BALCONY.z1 - 0.45, 1.2);
    plant(BALCONY.x0 + 0.45, D, BALCONY.z0 + 0.45, 1.0);
    plant(BALCONY.x1 - 0.4, D, BALCONY.z1 - 0.4, 0.9);
  }

  // ── plafon terang di bawah pelat (supaya langit-langit tidak hitam) ──
  const CEIL = "#efe8da";
  const c0 = FL + HOME.h - 0.25 - 0.015;
  // plafon bawah dipotong di bawah void, supaya ruang tamu terbuka sampai atap lantai atas
  for (const r of [
    [-11.7, 4.8, -6.7, 6.7],
    [9.8, 11.7, -6.7, 6.7],
    [4.8, 9.8, -5.3, 6.7],
  ] as [number, number, number, number][])
    for (const [x0, x1, z0, z1] of cutRects(r, [
      [VOID.x0, VOID.x1, VOID.z0, VOID.z1],
    ]))
      add(bx(x1 - x0, 0.02, z1 - z0, (x0 + x1) / 2, c0, (z0 + z1) / 2, CEIL));
  const c1 = INTERIOR.floor2Y + HOME.upper.h - 0.015;
  add(bx(15.4, 0.02, 15.0, 4.0, c1, 0.8, CEIL));

  // lampu plafon tertanam: cincin tepi dan piringan menyala rata dengan plafon (tonjolan 1 cm), tanpa gantungan
  for (const L of LAMPS) {
    const cy = L.floor === 0 ? c0 : c1;
    for (const [lx, lz] of L.at) {
      add(
        paint(
          new THREE.CylinderGeometry(
            LAMP_FIT.trim,
            LAMP_FIT.trim,
            0.006,
            20,
          ).translate(lx, cy - 0.013, lz),
          "#cfc6b4",
        ),
      );
      add(
        paint(
          new THREE.CylinderGeometry(
            LAMP_FIT.r,
            LAMP_FIT.r,
            0.004,
            20,
          ).translate(lx, cy - 0.018, lz),
          "#ffcf80",
        ),
      );
    }
  }

  // tiap kelompok bahan digabung terpisah supaya bisa diberi tekstur sendiri
  const FABRIC = new Set([
    "5d6b7a",
    "4f5c6a",
    "6b7f6a",
    "5c6e5b",
    "8a5a3a",
    "7a4c30",
    "6b3f3f",
    "c9b48a",
    "b9a77a",
    "7a5a3a",
    "5a4632",
    "efe8da",
    ...COVERS.map((c) => c.slice(1)),
  ]);
  const groups: Record<
    "wood" | "fabric" | "leaf" | "shade",
    THREE.BufferGeometry[]
  > = {
    wood: [],
    fabric: [],
    leaf: [],
    shade: [],
  };
  for (const g of list) {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes))
      if (!["position", "normal", "uv", "color"].includes(k))
        n.deleteAttribute(k);
    const c = n.attributes.color;
    const hex = new THREE.Color(c.getX(0), c.getY(0), c.getZ(0)).getHexString();
    const kind =
      hex === "ffcf80"
        ? "shade"
        : hex === "4f6b3a"
          ? "leaf"
          : FABRIC.has(hex)
            ? "fabric"
            : "wood";
    groups[kind].push(n);
  }
  return {
    wood: mergeGeometries(groups.wood, false),
    fabric: mergeGeometries(groups.fabric, false),
    leaf: mergeGeometries(groups.leaf, false),
    shade: mergeGeometries(groups.shade, false),
  };
}

function useTexture(draw: Draw, w: number, h: number) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    // gambar ulang setelah font selesai dimuat, supaya label tidak tertinggal memakai font cadangan
    whenDisplayFont(() => {
      g.clearRect(0, 0, w, h);
      draw(g, w, h);
      t.needsUpdate = true;
    });
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

// label CV, rak Tulisan, dan album
const textDraw =
  (bg: string, text: string, glyph?: string): Draw =>
  (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f3ecd6";
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (glyph) {
      g.font = `600 ${h * 0.38}px ${displayFamily()}`;
      g.fillText(glyph, w / 2, h * 0.38);
      g.font = `500 ${h * 0.17}px ${displayFamily()}`;
      g.fillText(text, w / 2, h * 0.76);
    } else {
      g.font = `600 ${h * 0.4}px ${displayFamily()}`;
      g.fillText(text, w / 2, h / 2);
    }
  };

const photoDraw =
  (seed: number): Draw =>
  (g, w, h) => {
    const r = prng(seed * 97 + 3);
    const hue = 190 + r() * 60;
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, `hsl(${hue},45%,62%)`);
    sky.addColorStop(1, `hsl(${hue - 140},55%,78%)`);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,240,200,0.9)";
    g.beginPath();
    g.arc(w * (0.25 + r() * 0.5), h * 0.3, h * 0.09, 0, 7);
    g.fill();
    for (let k = 0; k < 2; k++) {
      g.fillStyle = `hsl(${120 + k * 20},${25 - k * 5}%,${30 - k * 8}%)`;
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, h * (0.62 + k * 0.1));
      for (let i = 1; i <= 4; i++)
        g.lineTo((w * i) / 4, h * (0.5 + k * 0.12 + r() * 0.18));
      g.lineTo(w, h);
      g.fill();
    }
  };

const arduinoDraw: Draw = (g, w, h) => {
  g.fillStyle = "#00797f";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#101820";
  g.fillRect(w * 0.42, h * 0.3, w * 0.22, h * 0.34); // chip
  g.fillStyle = "#b8bcc0";
  g.fillRect(0, h * 0.34, w * 0.14, h * 0.3); // USB
  g.fillStyle = "#0b1114";
  for (let i = 0; i < 14; i++) {
    g.fillRect(w * (0.2 + i * 0.05), h * 0.04, w * 0.032, h * 0.09);
    g.fillRect(w * (0.2 + i * 0.05), h * 0.87, w * 0.032, h * 0.09);
  }
  g.fillStyle = "#e8fff9";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `700 ${h * 0.12}px monospace`;
  g.fillText("GitHub", w * 0.6, h * 0.76);
  g.fillStyle = "#f5c04a";
  g.beginPath();
  g.arc(w * 0.3, h * 0.74, h * 0.03, 0, 7);
  g.fill();
};
const docDraw: Draw = (g, w, h) => {
  g.fillStyle = "#f4f1ea";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#0a66c2";
  g.fillRect(0, 0, w, h * 0.22);
  g.fillStyle = "#ffffff";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.font = `700 ${h * 0.15}px ${displayFamily()}`;
  g.fillText("in", w * 0.06, h * 0.12);
  g.font = `600 ${h * 0.08}px ${displayFamily()}`;
  g.fillText("LinkedIn", w * 0.28, h * 0.12);
  g.fillStyle = "#b9b4a6";
  for (let i = 0; i < 9; i++)
    g.fillRect(
      w * 0.08,
      h * (0.32 + i * 0.07),
      w * (i % 4 === 3 ? 0.5 : 0.84),
      h * 0.025,
    );
};
const noteDraw: Draw = (g, w, h) => {
  g.fillStyle = "#efe6cf";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#c9bd9c";
  for (let i = 0; i < 8; i++)
    g.fillRect(w * 0.06, h * (0.3 + i * 0.085), w * 0.88, h * 0.012);
  g.fillStyle = "#5a3a22";
  g.textAlign = "left";
  g.textBaseline = "middle";
  g.font = `600 ${h * 0.17}px ${displayFamily()}`;
  g.fillText(HOME_UI.label.library, w * 0.07, h * 0.15);
  g.fillStyle = "#8a3b3b";
  g.fillRect(w * 0.015, 0, w * 0.02, h);
};
const phoneDraw: Draw = (g, w, h) => {
  const gr = g.createLinearGradient(0, h, w, 0);
  gr.addColorStop(0, "#feda75");
  gr.addColorStop(0.4, "#d62976");
  gr.addColorStop(1, "#4f5bd5");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#ffffff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `700 ${w * 0.4}px ${displayFamily()}`;
  g.fillText("IG", w / 2, h * 0.42);
  g.font = `500 ${w * 0.12}px ${displayFamily()}`;
  g.fillText("@baeeelll1", w / 2, h * 0.7);
};
const faxDraw: Draw = (g, w, h) => {
  g.fillStyle = "#cfcac0";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#1c2a24";
  g.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.3); // layar
  g.fillStyle = "#9bd8a8";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `700 ${h * 0.2}px monospace`;
  g.fillText("@ Email", w / 2, h * 0.23);
  g.fillStyle = "#7a766c";
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++)
      g.fillRect(
        w * (0.12 + c * 0.2),
        h * (0.48 + r * 0.16),
        w * 0.14,
        h * 0.1,
      );
};

type HotProps = {
  id: string;
  pos: P;
  size: P;
  color: string;
  ry?: number;
  rx?: number;
  draw?: Draw;
  texSize?: [number, number];
  plane?: { at: P; rot: P; w: number; h: number };
  house: MutableRefObject<HouseState>;
  onPick: (id: string) => void;
  onTip: (id: string | null) => void;
};

// Bingkai foto Ruang Album: dinding selatan (menghadap -z) dan dinding timur (menghadap -x)
const FRAMES: [number, number, number][] = [
  [5.2, -0.5, Math.PI],
  [6.4, -0.5, Math.PI],
  [7.6, -0.5, Math.PI],
  [8.7, -0.5, Math.PI],
  [11.66, -4.2, -Math.PI / 2],
  [11.66, -3.0, -Math.PI / 2],
  [11.66, -1.8, -Math.PI / 2],
];

function Hot({
  id,
  pos,
  size,
  color,
  ry = 0,
  draw,
  texSize = [256, 160],
  plane,
  house,
  onPick,
  onTip,
}: HotProps) {
  const [on, setOn] = useState(false);
  const tex = useTexture(draw ?? (() => {}), texSize[0], texSize[1]);
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  const live = () => house.current.mode === "in";
  return (
    <group position={pos} rotation={[0, ry, 0]} scale={on ? 1.04 : 1}>
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!live() || e.delta > 6) return;
          e.stopPropagation();
          onPick(id);
        }}
        onPointerOver={(e) => {
          if (!live()) return;
          e.stopPropagation();
          setOn(true);
          onTip(id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setOn(false);
          onTip(null);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive="#f5c04a"
          emissiveIntensity={on ? 0.5 : 0}
          roughness={0.7}
        />
      </mesh>
      {draw && plane && (
        <mesh position={plane.at} rotation={plane.rot}>
          <planeGeometry args={[plane.w, plane.h]} />
          <meshBasicMaterial
            map={tex}
            toneMapped={false}
            color={on ? "#ffffff" : "#d9d2c4"}
          />
        </mesh>
      )}
    </group>
  );
}

// Teleskop di balkon: kaki tiga dan tabung kuningan menghadap danau. Klik untuk mengintip (kamera mendekat).
function Scope({
  house,
  onPick,
  onTip,
}: {
  house: MutableRefObject<HouseState>;
  onPick: (id: string) => void;
  onTip: (id: string | null) => void;
}) {
  const [on, setOn] = useState(false);
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  const live = () => house.current.mode === "in";
  const D = INTERIOR.floor2Y + 0.06;
  const legs: [number, number][] = [
    [0, 0.34],
    [(-Math.PI * 2) / 3, 0.34],
    [(Math.PI * 2) / 3, 0.34],
  ];
  return (
    <group position={[BALCONY.scope.x, D, BALCONY.scope.z]}>
      {legs.map(([a, r], i) => (
        <mesh
          key={i}
          position={[Math.sin(a) * r * 0.5, 0.65, Math.cos(a) * r * 0.5]}
          rotation={[-Math.cos(a) * 0.27, 0, Math.sin(a) * 0.27]}
        >
          <cylinderGeometry args={[0.018, 0.012, 1.32, 6]} />
          <meshStandardMaterial color="#2b2118" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 1.28, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial color="#2b2118" roughness={0.6} />
      </mesh>
      {/* tabung: miring sedikit ke atas, menghadap +z (danau) */}
      <group position={[0, 1.34, 0]} rotation={[-0.16, 0, 0]}>
        <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.9, 16]} />
          <meshStandardMaterial
            color="#b08a3e"
            metalness={0.7}
            roughness={0.35}
            emissive="#f5c04a"
            emissiveIntensity={on ? 0.45 : 0}
          />
        </mesh>
        <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.065, 0.14, 16]} />
          <meshStandardMaterial color="#6b4a2e" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, -0.39]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.14, 10]} />
          <meshStandardMaterial color="#2b2118" roughness={0.5} />
        </mesh>
      </group>
      {/* area klik yang lebih lega dari modelnya */}
      <mesh
        position={[0, 0.85, 0.1]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!live() || e.delta > 6) return;
          e.stopPropagation();
          onPick("scope");
        }}
        onPointerOver={(e) => {
          if (!live()) return;
          e.stopPropagation();
          setOn(true);
          onTip("scope");
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setOn(false);
          onTip(null);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[0.7, 1.8, 1.1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function HouseInterior({
  house,
  onPick,
  onTip,
}: {
  house: MutableRefObject<HouseState>;
  books: number;
  onPick: (id: string) => void;
  onTip: (id: string | null) => void;
}) {
  const geo = useMemo(() => buildStatic(), []);
  const mats = useMemo(() => {
    const lam = (kind: "wood" | "fabric" | "ground") => {
      const m = new THREE.MeshLambertMaterial({ vertexColors: true });
      applyGrain(m, kind);
      return m;
    };
    return {
      wood: lam("wood"),
      fabric: lam("fabric"),
      leaf: lam("ground"),
      shade: new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      }),
    };
  }, []);
  // piringan plafon dan bola lampu: redup saat mati, terang saat menyala (mengikuti house.lamp)
  useFrame(() => {
    const k = HOME_GLOW.lampOff + (1 - HOME_GLOW.lampOff) * house.current.lamp;
    mats.shade.color.setScalar(k);
  });
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g?.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geo, mats],
  );
  const base = { house, onPick, onTip };
  // meja kerja kamar lantai atas (harus sama dengan blok kamar di buildStatic)
  const deskX = BEDROOM.window.c;
  const deskZ = BEDROOM.z0 + 0.02 + 0.62;
  const deskT2 = INTERIOR.floor2Y + 0.78;
  const deskT0 = FL + 0.75; // meja CV lantai bawah
  const deskA = INTERIOR.floor2Y + 0.75; // meja pajang Ruang Album
  const top2 = (h: number, w: number, d: number) => ({
    at: [0, h / 2 + 0.003, 0] as P,
    rot: [-Math.PI / 2, 0, 0] as P,
    w,
    h: d,
  });

  return (
    <group position={[HOME.x, 0, HOME.z]} rotation={[0, DOOR.yaw, 0]}>
      {(["wood", "fabric", "leaf", "shade"] as const).map((k) =>
        geo[k] ? <mesh key={k} geometry={geo[k]!} material={mats[k]} /> : null,
      )}

      {/* ── meja kerja di kamar lantai atas ── */}
      <Hot
        {...base}
        id="contact:github"
        pos={[deskX - 0.85, deskT2 + 0.015, deskZ - 0.1]}
        size={[0.34, 0.03, 0.24]}
        color="#00797f"
        ry={0.25}
        draw={arduinoDraw}
        texSize={[340, 240]}
        plane={top2(0.03, 0.34, 0.24)}
      />
      <Hot
        {...base}
        id="contact:linkedin"
        pos={[deskX - 0.35, deskT2 + 0.02, deskZ + 0.12]}
        size={[0.3, 0.04, 0.42]}
        color="#f4f1ea"
        ry={-0.12}
        draw={docDraw}
        texSize={[240, 340]}
        plane={top2(0.04, 0.28, 0.4)}
      />
      <Hot
        {...base}
        id="library"
        pos={[deskX + 0.1, deskT2 + 0.02, deskZ + 0.18]}
        size={[0.4, 0.04, 0.3]}
        color="#efe6cf"
        ry={0.08}
        draw={noteDraw}
        texSize={[400, 300]}
        plane={top2(0.04, 0.38, 0.28)}
      />
      <Hot
        {...base}
        id="contact:instagram"
        pos={[deskX + 0.62, deskT2 + 0.007, deskZ + 0.3]}
        size={[0.1, 0.014, 0.2]}
        color="#16141a"
        ry={-0.2}
        draw={phoneDraw}
        texSize={[170, 340]}
        plane={{
          at: [0, 0.0085, 0],
          rot: [-Math.PI / 2, 0, 0],
          w: 0.088,
          h: 0.185,
        }}
      />
      <Hot
        {...base}
        id="contact:email"
        pos={[deskX + 0.98, deskT2 + 0.06, deskZ - 0.05]}
        size={[0.34, 0.12, 0.3]}
        color="#cfcac0"
        draw={faxDraw}
        texSize={[340, 300]}
        plane={top2(0.12, 0.32, 0.28)}
      />

      {/* ── balkon ── */}
      <Scope house={house} onPick={onPick} onTip={onTip} />

      {/* ── lantai atas: album besar dan bingkai foto di Ruang Album ── */}
      <Hot
        {...base}
        id="album"
        pos={[7.3, deskA + 0.025, -2.75]}
        size={[0.6, 0.05, 0.42]}
        color="#2f5f5a"
        ry={0.15}
        draw={textDraw("#2f5f5a", HOME_UI.label.album)}
        texSize={[420, 300]}
        plane={top2(0.05, 0.58, 0.4)}
      />
      {FRAMES.map(([x, z, ry], i) => (
        <Hot
          key={i}
          {...base}
          id="album"
          pos={[x, INTERIOR.floor2Y + 1.5, z]}
          size={[0.8, 0.56, 0.04]}
          color="#3a2a1c"
          ry={ry}
          draw={photoDraw(i + 1)}
          texSize={[288, 200]}
          plane={{ at: [0, 0, 0.022], rot: [0, 0, 0], w: 0.72, h: 0.48 }}
        />
      ))}

      {/* ── lantai bawah: titik klik CV, rak Tulisan, album ── */}
      <Hot
        {...base}
        id="cv-writer"
        pos={[-8.15, deskT0 + 0.015, 6.05]}
        size={[0.4, 0.03, 0.3]}
        color="#8a3b3b"
        ry={0.12}
        draw={textDraw("#8a3b3b", HOME_UI.label.cvWriter, "CV")}
        texSize={[340, 260]}
        plane={top2(0.03, 0.38, 0.28)}
      />
      <Hot
        {...base}
        id="cv-marketing"
        pos={[-7.65, deskT0 + 0.015, 6.0]}
        size={[0.4, 0.03, 0.3]}
        color="#35506b"
        ry={-0.1}
        draw={textDraw("#35506b", HOME_UI.label.cvMarketing, "CV")}
        texSize={[340, 260]}
        plane={top2(0.03, 0.38, 0.28)}
      />
      <Hot
        {...base}
        id="library"
        pos={[-8.6, FL + 0.77, -3.5]}
        size={[0.5, 0.04, 0.36]}
        color="#efe6cf"
        ry={0.1}
        draw={noteDraw}
        texSize={[400, 300]}
        plane={top2(0.04, 0.48, 0.34)}
      />
      <Hot
        {...base}
        id="library"
        pos={[-9.65, FL + 2.05, -1.08]}
        size={[1.4, 0.3, 0.04]}
        color="#6b3f3f"
        draw={textDraw("#6b3f3f", HOME_UI.label.library)}
        texSize={[560, 120]}
        plane={{ at: [0, 0, -0.022], rot: [0, Math.PI, 0], w: 1.36, h: 0.26 }}
      />
      <Hot
        {...base}
        id="album"
        pos={[8.8, FL + 0.57, 0.4]}
        size={[0.36, 0.04, 0.28]}
        color="#4d6a45"
        ry={0.3}
        draw={textDraw("#4d6a45", HOME_UI.label.album)}
        texSize={[360, 280]}
        plane={top2(0.04, 0.34, 0.26)}
      />
    </group>
  );
}
