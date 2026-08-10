/* ─────────────────────────────────────────────────────────────
   ax-audio.js — 요즘 오락실 공용 WebAudio 합성 사운드

   외부 오디오 파일을 쓸 수 없어 모든 소리를 합성으로 만듭니다.
   AudioContext는 사용자 제스처 이후에만 소리가 나므로, resume()을
   시작 버튼 핸들러에서 불러 줍니다.

   전역 네임스페이스: AX.Audio
   ───────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var AX = global.AX = global.AX || {};

  var A = AX.Audio = {
    ctx: null,
    master: null,
    _comp: null,
    muted: false,

    init: function () {
      if (A.ctx) return A.ctx;
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return null;
      A.ctx = new Ctx();

      /* 마스터 체인: 게인 → 컴프레서 → 출력. 여러 소리가 겹쳐도 안 깨집니다. */
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.6;
      A._comp = A.ctx.createDynamicsCompressor();
      A._comp.threshold.value = -18;
      A._comp.knee.value = 24;
      A._comp.ratio.value = 6;
      A._comp.attack.value = 0.003;
      A._comp.release.value = 0.16;
      A.master.connect(A._comp);
      A._comp.connect(A.ctx.destination);
      return A.ctx;
    },

    resume: function () {
      if (!A.ctx) A.init();
      if (A.ctx && A.ctx.state !== 'running') {
        A.ctx.resume().catch(function () {});
      }
    },

    setVolume: function (v) { if (A.master) A.master.gain.value = v; },
    now: function () { return A.ctx ? A.ctx.currentTime : 0; },

    /* ── 저수준 빌딩 블록 ─────────────────────── */

    /* 오실레이터 한 발. freq는 숫자 또는 [시작, 끝](지수 스윕). */
    tone: function (opts) {
      if (!A.ctx || A.muted) return;
      var t0 = opts.at !== undefined ? opts.at : A.ctx.currentTime;
      var dur = opts.dur || 0.15;
      var osc = A.ctx.createOscillator();
      osc.type = opts.type || 'sine';
      var f = opts.freq || 440;
      if (Array.isArray(f)) {
        osc.frequency.setValueAtTime(Math.max(1, f[0]), t0);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, f[1]), t0 + dur);
      } else {
        osc.frequency.setValueAtTime(f, t0);
      }
      var g = A.ctx.createGain();
      var vol = opts.vol !== undefined ? opts.vol : 0.5;
      var attack = opts.attack !== undefined ? opts.attack : 0.004;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);

      var dest = A.master;
      if (opts.filterFreq) {
        var filt = A.ctx.createBiquadFilter();
        filt.type = opts.filterType || 'lowpass';
        filt.frequency.value = opts.filterFreq;
        if (opts.filterQ) filt.Q.value = opts.filterQ;
        g.connect(filt); filt.connect(dest);
        osc.connect(g);
      } else {
        osc.connect(g); g.connect(dest);
      }
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
      return osc;
    },

    /* 노이즈 버스트 — 타격·폭발·바람. */
    _noiseBuf: null,
    noise: function (opts) {
      if (!A.ctx || A.muted) return;
      if (!A._noiseBuf) {
        var len = A.ctx.sampleRate * 1.2;
        A._noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
        var d = A._noiseBuf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      var t0 = opts.at !== undefined ? opts.at : A.ctx.currentTime;
      var dur = opts.dur || 0.2;
      var src = A.ctx.createBufferSource();
      src.buffer = A._noiseBuf;
      src.loop = true;
      src.playbackRate.value = opts.rate || 1;

      var filt = A.ctx.createBiquadFilter();
      filt.type = opts.filterType || 'lowpass';
      var ff = opts.filterFreq || 1200;
      if (Array.isArray(ff)) {
        filt.frequency.setValueAtTime(Math.max(20, ff[0]), t0);
        filt.frequency.exponentialRampToValueAtTime(Math.max(20, ff[1]), t0 + dur);
      } else {
        filt.frequency.value = ff;
      }
      if (opts.filterQ) filt.Q.value = opts.filterQ;

      var g = A.ctx.createGain();
      var vol = opts.vol !== undefined ? opts.vol : 0.4;
      var attack = opts.attack !== undefined ? opts.attack : 0.003;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);

      src.connect(filt); filt.connect(g); g.connect(A.master);
      src.start(t0);
      src.stop(t0 + dur + 0.05);
      return src;
    },

    /* ── 게임 공용 프리셋 ─────────────────────── */

    sfx: {
      /* UI */
      click: function () {
        A.tone({ type: 'triangle', freq: [880, 660], dur: 0.06, vol: 0.25 });
      },
      confirm: function () {
        A.tone({ type: 'triangle', freq: 520, dur: 0.07, vol: 0.3 });
        A.tone({ type: 'triangle', freq: 780, dur: 0.12, vol: 0.3, at: A.now() + 0.06 });
      },
      denied: function () {
        A.tone({ type: 'square', freq: [220, 160], dur: 0.16, vol: 0.2, filterFreq: 900 });
      },

      /* 전투 */
      laser: function (pitch) {
        var p = pitch || 1;
        A.tone({ type: 'sawtooth', freq: [1800 * p, 320 * p], dur: 0.11, vol: 0.34, filterFreq: 3400 });
        A.tone({ type: 'square', freq: [900 * p, 210 * p], dur: 0.08, vol: 0.16 });
        A.noise({ dur: 0.05, vol: 0.1, filterType: 'highpass', filterFreq: 3800 });
      },
      enemyBolt: function () {
        A.tone({ type: 'sawtooth', freq: [420, 900], dur: 0.13, vol: 0.16, filterFreq: 2200 });
      },
      hit: function () {
        A.tone({ type: 'square', freq: [1300, 900], dur: 0.045, vol: 0.24, filterFreq: 4000 });
      },
      hitShield: function () {
        A.tone({ type: 'sine', freq: [2300, 1500], dur: 0.07, vol: 0.2 });
        A.noise({ dur: 0.05, vol: 0.1, filterType: 'bandpass', filterFreq: 3000, filterQ: 4 });
      },
      hurt: function () {
        A.tone({ type: 'sawtooth', freq: [300, 90], dur: 0.22, vol: 0.34, filterFreq: 900 });
        A.noise({ dur: 0.18, vol: 0.22, filterFreq: [1400, 300] });
      },
      boom: function (big) {
        var s = big ? 1.6 : 1;
        A.noise({ dur: 0.5 * s, vol: 0.5, filterFreq: [2600, 120], attack: 0.001 });
        A.tone({ type: 'sine', freq: [140, 34], dur: 0.5 * s, vol: 0.55 });
        A.tone({ type: 'triangle', freq: [420, 60], dur: 0.24 * s, vol: 0.2 });
      },
      reload: function () {
        A.noise({ dur: 0.07, vol: 0.16, filterType: 'bandpass', filterFreq: 1800, filterQ: 6 });
        A.tone({ type: 'square', freq: 240, dur: 0.05, vol: 0.12, at: A.now() + 0.12 });
        A.tone({ type: 'square', freq: 480, dur: 0.06, vol: 0.16, at: A.now() + 0.3 });
      },
      dash: function () {
        A.noise({ dur: 0.22, vol: 0.2, filterType: 'bandpass', filterFreq: [600, 2400], filterQ: 1.5 });
      },
      step: function () {
        A.noise({ dur: 0.05, vol: 0.06, filterFreq: [700, 200], rate: 0.7 });
      },

      /* 월드·공용 */
      blockBreak: function () {
        A.noise({ dur: 0.14, vol: 0.3, filterFreq: [2000, 300], attack: 0.001 });
        A.tone({ type: 'triangle', freq: [300, 120], dur: 0.1, vol: 0.18 });
      },
      blockPlace: function () {
        A.tone({ type: 'triangle', freq: [520, 300], dur: 0.07, vol: 0.22 });
        A.noise({ dur: 0.04, vol: 0.1, filterFreq: 1200 });
      },
      jump: function () {
        A.tone({ type: 'sine', freq: [340, 520], dur: 0.1, vol: 0.1 });
      },
      splash: function () {
        A.noise({ dur: 0.3, vol: 0.2, filterFreq: [2400, 500] });
      },
      pickup: function () {
        A.tone({ type: 'triangle', freq: 660, dur: 0.07, vol: 0.25 });
        A.tone({ type: 'triangle', freq: 990, dur: 0.1, vol: 0.25, at: A.now() + 0.07 });
      },
      waveStart: function () {
        A.tone({ type: 'sawtooth', freq: [160, 320], dur: 0.4, vol: 0.2, filterFreq: 1200 });
        A.tone({ type: 'sawtooth', freq: [240, 480], dur: 0.4, vol: 0.14, filterFreq: 1600, at: A.now() + 0.18 });
      },
      waveClear: function () {
        [523, 659, 784, 1047].forEach(function (f, i) {
          A.tone({ type: 'triangle', freq: f, dur: 0.22, vol: 0.22, at: A.now() + i * 0.09 });
        });
      }
    },

    /* ── 앰비언트 루프 — 낮게 웅웅거리는 배경 ──── */
    _amb: null,
    ambient: function (on, baseFreq) {
      if (!A.ctx) return;
      if (!on) {
        if (A._amb) {
          var stopAt = A.ctx.currentTime + 0.6;
          A._amb.g.gain.linearRampToValueAtTime(0, stopAt);
          var amb = A._amb;
          setTimeout(function () {
            try { amb.o1.stop(); amb.o2.stop(); amb.lfo.stop(); } catch (e) { /* noop */ }
          }, 800);
          A._amb = null;
        }
        return;
      }
      if (A._amb) return;
      var f = baseFreq || 46;
      var o1 = A.ctx.createOscillator();
      o1.type = 'sine'; o1.frequency.value = f;
      var o2 = A.ctx.createOscillator();
      o2.type = 'triangle'; o2.frequency.value = f * 1.503;
      var g = A.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.05, A.ctx.currentTime + 1.6);
      var filt = A.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 220;
      /* LFO로 볼륨을 아주 느리게 흔듭니다. */
      var lfo = A.ctx.createOscillator();
      lfo.frequency.value = 0.11;
      var lfoG = A.ctx.createGain();
      lfoG.gain.value = 0.016;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      o1.connect(filt); o2.connect(filt); filt.connect(g); g.connect(A.master);
      o1.start(); o2.start(); lfo.start();
      A._amb = { o1: o1, o2: o2, g: g, lfo: lfo };
    }
  };

})(window);
