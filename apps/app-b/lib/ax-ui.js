/* ─────────────────────────────────────────────────────────────
   ax-ui.js — 요즘 오락실 게임 공용 셸 (로딩 · 시작 · 일시정지 · 결과)

   게임은 루프만 돌리고, 화면 전환과 버튼은 전부 여기서 처리합니다.
   ES module이 아니라 클래식 스크립트입니다(file:// 대응).
   ───────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var AX = global.AX = global.AX || {};

  var UI = AX.UI = {
    root: null,
    hud: null,
    opts: null,
    current: null,
    _toastTimer: 0,

    /* ── 초기화 ─────────────────────────────── */
    init: function (opts) {
      UI.opts = opts = opts || {};
      document.documentElement.style.setProperty('--ax-tint', opts.tint || '#6d5bff');

      var nav = el('nav', 'ax-nav');
      nav.appendChild(link('../../index.html', '← 오락실로'));
      nav.appendChild(link('../../../../index.html', '← 목록으로'));
      nav.appendChild(el('span', 'ax-spacer'));

      /* 화질 전환 */
      var q = el('div', 'ax-quality');
      ['low', 'medium', 'high'].forEach(function (level) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = AX.Quality.presets[level].label;
        b.setAttribute('aria-pressed', String(AX.Quality.level === level));
        b.addEventListener('click', function () {
          AX.Quality.set(level);
          UI.syncQuality();
        });
        b.dataset.level = level;
        q.appendChild(b);
      });
      UI.qualityBox = q;
      nav.appendChild(q);

      UI.fpsEl = el('span', 'ax-stat');
      UI.fpsEl.textContent = '-- FPS';
      nav.appendChild(UI.fpsEl);

      UI.hud = el('div', 'ax-hud');
      UI.toastEl = el('div', 'ax-toast');
      UI.toastEl.setAttribute('role', 'status');

      document.body.appendChild(nav);
      document.body.appendChild(UI.hud);
      document.body.appendChild(UI.toastEl);

      UI.screens = {
        loading: buildLoading(),
        start: buildStart(opts),
        pause: buildPause(opts),
        result: buildResult(),
        error: buildError()
      };
      for (var k in UI.screens) document.body.appendChild(UI.screens[k]);

      /* Esc는 브라우저가 포인터 락을 풀면서 함께 옵니다.
         락 해제만으로 일시정지를 걸면 두 번 처리되니, 여기서 한 곳으로 모읍니다. */
      global.addEventListener('keydown', function (e) {
        if (e.code !== 'Escape') return;
        if (UI.current === 'start' || UI.current === 'loading') return;
        if (UI.current === 'pause') UI.resume();
        else if (UI.current === null && opts.onPause) { UI.showPause(); }
      });

      AX.Quality.onChange(function () { UI.syncQuality(); });

      /* 잡히지 않은 오류는 오류 화면으로 보냅니다 — 검은 화면으로 죽는 것보다 낫습니다. */
      global.addEventListener('error', function (e) {
        if (UI.current === 'error') return;
        UI.error(e.error || e.message);
      });
      return UI;
    },

    syncQuality: function () {
      if (!UI.qualityBox) return;
      Array.prototype.forEach.call(UI.qualityBox.children, function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.level === AX.Quality.level));
      });
    },

    /* ── 화면 전환 ──────────────────────────── */
    show: function (name) {
      for (var k in UI.screens) UI.screens[k].removeAttribute('data-open');
      UI.current = name;
      if (name) {
        UI.screens[name].setAttribute('data-open', '1');
        document.body.removeAttribute('data-playing');
        var btn = UI.screens[name].querySelector('.ax-btn');
        if (btn) setTimeout(function () { btn.focus(); }, 30);
      } else {
        document.body.setAttribute('data-playing', '1');
      }
    },

    /* ── 로딩 ───────────────────────────────── */
    loading: function (progress, note) {
      if (UI.current !== 'loading') UI.show('loading');
      var s = UI.screens.loading;
      s.querySelector('.ax-bar span').style.width = Math.round(progress * 100) + '%';
      if (note) s.querySelector('.ax-load-note').textContent = note;
    },

    /* ── 시작 화면 ──────────────────────────── */
    showStart: function () { UI.show('start'); },

    start: function () {
      UI.show(null);
      if (UI.opts.onStart) UI.opts.onStart();
    },

    /* ── 일시정지 ───────────────────────────── */
    showPause: function () {
      if (UI.current === 'result') return;
      UI.show('pause');
      if (UI.opts.onPause) UI.opts.onPause();
    },

    resume: function () {
      UI.show(null);
      if (UI.opts.onResume) UI.opts.onResume();
    },

    /* ── 결과 화면 ──────────────────────────── */
    /*
       UI.result({
         title: '클리어',
         lede: '...',
         stats: [['처치', '24'], ['정확도', '68%']],
         primary: { label: '다시 하기', onClick: fn },
         secondary: { label: '오락실로', href: '../../index.html' }
       })
    */
    result: function (cfg) {
      var s = UI.screens.result;
      s.querySelector('h2').textContent = cfg.title || '결과';
      var lede = s.querySelector('.ax-lede');
      lede.textContent = cfg.lede || '';
      lede.style.display = cfg.lede ? '' : 'none';

      var stats = s.querySelector('.ax-stats');
      stats.innerHTML = '';
      (cfg.stats || []).forEach(function (row) {
        var d = document.createElement('div');
        var dt = document.createElement('dt'); dt.textContent = row[0];
        var dd = document.createElement('dd'); dd.textContent = row[1];
        d.appendChild(dt); d.appendChild(dd);
        stats.appendChild(d);
      });
      stats.style.display = (cfg.stats && cfg.stats.length) ? '' : 'none';

      var actions = s.querySelector('.ax-actions');
      actions.innerHTML = '';
      if (cfg.primary) actions.appendChild(action(cfg.primary, false));
      actions.appendChild(action(cfg.secondary || { label: '오락실로', href: '../../index.html' }, true));

      UI.show('result');
    },

    /* ── 오류 ───────────────────────────────── */
    error: function (err) {
      var s = UI.screens.error;
      s.querySelector('.ax-error').textContent = (err && err.stack) || String(err);
      UI.show('error');
      console.error(err);
    },

    /* ── 토스트 ─────────────────────────────── */
    toast: function (msg, ms) {
      UI.toastEl.textContent = msg;
      UI.toastEl.setAttribute('data-show', '1');
      clearTimeout(UI._toastTimer);
      UI._toastTimer = setTimeout(function () {
        UI.toastEl.removeAttribute('data-show');
      }, ms || 1800);
    },

    /* ── FPS 표시 ───────────────────────────── */
    fps: function (frameMs) {
      if (!UI.fpsEl) return;
      var v = Math.round(1000 / Math.max(frameMs, 0.1));
      UI.fpsEl.textContent = v + ' FPS · ' + AX.Quality.get().label;
    },

    /* 포인터 락 상태를 body에 반영해 커서를 숨깁니다. */
    setLocked: function (locked) {
      if (locked) document.body.setAttribute('data-locked', '1');
      else document.body.removeAttribute('data-locked');
    }
  };

  /* ── DOM 헬퍼 ─────────────────────────────── */

  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function link(href, text) {
    var a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  }

  function action(cfg, ghost) {
    var e;
    if (cfg.href) {
      e = document.createElement('a');
      e.href = cfg.href;
    } else {
      e = document.createElement('button');
      e.type = 'button';
    }
    e.className = 'ax-btn' + (ghost ? ' ax-ghost' : '');
    e.textContent = cfg.label;
    if (cfg.onClick) e.addEventListener('click', cfg.onClick);
    return e;
  }

  function screen(name) {
    var s = el('div', 'ax-screen');
    s.dataset.screen = name;
    return s;
  }

  function card() { return el('div', 'ax-card'); }

  function buildLoading() {
    var s = screen('loading'), c = card();
    var h = el('h2'); h.textContent = '불러오는 중';
    var bar = el('div', 'ax-bar'); bar.appendChild(document.createElement('span'));
    var note = el('p', 'ax-load-note'); note.textContent = 'INITIALIZING';
    c.appendChild(h); c.appendChild(bar); c.appendChild(note);
    s.appendChild(c);
    return s;
  }

  function buildStart(opts) {
    var s = screen('start'), c = card();

    var eyebrow = el('p', 'ax-eyebrow');
    eyebrow.textContent = opts.en || 'REALTIME 3D';
    var h = el('h1'); h.textContent = opts.title || '게임';
    c.appendChild(eyebrow);
    c.appendChild(h);

    if (opts.lede) {
      var p = el('p', 'ax-lede');
      p.textContent = opts.lede;
      c.appendChild(p);
    }

    if (opts.controls && opts.controls.length) {
      var dl = el('dl', 'ax-keys');
      opts.controls.forEach(function (row) {
        var dt = document.createElement('dt');
        String(row[0]).split(' ').forEach(function (k) {
          var kbd = document.createElement('kbd');
          kbd.textContent = k;
          dt.appendChild(kbd);
        });
        var dd = document.createElement('dd');
        dd.textContent = row[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      c.appendChild(dl);
    }

    var actions = el('div', 'ax-actions');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ax-btn';
    btn.textContent = opts.startLabel || '시작하기';
    btn.addEventListener('click', function () { UI.start(); });
    actions.appendChild(btn);
    c.appendChild(actions);

    s.appendChild(c);
    return s;
  }

  function buildPause(opts) {
    var s = screen('pause'), c = card();
    var h = el('h2'); h.textContent = '일시정지';
    c.appendChild(h);

    if (opts.controls && opts.controls.length) {
      var dl = el('dl', 'ax-keys');
      opts.controls.forEach(function (row) {
        var dt = document.createElement('dt');
        String(row[0]).split(' ').forEach(function (k) {
          var kbd = document.createElement('kbd');
          kbd.textContent = k;
          dt.appendChild(kbd);
        });
        var dd = document.createElement('dd');
        dd.textContent = row[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      c.appendChild(dl);
    }

    var actions = el('div', 'ax-actions');
    actions.appendChild(action({ label: '계속하기', onClick: function () { UI.resume(); } }, false));
    actions.appendChild(action({ label: '오락실로', href: '../../index.html' }, true));
    c.appendChild(actions);
    s.appendChild(c);
    return s;
  }

  function buildResult() {
    var s = screen('result'), c = card();
    c.appendChild(el('h2'));
    c.appendChild(el('p', 'ax-lede'));
    c.appendChild(el('dl', 'ax-stats'));
    c.appendChild(el('div', 'ax-actions'));
    s.appendChild(c);
    return s;
  }

  function buildError() {
    var s = screen('error'), c = card();
    var h = el('h2'); h.textContent = '실행할 수 없습니다';
    var p = el('p', 'ax-lede');
    p.textContent = 'WebGL2를 지원하는 최신 브라우저가 필요합니다. 아래는 오류 내용입니다.';
    var pre = el('pre', 'ax-error');
    var actions = el('div', 'ax-actions');
    actions.appendChild(action({ label: '오락실로', href: '../../index.html' }, true));
    c.appendChild(h); c.appendChild(p); c.appendChild(pre); c.appendChild(actions);
    s.appendChild(c);
    return s;
  }

})(window);
