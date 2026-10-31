// Procedural rig for the cat. cat.glb is a single static mesh (no bones, no
// morph targets), so every movement lives in these shaders: walking legs,
// head, tail, ears, plus the pose layer (sit, loaf, play-bow, raised paw,
// puffed fur) and the face (mouth, tongue, blink, happy and angry eyes).
// Model space: the cat faces +x, y is up, z is sideways.

export const UNI = {
  uPhase: { value: 0 },
  uWalk: { value: 0 },
  uAmp: { value: 0.4 },
  uT: { value: 0 },
  uHeadYaw: { value: 0 },
  uHeadPitch: { value: 0 },
  uHeadRoll: { value: 0 },
  uTail: { value: 0.7 },
  uTailUp: { value: 0 },
  uEarL: { value: 0 },
  uEarR: { value: 0 },
  uBlink: { value: 0 },
  uRun: { value: 0 },
  // pose layer
  uSit: { value: 0 },
  uLoaf: { value: 0 },
  uBow: { value: 0 },
  uPawL: { value: 0 },
  uPawR: { value: 0 },
  uPuff: { value: 0 },
  // face
  uMouth: { value: 0 },
  uTongue: { value: 0 },
  uHappy: { value: 0 },
  uAngry: { value: 0 },
  // lentur badan
  uBend: { value: 0 },
  uSquash: { value: 0 },
  uBreath: { value: 0 },
};

export const VERT_DECL = `
uniform float uPhase, uWalk, uAmp, uT, uHeadYaw, uHeadPitch, uHeadRoll, uTail, uTailUp, uEarL, uEarR;
uniform float uSit, uLoaf, uBow, uPawL, uPawR, uPuff, uMouth, uRun, uBend, uSquash, uBreath;
varying vec3 vLocal;`;

export const FRAG_DECL = `
uniform float uBlink, uMouth, uTongue, uHappy, uAngry;
varying vec3 vLocal;`;

