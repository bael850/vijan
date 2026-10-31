// Shader langit malam ala "The Starry Night" (Van Gogh):
// pusaran besar yang berputar pelan, goresan biru yang mengalir, bintang besar dengan cincin
// cahaya yang berdenyut, bulan sabit oranye dengan lingkaran cahaya, dan cakrawala teal di bawah.
// Semua pola dihitung dari arah pandang 3D (bukan sudut), jadi tidak ada sambungan yang kelihatan.
// Hanya teks GLSL. Gambarnya ada di Sky.tsx. Uniform-nya sama seperti sebelumnya.

export const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SKY_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uBlue;
  uniform vec3 uGlow;
  uniform vec3 uAurora;
  uniform vec3 uTeal;
  uniform float uSat;
  uniform float uClouds;
  uniform float uAuroraK;
  uniform float uStars;
  uniform float uEncode;
  varying vec3 vDir;

  float h31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float h21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(mix(h31(i), h31(i + vec3(1.0, 0.0, 0.0)), f.x),
                  mix(h31(i + vec3(0.0, 1.0, 0.0)), h31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
    float b = mix(mix(h31(i + vec3(0.0, 0.0, 1.0)), h31(i + vec3(1.0, 0.0, 1.0)), f.x),
                  mix(h31(i + vec3(0.0, 1.0, 1.0)), h31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
    return mix(a, b, f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p = p * 2.02 + vec3(3.1, 1.7, 5.3);
      a *= 0.5;
    }
    return v;
  }

  // Satu lapis bintang kecil (titik-titik halus di antara bintang besar).
  float starLayer(vec3 dir, float scale, float density, float size, float halo) {
    vec3 p = dir * scale;
    vec3 id = floor(p);
    vec3 f = fract(p) - 0.5;
    float r = h31(id);
    if (r > density) return 0.0;
    vec3 off = (vec3(h31(id + 1.7), h31(id + 4.3), h31(id + 8.9)) - 0.5) * 0.45;
    float d = length(f - off);
    float sz = 0.4 + 0.6 * h31(id + 2.2);
    float tw = 0.82 + 0.18 * sin(uTime * (0.5 + 1.5 * h31(id + 5.5)) + r * 60.0);
    float core = exp(-d * d * 90.0 / (size * size * sz));
    float glow = exp(-d * 9.0 / size) * halo * sz;
    return (core + glow) * sz * tw;
  }

  // Cahaya hijau lembut di cakrawala utara. Hanya bergantung pada dir.x dan tinggi, tidak ada sambungan.
  vec3 aurora(vec3 dir) {
    float e = dir.y;
    float north = smoothstep(0.0, 0.7, -dir.z);
    float n = fbm(vec3(dir.x * 2.2, 3.0, uTime * 0.02));
    float base = 0.08 + 0.07 * n;
    float above = e - base;
    float body = smoothstep(0.0, 0.08, above) * exp(-above * 4.2);
    float soft = 0.78 + 0.22 * sin(dir.x * 14.0 + n * 5.0 + uTime * 0.12);
    vec3 tint = mix(uAurora, uTeal, clamp(above * 2.5 + 0.25 * n, 0.0, 1.0));
    return tint * body * soft * north * uAuroraK;
  }

  // Putar vektor v mengelilingi sumbu axis (rumus Rodrigues).
  vec3 rotAxis(vec3 v, vec3 axis, float ang) {
    float c = cos(ang);
    float s = sin(ang);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }

  // Pusaran: makin dekat pusat, arah pandang diputar makin banyak,
  // sehingga pola yang dibaca dari arah itu melingkar jadi spiral.
  vec3 swirl(vec3 dir, vec3 center, float radius, float strength) {
    float a = acos(clamp(dot(dir, center), -1.0, 1.0));
    float k = exp(-(a * a) / (radius * radius));
    return rotAxis(dir, center, strength * k);
  }

  // Posisi bintang-bintang besar (sembilan titik, tersebar di seluruh langit).
  vec3 bigStarPos(int i) {
    if (i == 0) return normalize(vec3(-0.15, 0.62, -0.77));
    if (i == 1) return normalize(vec3(0.55, 0.50, -0.67));
    if (i == 2) return normalize(vec3(0.10, 0.85, -0.30));
    if (i == 3) return normalize(vec3(-0.70, 0.55, -0.45));
    if (i == 4) return normalize(vec3(0.85, 0.35, -0.40));
    if (i == 5) return normalize(vec3(0.25, 0.38, -0.90));
    if (i == 6) return normalize(vec3(-0.55, 0.75, 0.20));
    if (i == 7) return normalize(vec3(0.60, 0.60, 0.50));
    return normalize(vec3(-0.90, 0.30, 0.30));
  }

  void main() {
    vec3 dir = normalize(vDir);
    float e = dir.y;

    // gradasi dasar: teal di cakrawala -> biru -> biru malam pekat
    vec3 col = mix(uTeal * 0.95 + uGlow * 0.04, uBlue, smoothstep(0.0, 0.3, e));
    col = mix(col, uDeep, smoothstep(0.12, 0.65, e));

    // langit hidup: tidak ada di bawah cakrawala, memudar halus ke arah teal
    float sky = smoothstep(0.03, 0.28, e);

    // tiga pusaran besar, berdenyut pelan (putarannya membesar-mengecil bergantian)
    vec3 sd = dir;
    sd = swirl(sd, normalize(vec3(0.30, 0.52, -0.80)), 0.60, 7.0 + 1.0 * sin(uTime * 0.07));
    sd = swirl(sd, normalize(vec3(0.80, 0.42, -0.42)), 0.45, -6.0 + 0.9 * sin(uTime * 0.055 + 1.7));
    sd = swirl(sd, normalize(vec3(-0.35, 0.85, -0.40)), 0.40, 5.0 + 0.8 * sin(uTime * 0.06 + 3.1));

    // goresan aliran: garis-garis kontur dari noise yang dilengkungkan
    vec3 p = sd * 2.6 + vec3(0.0, uTime * 0.015, 0.0);
    vec3 wp = p + 1.2 * vec3(fbm(p), fbm(p + vec3(5.2, 1.3, 2.8)), fbm(p + vec3(9.1, 4.7, 1.1)));
    float f = fbm(wp * 1.3);
    float band = sin(f * 24.0);
    float hatch = sin(f * 70.0 + wp.x * 6.0);
    float m = 0.5 + 0.5 * (band * 0.8 + hatch * 0.2);

    vec3 pale = uBlue * 1.9 + uGlow * 0.10 + vec3(0.02, 0.05, 0.08);
    vec3 stroke = mix(uDeep * 0.75, uBlue, smoothstep(0.12, 0.65, m));
    stroke = mix(stroke, pale, smoothstep(0.70, 0.98, m) * 0.75);
    stroke = mix(stroke, uDeep * 0.7, smoothstep(0.0, 1.0, e) * 0.35);
    col = mix(col, stroke, sky * 0.92);

    // bintang kecil, dibuat lebih redup supaya pusarannya tetap yang utama
    float fade = smoothstep(0.08, 0.4, e);
    vec3 starCol = mix(vec3(1.0, 0.96, 0.88), uGlow, 0.45);
    float st = starLayer(dir, 60.0, 0.16, 1.0, 0.0) * 0.5
             + starLayer(dir + 3.7, 17.0, 0.12, 1.0, 0.16) * 0.8;
    col += starCol * st * fade * uStars;

    // bintang besar bercincin: inti terang + lingkaran cahaya yang merambat keluar
    for (int i = 0; i < 9; i++) {
      vec3 P = bigStarPos(i);
      float fi = float(i);
      float rad = 0.05 + 0.035 * h21(vec2(fi, 3.0));
      float ph = fi * 1.9;
      float s = length(dir - P);
      float core = exp(-s * s / (rad * rad * 0.03));
      float rings = 0.5 + 0.5 * cos(s / rad * 14.0 - uTime * 1.2 + ph);
      float env = exp(-(s * s) / (rad * rad) * 1.4);
      float pulse = 0.85 + 0.15 * sin(uTime * (0.7 + 0.4 * h21(vec2(fi, 8.0))) + ph);
      col += (vec3(1.0, 0.95, 0.80) * core * 1.3 + uGlow * rings * env * 0.45) * pulse * fade * uStars;
    }

    // bulan sabit oranye + lingkaran cahaya di sekitarnya
    vec3 M = normalize(vec3(-0.38, 0.42, -0.82));
    vec3 M2 = normalize(M + vec3(0.03, 0.018, 0.0));
    float disc = smoothstep(0.9980, 0.9988, dot(dir, M));
    float cut = smoothstep(0.9980, 0.9988, dot(dir, M2));
    col += uGlow * 1.3 * clamp(disc - cut, 0.0, 1.0);
    col += uGlow * pow(max(dot(dir, M), 0.0), 60.0) * 0.14;
    float md = length(dir - M);
    float mrings = 0.5 + 0.5 * cos(md * 60.0 - uTime * 0.8);
    float menv = exp(-md * md * 40.0);
    col += uGlow * vec3(1.0, 0.75, 0.35) * mrings * menv * 0.30;

    col += aurora(dir);

    // cakrawala bercahaya hangat, di bawah cakrawala jadi gelap
    col += uGlow * 0.09 * exp(-abs(e) * 9.0);
    col = mix(col, uDeep * 0.6 + uTeal * 0.15, smoothstep(0.0, -0.15, e));

    // kalemkan warna
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = max(mix(vec3(l), col, uSat), 0.0);

    vec4 outc = vec4(col, 1.0);
    if (uEncode > 0.5) outc = linearToOutputTexel(outc);
    // noise sangat halus supaya gradasi tidak berpita
    outc.rgb += (h21(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = outc;
  }
`;
