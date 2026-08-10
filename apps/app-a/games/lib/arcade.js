/* ============================================================
   arcade.js — 옛날 오락실 공용 아케이드 엔진 (전역 ARC)

   - 클래식 스크립트입니다. ES module 로 바꾸면 file:// 에서
     CORS 로 깨집니다 (app-b lib 와 같은 이유).
   - 이 파일에는 화면에 표시할 한글 문자열을 두지 않습니다.
     픽셀 폰트 서브셋 도구(tools/pixel-font)가 HTML 파일만
     스캔하므로, 화면용 한글은 각 게임 페이지 안에 있어야
     합니다. 이 파일이 직접 그리는 텍스트는 ASCII 만 씁니다.
   ============================================================ */
(function () {
  "use strict";
  var ARC = window.ARC = {};

  /* ── 유틸 ─────────────────────────────────── */
  ARC.pad = function (n, w) {
    n = String(Math.max(0, Math.floor(n)));
    while (n.length < w) n = "0" + n;
    return n;
  };
  ARC.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ── 모션 감소 (실시간) ───────────────────── */
  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  ARC.reduced = mq.matches;
  var redCbs = [];
  function onRed(e) {
    ARC.reduced = e.matches;
    for (var i = 0; i < redCbs.length; i++) redCbs[i](e.matches);
  }
  if (mq.addEventListener) mq.addEventListener("change", onRed);
  else if (mq.addListener) mq.addListener(onRed);
  ARC.onReducedChange = function (cb) { redCbs.push(cb); };

  /* ── 고정 60Hz 타임스텝 루프 ──────────────── */
  ARC.loop = function (opts) {
    var STEP = 1000 / 60;
    var acc = 0, lastT = 0, running = false, rafId = 0;
    function frame(ts) {
      if (!running) return;
      rafId = requestAnimationFrame(frame);
      if (!lastT) lastT = ts;
      var dt = ts - lastT;
      lastT = ts;
      if (dt > 100) dt = 100;          /* 탭 복귀 등 긴 공백은 버림 */
      acc += dt;
      var steps = 0;
      while (acc >= STEP && steps < 3) {
        opts.update();
        ARC.input._endStep();
        acc -= STEP;
        steps++;
      }
      if (steps === 3) acc = 0;        /* 밀린 시간 폐기 (스파이럴 방지) */
      opts.render();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { lastT = 0; acc = 0; if (opts.onHide) opts.onHide(); }
    });
    return {
      start: function () {
        if (running) return;
        running = true; lastT = 0; acc = 0;
        rafId = requestAnimationFrame(frame);
      },
      stop: function () { running = false; cancelAnimationFrame(rafId); },
      isRunning: function () { return running; }
    };
  };

  /* ── 입력: 키보드 + 터치 버튼(data-btn) ───── */
  ARC.input = (function () {
    var keyMap = {}, state = {}, edge = {};
    var preventFn = function () { return false; };

    function press(name) {
      if (!state[name]) { state[name] = true; edge[name] = true; }
    }
    function release(name) { state[name] = false; }
    function nameOf(k) {
      return keyMap[k] || (k && k.length === 1 ? keyMap[k.toLowerCase()] : undefined);
    }

    function init(opts) {
      keyMap = {};
      for (var name in opts.keys) {
        for (var i = 0; i < opts.keys[name].length; i++) keyMap[opts.keys[name][i]] = name;
      }
      if (opts.preventScroll) preventFn = opts.preventScroll;

      document.addEventListener("keydown", function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var n = nameOf(e.key);
        if (!n) return;
        if (preventFn()) e.preventDefault();
        if (e.repeat) state[n] = true; else press(n);
      });
      document.addEventListener("keyup", function (e) {
        var n = nameOf(e.key);
        if (n) release(n);
      });
      window.addEventListener("blur", function () { state = {}; edge = {}; });

      if (opts.touchRoot) {
        var btns = opts.touchRoot.querySelectorAll("[data-btn]");
        Array.prototype.forEach.call(btns, function (b) {
          var n = b.getAttribute("data-btn");
          b.style.touchAction = "none";
          b.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            try { b.setPointerCapture(e.pointerId); } catch (err) {}
            press(n);
            b.classList.add("held");
          });
          function up() { release(n); b.classList.remove("held"); }
          b.addEventListener("pointerup", up);
          b.addEventListener("pointercancel", up);
          b.addEventListener("lostpointercapture", up);
          b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        });
      }
    }

    return {
      init: init,
      down: function (n) { return !!state[n]; },
      pressed: function (n) { return !!edge[n]; },
      inject: press,                    /* 테스트·데모용 */
      _endStep: function () { edge = {}; }
    };
  })();

  /* 캔버스 논리 좌표 포인터 (마우스·터치 드래그) */
  ARC.pointer = function (canvas) {
    var x = null, y = null, downAt = 0;
    function map(e) {
      var r = canvas.getBoundingClientRect();
      if (!r.width) return;
      x = (e.clientX - r.left) * canvas.width / r.width;
      y = (e.clientY - r.top) * canvas.height / r.height;
    }
    canvas.addEventListener("pointermove", map);
    canvas.addEventListener("pointerdown", function (e) { map(e); downAt = Date.now(); });
    canvas.style.touchAction = "none";
    return {
      x: function () { return x; },
      y: function () { return y; },
      clicked: function () {            /* 직전 스텝 내 클릭 여부 */
        if (Date.now() - downAt < 40) { downAt = 0; return true; }
        return false;
      }
    };
  };

  /* ── WebAudio: 효과음 + 칩튠 시퀀서 ───────── */
  ARC.audio = (function () {
    var ctx = null, noiseBuf = null;
    var sfxOn = false, musicOn = false, seqHandle = null;

    function ensure() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function getNoise() {
      if (noiseBuf || !ctx) return noiseBuf;
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    }
    function beep(freq, dur, type, vol, slideTo) {
      if (!sfxOn || !ensure()) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur + 0.02);
    }
    function noise(dur, vol, freq) {
      if (!sfxOn || !ensure() || !getNoise()) return;
      var t = ctx.currentTime;
      var src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuf; src.loop = true;
      flt.type = freq > 2000 ? "highpass" : "lowpass";
      flt.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt); flt.connect(g); g.connect(ctx.destination);
      src.start(t); src.stop(t + dur + 0.02);
    }
    function chord(list) {
      list.forEach(function (n, i) {
        setTimeout(function () { beep(n, 0.09, "square", 0.05); }, i * 70);
      });
    }

    /* 룩어헤드 시퀀서 — 탭 복귀 시 시계 재동기화 포함 */
    var DEF_LEAD = [659, 0, 659, 784, 880, 0, 784, 659, 587, 0, 587, 659, 784, 659, 587, 523,
                    659, 0, 659, 784, 880, 0, 1047, 880, 784, 659, 587, 659, 523, 0, 0, 0];
    var DEF_BASS = [110, 0, 165, 110, 110, 0, 165, 110, 87, 0, 131, 87, 98, 0, 147, 98,
                    110, 0, 165, 110, 110, 0, 165, 110, 87, 0, 98, 98, 131, 131, 131, 0];
    function makeSeq(cfg) {
      cfg = cfg || {};
      var lead = cfg.lead || DEF_LEAD, bass = cfg.bass || DEF_BASS;
      var spb = 60 / (cfg.bpm || 112) / 2;
      var vol = cfg.vol || 1;
      var timer = null, nextT = 0, idx = 0;
      function note(f, t, d, type, v) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(v * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + d + 0.02);
      }
      function hat(t, v) {
        if (!getNoise()) return;
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        s.buffer = noiseBuf;
        f.type = "highpass"; f.frequency.value = 6000;
        g.gain.setValueAtTime(v * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        s.connect(f); f.connect(g); g.connect(ctx.destination);
        s.start(t); s.stop(t + 0.06);
      }
      function tick() {
        if (!musicOn || !ctx || document.hidden) return;
        if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.06;
        while (nextT < ctx.currentTime + 0.12) {
          var f = lead[idx % lead.length];
          if (f) note(f, nextT, 0.22, "square", 0.028);
          var b = bass[idx % bass.length];
          if (b) note(b, nextT, 0.24, "triangle", 0.05);
          if (idx % 2 === 0) hat(nextT, idx % 8 === 0 ? 0.02 : 0.012);
          idx++;
          nextT += spb;
        }
      }
      return {
        start: function () {
          if (timer || !ensure()) return;
          nextT = ctx.currentTime + 0.06;
          idx = 0;
          timer = setInterval(tick, 30);
        },
        stop: function () { if (timer) { clearInterval(timer); timer = null; } }
      };
    }

    /* 사운드 버튼 3단계 (OFF / SFX / SFX+BGM). 라벨은 페이지가 제공 */
    function bindButton(btn, labels, seqCfg) {
      var st = 0;
      var seq = makeSeq(seqCfg);
      btn.addEventListener("click", function () {
        st = (st + 1) % 3;
        sfxOn = st > 0;
        musicOn = st === 2;
        btn.textContent = labels[st];
        btn.classList.toggle("off", !sfxOn);
        if (sfxOn) { ensure(); chord([440, 660, 880]); }
        if (musicOn) seq.start(); else seq.stop();
      });
      return { getState: function () { return st; } };
    }

    return {
      unlock: ensure,
      beep: beep,
      noise: noise,
      chord: chord,
      seq: makeSeq,
      bindButton: bindButton,
      isOn: function () { return sfxOn; }
    };
  })();

  /* ── 상태 머신 ────────────────────────────── */
  ARC.fsm = function (states) {
    var cur = null, t = 0;
    return {
      go: function (name) {
        if (cur && states[cur] && states[cur].exit) states[cur].exit();
        cur = name; t = 0;
        if (states[name] && states[name].enter) states[name].enter();
      },
      step: function () {
        if (cur && states[cur] && states[cur].step) states[cur].step(t);
        t++;
      },
      is: function (name) { return cur === name; },
      state: function () { return cur; },
      t: function () { return t; }
    };
  };

  /* ── HUD DOM 바인딩 ───────────────────────── */
  ARC.hud = (function () {
    var els = {};
    return {
      bind: function (map) {
        for (var k in map) els[k] = document.querySelector(map[k]);
      },
      set: function (k, v, w) {
        if (els[k]) els[k].textContent = w ? ARC.pad(v, w) : String(v);
      }
    };
  })();

  /* ── 세션 최고 기록 (sessionStorage, 시드값 없음) ── */
  ARC.best = {
    KEYS: ["breakout", "neoguri", "galaga", "fighter"],
    get: function (key) {
      try {
        return parseInt(sessionStorage.getItem("oraksil.best." + key) || "0", 10) || 0;
      } catch (e) { return 0; }
    },
    submit: function (key, score) {
      var b = ARC.best.get(key);
      if (score > b) {
        try { sessionStorage.setItem("oraksil.best." + key, String(score)); } catch (e) {}
        return true;
      }
      return false;
    },
    max: function () {
      var m = 0;
      for (var i = 0; i < ARC.best.KEYS.length; i++) m = Math.max(m, ARC.best.get(ARC.best.KEYS[i]));
      return m;
    }
  };

  /* ── 캔버스 정수 배율 피팅 ────────────────── */
  ARC.fit = function (canvas, opts) {
    function apply() {
      var parent = canvas.parentElement;
      if (!parent) return;
      var avail = parent.clientWidth;
      if (!avail) return;
      var scale = Math.floor(avail / opts.w);
      if (opts.maxScale) scale = Math.min(scale, opts.maxScale);
      if (scale < 1) canvas.style.width = "100%";   /* 1x도 안 들어가면 폭 맞춤 */
      else canvas.style.width = (opts.w * scale) + "px";
    }
    apply();
    window.addEventListener("resize", apply);
    setTimeout(apply, 200);              /* 폰트 로딩 후 레이아웃 재계산 대비 */
  };

  /* ── CRT 글리치 스케줄러 ──────────────────── */
  ARC.glitch = function (crtEl, tearEl) {
    (function sched() {
      setTimeout(function () {
        if (!ARC.reduced && !document.hidden) {
          if (tearEl) tearEl.style.top = (10 + Math.random() * 80) + "%";
          crtEl.classList.add("glitch");
          setTimeout(function () { crtEl.classList.remove("glitch"); }, 180);
        }
        sched();
      }, 9000 + Math.random() * 13000);
    })();
  };

  /* ── bfcache 복원 훅 ──────────────────────── */
  ARC.pageshowReset = function (fn) {
    window.addEventListener("pageshow", function (e) { if (e.persisted) fn(); });
  };
})();