export const VERT = /* glsl */ `
  vec3 q = position;
  vec3 p = position;
  vLocal = position;

  float wy = smoothstep(-0.14, -0.32, q.y);
  float depan = step(0.0, q.x);
  float pivX = mix(-0.17, 0.20, depan);
  float wx = 1.0 - smoothstep(0.10, 0.17, abs(q.x - pivX));
  float wz = smoothstep(0.02, 0.05, abs(q.z));
  float sisi = clamp(q.z / 0.05, -1.0, 1.0);
  float arah = depan * 2.0 - 1.0;
  // jalan: kaki kiri-kanan berselang; lari: kiri-kanan hampir bersamaan (gallop)
  float ph = uPhase + 1.5708 * (1.0 - arah * sisi) * (1.0 - 0.8 * uRun);
  float wk = wy * wx * wz * uWalk;
  float th = sin(ph) * uAmp * wk;
  vec2 hip = vec2(pivX, -0.14);
  vec2 dd = p.xy - hip;
  p.xy = hip + vec2(dd.x * cos(th) - dd.y * sin(th), dd.x * sin(th) + dd.y * cos(th));
  p.y += max(0.0, cos(ph)) * 0.06 * wk;

  // lari: badan melompat dua kali per siklus dan mengayun naik-turun
  // seperti tulang punggung yang melengkung, kepala sedikit turun
  p.y += uRun * (0.035 * (0.5 + 0.5 * cos(2.0 * uPhase)) + 0.05 * sin(uPhase + 0.6) * q.x);

  float tw = smoothstep(-0.22, -0.30, q.x) * smoothstep(0.02, 0.3, q.y);
  p.z += sin(uT * 2.2 + q.y * 6.0) * 0.08 * uTail * tw;
  p.x += sin(uT * 1.1 + q.y * 3.0) * 0.03 * uTail * tw;
  p.y += uTailUp * 0.07 * tw;

  // lari: ekor terbentang ke belakang
  vec2 tb = vec2(-0.27, 0.0);
  vec2 td = p.xy - tb;
  float ta = uRun * 1.0 * tw;
  p.xy = tb + vec2(td.x * cos(ta) - td.y * sin(ta), td.x * sin(ta) + td.y * cos(ta));

  float hw = smoothstep(0.12, 0.26, q.x) * smoothstep(-0.12, -0.02, q.y);
  vec3 hp = p - vec3(0.2, 0.0, 0.0);
  float a1 = uHeadYaw * hw;
  hp = vec3(hp.x * cos(a1) + hp.z * sin(a1), hp.y, -hp.x * sin(a1) + hp.z * cos(a1));
  float a2 = uHeadPitch * hw;
  hp = vec3(hp.x * cos(a2) - hp.y * sin(a2), hp.x * sin(a2) + hp.y * cos(a2), hp.z);
  float a3 = uHeadRoll * hw;
  hp = vec3(hp.x, hp.y * cos(a3) - hp.z * sin(a3), hp.y * sin(a3) + hp.z * cos(a3));
  p = hp + vec3(0.2, 0.0, 0.0);

  // ears: values above 1 pin them sideways and down ("airplane ears")
  float ew = smoothstep(0.19, 0.24, q.y) * smoothstep(0.08, 0.13, abs(q.z)) * smoothstep(0.15, 0.25, q.x);
  float ea = mix(uEarR, uEarL, step(0.0, q.z));
  p.z += ew * ea * 0.035 * sign(q.z);
  p.y -= ew * ea * 0.02;

  // ── pose layer ──
  // raised front paw (left = +z, right = -z): waving, grooming, batting
  float pawW = wy * wx * depan;
  float pawL = pawW * smoothstep(0.02, 0.05, q.z);
  float pawR = pawW * smoothstep(0.02, 0.05, -q.z);
  float th2 = 1.9 * (uPawL * pawL + uPawR * pawR);
  vec2 d2 = p.xy - vec2(0.20, -0.14);
  p.xy = vec2(0.20, -0.14) + vec2(d2.x * cos(th2) - d2.y * sin(th2), d2.x * sin(th2) + d2.y * cos(th2));

  // jaw drops a little when the mouth opens
  float cw = smoothstep(0.36, 0.46, q.x) * smoothstep(0.03, -0.01, q.y) * smoothstep(-0.14, -0.04, q.y);
  p.y -= uMouth * 0.016 * cw;

  // puffed fur: fat tail and slightly bigger body
  float tailAxis = -0.25 - 0.5 * max(q.y - 0.05, 0.0);
  p.x = tailAxis + (p.x - tailAxis) * (1.0 + 0.9 * uPuff * tw);
  p.z *= 1.0 + uPuff * (1.1 * tw + 0.10 * smoothstep(-0.4, -0.1, q.y) * (1.0 - tw));

  // play-bow: chest and head down, rear up
  float fw = smoothstep(-0.05, 0.25, q.x);
  p.y += uBow * (-0.2 * fw + 0.05 * (1.0 - fw)) * smoothstep(-0.5, -0.2, q.y);

  // loaf: lower half squashes, upper half (head) sinks rigidly, body widens
  float lc = clamp(p.y + 0.5, 0.0, 0.5);
  p.y -= uLoaf * 0.4 * lc;
  p.z *= 1.0 + 0.2 * uLoaf * (1.0 - smoothstep(-0.2, 0.15, q.y));

  // sit: torso pitches up around the rear paws, feet stay on the floor
  float sa = uSit * 0.42;
  float sw = smoothstep(-0.42, -0.12, q.y) * (1.0 - 0.7 * tw);
  vec2 sp = vec2(-0.22, -0.5);
  vec2 sd = p.xy - sp;
  vec2 sr = vec2(sd.x * cos(sa) - sd.y * sin(sa), sd.x * sin(sa) + sd.y * cos(sa));
  vec2 pRot = mix(p.xy, sp + sr, sw);
  // front legs stay vertical under the chest: they follow the shoulder
  // (shift back, stretch down) so the paws remain on the floor instead of
  // shearing backwards.
  vec2 sh = vec2(0.20, -0.14) - sp;
  vec2 shR = sp + vec2(sh.x * cos(sa) - sh.y * sin(sa), sh.x * sin(sa) + sh.y * cos(sa));
  float lStretch = (shR.y + 0.5) / 0.36;
  vec2 legP = vec2(p.x + (shR.x - 0.20), -0.5 + (p.y + 0.5) * lStretch);
  float lm = smoothstep(0.04, 0.10, q.x) * (1.0 - smoothstep(0.32, 0.38, q.x)) * smoothstep(-0.12, -0.20, q.y);
  p.xy = mix(pRot, legP, lm);

  // ── lentur: punggung melengkung saat belok, goyang halus saat jalan, napas, squash & stretch ──
  float spine = (q.x + 0.25) / 0.7;
  float plant = 1.0 - 0.8 * wy; // kaki tetap menapak
  p.z -= uBend * 0.07 * (spine * spine - 0.2) * plant;
  p.z += uWalk * 0.010 * sin(uPhase - q.x * 7.0) * plant;
  float chest = smoothstep(-0.3, 0.05, q.y) * (1.0 - tw);
  p.y += uBreath * 0.008 * chest;
  p.z *= 1.0 + uBreath * 0.012 * chest;
  // squash (<0: jongkok, melebar) dan stretch (>0: memanjang) dengan lantai di y = -0.5
  p.y = -0.5 + (p.y + 0.5) * (1.0 + uSquash);
  p.x = 0.1 + (p.x - 0.1) * (1.0 - 0.4 * uSquash);
  p.z *= 1.0 - 0.5 * uSquash;

  vec3 transformed = p;
`;

