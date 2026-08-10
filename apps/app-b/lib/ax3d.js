/* ─────────────────────────────────────────────────────────────
   ax3d.js — 요즘 오락실 공용 WebGL2 미니 엔진

   외부 라이브러리를 쓰지 않는다는 저장소 규칙 때문에 직접 만든 엔진입니다.
   ES module이 아니라 클래식 스크립트입니다. file:// 로 열어도 동작해야 하기
   때문입니다(같은 이유로 Web Worker도 쓰지 않습니다).

   전역 네임스페이스: AX
   ───────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var AX = global.AX = global.AX || {};

  /* ══════════════════════════════════════════════════════════
     1. 수학 — mat4 / mat3 / vec3
     열 우선(column-major). gl-matrix와 같은 규약입니다.
     ══════════════════════════════════════════════════════════ */

  var mat4 = AX.mat4 = {
    create: function () {
      var o = new Float32Array(16);
      o[0] = o[5] = o[10] = o[15] = 1;
      return o;
    },
    identity: function (o) {
      o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0;
      o[4] = 0; o[5] = 1; o[6] = 0; o[7] = 0;
      o[8] = 0; o[9] = 0; o[10] = 1; o[11] = 0;
      o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
      return o;
    },
    copy: function (o, a) { o.set(a); return o; },

    multiply: function (o, a, b) {
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
          a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
          a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
          a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      for (var i = 0; i < 4; i++) {
        var b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
        o[i * 4]     = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        o[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        o[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        o[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      }
      return o;
    },

    perspective: function (o, fovy, aspect, near, far) {
      var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
      o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
      o[8] = 0; o[9] = 0; o[10] = (far + near) * nf; o[11] = -1;
      o[12] = 0; o[13] = 0; o[14] = 2 * far * near * nf; o[15] = 0;
      return o;
    },

    ortho: function (o, l, r, b, t, n, f) {
      var lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
      o[0] = -2 * lr; o[1] = 0; o[2] = 0; o[3] = 0;
      o[4] = 0; o[5] = -2 * bt; o[6] = 0; o[7] = 0;
      o[8] = 0; o[9] = 0; o[10] = 2 * nf; o[11] = 0;
      o[12] = (l + r) * lr; o[13] = (t + b) * bt; o[14] = (f + n) * nf; o[15] = 1;
      return o;
    },

    lookAt: function (o, eye, center, up) {
      var z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
      var len = Math.hypot(z0, z1, z2);
      if (len < 1e-6) { return mat4.identity(o); }
      len = 1 / len; z0 *= len; z1 *= len; z2 *= len;

      var x0 = up[1] * z2 - up[2] * z1,
          x1 = up[2] * z0 - up[0] * z2,
          x2 = up[0] * z1 - up[1] * z0;
      len = Math.hypot(x0, x1, x2);
      if (len < 1e-6) { x0 = 1; x1 = 0; x2 = 0; }
      else { len = 1 / len; x0 *= len; x1 *= len; x2 *= len; }

      var y0 = z1 * x2 - z2 * x1,
          y1 = z2 * x0 - z0 * x2,
          y2 = z0 * x1 - z1 * x0;

      o[0] = x0; o[1] = y0; o[2] = z0; o[3] = 0;
      o[4] = x1; o[5] = y1; o[6] = z1; o[7] = 0;
      o[8] = x2; o[9] = y2; o[10] = z2; o[11] = 0;
      o[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
      o[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
      o[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
      o[15] = 1;
      return o;
    },

    translate: function (o, a, v) {
      var x = v[0], y = v[1], z = v[2];
      if (o !== a) o.set(a);
      o[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      o[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      o[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      o[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
      return o;
    },

    scale: function (o, a, v) {
      var x = v[0], y = v[1], z = v[2];
      o[0] = a[0] * x; o[1] = a[1] * x; o[2] = a[2] * x; o[3] = a[3] * x;
      o[4] = a[4] * y; o[5] = a[5] * y; o[6] = a[6] * y; o[7] = a[7] * y;
      o[8] = a[8] * z; o[9] = a[9] * z; o[10] = a[10] * z; o[11] = a[11] * z;
      o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15];
      return o;
    },

    rotateX: function (o, a, rad) {
      var s = Math.sin(rad), c = Math.cos(rad);
      var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
          a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      if (o !== a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; o[3] = a[3]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
      o[4] = a10 * c + a20 * s; o[5] = a11 * c + a21 * s; o[6] = a12 * c + a22 * s; o[7] = a13 * c + a23 * s;
      o[8] = a20 * c - a10 * s; o[9] = a21 * c - a11 * s; o[10] = a22 * c - a12 * s; o[11] = a23 * c - a13 * s;
      return o;
    },

    rotateY: function (o, a, rad) {
      var s = Math.sin(rad), c = Math.cos(rad);
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
          a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      if (o !== a) { o[4] = a[4]; o[5] = a[5]; o[6] = a[6]; o[7] = a[7]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
      o[0] = a00 * c - a20 * s; o[1] = a01 * c - a21 * s; o[2] = a02 * c - a22 * s; o[3] = a03 * c - a23 * s;
      o[8] = a00 * s + a20 * c; o[9] = a01 * s + a21 * c; o[10] = a02 * s + a22 * c; o[11] = a03 * s + a23 * c;
      return o;
    },

    rotateZ: function (o, a, rad) {
      var s = Math.sin(rad), c = Math.cos(rad);
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
          a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      if (o !== a) { o[8] = a[8]; o[9] = a[9]; o[10] = a[10]; o[11] = a[11]; o[12] = a[12]; o[13] = a[13]; o[14] = a[14]; o[15] = a[15]; }
      o[0] = a00 * c + a10 * s; o[1] = a01 * c + a11 * s; o[2] = a02 * c + a12 * s; o[3] = a03 * c + a13 * s;
      o[4] = a10 * c - a00 * s; o[5] = a11 * c - a01 * s; o[6] = a12 * c - a02 * s; o[7] = a13 * c - a03 * s;
      return o;
    },

    invert: function (o, a) {
      var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
          a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
          a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
          a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      var b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10,
          b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
          b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
          b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
          b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31,
          b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
      var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return null;
      det = 1 / det;
      o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return o;
    }
  };

  var mat3 = AX.mat3 = {
    create: function () {
      var o = new Float32Array(9);
      o[0] = o[4] = o[8] = 1;
      return o;
    },
    /* 모델 행렬에서 법선 행렬(역전치 3×3)을 뽑습니다. */
    normalFromMat4: function (o, a) {
      var inv = mat4.invert(mat4.create(), a);
      if (!inv) return mat3.create();
      o[0] = inv[0]; o[1] = inv[4]; o[2] = inv[8];
      o[3] = inv[1]; o[4] = inv[5]; o[5] = inv[9];
      o[6] = inv[2]; o[7] = inv[6]; o[8] = inv[10];
      return o;
    }
  };

  var vec3 = AX.vec3 = {
    create: function (x, y, z) { return new Float32Array([x || 0, y || 0, z || 0]); },
    set: function (o, x, y, z) { o[0] = x; o[1] = y; o[2] = z; return o; },
    copy: function (o, a) { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; },
    add: function (o, a, b) { o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; },
    sub: function (o, a, b) { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; },
    scale: function (o, a, s) { o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o; },
    scaleAndAdd: function (o, a, b, s) { o[0] = a[0] + b[0] * s; o[1] = a[1] + b[1] * s; o[2] = a[2] + b[2] * s; return o; },
    dot: function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    cross: function (o, a, b) {
      var ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2];
      o[0] = ay * bz - az * by; o[1] = az * bx - ax * bz; o[2] = ax * by - ay * bx;
      return o;
    },
    len: function (a) { return Math.hypot(a[0], a[1], a[2]); },
    dist: function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); },
    normalize: function (o, a) {
      var l = Math.hypot(a[0], a[1], a[2]);
      if (l < 1e-8) { o[0] = 0; o[1] = 0; o[2] = 0; return o; }
      l = 1 / l; o[0] = a[0] * l; o[1] = a[1] * l; o[2] = a[2] * l;
      return o;
    },
    lerp: function (o, a, b, t) {
      o[0] = a[0] + (b[0] - a[0]) * t;
      o[1] = a[1] + (b[1] - a[1]) * t;
      o[2] = a[2] + (b[2] - a[2]) * t;
      return o;
    },
    transformMat4: function (o, a, m) {
      var x = a[0], y = a[1], z = a[2];
      var w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
      o[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
      o[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
      o[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
      return o;
    }
  };

  /* 잡다한 스칼라 헬퍼 */
  AX.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  AX.lerp = function (a, b, t) { return a + (b - a) * t; };
  AX.smoothstep = function (a, b, x) {
    var t = AX.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  /* 프레임률에 무관한 감쇠 보간. rate가 클수록 빠르게 따라붙습니다. */
  AX.damp = function (a, b, rate, dt) { return b + (a - b) * Math.exp(-rate * dt); };

  /* ══════════════════════════════════════════════════════════
     2. 노이즈 — 지형·텍스처 생성용
     ══════════════════════════════════════════════════════════ */

  var noise = AX.noise = {
    seed: 1337,
    setSeed: function (s) { noise.seed = s >>> 0; },

    hash2: function (x, y) {
      var h = (x * 374761393 + y * 668265263 + noise.seed * 1442695040) | 0;
      h = (h ^ (h >>> 13)) * 1274126177;
      h = h ^ (h >>> 16);
      return (h >>> 0) / 4294967296;
    },
    hash3: function (x, y, z) {
      var h = (x * 374761393 + y * 668265263 + z * 2147483647 + noise.seed * 1442695040) | 0;
      h = (h ^ (h >>> 13)) * 1274126177;
      h = h ^ (h >>> 16);
      return (h >>> 0) / 4294967296;
    },

    /* 값 노이즈. 큐빅 보간이라 모서리가 부드럽습니다. */
    value2: function (x, y) {
      var ix = Math.floor(x), iy = Math.floor(y);
      var fx = x - ix, fy = y - iy;
      var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      var a = noise.hash2(ix, iy), b = noise.hash2(ix + 1, iy);
      var c = noise.hash2(ix, iy + 1), d = noise.hash2(ix + 1, iy + 1);
      return (a + (b - a) * ux) + ((c + (d - c) * ux) - (a + (b - a) * ux)) * uy;
    },

    value3: function (x, y, z) {
      var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
      var fx = x - ix, fy = y - iy, fz = z - iz;
      var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
      function lerp(a, b, t) { return a + (b - a) * t; }
      var c000 = noise.hash3(ix, iy, iz), c100 = noise.hash3(ix + 1, iy, iz);
      var c010 = noise.hash3(ix, iy + 1, iz), c110 = noise.hash3(ix + 1, iy + 1, iz);
      var c001 = noise.hash3(ix, iy, iz + 1), c101 = noise.hash3(ix + 1, iy, iz + 1);
      var c011 = noise.hash3(ix, iy + 1, iz + 1), c111 = noise.hash3(ix + 1, iy + 1, iz + 1);
      var x00 = lerp(c000, c100, ux), x10 = lerp(c010, c110, ux);
      var x01 = lerp(c001, c101, ux), x11 = lerp(c011, c111, ux);
      return lerp(lerp(x00, x10, uy), lerp(x01, x11, uy), uz);
    },

    fbm2: function (x, y, octaves, lacunarity, gain) {
      octaves = octaves || 4; lacunarity = lacunarity || 2; gain = gain || 0.5;
      var sum = 0, amp = 1, freq = 1, norm = 0;
      for (var i = 0; i < octaves; i++) {
        sum += noise.value2(x * freq, y * freq) * amp;
        norm += amp;
        amp *= gain; freq *= lacunarity;
      }
      return sum / norm;
    },

    fbm3: function (x, y, z, octaves, lacunarity, gain) {
      octaves = octaves || 3; lacunarity = lacunarity || 2; gain = gain || 0.5;
      var sum = 0, amp = 1, freq = 1, norm = 0;
      for (var i = 0; i < octaves; i++) {
        sum += noise.value3(x * freq, y * freq, z * freq) * amp;
        norm += amp;
        amp *= gain; freq *= lacunarity;
      }
      return sum / norm;
    },

    /* 시드 고정 난수 생성기 (mulberry32) */
    rng: function (seed) {
      var a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
  };

  /* ══════════════════════════════════════════════════════════
     3. 화질 프리셋
     ══════════════════════════════════════════════════════════ */

  var Quality = AX.Quality = {
    presets: {
      low:    { dpr: 1,    msaa: 0, shadow: 0,    bloom: false, bloomScale: 4, viewDist: 4, label: '낮음' },
      medium: { dpr: 1.5,  msaa: 0, shadow: 1024, bloom: true,  bloomScale: 4, viewDist: 5, label: '보통' },
      high:   { dpr: 2,    msaa: 4, shadow: 2048, bloom: true,  bloomScale: 2, viewDist: 6, label: '높음' }
    },
    level: 'high',
    listeners: [],

    get: function () { return Quality.presets[Quality.level]; },

    set: function (level) {
      if (!Quality.presets[level] || level === Quality.level) return;
      Quality.level = level;
      try { localStorage.setItem('ax-quality', level); } catch (e) { /* 사생활 모드 등 */ }
      Quality.listeners.forEach(function (fn) { fn(Quality.get(), level); });
    },

    onChange: function (fn) { Quality.listeners.push(fn); },

    /* 저장된 설정을 불러옵니다. 없으면 화면 크기로 초기 추정합니다. */
    restore: function () {
      var saved = null;
      try { saved = localStorage.getItem('ax-quality'); } catch (e) { /* noop */ }
      if (saved && Quality.presets[saved]) { Quality.level = saved; return; }
      var px = (global.innerWidth || 1280) * (global.devicePixelRatio || 1);
      Quality.level = px > 2600 ? 'medium' : 'high';
    },

    /* 첫 몇 초간 프레임타임을 지켜보다 나쁘면 한 단계 내립니다. */
    _tuner: null,
    autoTune: function (onDrop) {
      var samples = [], start = performance.now(), done = false;
      Quality._tuner = function (frameMs) {
        if (done) return;
        if (performance.now() - start < 1200) return;   // 초기 워밍업은 버립니다
        samples.push(frameMs);
        if (samples.length < 90) return;
        done = true;
        samples.sort(function (a, b) { return a - b; });
        var median = samples[Math.floor(samples.length / 2)];
        if (median > 26 && Quality.level !== 'low') {
          var next = Quality.level === 'high' ? 'medium' : 'low';
          Quality.set(next);
          if (onDrop) onDrop(next, median);
        }
      };
    },
    feed: function (frameMs) { if (Quality._tuner) Quality._tuner(frameMs); }
  };
  Quality.restore();

  /* 모션 민감도 — 흔들림·그레인·색수차를 끕니다. */
  AX.reduceMotion = global.matchMedia
    ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* ══════════════════════════════════════════════════════════
     4. GL 컨텍스트
     ══════════════════════════════════════════════════════════ */

  AX.GL = {
    create: function (canvas, opts) {
      opts = opts || {};
      var gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,           // MSAA는 오프스크린에서 직접 처리합니다
        depth: true,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
        powerPreference: 'high-performance'
      });
      if (!gl) throw new Error('WebGL2를 지원하지 않는 브라우저입니다.');

      /* 부동소수점 렌더타겟 지원 여부 — 없으면 8비트로 떨어집니다. */
      gl.axFloatRT = !!(gl.getExtension('EXT_color_buffer_float') ||
                        gl.getExtension('EXT_color_buffer_half_float'));
      gl.getExtension('OES_texture_float_linear');
      gl.axMaxSamples = gl.getParameter(gl.MAX_SAMPLES) || 0;
      gl.axCanvas = canvas;
      return gl;
    },

    /* 캔버스 백버퍼를 CSS 크기 × DPR에 맞춥니다. 바뀌었으면 true. */
    resize: function (gl, dprCap) {
      var canvas = gl.axCanvas;
      var dpr = Math.min(global.devicePixelRatio || 1, dprCap || Quality.get().dpr);
      var w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width === w && canvas.height === h) return false;
      canvas.width = w; canvas.height = h;
      return true;
    }
  };

  /* ══════════════════════════════════════════════════════════
     5. 셰이더
     ══════════════════════════════════════════════════════════ */

  function compile(gl, type, src, label) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(sh);
      var numbered = src.split('\n').map(function (l, i) {
        return String(i + 1).padStart(4, ' ') + ' | ' + l;
      }).join('\n');
      console.error('[ax3d] 셰이더 컴파일 실패 (' + label + ')\n' + log + '\n' + numbered);
      throw new Error('셰이더 컴파일 실패: ' + label + '\n' + log);
    }
    return sh;
  }

  var Shader = AX.Shader = function (gl, vsSrc, fsSrc, label) {
    this.gl = gl;
    this.label = label || 'shader';
    var vs = compile(gl, gl.VERTEX_SHADER, vsSrc, this.label + ':vs');
    var fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc, this.label + ':fs');
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('셰이더 링크 실패: ' + this.label + '\n' + gl.getProgramInfoLog(p));
    }
    gl.deleteShader(vs); gl.deleteShader(fs);
    this.program = p;

    /* 유니폼 위치와 타입을 미리 훑어 캐시합니다. */
    this.uniforms = {};
    var n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) {
      var info = gl.getActiveUniform(p, i);
      var name = info.name.replace(/\[0\]$/, '');
      this.uniforms[name] = {
        loc: gl.getUniformLocation(p, name),
        type: info.type,
        size: info.size
      };
    }
  };

  Shader.prototype.use = function () { this.gl.useProgram(this.program); return this; };

  Shader.prototype.set = function (name, v) {
    var u = this.uniforms[name];
    if (!u) return this;
    var gl = this.gl, T = gl;
    switch (u.type) {
      case T.FLOAT:      u.size > 1 ? gl.uniform1fv(u.loc, v) : gl.uniform1f(u.loc, v); break;
      case T.FLOAT_VEC2: gl.uniform2fv(u.loc, v); break;
      case T.FLOAT_VEC3: gl.uniform3fv(u.loc, v); break;
      case T.FLOAT_VEC4: gl.uniform4fv(u.loc, v); break;
      case T.FLOAT_MAT3: gl.uniformMatrix3fv(u.loc, false, v); break;
      case T.FLOAT_MAT4: gl.uniformMatrix4fv(u.loc, false, v); break;
      case T.INT: case T.BOOL:
      case T.SAMPLER_2D: case T.SAMPLER_2D_ARRAY:
      case T.SAMPLER_CUBE: case T.SAMPLER_2D_SHADOW:
        u.size > 1 ? gl.uniform1iv(u.loc, v) : gl.uniform1i(u.loc, v); break;
      case T.INT_VEC2:   gl.uniform2iv(u.loc, v); break;
      case T.INT_VEC3:   gl.uniform3iv(u.loc, v); break;
      case T.INT_VEC4:   gl.uniform4iv(u.loc, v); break;
      default: break;
    }
    return this;
  };

  Shader.prototype.setAll = function (obj) {
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) this.set(k, obj[k]);
    return this;
  };

  /* 텍스처를 유닛에 바인딩하고 샘플러 유니폼까지 맞춥니다. */
  Shader.prototype.tex = function (name, texture, unit, target) {
    var gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target || gl.TEXTURE_2D, texture);
    return this.set(name, unit);
  };

  /* ══════════════════════════════════════════════════════════
     6. 메시 — VAO 래퍼
     ══════════════════════════════════════════════════════════ */

  /*
     new AX.Mesh(gl, {
       buffers: [{ data: Float32Array, stride: 32, dynamic: false,
                   attrs: [{ loc: 0, size: 3, offset: 0 },
                           { loc: 1, size: 3, offset: 12 }] }],
       index: Uint16Array | Uint32Array,
       count: 정점 또는 인덱스 개수
     })
  */
  var Mesh = AX.Mesh = function (gl, desc) {
    this.gl = gl;
    this.vao = gl.createVertexArray();
    this.buffers = [];
    this.mode = desc.mode !== undefined ? desc.mode : gl.TRIANGLES;
    gl.bindVertexArray(this.vao);

    var self = this;
    (desc.buffers || []).forEach(function (b) {
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, b.data, b.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      b.attrs.forEach(function (a) {
        gl.enableVertexAttribArray(a.loc);
        if (a.integer) {
          /* uint/int 속성은 정규화 없이 그대로 넘겨야 합니다 — 복셀 정점 압축에 씁니다. */
          gl.vertexAttribIPointer(a.loc, a.size, a.type || gl.UNSIGNED_INT,
                                  b.stride || 0, a.offset || 0);
        } else {
          gl.vertexAttribPointer(a.loc, a.size, a.type || gl.FLOAT, !!a.normalized,
                                 b.stride || 0, a.offset || 0);
        }
        if (b.divisor) gl.vertexAttribDivisor(a.loc, b.divisor);
      });
      self.buffers.push({ buf: buf, desc: b });
    });

    this.indexType = 0;
    if (desc.index) {
      this.ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, desc.index, gl.STATIC_DRAW);
      this.indexType = (desc.index instanceof Uint32Array) ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      this.count = desc.count !== undefined ? desc.count : desc.index.length;
    } else {
      this.count = desc.count || 0;
    }
    gl.bindVertexArray(null);
  };

  Mesh.prototype.updateBuffer = function (i, data) {
    var gl = this.gl, b = this.buffers[i];
    gl.bindBuffer(gl.ARRAY_BUFFER, b.buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    return this;
  };

  Mesh.prototype.draw = function (instances) {
    var gl = this.gl;
    if (!this.count) return;
    gl.bindVertexArray(this.vao);
    if (this.indexType) {
      if (instances !== undefined) gl.drawElementsInstanced(this.mode, this.count, this.indexType, 0, instances);
      else gl.drawElements(this.mode, this.count, this.indexType, 0);
    } else {
      if (instances !== undefined) gl.drawArraysInstanced(this.mode, 0, this.count, instances);
      else gl.drawArrays(this.mode, 0, this.count);
    }
  };

  Mesh.prototype.dispose = function () {
    var gl = this.gl;
    this.buffers.forEach(function (b) { gl.deleteBuffer(b.buf); });
    if (this.ibo) gl.deleteBuffer(this.ibo);
    gl.deleteVertexArray(this.vao);
    this.count = 0;
  };

  /* position/normal/uv 지오메트리를 표준 배치(loc 0,1,2)로 올립니다. */
  Mesh.fromGeometry = function (gl, geo) {
    var n = geo.position.length / 3;
    var interleaved = new Float32Array(n * 8);
    for (var i = 0; i < n; i++) {
      interleaved[i * 8]     = geo.position[i * 3];
      interleaved[i * 8 + 1] = geo.position[i * 3 + 1];
      interleaved[i * 8 + 2] = geo.position[i * 3 + 2];
      interleaved[i * 8 + 3] = geo.normal ? geo.normal[i * 3] : 0;
      interleaved[i * 8 + 4] = geo.normal ? geo.normal[i * 3 + 1] : 1;
      interleaved[i * 8 + 5] = geo.normal ? geo.normal[i * 3 + 2] : 0;
      interleaved[i * 8 + 6] = geo.uv ? geo.uv[i * 2] : 0;
      interleaved[i * 8 + 7] = geo.uv ? geo.uv[i * 2 + 1] : 0;
    }
    return new Mesh(gl, {
      buffers: [{
        data: interleaved, stride: 32,
        attrs: [{ loc: 0, size: 3, offset: 0 },
                { loc: 1, size: 3, offset: 12 },
                { loc: 2, size: 2, offset: 24 }]
      }],
      index: geo.index
    });
  };

  /* ══════════════════════════════════════════════════════════
     7. 기본 지오메트리
     ══════════════════════════════════════════════════════════ */

  var geom = AX.geom = {
    box: function (w, h, d) {
      w = (w || 1) / 2; h = (h || 1) / 2; d = (d || 1) / 2;
      var p = [], nr = [], uv = [], idx = [];
      var faces = [
        [[ 1, -1, -1], [ 1,  1, -1], [ 1,  1,  1], [ 1, -1,  1], [ 1, 0, 0]],
        [[-1, -1,  1], [-1,  1,  1], [-1,  1, -1], [-1, -1, -1], [-1, 0, 0]],
        [[-1,  1, -1], [-1,  1,  1], [ 1,  1,  1], [ 1,  1, -1], [ 0, 1, 0]],
        [[-1, -1,  1], [-1, -1, -1], [ 1, -1, -1], [ 1, -1,  1], [ 0, -1, 0]],
        [[-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1], [ 0, 0, 1]],
        [[ 1, -1, -1], [-1, -1, -1], [-1,  1, -1], [ 1,  1, -1], [ 0, 0, -1]]
      ];
      faces.forEach(function (f, fi) {
        var n = f[4];
        for (var i = 0; i < 4; i++) {
          p.push(f[i][0] * w, f[i][1] * h, f[i][2] * d);
          nr.push(n[0], n[1], n[2]);
        }
        uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        var b = fi * 4;
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      });
      return {
        position: new Float32Array(p), normal: new Float32Array(nr),
        uv: new Float32Array(uv), index: new Uint16Array(idx)
      };
    },

    plane: function (w, d, segs) {
      w = w || 1; d = d || 1; segs = segs || 1;
      var p = [], nr = [], uv = [], idx = [];
      for (var z = 0; z <= segs; z++) {
        for (var x = 0; x <= segs; x++) {
          p.push((x / segs - 0.5) * w, 0, (z / segs - 0.5) * d);
          nr.push(0, 1, 0);
          uv.push(x / segs, z / segs);
        }
      }
      for (var zz = 0; zz < segs; zz++) {
        for (var xx = 0; xx < segs; xx++) {
          var a = zz * (segs + 1) + xx;
          idx.push(a, a + segs + 1, a + 1, a + 1, a + segs + 1, a + segs + 2);
        }
      }
      return {
        position: new Float32Array(p), normal: new Float32Array(nr),
        uv: new Float32Array(uv), index: new Uint16Array(idx)
      };
    },

    sphere: function (r, seg, rings) {
      r = r || 0.5; seg = seg || 24; rings = rings || 16;
      var p = [], nr = [], uv = [], idx = [];
      for (var y = 0; y <= rings; y++) {
        var v = y / rings, phi = v * Math.PI;
        for (var x = 0; x <= seg; x++) {
          var u = x / seg, theta = u * Math.PI * 2;
          var nx = Math.sin(phi) * Math.cos(theta),
              ny = Math.cos(phi),
              nz = Math.sin(phi) * Math.sin(theta);
          p.push(nx * r, ny * r, nz * r);
          nr.push(nx, ny, nz);
          uv.push(u, v);
        }
      }
      for (var yy = 0; yy < rings; yy++) {
        for (var xx = 0; xx < seg; xx++) {
          var a = yy * (seg + 1) + xx, b = a + seg + 1;
          /* CCW-바깥 감김 — box·plane과 같은 규약 */
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
      return {
        position: new Float32Array(p), normal: new Float32Array(nr),
        uv: new Float32Array(uv), index: new Uint16Array(idx)
      };
    },

    cylinder: function (rTop, rBot, h, seg, caps) {
      rTop = rTop === undefined ? 0.5 : rTop;
      rBot = rBot === undefined ? 0.5 : rBot;
      h = h || 1; seg = seg || 20;
      caps = caps !== false;
      var p = [], nr = [], uv = [], idx = [];
      var hh = h / 2;
      for (var i = 0; i <= seg; i++) {
        var u = i / seg, a = u * Math.PI * 2;
        var ca = Math.cos(a), sa = Math.sin(a);
        var slope = (rBot - rTop) / h;
        var ny = slope / Math.hypot(1, slope), sc = 1 / Math.hypot(1, slope);
        p.push(ca * rTop, hh, sa * rTop); nr.push(ca * sc, ny, sa * sc); uv.push(u, 0);
        p.push(ca * rBot, -hh, sa * rBot); nr.push(ca * sc, ny, sa * sc); uv.push(u, 1);
      }
      for (var s = 0; s < seg; s++) {
        var b = s * 2;
        /* CCW-바깥 감김 — 캡·box와 같은 규약 */
        idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
      if (caps) {
        [[rTop, hh, 1], [rBot, -hh, -1]].forEach(function (cap) {
          var cr = cap[0], cy = cap[1], dir = cap[2];
          if (cr <= 0) return;
          var center = p.length / 3;
          p.push(0, cy, 0); nr.push(0, dir, 0); uv.push(0.5, 0.5);
          for (var i2 = 0; i2 <= seg; i2++) {
            var a2 = (i2 / seg) * Math.PI * 2;
            p.push(Math.cos(a2) * cr, cy, Math.sin(a2) * cr);
            nr.push(0, dir, 0);
            uv.push(0.5 + Math.cos(a2) * 0.5, 0.5 + Math.sin(a2) * 0.5);
          }
          for (var i3 = 0; i3 < seg; i3++) {
            if (dir > 0) idx.push(center, center + 1 + i3 + 1, center + 1 + i3);
            else idx.push(center, center + 1 + i3, center + 1 + i3 + 1);
          }
        });
      }
      return {
        position: new Float32Array(p), normal: new Float32Array(nr),
        uv: new Float32Array(uv), index: new Uint16Array(idx)
      };
    },

    /* 전체 화면 삼각형 — 포스트프로세싱용. 정점 속성이 없습니다. */
    fullscreen: function (gl) {
      var m = new Mesh(gl, { buffers: [], count: 3 });
      return m;
    }
  };

  /* ══════════════════════════════════════════════════════════
     8. 텍스처 — 전부 절차 생성 (외부 이미지 금지)
     ══════════════════════════════════════════════════════════ */

  var tex = AX.tex = {
    canvas: function (size) {
      var c = document.createElement('canvas');
      c.width = c.height = size;
      return c;
    },

    fromCanvas: function (gl, canvas, opts) {
      opts = opts || {};
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, opts.srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8,
                    canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      var wrap = opts.wrap || gl.REPEAT;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opts.nearest ? gl.NEAREST : gl.LINEAR);
      if (opts.mips !== false) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                         opts.nearest ? gl.NEAREST_MIPMAP_LINEAR : gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.nearest ? gl.NEAREST : gl.LINEAR);
      }
      var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso && opts.aniso !== false) {
        gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
                         Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      }
      return t;
    },

    /*
       2D 텍스처 배열. 복셀 블록처럼 타일이 여러 장 필요할 때 아틀라스보다
       낫습니다 — 밉맵 사이에서 이웃 타일 색이 새어 나오지 않습니다.
       drawFn(ctx, layerIndex, size)로 각 레이어를 그립니다.
    */
    array: function (gl, size, layers, drawFn, opts) {
      opts = opts || {};
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
      var levels = Math.floor(Math.log2(size)) + 1;
      /* 캔버스 색은 sRGB입니다. SRGB 포맷으로 올려야 셰이더에서 선형으로
         제대로 디코딩됩니다 — 아니면 화면 전체가 과노출됩니다. */
      gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels,
                      opts.srgb === false ? gl.RGBA8 : gl.SRGB8_ALPHA8, size, size, layers);

      var c = tex.canvas(size), ctx = c.getContext('2d');
      for (var i = 0; i < layers; i++) {
        ctx.clearRect(0, 0, size, size);
        drawFn(ctx, i, size);
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, size, size, 1,
                         gl.RGBA, gl.UNSIGNED_BYTE, c);
      }
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER,
                       opts.nearest ? gl.NEAREST_MIPMAP_LINEAR : gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER,
                       opts.nearest ? gl.NEAREST : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) {
        gl.texParameterf(gl.TEXTURE_2D_ARRAY, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
                         Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      }
      return t;
    },

    /* 캔버스에 얹는 픽셀 노이즈 — 텍스처를 만들 때 자주 씁니다. */
    grain: function (ctx, size, amount, seed) {
      var img = ctx.getImageData(0, 0, size, size);
      var d = img.data, rnd = noise.rng(seed || 1);
      for (var i = 0; i < d.length; i += 4) {
        var n = (rnd() - 0.5) * amount;
        d[i] = AX.clamp(d[i] + n, 0, 255);
        d[i + 1] = AX.clamp(d[i + 1] + n, 0, 255);
        d[i + 2] = AX.clamp(d[i + 2] + n, 0, 255);
      }
      ctx.putImageData(img, 0, 0);
    },

    /* 1×1 단색 텍스처 — 자리표시자용 */
    solid: function (gl, r, g, b, a) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    new Uint8Array([r, g, b, a === undefined ? 255 : a]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    }
  };

  /* ══════════════════════════════════════════════════════════
     9. 렌더타겟
     ══════════════════════════════════════════════════════════ */

  var RT = AX.RT = function (gl, w, h, opts) {
    opts = opts || {};
    this.gl = gl;
    this.width = w; this.height = h;
    this.samples = opts.samples || 0;
    this.float = opts.float !== false && gl.axFloatRT;
    this.hasDepth = opts.depth !== false;
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

    var colorFormat = this.float ? gl.RGBA16F : gl.RGBA8;

    if (opts.noColor) {
      /* 깊이 전용 — 그림자 맵이 이걸 씁니다. */
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
    } else if (this.samples > 0) {
      /* 멀티샘플 렌더버퍼 — 나중에 blit으로 해상합니다. */
      this.colorRB = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.colorRB);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, colorFormat, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.colorRB);
    } else {
      this.color = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.color);
      gl.texStorage2D(gl.TEXTURE_2D, 1, colorFormat, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.color, 0);
    }

    if (this.hasDepth) {
      if (opts.depthTexture) {
        this.depth = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.depth);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, w, h);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depth, 0);
      } else {
        this.depthRB = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRB);
        if (this.samples > 0) {
          gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, w, h);
        } else {
          gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
        }
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRB);
      }
    }

    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.warn('[ax3d] 렌더타겟이 불완전합니다: 0x' + status.toString(16));
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  RT.prototype.bind = function (clear) {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    if (clear) gl.clear(gl.COLOR_BUFFER_BIT | (this.hasDepth ? gl.DEPTH_BUFFER_BIT : 0));
    return this;
  };

  /* 멀티샘플 버퍼를 일반 텍스처 렌더타겟으로 해상합니다. */
  RT.prototype.blitTo = function (dst) {
    var gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst.fbo);
    gl.blitFramebuffer(0, 0, this.width, this.height, 0, 0, dst.width, dst.height,
                       gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return dst;
  };

  RT.prototype.dispose = function () {
    var gl = this.gl;
    if (this.color) gl.deleteTexture(this.color);
    if (this.depth) gl.deleteTexture(this.depth);
    if (this.colorRB) gl.deleteRenderbuffer(this.colorRB);
    if (this.depthRB) gl.deleteRenderbuffer(this.depthRB);
    gl.deleteFramebuffer(this.fbo);
  };

  /* ══════════════════════════════════════════════════════════
     10. 셰이더 조각 — 게임 셰이더에서 문자열로 조립해 씁니다
     ══════════════════════════════════════════════════════════ */

  AX.chunk = {
    /* 전체 화면 삼각형 정점 셰이더. 정점 버퍼 없이 gl_VertexID만 씁니다. */
    fullscreenVS: [
      '#version 300 es',
      'out vec2 vUV;',
      'void main() {',
      '  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);',
      '  vUV = p;',
      '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);',
      '}'
    ].join('\n'),

    /* Cook-Torrance GGX. 게임 프래그먼트 셰이더에 붙여 씁니다. */
    pbr: [
      'const float PI = 3.14159265359;',
      'float distributionGGX(vec3 N, vec3 H, float rough) {',
      '  float a = rough * rough;',
      '  float a2 = a * a;',
      '  float NdotH = max(dot(N, H), 0.0);',
      '  float d = NdotH * NdotH * (a2 - 1.0) + 1.0;',
      '  return a2 / max(PI * d * d, 1e-5);',
      '}',
      'float geometrySchlick(float NdotV, float rough) {',
      '  float r = rough + 1.0;',
      '  float k = (r * r) / 8.0;',
      '  return NdotV / (NdotV * (1.0 - k) + k);',
      '}',
      'float geometrySmith(vec3 N, vec3 V, vec3 L, float rough) {',
      '  return geometrySchlick(max(dot(N, V), 0.0), rough) * geometrySchlick(max(dot(N, L), 0.0), rough);',
      '}',
      'vec3 fresnelSchlick(float cosT, vec3 F0) {',
      '  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosT, 0.0, 1.0), 5.0);',
      '}',
      '/* 방향광 하나에 대한 직접광 기여 */',
      'vec3 directPBR(vec3 N, vec3 V, vec3 L, vec3 radiance, vec3 albedo, float metal, float rough) {',
      '  vec3 H = normalize(V + L);',
      '  vec3 F0 = mix(vec3(0.04), albedo, metal);',
      '  float NDF = distributionGGX(N, H, rough);',
      '  float G = geometrySmith(N, V, L, rough);',
      '  vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);',
      '  vec3 spec = (NDF * G * F) / max(4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0), 1e-4);',
      '  vec3 kD = (vec3(1.0) - F) * (1.0 - metal);',
      '  return (kD * albedo / PI + spec) * radiance * max(dot(N, L), 0.0);',
      '}'
    ].join('\n'),

    /* 절차 환경광 — 하늘/지면 그라디언트를 IBL 대용으로 씁니다. */
    envLight: [
      'vec3 envIrradiance(vec3 N, vec3 skyTop, vec3 skyBottom, vec3 ground) {',
      '  float t = N.y * 0.5 + 0.5;',
      '  vec3 sky = mix(skyBottom, skyTop, t);',
      '  return mix(ground, sky, smoothstep(-0.25, 0.35, N.y));',
      '}',
      'vec3 envSpecular(vec3 R, float rough, vec3 skyTop, vec3 skyBottom, vec3 ground, vec3 sunDir, vec3 sunColor) {',
      '  float t = R.y * 0.5 + 0.5;',
      '  vec3 base = mix(mix(ground, skyBottom, 0.6), skyTop, t);',
      '  float sun = pow(max(dot(R, sunDir), 0.0), mix(220.0, 6.0, rough));',
      '  return base + sunColor * sun * (1.0 - rough * 0.85);',
      '}'
    ].join('\n'),

    /* 3×3 PCF 그림자. shadowMap은 깊이 텍스처입니다. */
    shadow: [
      'float shadowFactor(sampler2D shadowMap, vec4 lightSpace, float NdotL, float texel) {',
      '  vec3 proj = lightSpace.xyz / lightSpace.w;',
      '  proj = proj * 0.5 + 0.5;',
      '  if (proj.z > 1.0 || proj.x < 0.0 || proj.x > 1.0 || proj.y < 0.0 || proj.y > 1.0) return 1.0;',
      '  float bias = max(0.0015 * (1.0 - NdotL), 0.0004);',
      '  float sum = 0.0;',
      '  for (int y = -1; y <= 1; y++) {',
      '    for (int x = -1; x <= 1; x++) {',
      '      float d = texture(shadowMap, proj.xy + vec2(float(x), float(y)) * texel).r;',
      '      sum += (proj.z - bias > d) ? 0.0 : 1.0;',
      '    }',
      '  }',
      '  return sum / 9.0;',
      '}'
    ].join('\n'),

    /* ACES 근사 톤매핑 + 감마 */
    tonemap: [
      'vec3 acesTonemap(vec3 x) {',
      '  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;',
      '  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);',
      '}',
      'vec3 toGamma(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }'
    ].join('\n'),

    /* 해시 / 간단한 노이즈 — 셰이더 안에서 쓰는 것 */
    hash: [
      'float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }',
      'float hash12(vec2 p) {',
      '  vec3 p3 = fract(vec3(p.xyx) * 0.1031);',
      '  p3 += dot(p3, p3.yzx + 33.33);',
      '  return fract((p3.x + p3.y) * p3.z);',
      '}',
      'vec2 hash22(vec2 p) {',
      '  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));',
      '  p3 += dot(p3, p3.yzx + 33.33);',
      '  return fract((p3.xx + p3.yz) * p3.zy);',
      '}'
    ].join('\n')
  };

  /* ══════════════════════════════════════════════════════════
     11. 그림자 맵
     ══════════════════════════════════════════════════════════ */

  var ShadowMap = AX.ShadowMap = function (gl, size) {
    this.gl = gl;
    this.size = size || 2048;
    this.enabled = this.size > 0;
    this.lightViewProj = mat4.create();
    this._view = mat4.create();
    this._proj = mat4.create();
    this._eye = vec3.create();
    this._up = vec3.create(0, 1, 0);
    if (this.enabled) this._alloc();
  };

  ShadowMap.prototype._alloc = function () {
    this.rt = new RT(this.gl, this.size, this.size,
                     { depthTexture: true, float: false, noColor: true });
  };

  ShadowMap.prototype.resize = function (size) {
    if (size === this.size) return;
    if (this.rt) this.rt.dispose();
    this.size = size;
    this.enabled = size > 0;
    if (this.enabled) this._alloc();
  };

  /* 광원 방향과 중심점으로 직교 투영 상자를 잡고 깊이 패스를 시작합니다. */
  ShadowMap.prototype.begin = function (lightDir, center, radius) {
    var gl = this.gl;
    vec3.scaleAndAdd(this._eye, center, lightDir, radius * 1.6);
    mat4.lookAt(this._view, this._eye, center, this._up);
    mat4.ortho(this._proj, -radius, radius, -radius, radius, 0.1, radius * 3.4);
    mat4.multiply(this.lightViewProj, this._proj, this._view);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.rt.fbo);
    gl.viewport(0, 0, this.size, this.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    /* 앞면을 잘라 피터패닝을 줄입니다. */
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
    return this.lightViewProj;
  };

  ShadowMap.prototype.end = function () {
    var gl = this.gl;
    gl.cullFace(gl.BACK);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  /* ══════════════════════════════════════════════════════════
     12. 포스트프로세싱 — 블룸 → ACES → 비네트·그레인·색수차
     ══════════════════════════════════════════════════════════ */

  var Post = AX.Post = function (gl) {
    this.gl = gl;
    this.quad = geom.fullscreen(gl);
    this.effects = {
      exposure: 1.0,
      bloomStrength: 0.55,
      bloomThreshold: 1.0,
      vignette: 0.42,
      grain: 0.035,
      chroma: 0.0016,
      saturation: 1.06
    };
    this.time = 0;
    this._buildShaders();
    this.width = 0; this.height = 0;
  };

  Post.prototype._buildShaders = function () {
    var gl = this.gl, VS = AX.chunk.fullscreenVS;

    this.brightShader = new Shader(gl, VS, [
      '#version 300 es',
      'precision highp float;',
      'in vec2 vUV;',
      'uniform sampler2D uScene;',
      'uniform float uThreshold;',
      'out vec4 fragColor;',
      'void main() {',
      '  vec3 c = texture(uScene, vUV).rgb;',
      '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
      '  float k = max(l - uThreshold, 0.0) / max(l, 1e-4);',
      '  fragColor = vec4(c * k, 1.0);',
      '}'
    ].join('\n'), 'bright');

    this.blurShader = new Shader(gl, VS, [
      '#version 300 es',
      'precision highp float;',
      'in vec2 vUV;',
      'uniform sampler2D uTex;',
      'uniform vec2 uDir;',      // 텍셀 단위 방향
      'out vec4 fragColor;',
      'void main() {',
      '  /* 9탭 가우시안을 선형 샘플링으로 5탭에 담았습니다. */',
      '  float w0 = 0.2270270270;',
      '  float w1 = 0.3162162162, o1 = 1.3846153846;',
      '  float w2 = 0.0702702703, o2 = 3.2307692308;',
      '  vec3 c = texture(uTex, vUV).rgb * w0;',
      '  c += texture(uTex, vUV + uDir * o1).rgb * w1;',
      '  c += texture(uTex, vUV - uDir * o1).rgb * w1;',
      '  c += texture(uTex, vUV + uDir * o2).rgb * w2;',
      '  c += texture(uTex, vUV - uDir * o2).rgb * w2;',
      '  fragColor = vec4(c, 1.0);',
      '}'
    ].join('\n'), 'blur');

    this.compositeShader = new Shader(gl, VS, [
      '#version 300 es',
      'precision highp float;',
      'in vec2 vUV;',
      'uniform sampler2D uScene;',
      'uniform sampler2D uBloomA;',
      'uniform sampler2D uBloomB;',
      'uniform sampler2D uBloomC;',
      'uniform float uExposure, uBloom, uVignette, uGrain, uChroma, uSat, uTime;',
      'uniform int uHasBloom;',
      'out vec4 fragColor;',
      AX.chunk.tonemap,
      AX.chunk.hash,
      'void main() {',
      '  vec2 uv = vUV;',
      '  vec2 d = uv - 0.5;',
      '  float r2 = dot(d, d);',
      '  vec3 color;',
      '  if (uChroma > 0.0) {',
      '    /* 화면 가장자리로 갈수록 채널을 어긋나게 샘플링합니다. */',
      '    vec2 off = d * uChroma * (0.35 + r2);',
      '    color.r = texture(uScene, uv + off).r;',
      '    color.g = texture(uScene, uv).g;',
      '    color.b = texture(uScene, uv - off).b;',
      '  } else {',
      '    color = texture(uScene, uv).rgb;',
      '  }',
      '  if (uHasBloom == 1) {',
      '    vec3 bloom = texture(uBloomA, uv).rgb * 0.5',
      '               + texture(uBloomB, uv).rgb * 0.32',
      '               + texture(uBloomC, uv).rgb * 0.18;',
      '    color += bloom * uBloom;',
      '  }',
      '  color *= uExposure;',
      '  color = acesTonemap(color);',
      '  float l = dot(color, vec3(0.2126, 0.7152, 0.0722));',
      '  color = mix(vec3(l), color, uSat);',
      '  float vig = smoothstep(0.85, 0.18, r2 * uVignette * 2.4);',
      '  color *= mix(1.0, vig, clamp(uVignette, 0.0, 1.0));',
      '  if (uGrain > 0.0) {',
      '    float g = hash12(gl_FragCoord.xy + fract(uTime) * 431.7) - 0.5;',
      '    color += g * uGrain;',
      '  }',
      '  fragColor = vec4(toGamma(max(color, 0.0)), 1.0);',
      '}'
    ].join('\n'), 'composite');
  };

  Post.prototype.resize = function (w, h) {
    if (w === this.width && h === this.height) return;
    this.dispose(true);
    this.width = w; this.height = h;

    var gl = this.gl, q = Quality.get();
    var samples = Math.min(q.msaa, gl.axMaxSamples);
    this.msRT = samples > 1 ? new RT(gl, w, h, { samples: samples }) : null;
    this.sceneRT = new RT(gl, w, h, { depth: !this.msRT });

    this.bloomEnabled = q.bloom;
    if (this.bloomEnabled) {
      var s = q.bloomScale;
      var w1 = Math.max(2, Math.floor(w / s)), h1 = Math.max(2, Math.floor(h / s));
      this.bloomRT = [];
      for (var i = 0; i < 3; i++) {
        var lw = Math.max(2, w1 >> i), lh = Math.max(2, h1 >> i);
        this.bloomRT.push([
          new RT(gl, lw, lh, { depth: false }),
          new RT(gl, lw, lh, { depth: false })
        ]);
      }
    }
  };

  /* 씬 렌더 시작 — 이후 그리는 것은 전부 오프스크린으로 갑니다. */
  Post.prototype.begin = function () {
    var target = this.msRT || this.sceneRT;
    target.bind(false);
    return target;
  };

  /* 씬 렌더 종료 → 블룸 → 합성 → 화면 */
  Post.prototype.end = function (dt) {
    var gl = this.gl;
    this.time += dt || 0;

    if (this.msRT) this.msRT.blitTo(this.sceneRT);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    var e = this.effects;

    if (this.bloomEnabled && this.bloomRT) {
      /* 밝은 부분만 뽑아 1단계 버퍼로 */
      var b0 = this.bloomRT[0][0];
      b0.bind(true);
      this.brightShader.use();
      this.brightShader.tex('uScene', this.sceneRT.color, 0);
      this.brightShader.set('uThreshold', e.bloomThreshold);
      this.quad.draw();

      /* 단계마다 가로·세로 블러, 다음 단계는 이전 결과를 축소해 이어받습니다. */
      for (var i = 0; i < this.bloomRT.length; i++) {
        var pair = this.bloomRT[i];
        if (i > 0) {
          pair[0].bind(true);
          this.blurShader.use();
          this.blurShader.tex('uTex', this.bloomRT[i - 1][0].color, 0);
          this.blurShader.set('uDir', [0, 0]);
          this.quad.draw();
        }
        this.blurShader.use();
        pair[1].bind(true);
        this.blurShader.tex('uTex', pair[0].color, 0);
        this.blurShader.set('uDir', [1 / pair[0].width, 0]);
        this.quad.draw();

        pair[0].bind(true);
        this.blurShader.tex('uTex', pair[1].color, 0);
        this.blurShader.set('uDir', [0, 1 / pair[0].height]);
        this.quad.draw();
      }
    }

    /* 화면으로 합성 */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.axCanvas.width, gl.axCanvas.height);
    var c = this.compositeShader.use();
    c.tex('uScene', this.sceneRT.color, 0);
    if (this.bloomEnabled && this.bloomRT) {
      c.tex('uBloomA', this.bloomRT[0][0].color, 1);
      c.tex('uBloomB', this.bloomRT[1][0].color, 2);
      c.tex('uBloomC', this.bloomRT[2][0].color, 3);
      c.set('uHasBloom', 1);
    } else {
      c.set('uHasBloom', 0);
    }
    c.set('uExposure', e.exposure);
    c.set('uBloom', e.bloomStrength);
    c.set('uVignette', e.vignette);
    c.set('uGrain', AX.reduceMotion ? 0 : e.grain);
    c.set('uChroma', AX.reduceMotion ? 0 : e.chroma);
    c.set('uSat', e.saturation);
    c.set('uTime', this.time);
    this.quad.draw();
  };

  Post.prototype.dispose = function (keepShaders) {
    if (this.msRT) { this.msRT.dispose(); this.msRT = null; }
    if (this.sceneRT) { this.sceneRT.dispose(); this.sceneRT = null; }
    if (this.bloomRT) {
      this.bloomRT.forEach(function (pair) { pair[0].dispose(); pair[1].dispose(); });
      this.bloomRT = null;
    }
    if (!keepShaders) this.width = this.height = 0;
  };

  /* ══════════════════════════════════════════════════════════
     13. 입력 — 키보드 / 마우스 / 포인터 락
     ══════════════════════════════════════════════════════════ */

  var Input = AX.Input = {
    keys: {},
    pressed: {},          // 이번 프레임에 처음 눌린 키
    released: {},
    mouse: { x: 0, y: 0, dx: 0, dy: 0, wheel: 0, buttons: 0, clicked: 0 },
    locked: false,
    sensitivity: 0.0022,
    _canvas: null,
    _onLockChange: null,

    init: function (canvas, opts) {
      opts = opts || {};
      Input._canvas = canvas;

      global.addEventListener('keydown', function (e) {
        if (e.repeat) return;
        /* 게임 중에는 스크롤·검색 등 기본 동작을 막습니다.
           단, 버튼·링크에 포커스가 있으면 Space/Enter 활성화를 살려 둡니다. */
        var tag = document.activeElement && document.activeElement.tagName;
        var uiFocused = tag === 'BUTTON' || tag === 'A' || tag === 'INPUT';
        if (!uiFocused &&
            ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Slash'].indexOf(e.code) >= 0) {
          e.preventDefault();
        }
        Input.keys[e.code] = true;
        Input.pressed[e.code] = true;
      });
      global.addEventListener('keyup', function (e) {
        Input.keys[e.code] = false;
        Input.released[e.code] = true;
      });
      /* 탭을 벗어나면 눌린 키가 남아 캐릭터가 계속 걷는 문제를 막습니다. */
      global.addEventListener('blur', function () { Input.keys = {}; });

      canvas.addEventListener('mousedown', function (e) {
        Input.mouse.buttons |= (1 << e.button);
        Input.mouse.clicked |= (1 << e.button);
        if (opts.pointerLock && !Input.locked) Input.lock();
      });
      global.addEventListener('mouseup', function (e) {
        Input.mouse.buttons &= ~(1 << e.button);
      });
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      global.addEventListener('mousemove', function (e) {
        if (Input.locked) {
          Input.mouse.dx += e.movementX || 0;
          Input.mouse.dy += e.movementY || 0;
        } else {
          var r = canvas.getBoundingClientRect();
          var nx = (e.clientX - r.left) / r.width;
          var ny = (e.clientY - r.top) / r.height;
          /* 첫 이동에서는 델타를 만들지 않습니다 — 화면이 홱 도는 걸 막습니다. */
          if (Input._seenMove) {
            Input.mouse.dx += (nx - Input.mouse.x) * r.width;
            Input.mouse.dy += (ny - Input.mouse.y) * r.height;
          }
          Input._seenMove = true;
          Input.mouse.x = nx;
          Input.mouse.y = ny;
        }
      });

      canvas.addEventListener('wheel', function (e) {
        Input.mouse.wheel += Math.sign(e.deltaY);
        e.preventDefault();
      }, { passive: false });

      document.addEventListener('pointerlockchange', function () {
        Input.locked = document.pointerLockElement === canvas;
        if (Input._onLockChange) Input._onLockChange(Input.locked);
      });
    },

    lock: function () {
      if (Input._canvas && Input._canvas.requestPointerLock) {
        var p = Input._canvas.requestPointerLock();
        /* 크롬 최신 버전은 프라미스를 반환합니다. 실패는 조용히 무시합니다. */
        if (p && p.catch) p.catch(function () {});
      }
    },
    unlock: function () { if (document.exitPointerLock) document.exitPointerLock(); },
    onLockChange: function (fn) { Input._onLockChange = fn; },

    down: function (code) { return !!Input.keys[code]; },

    /* 엣지 상태는 읽는 순간 소비됩니다. 고정 스텝이 한 프레임에 여러 번 돌아도
       한 번만 true가 되고, 업데이트가 안 돈 프레임(>120Hz)에서는 다음 프레임까지
       살아남습니다 — endFrame(clearEdges)와 짝을 이룹니다. */
    justPressed: function (code) {
      if (Input.pressed[code]) { delete Input.pressed[code]; return true; }
      return false;
    },
    justReleased: function (code) {
      if (Input.released[code]) { delete Input.released[code]; return true; }
      return false;
    },
    mouseDown: function (btn) { return (Input.mouse.buttons & (1 << btn)) !== 0; },
    mouseClicked: function (btn) {
      var bit = 1 << btn;
      if (Input.mouse.clicked & bit) { Input.mouse.clicked &= ~bit; return true; }
      return false;
    },

    /* 매 프레임 마지막에 호출. clearEdges=false면(이번 프레임에 고정 스텝이
       한 번도 안 돌았을 때) 키·클릭 엣지는 남겨 두고 마우스 델타만 비웁니다. */
    endFrame: function (clearEdges) {
      if (clearEdges !== false) {
        Input.pressed = {};
        Input.released = {};
        Input.mouse.clicked = 0;
      }
      Input.mouse.dx = 0;
      Input.mouse.dy = 0;
      Input.mouse.wheel = 0;
    },

    /* 여러 키 중 아무거나 눌렸는지 */
    anyDown: function (codes) {
      for (var i = 0; i < codes.length; i++) if (Input.keys[codes[i]]) return true;
      return false;
    }
  };

  /* ══════════════════════════════════════════════════════════
     14. 메인 루프 — 물리는 고정 스텝, 렌더는 가변
     ══════════════════════════════════════════════════════════ */

  var Loop = AX.Loop = function (opts) {
    this.step = opts.step || 1 / 120;
    this.maxSub = opts.maxSub || 6;
    this.update = opts.update || function () {};
    this.render = opts.render || function () {};
    this.running = false;
    this.paused = false;
    this.time = 0;
    this.frameMs = 16.7;
    this._acc = 0;
    this._last = 0;
    this._raf = 0;
    this._smoothing = 0;
    var self = this;
    this._tick = function (now) {
      if (!self.running) return;
      self._raf = requestAnimationFrame(self._tick);

      var dt = (now - self._last) / 1000;
      self._last = now;
      if (!isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 0.1);            // 탭 복귀 시 큰 점프를 자릅니다

      self.frameMs = self.frameMs * 0.9 + (dt * 1000) * 0.1;
      Quality.feed(self.frameMs);

      /* 일시정지 중에도 화면은 계속 그립니다. 입력 상태는 반드시 비웁니다 —
         안 그러면 justPressed가 남아 재개하자마자 다시 눌린 것으로 읽힙니다. */
      if (self.paused) { self.render(0, self.time); Input.endFrame(); return; }

      self.time += dt;
      self._acc += dt;
      var n = 0;
      while (self._acc >= self.step && n < self.maxSub) {
        self.update(self.step, self.time);
        self._acc -= self.step;
        n++;
      }
      if (n === self.maxSub) self._acc = 0;   // 따라잡기 포기 — 나선형 지연 방지
      self.render(dt, self.time);
      /* 고정 스텝이 안 돈 프레임에서는 키 엣지를 보존합니다 (>120Hz 입력 유실 방지). */
      Input.endFrame(n > 0);
    };
  };

  Loop.prototype.start = function () {
    if (this.running) return this;
    this.running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
    return this;
  };

  Loop.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    return this;
  };

  Loop.prototype.setPaused = function (p) {
    if (p === this.paused) return;
    this.paused = p;
    this._acc = 0;
    this._last = performance.now();
  };

  /* ══════════════════════════════════════════════════════════
     15. 파티클 — 인스턴싱 기반 공용 시스템
     ══════════════════════════════════════════════════════════ */

  /*
     GPU 인스턴싱으로 파티클을 한 번에 그립니다.
     각 인스턴스: 위치(3) 크기(1) 색(3) 알파(1) = 8 float
  */
  var Particles = AX.Particles = function (gl, max) {
    this.gl = gl;
    this.max = max || 512;
    this.data = new Float32Array(this.max * 8);
    this.live = [];
    this.pool = [];
    for (var i = 0; i < this.max; i++) {
      this.pool.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0, life: 0, maxLife: 1,
                       r: 1, g: 1, b: 1, gravity: -20, drag: 0.06 });
    }

    /* 빌보드 사각형 하나에 인스턴스 속성을 붙입니다. */
    var quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    this.mesh = new Mesh(gl, {
      buffers: [
        { data: quad, stride: 8, attrs: [{ loc: 0, size: 2, offset: 0 }] },
        { data: this.data, stride: 32, dynamic: true, divisor: 1,
          attrs: [{ loc: 1, size: 4, offset: 0 },     // xyz + size
                  { loc: 2, size: 4, offset: 16 }] }  // rgb + alpha
      ],
      index: new Uint16Array([0, 1, 2, 0, 2, 3])
    });

    this.shader = new Shader(gl, [
      '#version 300 es',
      'layout(location=0) in vec2 aCorner;',
      'layout(location=1) in vec4 aPosSize;',
      'layout(location=2) in vec4 aColor;',
      'uniform mat4 uViewProj;',
      'uniform vec3 uRight, uUp;',
      'out vec4 vColor;',
      'out vec2 vCorner;',
      'void main() {',
      '  vColor = aColor;',
      '  vCorner = aCorner;',
      '  vec3 world = aPosSize.xyz + (uRight * aCorner.x + uUp * aCorner.y) * aPosSize.w;',
      '  gl_Position = uViewProj * vec4(world, 1.0);',
      '}'
    ].join('\n'), [
      '#version 300 es',
      'precision highp float;',
      'in vec4 vColor;',
      'in vec2 vCorner;',
      'out vec4 fragColor;',
      'void main() {',
      '  float d = length(vCorner) * 2.0;',
      '  float a = smoothstep(1.0, 0.35, d) * vColor.a;',
      '  if (a < 0.01) discard;',
      '  fragColor = vec4(vColor.rgb * (0.6 + 0.4 * (1.0 - d)), a);',
      '}'
    ].join('\n'), 'particles');
  };

  Particles.prototype.spawn = function (opts) {
    if (!this.pool.length) return null;
    var p = this.pool.pop();
    p.x = opts.x; p.y = opts.y; p.z = opts.z;
    p.vx = opts.vx || 0; p.vy = opts.vy || 0; p.vz = opts.vz || 0;
    p.size = opts.size || 0.1;
    p.life = p.maxLife = opts.life || 0.8;
    p.r = opts.r !== undefined ? opts.r : 1;
    p.g = opts.g !== undefined ? opts.g : 1;
    p.b = opts.b !== undefined ? opts.b : 1;
    p.gravity = opts.gravity !== undefined ? opts.gravity : -20;
    p.drag = opts.drag !== undefined ? opts.drag : 0.06;
    p.shrink = opts.shrink !== undefined ? opts.shrink : 1;
    this.live.push(p);
    return p;
  };

  Particles.prototype.update = function (dt, collide) {
    for (var i = this.live.length - 1; i >= 0; i--) {
      var p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.live.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.vy += p.gravity * dt;
      var d = Math.max(0, 1 - p.drag * dt * 60 * 0.016);
      p.vx *= d; p.vz *= d;
      var nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      if (collide && collide(nx, ny, nz)) {
        /* 지형에 닿으면 튕기며 속도를 잃습니다. */
        if (!collide(p.x, ny, p.z)) { p.y = ny; p.vx *= 0.6; p.vz *= 0.6; }
        p.vy = -p.vy * 0.28;
        if (Math.abs(p.vy) < 0.6) p.vy = 0;
      } else {
        p.x = nx; p.y = ny; p.z = nz;
      }
    }
  };

  Particles.prototype.draw = function (viewProj, right, up) {
    var n = this.live.length;
    if (!n) return;
    var d = this.data;
    for (var i = 0; i < n; i++) {
      var p = this.live[i], o = i * 8;
      var t = p.life / p.maxLife;
      d[o] = p.x; d[o + 1] = p.y; d[o + 2] = p.z;
      d[o + 3] = p.size * (p.shrink ? (0.35 + 0.65 * t) : 1);
      d[o + 4] = p.r; d[o + 5] = p.g; d[o + 6] = p.b;
      d[o + 7] = Math.min(1, t * 2.2);
    }
    var gl = this.gl;
    this.mesh.updateBuffer(1, d.subarray(0, n * 8));
    this.shader.use()
      .set('uViewProj', viewProj)
      .set('uRight', right)
      .set('uUp', up);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    this.mesh.draw(n);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  };

  Particles.prototype.clear = function () {
    while (this.live.length) this.pool.push(this.live.pop());
  };

  /* ══════════════════════════════════════════════════════════
     16. 카메라 헬퍼
     ══════════════════════════════════════════════════════════ */

  var Camera = AX.Camera = function () {
    this.position = vec3.create(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.fov = 70 * Math.PI / 180;
    this.near = 0.08;
    this.far = 400;
    this.view = mat4.create();
    this.proj = mat4.create();
    this.viewProj = mat4.create();
    this.forward = vec3.create(0, 0, -1);
    this.right = vec3.create(1, 0, 0);
    this.up = vec3.create(0, 1, 0);
    this._target = vec3.create();
    this._worldUp = vec3.create(0, 1, 0);
  };

  Camera.prototype.update = function (aspect) {
    var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    vec3.set(this.forward, sy * cp, sp, -cy * cp);
    vec3.normalize(this.forward, this.forward);
    vec3.cross(this.right, this.forward, this._worldUp);
    vec3.normalize(this.right, this.right);
    vec3.cross(this.up, this.right, this.forward);

    vec3.add(this._target, this.position, this.forward);
    mat4.lookAt(this.view, this.position, this._target, this.up);
    mat4.perspective(this.proj, this.fov, aspect, this.near, this.far);
    mat4.multiply(this.viewProj, this.proj, this.view);
    return this;
  };

  /* 마우스 델타로 시점을 돌립니다. 위아래는 수직 근처에서 멈춥니다. */
  Camera.prototype.look = function (dx, dy, sensitivity) {
    var s = sensitivity || Input.sensitivity;
    this.yaw += dx * s;
    this.pitch -= dy * s;
    var lim = Math.PI / 2 - 0.001;
    this.pitch = AX.clamp(this.pitch, -lim, lim);
    if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
    return this;
  };

  /* ══════════════════════════════════════════════════════════
     17. 절두체 컬링 — 청크 단위로 씁니다
     ══════════════════════════════════════════════════════════ */

  var Frustum = AX.Frustum = function () {
    this.planes = [];
    for (var i = 0; i < 6; i++) this.planes.push(new Float32Array(4));
  };

  Frustum.prototype.fromMatrix = function (m) {
    var p = this.planes;
    /* 좌, 우, 하, 상, 근, 원 */
    var rows = [
      [0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]
    ];
    for (var i = 0; i < 6; i++) {
      var r = rows[i][0], s = rows[i][1];
      p[i][0] = m[3] + s * m[r];
      p[i][1] = m[7] + s * m[4 + r];
      p[i][2] = m[11] + s * m[8 + r];
      p[i][3] = m[15] + s * m[12 + r];
      var len = Math.hypot(p[i][0], p[i][1], p[i][2]) || 1;
      p[i][0] /= len; p[i][1] /= len; p[i][2] /= len; p[i][3] /= len;
    }
    return this;
  };

  Frustum.prototype.boxVisible = function (minX, minY, minZ, maxX, maxY, maxZ) {
    for (var i = 0; i < 6; i++) {
      var pl = this.planes[i];
      var px = pl[0] > 0 ? maxX : minX;
      var py = pl[1] > 0 ? maxY : minY;
      var pz = pl[2] > 0 ? maxZ : minZ;
      if (pl[0] * px + pl[1] * py + pl[2] * pz + pl[3] < 0) return false;
    }
    return true;
  };

  /* ══════════════════════════════════════════════════════════
     18. 색 유틸
     ══════════════════════════════════════════════════════════ */

  AX.color = {
    /* '#ff4d8f' → [1, 0.302, 0.561] (선형 공간) */
    hex: function (h, linear) {
      var n = parseInt(h.replace('#', ''), 16);
      var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      if (linear !== false) { r = Math.pow(r, 2.2); g = Math.pow(g, 2.2); b = Math.pow(b, 2.2); }
      return new Float32Array([r, g, b]);
    },
    scale: function (c, s) { return new Float32Array([c[0] * s, c[1] * s, c[2] * s]); }
  };

})(window);
