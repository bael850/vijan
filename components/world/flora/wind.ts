import * as THREE from "three";

// Waktu bersama untuk ayunan angin. Diperbarui sekali per frame oleh <Trees>.
export const windTime = { value: 0 };

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
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform float uSway;
uniform float uFlutter;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
{
  float ph = 0.0;
  #ifdef USE_INSTANCING
    ph = instanceMatrix[3].x * 0.071 + instanceMatrix[3].z * 0.113;
  #endif
  float hh = clamp(position.y, 0.0, 1.5);
  float hh2 = hh * hh;
  float w1 = sin(uTime * 1.1 + ph) * 0.6 + sin(uTime * 2.3 + ph * 1.7) * 0.3;
  float w2 = cos(uTime * 0.9 + ph * 1.3) * 0.6 + sin(uTime * 1.9 + ph) * 0.25;
  transformed.x += w1 * uSway * hh2;
  transformed.z += w2 * uSway * hh2;
  transformed.y += sin(uTime * 7.0 + position.x * 41.0 + position.z * 37.0 + ph) * uFlutter * hh;
}`,
      );
  };
  mat.customProgramCacheKey = () => "flora-wind-v1";
  mat.needsUpdate = true;
}
