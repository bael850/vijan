import * as THREE from "three";
import { dayState } from "./dayCycle";
import { lerp } from "./math";

// Tampilan makhluk besar (naga, wyvern) supaya tidak terlihat rata dan pucat. Tiga hal ditambahkan:
//  1. Environment map kecil buatan (gradasi langit -> cakrawala -> tanah). Scene tidak punya env map, jadi tanpa ini
//     tidak ada kilau dan pantulan sama sekali. Env ini hanya dipasang ke bahan makhluk, bukan ke seluruh dunia.
//  2. Cahaya tepi (rim): tepi badan yang membelakangi kamera diberi sedikit cahaya langit (biru malam, jingga senja),
//     memisahkan siluet dari kabut dan latar.
//  3. Oklusi dan pantulan tanah: bagian yang menghadap ke bawah (perut, sisi dalam kaki, bawah rahang) digelapkan,
//     dengan sedikit pantulan hangat dari tanah. Memberi bobot, dan bayangan terasa menyatu.
// Waktu hari diambil dari dayState, jadi ikut siang, senja, dan malam.
// Pakai: const look = makeLook(cfg, grade.list.map(e => e.mat));  tiap frame: lookUpdate(look, gl).

export type LookCfg = {
  envDay: number;
  envNight: number;
  rimDay: number;
  rimNight: number;
  rimTwilight: number;
  belly: number;
  bounce: number;
};

export type Look = {
  cfg: LookCfg;
  mats: THREE.MeshStandardMaterial[];
  uniforms: {
    uRim: { value: THREE.Color };
    uBelly: { value: number };
    uBounce: { value: THREE.Color };
  };
  attached: boolean;
};

let env: THREE.Texture | null = null;
function getEnv(gl: THREE.WebGLRenderer) {
  if (env) return env;
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 top = vec3(0.46, 0.62, 1.0);
        vec3 hor = vec3(1.0, 0.93, 0.82);
        vec3 gnd = vec3(0.09, 0.11, 0.06);
        vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.55)) : mix(hor * 0.3, gnd, pow(-h, 0.45));
        gl_FragColor = vec4(c * 1.5, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat));
  const pm = new THREE.PMREMGenerator(gl);
  env = pm.fromScene(scene, 0.04).texture;
  pm.dispose();
  mat.dispose();
  return env;
}

export function makeLook(
  cfg: LookCfg,
  mats: THREE.MeshStandardMaterial[],
): Look {
  const uniforms = {
    uRim: { value: new THREE.Color(0, 0, 0) },
    uBelly: { value: cfg.belly },
    uBounce: { value: new THREE.Color(0, 0, 0) },
  };
  for (const m of mats) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = uniforms.uRim;
      sh.uniforms.uBelly = uniforms.uBelly;
      sh.uniforms.uBounce = uniforms.uBounce;
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "void main() {",
          "uniform vec3 uRim;\nuniform float uBelly;\nuniform vec3 uBounce;\nvoid main() {",
        )
        .replace(
          "#include <opaque_fragment>",
          /* glsl */ `
          {
            float ndv = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
            float rimK = pow(1.0 - ndv, 2.6);
            float upN = inverseTransformDirection(normal, viewMatrix).y;
            float lit = smoothstep(-0.35, 0.5, upN);
            float belly = smoothstep(0.15, -0.75, upN);
            outgoingLight *= mix(1.0, uBelly, belly);
            outgoingLight += uBounce * belly * diffuseColor.rgb;
            outgoingLight += uRim * rimK * lit;
          }
          #include <opaque_fragment>`,
        );
    };
    m.customProgramCacheKey = () => "creatureLook1";
    m.needsUpdate = true;
  }
  return { cfg, mats, uniforms, attached: false };
}

const NIGHT_RIM = new THREE.Color(0.42, 0.58, 1.0);
const DAY_RIM = new THREE.Color(1.0, 0.97, 0.9);
const DUSK_RIM = new THREE.Color(1.0, 0.5, 0.22);
const BOUNCE = new THREE.Color(0.55, 0.42, 0.26);
const tmp = new THREE.Color();
const tmp2 = new THREE.Color();

// Dipanggil tiap frame; murah (hanya mengubah beberapa angka).
export function lookUpdate(l: Look, gl: THREE.WebGLRenderer) {
  if (!l.attached) {
    const e = getEnv(gl);
    for (const m of l.mats) {
      m.envMap = e;
      m.needsUpdate = true;
    }
    l.attached = true;
  }
  const c = l.cfg;
  const dl = dayState.daylight;
  const tw = dayState.twilight;
  const intensity = lerp(c.envNight, c.envDay, dl);
  for (const m of l.mats) m.envMapIntensity = intensity;

  tmp.copy(NIGHT_RIM).multiplyScalar(c.rimNight);
  tmp.lerp(tmp2.copy(DAY_RIM).multiplyScalar(c.rimDay), dl);
  tmp.lerp(
    tmp2.copy(DUSK_RIM).multiplyScalar(c.rimTwilight),
    Math.min(1, tw * 0.9),
  );
  l.uniforms.uRim.value.copy(tmp);
  l.uniforms.uBounce.value
    .copy(BOUNCE)
    .multiplyScalar(c.bounce * (0.35 + 0.65 * dl));
}
