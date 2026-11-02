import * as THREE from "three";
import { dayState } from "./dayCycle";
import { lerp } from "./math";

// Pencahayaan ksatria, prajurit, dan biarawan, dibuat senatural mungkin:
// - material GLB (sering logam tanpa peta lingkungan, tampil hitam) diganti ke Phong ringan
// - bagian bawah tubuh digelapkan halus (oklusi dekat tanah), seperti kain/zirah yang teduh
// - pantulan cahaya dari tanah menerangi sisi bawah lipatan kain dan zirah
// - fresnel sangat tipis dari langit hanya di tepi sudut landai, bukan garis tepi menyala
// Cahaya utamanya tetap matahari/bulan sungguhan lewat bayangan dan arah cahaya scene.

export const folkUniforms = {
  uFres: { value: 0.1 },
  uSkyCol: { value: new THREE.Color("#5f86e8") },
  uBounce: { value: 0.12 },
  uLift: { value: 0.02 },
};

const NIGHT_SKY = new THREE.Color("#4a6cc0");
const DAY_SKY = new THREE.Color("#a8cdf5");
const DUSK_SKY = new THREE.Color("#ff9a60");

// Dipanggil tiap frame oleh komponen yang memakai material ini (murah dan aman diulang).
export function tickFolkLight() {
  const dl = dayState.daylight;
  folkUniforms.uSkyCol.value
    .copy(NIGHT_SKY)
    .lerp(DAY_SKY, dl)
    .lerp(DUSK_SKY, dayState.twilight * 0.5);
  folkUniforms.uFres.value = lerp(0.1, 0.07, dl);
  folkUniforms.uBounce.value = lerp(0.1, 0.2, dl); // siang: tanah terang memantulkan lebih banyak
  folkUniforms.uLift.value = lerp(0.025, 0.015, dl);
}

const cache = new Map<string, THREE.Material>();

function convert(
  src: THREE.Material,
  geo: THREE.BufferGeometry,
): THREE.Material {
  const s = src as THREE.MeshStandardMaterial;
  // api/lilin dan material bercahaya lainnya dibiarkan apa adanya
  if (s.emissive && s.emissive.getHex() > 0) return src;
  if ((src as THREE.MeshBasicMaterial).isMeshBasicMaterial) return src;

  const vc = !!geo.attributes.color;
  const key = `${src.uuid}:${vc ? "v" : "n"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const metal = (s.metalness ?? 0) > 0.5;
  const m = new THREE.MeshPhongMaterial({
    name: src.name,
    color: s.color ? s.color.clone() : new THREE.Color(1, 1, 1),
    map: s.map ?? null,
    vertexColors: vc,
    transparent: src.transparent,
    opacity: src.opacity,
    alphaTest: src.alphaTest,
    side: src.side,
    specular: new THREE.Color(metal ? 0x4a505c : 0x0c0d10),
    shininess: metal ? 34 : 6,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFres = folkUniforms.uFres;
    sh.uniforms.uSkyCol = folkUniforms.uSkyCol;
    sh.uniforms.uBounce = folkUniforms.uBounce;
    sh.uniforms.uLift = folkUniforms.uLift;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vFY;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvFY = position.y;",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vFY;\nuniform float uFres;\nuniform vec3 uSkyCol;\nuniform float uBounce;\nuniform float uLift;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 0.6, vFY));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  vec3 wn = inverseTransformDirection(normal, viewMatrix);
  float down = max(-wn.y, 0.0);
  float fr = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 4.0);
  totalEmissiveRadiance += diffuseColor.rgb * (uBounce * down + uLift)
                         + uSkyCol * fr * uFres * (0.5 + 0.5 * wn.y);
}`,
      );
  };
  cache.set(key, m);
  return m;
}

// Terapkan ke satu salinan model: ganti material, aktifkan bayangan jatuh dan terima.
export function styleFolk(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((x) => convert(x, mesh.geometry))
      : convert(mesh.material, mesh.geometry);
  });
}
