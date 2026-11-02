// Shader langit malam ala "The Starry Night" (Van Gogh), versi tenang:
// satu pusaran lebar yang diam, goresan kuas biru yang lebar, bintang emas bercincin lembut,
// bulan sabit, dan cakrawala teal gelap. Hampir tidak ada gerakan supaya tidak memusingkan.
// Semua pola dihitung dari arah pandang 3D (bukan sudut), jadi tidak ada sambungan yang kelihatan.
// Hanya teks GLSL. Gambarnya ada di Sky.tsx. Uniform-nya sama seperti sebelumnya.

export const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.z = gl_Position.w; // selalu di bidang terjauh: hanya piksel yang tidak tertutup benda yang menjalankan shader langit
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
  uniform vec3 uSun;
  uniform vec3 uMoon;
  uniform float uDay;
  uniform float uTwi;
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
    float tw = 0.9 + 0.1 * sin(uTime * (0.25 + 0.5 * h31(id + 5.5)) + r * 60.0);
    float core = exp(-d * d * 90.0 / (size * size * sz));
    float glow = exp(-d * 9.0 / size) * halo * sz;
    return (core + glow) * sz * tw;
  }

  // Aurora tipis hijau -> biru di langit utara: dua tirai berlapis, tepi bawah terang,
  // memudar ke atas, sinar vertikal halus. Gerakannya sangat lambat.
  vec3 aurora(vec3 dir) {
    float az = atan(dir.x, -dir.z); // 0 = lurus ke utara
    float north = smoothstep(-0.25, 0.55, -dir.z);
    float t = uTime * 0.03;
    vec3 acc = vec3(0.0);
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      float sway = 0.07 * sin(az * 2.3 + t * 2.0 + fk * 2.1)
                 + 0.05 * (vnoise(vec3(az * 1.6, fk * 7.0, t)) - 0.5);
      float base = 0.20 + 0.11 * fk + sway;
      float h = dir.y - base;
      float edge = smoothstep(-0.015, 0.02, h);
      float fall = exp(-max(h, 0.0) * (7.0 - 2.0 * fk));
      float rays = 0.55 + 0.45 * vnoise(vec3(az * 22.0 + fk * 5.0, fk * 3.0, t * 1.5));
      float fold = 0.6 + 0.4 * sin(az * 5.0 + t * 3.0 + fk * 1.3 + 2.0 * vnoise(vec3(az * 3.0, 1.0, t)));
      float inten = edge * fall * rays * fold * (1.0 - 0.35 * fk);
      vec3 green = vec3(0.22, 0.95, 0.55);
      vec3 blue = vec3(0.20, 0.50, 1.0);
      vec3 c = mix(green, blue, clamp(h * 3.5 + fk * 0.35, 0.0, 1.0));
      acc += c * inten;
    }
    return acc * north * uAuroraK * 1.2;
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

  // Langit siang: biru kobalt cerah, cakrawala krem-toska, sapuan awan krem searah goresan.
  vec3 daySky(vec3 dir, float m) {
    float e = max(dir.y, 0.0);
    vec3 hor = vec3(0.74, 0.86, 0.86);
    vec3 mid = vec3(0.30, 0.60, 0.88);
    vec3 top = vec3(0.12, 0.33, 0.70);
    vec3 c = mix(hor, mid, smoothstep(0.0, 0.35, e));
    c = mix(c, top, smoothstep(0.25, 0.9, e));
    float cl = smoothstep(0.55, 0.95, m) * smoothstep(0.05, 0.35, dir.y) * 0.55;
    return mix(c, vec3(1.0, 0.96, 0.86), cl);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float e = dir.y;
    float night = 1.0 - uDay;

    // gradasi dasar: teal gelap di cakrawala -> biru kobalt -> biru malam pekat di puncak
    vec3 col = mix(uTeal * 0.95 + uGlow * 0.04, uBlue * 0.85, smoothstep(0.0, 0.3, e));
    col = mix(col, uDeep * 0.8, smoothstep(0.12, 0.7, e));

    float sky = smoothstep(0.03, 0.28, e);

    // dua pusaran lebar, diam (tanpa denyut), cukup untuk melengkungkan goresan
    vec3 sd = dir;
    sd = swirl(sd, normalize(vec3(0.20, 0.50, -0.84)), 0.75, 3.2);
    sd = swirl(sd, normalize(vec3(0.85, 0.40, -0.35)), 0.55, -2.4);

    // goresan kuas: garis kontur lebar dari noise yang dilengkungkan, sangat lambat hanyutnya
    vec3 p = sd * 2.2 + vec3(0.0, uTime * 0.004, 0.0);
    vec3 wp = p + 0.6 * vec3(fbm(p), fbm(p + vec3(5.2, 1.3, 2.8)), fbm(p + vec3(9.1, 4.7, 1.1)));
    float f = fbm(wp * 1.1);
    float m = 0.5 + 0.5 * sin(f * 13.0);
    m = smoothstep(0.15, 0.85, m);

    vec3 cobalt = uBlue * 1.15;
    vec3 crest = mix(uBlue, vec3(0.62, 0.80, 0.95), 0.55);   // biru pucat, bukan putih
    vec3 stroke = mix(uDeep * 0.7, cobalt, smoothstep(0.1, 0.7, m));
    stroke = mix(stroke, crest, smoothstep(0.78, 1.0, m) * 0.45);
    // makin ke puncak makin gelap dan pekat, memberi kedalaman
    stroke *= mix(1.0, 0.62, smoothstep(0.25, 1.0, e));
    col = mix(col, stroke, sky * 0.9);

    // bintang kecil: sedikit dan halus
    float fade = smoothstep(0.1, 0.42, e);
    vec3 starCol = mix(vec3(1.0, 0.93, 0.78), uGlow, 0.5);
    float st = starLayer(dir, 55.0, 0.07, 1.0, 0.0) * 0.6
             + starLayer(dir + 3.7, 17.0, 0.06, 1.0, 0.2) * 0.8;
    col += starCol * st * fade * uStars * night * night;

    // bintang besar: inti emas + cincin cahaya lembut yang diam, napasnya sangat pelan
    for (int i = 0; i < 9; i++) {
      vec3 P = bigStarPos(i);
      float fi = float(i);
      float rad = 0.045 + 0.03 * h21(vec2(fi, 3.0));
      float ph = fi * 1.9;
      float s = length(dir - P);
      float core = exp(-s * s / (rad * rad * 0.03));
      float halo = exp(-s * s / (rad * rad) * 1.2);
      float rings = 0.55 + 0.45 * cos(s / rad * 9.0 + ph);
      float breathe = 0.94 + 0.06 * sin(uTime * 0.35 + ph);
      vec3 gold = vec3(1.0, 0.86, 0.50);
      col += (gold * core * 1.2 + mix(uGlow, vec3(0.75, 0.88, 1.0), 0.35) * rings * halo * 0.30) * breathe * fade * uStars * night * night;
    }

    // bulan sabit emas + lingkaran cahaya yang diam
    vec3 M = normalize(uMoon);
    vec3 moonAcc = vec3(0.0);
    vec3 M2 = normalize(M + vec3(0.03, 0.018, 0.0));
    float disc = smoothstep(0.9980, 0.9988, dot(dir, M));
    float cut = smoothstep(0.9980, 0.9988, dot(dir, M2));
    moonAcc += uGlow * 1.25 * clamp(disc - cut, 0.0, 1.0);
    moonAcc += uGlow * pow(max(dot(dir, M), 0.0), 60.0) * 0.12;
    float md = length(dir - M);
    float mrings = 0.55 + 0.45 * cos(md * 55.0);
    float menv = exp(-md * md * 40.0);
    moonAcc += uGlow * vec3(1.0, 0.78, 0.40) * mrings * menv * 0.22;
    col += moonAcc * night;

    col += aurora(dir) * night * night;

    // cakrawala bercahaya hangat tipis, di bawah cakrawala jadi gelap
    col += uGlow * 0.07 * exp(-abs(e) * 9.0);

    // siang: campur ke langit siang, lalu matahari + cahaya senja/fajar
    col = mix(col, daySky(dir, m), smoothstep(0.0, 1.0, uDay));
    float sdot = dot(dir, uSun);
    float sa = acos(clamp(sdot, -1.0, 1.0));
    vec3 sunAcc = vec3(1.0, 0.93, 0.65) * smoothstep(0.9990, 0.9995, sdot) * 2.5
                + vec3(1.0, 0.80, 0.40) * pow(max(sdot, 0.0), 30.0) * 0.55
                + vec3(1.0, 0.85, 0.50) * pow(max(sdot, 0.0), 6.0) * 0.12
                + vec3(1.0, 0.85, 0.50) * (0.5 + 0.5 * cos(sa * 45.0)) * exp(-sa * sa * 30.0) * 0.16;
    col += sunAcc * smoothstep(-0.05, 0.1, uSun.y);
    vec2 hd = normalize(dir.xz + 1e-4);
    vec2 sh = normalize(uSun.xz + 1e-4);
    float toward = pow(max(dot(hd, sh), 0.0), 2.0);
    col += vec3(1.0, 0.55, 0.25) * uTwi * toward * exp(-max(e, 0.0) * 4.0) * 0.55;

    vec3 below = mix(uDeep * 0.6 + uTeal * 0.15, vec3(0.28, 0.42, 0.42), uDay);
    col = mix(col, below, smoothstep(0.0, -0.15, e));

    // kalemkan warna, lalu kontras lembut: bayangan sedikit dingin, sorotan sedikit hangat
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = max(mix(vec3(l), col, uSat), 0.0);
    col = mix(col * vec3(0.94, 0.99, 1.08), col * vec3(1.06, 1.0, 0.92), smoothstep(0.1, 0.6, l));

    vec4 outc = vec4(col, 1.0);
    if (uEncode > 0.5) outc = linearToOutputTexel(outc);
    // noise sangat halus supaya gradasi tidak berpita
    outc.rgb += (h21(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = outc;
  }
`;
