import * as THREE from "three";

// Tekstur prosedural berbasis posisi dunia (tanpa file gambar, tanpa UV), jadi ringan dan
// tidak melar di dinding besar. Menempel ke material Lambert lewat onBeforeCompile.
export type GrainKind =
  | "plaster"
  | "wood"
  | "deck"
  | "stone"
  | "roof"
  | "ground"
  | "floor"
  | "brick"
  | "fabric";

const GLSL = /* glsl */ `
varying vec3 vWp;
float gh(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float gn(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(gh(i),gh(i+vec3(1,0,0)),f.x), mix(gh(i+vec3(0,1,0)),gh(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(gh(i+vec3(0,0,1)),gh(i+vec3(1,0,1)),f.x), mix(gh(i+vec3(0,1,1)),gh(i+vec3(1,1,1)),f.x), f.y), f.z);
}
`;

const BODY: Record<GrainKind, string> = {
  // kapur: bintik halus + noda lembap yang lebih lebar
  plaster: `
    float a = gn(vWp*2.2)*0.5 + gn(vWp*9.0)*0.3 + gn(vWp*28.0)*0.2;
    float b = gn(vWp*0.45);
    float k = 0.86 + a*0.3 - (1.0-b)*0.10;`,
  // kayu: serat memanjang + garis papan
  wood: `
    float a = gn(vec3(vWp.x*3.0+vWp.z*3.0, vWp.y*26.0, 0.0))*0.6 + gn(vWp*14.0)*0.4;
    float pl = smoothstep(0.93, 1.0, fract((vWp.x+vWp.z)*3.2));
    float k = 0.8 + a*0.35 - pl*0.28;`,
  // kayu rumah: permukaan datar (lantai, teras, dek) berpola papan dengan sambungan ujung dan nada tiap papan beda;
  // permukaan tegak (lis, kisi, tiang) tetap berserat biasa. Arah permukaan dibaca dari turunan posisi dunia.
  deck: `
    vec3 dn = normalize(cross(dFdx(vWp), dFdy(vWp)));
    float dUp = step(0.85, abs(dn.y));
    float dV = gn(vec3(vWp.x*3.0+vWp.z*3.0, vWp.y*26.0, 0.0))*0.6 + gn(vWp*14.0)*0.4;
    float dVl = smoothstep(0.93, 1.0, fract((vWp.x+vWp.z)*3.2));
    float dRow = floor(vWp.z*2.2);
    float dOff = fract(sin(dRow*12.9898)*43758.5453);
    float dSeam = smoothstep(0.93, 1.0, fract(vWp.z*2.2));
    float dCol = vWp.x*0.42 + dOff;
    float dEnd = smoothstep(0.985, 1.0, fract(dCol))*0.6;
    float dTone = fract(sin((dRow*7.0 + floor(dCol))*78.233)*12345.6);
    float dH = gn(vec3(vWp.x*1.5, vWp.y*20.0, vWp.z*34.0))*0.5 + gn(vWp*16.0)*0.2;
    float kV = 0.8 + dV*0.35 - dVl*0.28;
    float kH = 0.74 + dTone*0.2 + dH*0.3 - dSeam*0.34 - dEnd*0.3;
    float k = mix(kV, kH, dUp);`,
  // batu: gumpalan besar dengan celah gelap
  stone: `
    float a = gn(vWp*3.0)*0.55 + gn(vWp*11.0)*0.45;
    float cell = gn(vWp*1.6);
    float k = 0.75 + a*0.4 - smoothstep(0.42, 0.5, cell)*smoothstep(0.58, 0.5, cell)*0.45;`,
  // genteng: baris melintang, bergeser selang-seling
  roof: `
    float row = vWp.y*4.2;
    float r = fract(row);
    float off = mod(floor(row), 2.0)*0.5;
    float c = fract((vWp.x*2.4 + off));
    float line = smoothstep(0.88, 1.0, r)*0.45 + smoothstep(0.94, 1.0, c)*0.3;
    float a = gn(vec3(vWp.x*3.0, floor(row), vWp.z*3.0))*0.3 + gn(vWp*12.0)*0.15;
    float tile = gh(vec3(floor(vWp.x*2.4 + off), floor(row), 7.0));
    float moss = smoothstep(0.62, 0.9, gn(vWp*0.7))*0.16;
    float k = 0.74 + tile*0.2 + a - line - moss;`,
  // lantai kayu: papan lurus sepanjang x, sambungan ujung berselang-seling, tiap papan beda nada
  floor: `
    float prow = floor(vWp.z*2.2);
    float poff = fract(sin(prow*12.9898)*43758.5453);
    float pseam = smoothstep(0.93, 1.0, fract(vWp.z*2.2));
    float pcol = vWp.x*0.42 + poff;
    float pend = smoothstep(0.985, 1.0, fract(pcol))*0.6;
    float ptone = fract(sin((prow*7.0 + floor(pcol))*78.233)*12345.6);
    float a = gn(vec3(vWp.x*1.5, vWp.y*20.0, vWp.z*34.0))*0.5 + gn(vWp*16.0)*0.2;
    float k = 0.72 + ptone*0.16 + a*0.3 - pseam*0.38 - pend*0.3;`,
  // bata: baris sejajar dengan mortar, tiap bata beda nada
  brick: `
    float brow = vWp.y*7.5;
    float boff = mod(floor(brow), 2.0)*0.5;
    float bc = (vWp.x + vWp.z)*3.2 + boff;
    float mort = max(smoothstep(0.86, 0.96, fract(brow)), smoothstep(0.92, 0.98, fract(bc)));
    float bt = gh(vec3(floor(bc), floor(brow), 3.0));
    float a = gn(vWp*14.0)*0.2;
    float k = 0.7 + bt*0.32 + a - mort*0.5;`,
  // kain: tenunan halus dan bercak lembut
  fabric: `
    float wv = sin(vWp.x*120.0)*sin(vWp.y*120.0 + vWp.z*120.0)*0.04;
    float a = gn(vWp*5.0)*0.3 + gn(vWp*30.0)*0.12;
    float k = 0.84 + a + wv;`,
  // tanah: bercak besar dan rumput halus supaya tidak datar
  ground: `
    float a = gn(vWp*0.35)*0.5 + gn(vWp*1.8)*0.3 + gn(vWp*7.0)*0.2;
    float k = 0.78 + a*0.5;`,
};

export function applyGrain(mat: THREE.Material, kind: GrainKind) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWp;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${GLSL}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>\n${BODY[kind]}\n diffuseColor.rgb *= k;`,
      );
  };
  mat.customProgramCacheKey = () => `grain-${kind}`;
}

const cache = new Map<string, THREE.MeshLambertMaterial>();

// Material Lambert bertekstur, dibagi bersama menurut warna + jenis.
export function grainMat(color: string, kind: GrainKind, double = false) {
  const key = `${color}|${kind}|${double}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color,
      side: double ? THREE.DoubleSide : THREE.FrontSide,
    });
    applyGrain(m, kind);
    cache.set(key, m);
  }
  return m;
}