// Face geometry, measured from cat.glb vertices (model space).
// If the paint is off, tune only these numbers.
//   EYE_Z / EYE_Y: centre of each eye, EYE_RZ / EYE_RY: half width / half height
//   MOUTH_TOP: y of the lip line under the nose
export const FRAG = /* glsl */ `
  const float EYE_Z = 0.086;
  const float EYE_Y = 0.105;
  const float EYE_RZ = 0.046;
  const float EYE_RY = 0.043;
  const float MOUTH_TOP = 0.006;
  // fur around the eyes (linear colour, already multiplied by the body tint)
  vec3 kelopak = vec3(0.314, 0.137, 0.051);
  vec3 garisCol = vec3(0.10, 0.04, 0.02);
  for (int i = 0; i < 2; i++) {
    float sz = i == 0 ? 1.0 : -1.0;
    float ex = (vLocal.z - sz * EYE_Z) / EYE_RZ;
    float ey = (vLocal.y - EYE_Y) / EYE_RY;
    float inner = -ex * sz;
    float u2 = clamp(ex * ex, 0.0, 1.0);
    float onFace = step(0.385, vLocal.x);
    float dalam = (1.0 - smoothstep(1.02, 1.12, length(vec2(ex, ey)))) * onFace;

    // upper lid edge in eye space (+1 top, -1 bottom): sags in the middle when
    // closing, and tilts down toward the nose when angry
    float lid = 1.2 - 2.2 * uBlink + 0.5 * uBlink * u2
              - uAngry * (0.55 + 0.45 * inner);
    float tutup = dalam * smoothstep(lid - 0.05, lid + 0.05, ey);
    float garis = dalam * (1.0 - smoothstep(0.0, 0.07, abs(ey - lid)))
                * smoothstep(0.02, 0.15, max(uBlink, uAngry));

    // happy ^ ^: everything under an arch is skin, the arch is the line
    float arch = -1.3 + uHappy * (2.1 - 0.9 * u2);
    float senang = dalam * (1.0 - smoothstep(arch - 0.05, arch + 0.05, ey));
    float hline = dalam * (1.0 - smoothstep(0.0, 0.07, abs(ey - arch)))
                * smoothstep(0.05, 0.3, uHappy);

    diffuseColor.rgb = mix(diffuseColor.rgb, kelopak, max(tutup, senang));
    diffuseColor.rgb = mix(diffuseColor.rgb, garisCol, max(garis, hline));
  }

  // mouth: open "D" hanging from the lip line under the nose, tongue inside
  float face = smoothstep(0.44, 0.47, vLocal.x);
  float mo = clamp(uMouth, 0.0, 1.0);
  float mrz = 0.015 + 0.010 * mo;
  float mry = 0.030 * mo + 0.0001;
  float mx = vLocal.z / mrz;
  float my2 = (MOUTH_TOP - vLocal.y) / mry;      // 0 at the lip line, 1 at the chin
  float md = length(vec2(mx, max(my2, 0.0)));
  float minside = (1.0 - smoothstep(0.92, 1.0, md))
                * smoothstep(-0.05, 0.05, my2) * face * step(0.04, mo);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28, 0.04, 0.07), minside);
  float td = length(vec2(mx / 0.75, (my2 - 0.78) / 0.40));
  float tin = (1.0 - smoothstep(0.85, 1.0, td)) * minside * smoothstep(0.25, 0.6, mo);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.90, 0.42, 0.48), tin);

  // blep: small tongue tip under the closed mouth
  float bd = length(vec2(vLocal.z / 0.011, (vLocal.y - (MOUTH_TOP - 0.012)) / (0.011 * uTongue + 0.0001)));
  float blep = (1.0 - smoothstep(0.85, 1.0, bd)) * face * step(0.03, uTongue);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.48, 0.54), blep);
`;
