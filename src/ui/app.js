/* Fiv-o UI: app store, actions, and the render loop (focus/scroll-preserving). */
(function (F) {
  'use strict';

  const { prefs, toast } = F.dom;
  F.screens = F.screens || {};

  const app = F.app = {
    s: null, // current session
    d: null, // derived state from F.router.evaluate
    ui: {
      screen: 'home',
      focusModule: null, pinned: null, active: null,
      coaching: prefs.get('coaching', true),
      blur: false, help: false,
      search: null, searchIdx: 0,
      drawer: null, drawerTab: null,
      mtab: 'q',
      undo: null, openQuote: {},
      prevConf: {}, rankDelta: {}, unlocked: {}, prevCluster: [],
    },
  };

  let saveWarned = false;
  let saveTimer = null;
  app.persist = function () {
    if (!app.s) return;
    app.s.updatedAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!F.state.save(app.s) && !saveWarned) {
        saveWarned = true;
        toast('Autosave unavailable in this browser — use “Save session (.json)”.', 'warn');
      }
    }, 250);
  };

  app.recompute = function () { app.d = app.s ? F.router.evaluate(app.s, app.ui) : null; };

  app.open = function (s, screen) {
    app.s = s;
    Object.assign(app.ui, { focusModule: null, pinned: null, active: null, drawer: null, search: null, undo: null, rankDelta: {}, unlocked: {}, prevConf: {}, prevCluster: [] });
    app.recompute();
    app.go(screen);
  };

  app.go = function (screen) {
    app.ui.screen = screen;
    if (screen === 'interview' && app.s) {
      const call = app.s.calls[app.s.calls.length - 1];
      if (!call.startedAt) { call.startedAt = Date.now(); app.persist(); }
    }
    app.recompute();
    app.render();
    window.scrollTo(0, 0);
  };

  // Mutate the session, recompute, announce what changed, re-render.
  app.act = function (fn, opts) {
    opts = opts || {};
    const before = app.d;
    fn(app.s);
    app.persist();
    app.recompute();
    if (opts.answer) announce(before, app.d);
    if (opts.render !== false) app.render();
  };

  // Typing: update state now, re-render shortly after (focus and caret are restored).
  let softTimer = null;
  app.soft = function (fn) {
    fn(app.s);
    app.persist();
    clearTimeout(softTimer);
    softTimer = setTimeout(() => { app.recompute(); app.render(); }, 400);
  };

  function announce(before, after) {
    if (!before || !after) return;
    const prevRank = Object.fromEntries(before.scores.list.map((r, i) => [r.id, i]));
    app.ui.prevConf = Object.fromEntries(before.scores.list.map((r) => [r.id, r.conf]));
    app.ui.rankDelta = {};
    after.scores.list.forEach((r, i) => {
      if (r.score > 0 && prevRank[r.id] !== i) app.ui.rankDelta[r.id] = prevRank[r.id] - i;
    });
    const msgs = [];
    const opened = after.modules.filter((m) => !before.modules.includes(m));
    opened.forEach((m) => { app.ui.unlocked[m] = Date.now(); });
    if (opened.length) {
      const labels = opened.map((m) => F.meta.modules.find((x) => x.id === m).label);
      msgs.push(`New topic${labels.length > 1 ? 's' : ''} unlocked: ${labels.join(', ')}`);
    }
    after.scores.list.filter((r) => r.ready && !before.scores.byId[r.id].ready).forEach((r) => {
      msgs.push(`Pitch ready: ${r.play.short}${r.variant ? ' → ' + r.variant.name : ''}`);
    });
    if (msgs.length) toast(msgs.join(' · '), 'good');
  }

  // ── answer actions ──
  function snapshot(qid) {
    app.ui.undo = { qid, prev: app.s.answers[qid] ? JSON.parse(JSON.stringify(app.s.answers[qid])) : null, prevLast: app.s.lastAnswered };
  }
  function release(qid) {
    if (app.ui.pinned === qid) app.ui.pinned = null;
    if (app.ui.active === qid) app.ui.active = null;
  }

  // hold: keep a just-answered single on screen (pain follow-up, risk, or coaching tip).
  app.choose = function (qid, optId, hold) {
    const q = F.questionById[qid];
    if (q.type === 'single') {
      snapshot(qid);
      app.act((s) => {
        F.state.selectOption(s, qid, optId);
        if (hold) { app.ui.pinned = qid; app.ui.active = qid; } else release(qid);
      }, { answer: true });
    } else {
      app.ui.active = qid;
      app.act((s) => F.state.selectOption(s, qid, optId), { answer: true });
    }
  };
  app.done = function (qid) {
    snapshot(qid);
    app.act((s) => { F.state.markDone(s, qid); release(qid); }, { answer: true });
  };
  app.skip = function (qid) {
    const q = F.questionById[qid];
    if (F.hasValue(q, app.s.answers[qid])) return app.done(qid);
    app.act((s) => { F.state.skip(s, qid); release(qid); });
  };
  app.clear = function (qid) {
    snapshot(qid);
    app.act((s) => { F.state.clear(s, qid); release(qid); }, { answer: true });
  };
  app.undo = function () {
    const u = app.ui.undo;
    if (!u) return toast('Nothing to undo');
    app.ui.undo = null;
    app.act((s) => {
      if (u.prev) s.answers[u.qid] = u.prev; else delete s.answers[u.qid];
      s.lastAnswered = u.prevLast;
      app.ui.pinned = u.qid;
      app.ui.active = u.qid;
    }, { answer: true });
  };
  app.pin = function (qid) {
    app.ui.pinned = qid;
    app.ui.active = qid;
    app.ui.mtab = 'q';
    app.ui.search = null;
    app.recompute();
    app.render();
  };
  app.focusModule = function (mid) {
    app.ui.focusModule = app.ui.focusModule === mid ? null : mid;
    app.ui.pinned = null;
    app.ui.active = null;
    app.ui.mtab = 'q';
    app.recompute();
    app.render();
  };
  // A topic the customer raised that wasn't in "why now": append its trigger (lowest rank).
  app.unlockModule = function (mid) {
    const trig = Object.keys(F.meta.triggerModule).find((t) => F.meta.triggerModule[t] === mid);
    if (!trig) return;
    app.act((s) => {
      const a = s.answers.trigger || (s.answers.trigger = { value: [], done: true, note: '', quote: '', pains: {} });
      a.value = Array.isArray(a.value) ? a.value : [];
      if (!a.value.includes(trig)) a.value.push(trig);
      a.done = true;
      a.skipped = false;
      a.call = s.calls.length;
      app.ui.focusModule = mid;
      app.ui.pinned = null;
      app.ui.search = null;
    }, { answer: true });
  };

  app.setPref = function (k, v) { app.ui[k] = v; prefs.set(k, v); app.render(); };

  // ── render loop ──
  app.render = function () {
    const root = document.getElementById('app');
    if (!root) return;
    const ae = document.activeElement;
    const key = ae && ae.dataset ? ae.dataset.key : null;
    let sel = null;
    if (key && typeof ae.selectionStart === 'number') sel = [ae.selectionStart, ae.selectionEnd];
    const scrolls = {};
    root.querySelectorAll('[data-scroll]').forEach((el) => { scrolls[el.dataset.scroll] = el.scrollTop; });
    const winY = window.scrollY;

    root.innerHTML = '';
    const screen = F.screens[app.ui.screen] || F.screens.home;
    root.appendChild(screen());
    if (app.ui.screen === 'interview') {
      if (app.ui.drawer && F.screens.drawer) root.appendChild(F.screens.drawer());
      if (app.ui.search !== null && F.screens.search) root.appendChild(F.screens.search());
    }
    if (app.ui.help && F.screens.help) root.appendChild(F.screens.help());
    if (app.ui.blur && F.screens.blur) root.appendChild(F.screens.blur());

    root.querySelectorAll('[data-scroll]').forEach((el) => {
      if (scrolls[el.dataset.scroll]) el.scrollTop = scrolls[el.dataset.scroll];
    });
    if (window.scrollY !== winY) window.scrollTo(0, winY);
    if (key) {
      const el = root.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        if (sel && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* ignore */ } }
      }
    }
    // Confidence bars animate from their previous width.
    requestAnimationFrame(() => root.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w; }));
    document.title = app.s && app.s.setup.account && app.ui.screen !== 'home' ? `Fiv-o · ${app.s.setup.account}` : 'Fiv-o · Discovery Navigator';
  };
})(globalThis.Fivo = globalThis.Fivo || {});
