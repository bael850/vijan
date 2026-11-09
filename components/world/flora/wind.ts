import * as THREE from "three";

// Waktu bersama untuk ayunan angin. Diperbarui sekali per frame oleh <Trees>.
export const windTime = { value: 0 };
// Hembusan (0..1) dan arah angin (panjang 1), diperbarui sekali per frame oleh <Trees> dari core/weather.
export const windGust = { value: 0 };
export const windDir = { value: new THREE.Vector2(0.94, 0.34) };

// Tambahkan ayunan angin ke material: pucuk bergerak paling jauh, pangkal diam.
// Geometri sudah dinormalkan (tinggi 1), jadi nilai sway dan flutter adalah pecahan dari tinggi pohon.
export function applyWind(
  mat: THREE.MeshStandardMaterial,
  sway: number,
  flutter: number,
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windTime;
    shader.uniforms.uSway = { value: sway };
    shader.uniforms.uFlutter = { value: flutter };
    shader.uniforms.uGust = windGust;
    shader.uniforms.uWindDir = windDir;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform float uSway;
uniform float uFlutter;
uniform float uGust;
uniform vec2 uWindDir;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
{
  float ph = 0.0;
  vec2 wpos = vec2(0.0);
  #ifdef USE_INSTANCING
    ph = instanceMatrix[3].x * 0.071 + instanceMatrix[3].z * 0.113;
    wpos = instanceMatrix[3].xz;
  #endif
  float hh = clamp(position.y, 0.0, 1.5);
  float hh2 = hh * hh;
  // hembusan menyapu padang sebagai gelombang searah angin, jadi pohon tidak bergoyang serentak
  float gw = 0.5 + 0.5 * sin(dot(wpos, uWindDir) * 0.05 - uTime * 0.9);
  float gk = uGust * (0.4 + 0.6 * gw);
  float amp = 0.7 + 1.1 * gk;
  float w1 = sin(uTime * 1.1 + ph) * 0.6 + sin(uTime * 2.3 + ph * 1.7) * 0.3;
  float w2 = cos(uTime * 0.9 + ph * 1.3) * 0.6 + sin(uTime * 1.9 + ph) * 0.25;
  transformed.x += (w1 * amp + uWindDir.x * gk * 0.9) * uSway * hh2;
  transformed.z += (w2 * amp + uWindDir.y * gk * 0.9) * uSway * hh2;
  transformed.y += sin(uTime * 7.0 + position.x * 41.0 + position.z * 37.0 + ph) * uFlutter * hh * (0.6 + 0.9 * gk);
}`,
      );
  };
  mat.customProgramCacheKey = () => "flora-wind-v2";
  mat.needsUpdate = true;
}
