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
      pinned: null, active: null,
      focusPhase: null,     // ask this phase's questions first (e.g., decision before time runs out)
      focusModule: null,    // a topic the customer just raised catches up to the current phase
      review: null,         // phase number being reviewed in the main column
      focusKey: null,       // field to focus after the next render (a pain's number)
      prompted: null,       // question whose Done already sent you to a missing number once
      addTopic: false,      // "customer raised another topic" picker
      coaching: prefs.get('coaching', true),
      askOpen: prefs.get('askOpen', false), // "How to ask it" (DISC + coaching) expanded
      sideTab: 'pitch',     // side panel: 'pitch' | 'license'
      techAll: false, techPicker: false, freshTech: {},
      blur: false, help: false,
      search: null, searchIdx: 0,
      drawer: null, drawerTab: null, pitchTab: 'pitch',
      showAll: false, setupMore: false,
      mtab: 'q',
      undo: null, openQuote: {}, openNote: {},
      prevConf: {}, rankDelta: {}, unlocked: {}, prevActive: null, resetMain: false,
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
    Object.assign(app.ui, { sideTab: 'pitch', techAll: false, techPicker: false, freshTech: {}, nudged: false, held: null, focusPhase: null, focusModule: null, focusKey: null, prompted: null, pinned: null, active: null, review: null, addTopic: false, drawer: null, search: null, undo: null, rankDelta: {}, unlocked: {}, prevConf: {}, prevActive: null, openQuote: {}, openNote: {} });
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
    const af = document.querySelector('[autofocus]');
    if (af && (!document.activeElement || document.activeElement === document.body)) af.focus();
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
      msgs.push(`New topic${labels.length > 1 ? 's' : ''}: ${labels.join(', ')}`);
    }
    after.scores.list.filter((r) => r.ready && !before.scores.byId[r.id].ready).forEach((r) => {
      msgs.push(`Pitch ready: ${r.play.short}${r.variant ? ' → ' + r.variant.name : ''}`);
    });
    const wasSuggested = Object.fromEntries(before.tech.map((t) => [t.id, t.suggested]));
    const newTech = after.tech.filter((t) => t.suggested && !t.status && !wasSuggested[t.id]);
    newTech.forEach((t) => { app.ui.freshTech[t.id] = Date.now(); });
    if (newTech.length) msgs.push(`Suggested: ${newTech.map((t) => t.tech.name).join(', ')}`);
    if (msgs.length) toast(msgs.join(' · '));
  }

  // ── answer actions ──
  function snapshot(qid) {
    app.ui.undo = { qid, prev: app.s.answers[qid] ? JSON.parse(JSON.stringify(app.s.answers[qid])) : null, prevLast: app.s.lastAnswered };
  }
  function release(qid) {
    if (app.ui.held === qid) app.ui.held = null;
    if (app.ui.pinned === qid) app.ui.pinned = null;
    if (app.ui.active === qid) app.ui.active = null;
  }

  // hold: keep a just-answered single on screen (pain follow-up, risk, or coaching tip).
  // A pain puts the cursor straight into its number, so the number gets asked right away.
  app.choose = function (qid, optId, hold) {
    const q = F.questionById[qid];
    if (q.type === 'single') {
      snapshot(qid);
      const o = q.options.find((x) => x.id === optId);
      app.ui.prompted = null;
      if (hold && o && o.pain) app.ui.focusKey = `pa.${qid}.${optId}`;
      app.act((s) => {
        F.state.selectOption(s, qid, optId);
        if (hold) { app.ui.pinned = qid; app.ui.active = qid; app.ui.held = qid; } else release(qid);
      }, { answer: true });
    } else {
      app.ui.active = qid;
      app.act((s) => F.state.selectOption(s, qid, optId), { answer: true });
    }
  };
  app.done = function (qid) {
    snapshot(qid);
    app.ui.prompted = null;
    app.act((s) => { F.state.markDone(s, qid); release(qid); }, { answer: true });
  };
  // Move on from a question held open for its follow-up (a pain's number, a risk, a tip).
  app.proceed = function (qid) {
    release(qid);
    app.ui.resetMain = true;
    app.recompute();
    app.render();
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
    app.ui.held = null;
    app.ui.pinned = qid;
    app.ui.active = qid;
    app.ui.review = null;
    app.ui.mtab = 'q';
    app.ui.search = null;
    app.recompute();
    app.render();
  };
  function refocus(key, value) {
    app.ui[key] = app.ui[key] === value ? null : value;
    app.ui.review = null;
    app.ui.pinned = null;
    app.ui.active = null;
    app.ui.mtab = 'q';
    app.ui.resetMain = true;
    app.recompute();
    app.render();
  }
  app.focusPhase = (n) => { app.ui.focusModule = null; refocus('focusPhase', n); };
  app.focusModule = (mid) => refocus('focusModule', mid);
  // A topic the customer raised that wasn't in "why now": append its trigger (lowest rank).
  // Its earlier-phase questions (its deadline, its environment) are asked first as a catch-up.
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
      app.ui.focusPhase = null;
      app.ui.pinned = null;
      app.ui.active = null;
      app.ui.review = null;
      app.ui.addTopic = false;
      app.ui.search = null;
    }, { answer: true });
  };

  app.setPref = function (k, v) { app.ui[k] = v; prefs.set(k, v); app.render(); };

  // The customer's reaction to a technology: 'interested' | 'declined' | null (undo).
  app.setTech = function (id, status) {
    const t = F.techById[id];
    const before = app.d;
    app.act((s) => F.state.setTech(s, id, status), { answer: true });
    if (status === 'declined') {
      const aside = Object.keys(app.d.aside).filter((m) => !before.aside[m])
        .map((m) => F.meta.modules.find((x) => x.id === m).label);
      toast(`Not interested in ${t.name} — ${aside.length ? `skipping the ${aside.join(' and ')} questions` : 'it won’t be suggested or licensed'}.`);
    } else if (status === 'interested') {
      toast(`Interested in ${t.name} — it’s in the license sketch.`);
    }
  };

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
      if (app.ui.addTopic && F.screens.addTopic) root.appendChild(F.screens.addTopic());
      if (app.ui.techPicker && F.screens.techPicker) root.appendChild(F.screens.techPicker());
    }
    if (app.ui.help && F.screens.help) root.appendChild(F.screens.help());
    if (app.ui.blur && F.screens.blur) root.appendChild(F.screens.blur());

    root.querySelectorAll('[data-scroll]').forEach((el) => {
      if (scrolls[el.dataset.scroll]) el.scrollTop = scrolls[el.dataset.scroll];
    });
    // A new question starts at the top of the column.
    if (app.ui.resetMain) {
      app.ui.resetMain = false;
      const main = root.querySelector('[data-scroll="main"]');
      if (main) main.scrollTop = 0;
      if (window.innerWidth <= 900) window.scrollTo(0, 0);
    }
    if (window.scrollY !== winY) window.scrollTo(0, winY);
    if (key) {
      const el = root.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (el) {
        el.focus({ preventScroll: true });
        if (sel && typeof el.setSelectionRange === 'function') { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* ignore */ } }
      }
    }
    // Jump to a field asked for by an action (e.g., the number behind a pain just picked).
    if (app.ui.focusKey) {
      const el = root.querySelector(`[data-key="${CSS.escape(app.ui.focusKey)}"]`);
      app.ui.focusKey = null;
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
    }
    // Confidence bars animate from their previous width.
    requestAnimationFrame(() => root.querySelectorAll('[data-w]').forEach((el) => { el.style.width = el.dataset.w; }));
    document.title = app.s && app.s.setup.account && app.ui.screen !== 'home' ? `Fiv-o · ${app.s.setup.account}` : 'Fiv-o · Discovery Navigator';
  };
})(globalThis.Fivo = globalThis.Fivo || {});
