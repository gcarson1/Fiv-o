/* Fiv-o UI: the live-call screen.
   Layout: top bar · topic steps · one focused question (+ "up next") · likely pitch on the side. */
(function (F) {
  'use strict';

  const { h, prefs } = F.dom;
  const app = F.app;
  const MOD = Object.fromEntries(F.meta.modules.map((m) => [m.id, m]));
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  F.ui = F.ui || {};

  // The focused question + the next two. A pinned question (from search / topic review) goes first.
  function cluster() {
    const { d, ui } = app;
    const ids = [];
    if (ui.pinned && F.questionById[ui.pinned]) ids.push(ui.pinned);
    for (const id of d.queue) {
      if (ids.length >= 3) break;
      if (!ids.includes(id)) ids.push(id);
    }
    return ids;
  }
  const activeOf = (ids) => (app.ui.active && ids.includes(app.ui.active) ? app.ui.active : ids[0] || null);
  F.ui.cluster = cluster;
  F.ui.activeId = () => (app.ui.topic ? null : activeOf(cluster()));

  // Human-readable "appears when…" for a question that isn't in play yet.
  function requirement(q) {
    const terms = [];
    [MOD[q.module].when, q.when].forEach((c) => (c && c.any ? c.any : []).forEach((t) => {
      const [qid, opt] = t.split(':');
      const src = F.questionById[qid];
      const o = src && (src.options || []).find((x) => x.id === opt);
      terms.push(`${src ? src.short : qid} is “${o ? o.label : opt}”`);
    }));
    return terms.join(' or ');
  }

  // Answering a pain, risk, or coached option keeps the question open for the follow-up.
  F.ui.shouldHold = function (q, optId) {
    const o = (q.options || []).find((x) => x.id === optId);
    return !!(o && (o.pain || o.flag || (o.tip && app.ui.coaching)));
  };
  F.ui.pick = function (qid, optId) {
    const q = F.questionById[qid];
    app.choose(qid, optId, q.type === 'single' && F.ui.shouldHold(q, optId));
  };

  const lockedTopics = () => F.meta.modules.filter((m) => !app.d.modules.includes(m.id) && Object.values(F.meta.triggerModule).includes(m.id));

  F.ui.elapsed = function () {
    const call = app.s && app.s.calls[app.s.calls.length - 1];
    return call && call.startedAt ? F.dom.fmtTime(Date.now() - call.startedAt) : '0:00';
  };

  F.ui.openTopic = function (mid) {
    app.ui.topic = app.ui.topic === mid ? null : mid;
    app.ui.mtab = 'q';
    app.ui.resetMain = true;
    app.render();
  };
  F.ui.openNote = function (qid) {
    app.ui.openNote[qid] = true;
    app.render();
    const el = document.querySelector(`[data-key="note.${CSS.escape(qid)}"]`);
    if (el) el.focus();
  };
  F.ui.openQuote = function (qid) {
    app.ui.openQuote[qid] = true;
    app.render();
    const el = document.querySelector(`[data-key="quote.${CSS.escape(qid)}"]`);
    if (el) el.focus();
  };

  // ── top bar ──
  function header() {
    const s = app.s;
    return h('header.bar',
      h('div.bar-l',
        h('button.wordmark', { onclick: () => app.go('home'), title: 'Home' }, 'Fiv-o'),
        h('span.bar-acct', s.setup.account || 'Account'),
        h('span.bar-meta', `Call ${s.calls.length}`),
        h('span.bar-meta.mono', { id: 'timer', title: 'Time on this call' }, F.ui.elapsed())),
      h('div.bar-r',
        h('button.tbtn', { onclick: F.ui.openSearch, title: 'Search every question  ( / )' }, 'Search'),
        h('button.tbtn', { onclick: () => { app.ui.blur = true; app.render(); }, title: 'Hide the screen while sharing  (Esc)' }, 'Hide'),
        h('button.tbtn', { onclick: () => { app.ui.help = true; app.render(); }, title: 'Shortcuts and settings  ( ? )' }, 'Help'),
        h('button.btn.primary', { onclick: () => app.go('wrap'), title: 'Wrap up  (W)' }, 'Wrap up')));
  }

  // ── topic steps ──
  function stepper() {
    const { d, ui } = app;
    const act = F.ui.activeId();
    const cur = ui.topic || (act ? F.questionById[act].module : null);
    const steps = d.modules.map((mid, i) => {
      const p = d.progress[mid];
      const done = p.eligible > 0 && p.answered === p.eligible;
      const fresh = ui.unlocked[mid] && Date.now() - ui.unlocked[mid] < 90000;
      const off = d.aside[mid];
      return h('button.step' + (mid === cur ? '.cur' : '') + (done ? '.done' : '') + (off ? '.aside' : ''), {
        onclick: () => F.ui.openTopic(mid),
        title: off ? 'Set aside — the customer isn’t interested in what this topic covers' : `${p.answered} of ${p.eligible} answered — click to review`,
      },
      h('span.step-n', off ? '–' : done ? '✓' : String(i + 1)),
      h('span.step-l', MOD[mid].label),
      fresh ? h('span.step-new', 'new') : null);
    });
    return h('nav.stepper', { 'aria-label': 'Topics' },
      h('div.steps', steps,
        lockedTopics().length ? h('button.step.add', { onclick: () => { ui.addTopic = true; app.render(); }, title: 'The customer raised another topic' }, '+ Topic') : null),
      h('button.step-meta' + (d.mustLeft ? '' : '.ok'), {
        onclick: () => {
          const cur = F.ui.activeId();
          const must = d.queue.filter((x) => F.questionById[x].mustAsk);
          const id = must.find((x) => x !== cur);
          if (id) app.pin(id);
        },
        title: d.mustLeft ? 'Jump to the next must-ask question' : '',
      }, d.mustLeft ? `${d.mustLeft} must-ask${d.mustLeft > 1 ? 's' : ''} left` : 'Must-asks covered'));
  }

  // ── the focused question ──
  function options(q, a) {
    const sel = F.selected(q, a);
    return h('div.opts' + (q.options.length > 7 ? '.two' : ''), { role: 'group', 'aria-label': q.text },
      q.options.map((o, i) => {
        const on = sel.includes(o.id);
        const rank = q.ranked && on ? sel.indexOf(o.id) + 1 : null;
        return h('button.opt' + (on ? '.on' : ''), {
          'aria-pressed': on ? 'true' : 'false',
          onclick: () => F.ui.pick(q.id, o.id),
        },
        h('span.opt-k', i < KEYS.length ? KEYS[i] : ''),
        h('span.opt-l', o.label),
        h('span.opt-m', rank ? `#${rank}` : on ? '✓' : ''));
      }));
  }

  function followUps(q, a) {
    const { ui } = app;
    const out = [];
    const opts = F.selected(q, a).map((id) => q.options.find((o) => o.id === id)).filter(Boolean);
    opts.filter((o) => o.flag).forEach((o) => out.push(h('div.follow.risk', h('div.follow-k', 'Risk'), h('p', o.flag))));
    if (ui.coaching) opts.filter((o) => o.tip).forEach((o) => out.push(h('div.follow.tip', h('div.follow-k', 'Coach'), h('p', o.tip))));
    opts.filter((o) => o.pain).forEach((o) => {
      const p = (a.pains && a.pains[o.id]) || {};
      out.push(h('div.follow.pain',
        h('div.follow-k', `Quantify: ${o.painLabel || `${q.short} — ${o.label}`}`),
        h('div.pair',
          h('input', { placeholder: 'Impact — time, money, or risk', 'aria-label': 'Impact', value: p.impact || '', 'data-key': `pi.${q.id}.${o.id}`, oninput: (e) => app.soft((x) => F.state.setPain(x, q.id, o.id, 'impact', e.target.value)) }),
          h('input', { placeholder: 'Metric — e.g., +$180k/yr', 'aria-label': 'Metric', value: p.metric || '', 'data-key': `pm.${q.id}.${o.id}`, oninput: (e) => app.soft((x) => F.state.setPain(x, q.id, o.id, 'metric', e.target.value)) }))));
    });
    return out;
  }

  // DISC: with the buyer's style set, its phrasing sits under the question; the dropdown
  // shows all four ways to ask it plus the coaching (why ask, listen for, dig deeper).
  F.ui.toggleAsk = () => app.setPref('askOpen', !app.ui.askOpen);
  function howToAsk(q) {
    const { s, ui } = app;
    const ask = F.disc.ask[q.id] || {};
    const style = s.setup.disc;
    const cur = style && F.disc.styles.find((x) => x.k === style);
    const open = ui.askOpen;
    const out = [h('div.ask',
      cur && ask[style] ? h('p.ask-line', h('span.ask-k', { title: `${cur.name}: ${cur.cue}` }, cur.label), h('span', `“${ask[style]}”`)) : null,
      h('button.tbtn.ask-toggle', { onclick: F.ui.toggleAsk, 'aria-expanded': open ? 'true' : 'false', title: 'Four ways to ask it, one per DISC style  (H)' },
        open ? 'Hide' : cur ? 'Other ways to ask' : 'How to ask it', h('span.caret', open ? '▴' : '▾')))];
    if (!open) return out;
    out.push(h('div.askpanel',
      h('div.askpanel-head', h('span.follow-k', 'Ask it their way'), h('span.muted.small', 'Click a style to set it for this buyer')),
      F.disc.styles.map((x) => h('button.askrow' + (style === x.k ? '.on' : ''), {
        onclick: () => app.act((ss) => { ss.setup.disc = ss.setup.disc === x.k ? '' : x.k; }),
        title: style === x.k ? 'Clear the buyer’s style' : `Set ${x.name} as the buyer’s style`,
      },
      h('span.ask-k', x.label),
      h('span.askrow-body', h('span.askrow-name', `${x.name} — ${x.cue.toLowerCase()}`), h('span.askrow-q', `“${ask[x.k]}”`)))),
      ui.coaching ? h('div.coach',
        h('div', h('div.follow-k', 'Why ask'), h('p', q.why)),
        q.listen && q.listen.length ? h('div', h('div.follow-k', 'Listen for'), h('ul', q.listen.map((x) => h('li', x)))) : null,
        q.probes && q.probes.length ? h('div', h('div.follow-k', 'Dig deeper'), h('ul', q.probes.map((x) => h('li', x)))) : null) : null));
    return out;
  }

  function questionBlock(qid, isNew) {
    const q = F.questionById[qid];
    const { s, d, ui } = app;
    const a = s.answers[qid];
    const answered = F.isAnswered(q, a);
    const stale = d.stale[qid];
    const locked = !d.eligible[qid];
    const pinned = ui.pinned === qid;
    const p = d.progress[q.module];
    const pos = !answered && p.eligible ? Math.min(p.answered + 1, p.eligible) : null;

    const out = [];
    out.push(h('div.eyebrow',
      h('span', MOD[q.module].label),
      pos ? h('span.muted', ` · ${pos} of ${p.eligible}`) : null,
      q.type === 'multi' ? h('span.muted', q.ranked ? ' · in priority order' : ' · pick all that apply') : null,
      q.mustAsk ? h('span.must', 'Must ask') : null,
      d.split[qid] ? h('span.key', { title: `This answer decides: ${d.split[qid]}` }, 'Key question') : null,
      pinned && answered && ui.held !== qid ? h('span.muted', ' · editing') : null));
    out.push(h('h1.qtitle', q.text));
    out.push(...howToAsk(q));

    if (q.type === 'single' || q.type === 'multi') {
      out.push(options(q, a));
    } else if (q.type === 'fields') {
      out.push(h('div.fields', q.fields.map((f) => h('label.lf',
        h('span', f.label.charAt(0).toUpperCase() + f.label.slice(1) + (f.unit ? ` (${f.unit})` : '')),
        h('input', {
          inputmode: 'numeric', value: (a && a.value && a.value[f.id]) || '', 'data-key': `f.${q.id}.${f.id}`,
          oninput: (e) => app.soft((x) => F.state.setField(x, q.id, f.id, e.target.value)),
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); app.done(q.id); } },
        })))));
    } else {
      out.push(h('textarea', {
        rows: 2, 'data-key': `t.${q.id}`, placeholder: 'Type their answer…',
        oninput: (e) => app.soft((x) => F.state.setText(x, q.id, e.target.value)),
        onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); app.done(q.id); } },
      }, (a && a.value) || ''));
    }

    out.push(...followUps(q, a || { pains: {} }));
    if (stale) out.push(h('p.notice.warn', 'This answer no longer applies because an earlier answer changed. It’s kept for reference but doesn’t count.'));
    else if (locked) out.push(h('p.notice', `Not in play yet — it appears when ${requirement(q) || 'its topic is opened'}. You can still record it.`));
    else if (d.aside[q.module] && !answered) out.push(h('p.notice', 'This topic is set aside — the customer isn’t interested in what it covers. You can still record an answer.'));

    // Actions: the main move on the left, capture links on the right.
    const main = [];
    if (q.type !== 'single') main.push(h('button.btn.primary', { onclick: () => app.done(q.id) }, F.hasValue(q, a) ? 'Done' : 'None of these'));
    else if (pinned && answered) main.push(h('button.btn.primary', { onclick: () => { ui.pinned = null; ui.active = null; ui.resetMain = true; app.render(); } }, 'Next question'));
    if (!answered) main.push(h('button.tbtn', { onclick: () => app.skip(q.id) }, 'Skip'));
    if (a && F.hasValue(q, a) && (pinned || stale)) main.push(h('button.tbtn.danger', { onclick: () => app.clear(q.id) }, 'Clear answer'));
    if (pinned && !answered) main.push(h('button.tbtn', { onclick: () => { ui.pinned = null; ui.active = null; app.render(); } }, 'Back to the flow'));

    const noteOpen = ui.openNote[qid] || (a && a.note);
    const quoteOpen = ui.openQuote[qid] || (a && a.quote);
    const links = [
      !noteOpen ? h('button.tbtn', { onclick: () => F.ui.openNote(qid) }, q.detail ? `+ ${q.detail}` : '+ Note') : null,
      !quoteOpen ? h('button.tbtn', { onclick: () => F.ui.openQuote(qid) }, '+ Quote') : null,
    ];
    out.push(h('div.qactions', h('div.qa-main', main), h('div.qa-links', links)));

    if (noteOpen) {
      out.push(h('label.lf.capture',
        h('span', q.detail || 'Note'),
        h('input', {
          placeholder: q.detail ? `${q.detail}…` : 'Anything worth remembering', value: (a && a.note) || '', 'data-key': `note.${q.id}`,
          oninput: (e) => app.soft((x) => F.state.setNote(x, q.id, e.target.value)),
          onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
        })));
    }
    if (quoteOpen) {
      out.push(h('label.lf.capture',
        h('span', 'In their words'),
        h('textarea.quote', {
          rows: 2, placeholder: 'Type exactly what they said', 'data-key': `quote.${q.id}`,
          oninput: (e) => app.soft((x) => F.state.setQuote(x, q.id, e.target.value)),
        }, (a && a.quote) || '')));
    }

    return h('section.question' + (isNew ? '.fade' : ''), { 'aria-label': q.text }, out);
  }

  function intro() {
    return h('div.intro',
      h('div',
        h('strong', 'How this works'),
        h('ol',
          h('li', 'Ask the question on screen and click what they say — or press its number.'),
          h('li', 'Fiv-o picks the next best question. The likely Nutanix pitch builds on the right.'),
          h('li', 'Click any topic above to review or change answers. Press Wrap up when you’re done.'))),
      h('button.tbtn', { onclick: () => { prefs.set('introSeen', true); app.render(); } }, 'Got it'));
  }

  function questionView() {
    const { s, d, ui } = app;
    const ids = cluster();
    const act = activeOf(ids);
    const isNew = act !== ui.prevActive;
    if (isNew && ui.prevActive !== null) ui.resetMain = true;
    ui.prevActive = act;

    const parts = [];
    if (!prefs.get('introSeen', false)) parts.push(intro());

    const last = s.lastAnswered && F.questionById[s.lastAnswered];
    const la = last && s.answers[last.id];
    if (last && la && F.hasValue(last, la) && last.id !== act) {
      parts.push(h('div.lastline',
        h('span.muted', 'Saved'), h('span', `${last.short}: ${F.answerText(last, la)}`),
        ui.undo ? h('button.tbtn', { onclick: app.undo, title: 'Undo  (B)' }, 'Undo') : null));
    }
    const call = s.calls[s.calls.length - 1];
    const minutes = call.startedAt ? (Date.now() - call.startedAt) / 60000 : 0;
    const decisionLeft = d.queue.filter((id) => F.questionById[id].module === 'decision' && F.questionById[id].mustAsk);
    if (minutes >= 20 && decisionLeft.length && ui.focusModule !== 'decision' && !ui.nudged) {
      parts.push(h('div.lastline.nudge',
        h('span', `${Math.floor(minutes)} minutes in — leave time for who signs, timing, and the next step.`),
        h('button.tbtn', { onclick: () => { ui.nudged = true; app.focusModule('decision'); } }, 'Ask them now'),
        h('button.tbtn', { onclick: () => { ui.nudged = true; app.render(); } }, 'Later')));
    }
    if (ui.focusModule) {
      const left = d.queue.some((id) => F.questionById[id].module === ui.focusModule);
      parts.push(h('div.lastline',
        h('span', left ? `Asking ${MOD[ui.focusModule].label} questions first` : `${MOD[ui.focusModule].label}: all asked`),
        h('button.tbtn', { onclick: () => app.focusModule(ui.focusModule) }, 'Back to normal order')));
    }

    if (!act) {
      parts.push(h('section.question.empty',
        h('div.eyebrow', 'All caught up'),
        h('h1.qtitle', 'Every question in play has an answer'),
        h('p.qwhy', 'Add a topic the customer raised, review the pitch, or wrap up the call.'),
        h('div.qactions', h('div.qa-main',
          h('button.btn.primary', { onclick: () => app.go('wrap') }, 'Wrap up'),
          lockedTopics().length ? h('button.btn', { onclick: () => { ui.addTopic = true; app.render(); } }, 'Add a topic') : null))));
      return parts;
    }

    parts.push(questionBlock(act, isNew));
    const next = ids.filter((id) => id !== act);
    if (next.length) {
      parts.push(h('section.upnext',
        h('div.eyebrow', 'Up next'),
        next.map((id) => h('button.next-row', { onclick: () => { ui.active = id; app.render(); }, title: 'Ask this one now' },
          h('span', F.questionById[id].text),
          h('span.muted', MOD[F.questionById[id].module].label)))));
    }
    return parts;
  }

  // ── topic review (click a step) ──
  function topicView(mid) {
    const { s, d } = app;
    const p = d.progress[mid];
    const qs = F.questions.filter((q) => q.module === mid && (d.eligible[q.id] || d.stale[q.id] || F.hasValue(q, s.answers[q.id])));
    return [h('section.question.topic',
      h('div.eyebrow', 'Topic review'),
      h('h1.qtitle', MOD[mid].label),
      h('p.qwhy', d.aside[mid]
        ? 'Set aside — the customer isn’t interested in what this topic covers. Its questions are out of the flow; undo that in the pitch panel.'
        : `${p.answered} of ${p.eligible} answered. Click a question to ask it or change the answer.`),
      h('div.rows', qs.map((q) => {
        const a = s.answers[q.id];
        const st = d.stale[q.id] ? 'stale' : F.isAnswered(q, a) ? 'done' : a && a.skipped ? 'skipped' : 'open';
        const txt = {
          done: () => F.answerText(q, a),
          stale: () => `${F.answerText(q, a)} — no longer applies`,
          skipped: () => 'Skipped',
          open: () => 'Not asked yet',
        }[st]();
        return h('button.row.' + st, { onclick: () => app.pin(q.id) },
          h('span.row-q', q.text, q.mustAsk && st === 'open' ? h('span.must', 'Must ask') : null),
          h('span.row-a', txt));
      })),
      h('div.qactions', h('div.qa-main',
        p.answered < p.eligible && !d.aside[mid] ? h('button.btn.primary', { onclick: () => app.focusModule(mid) }, 'Ask the rest of this topic now') : null,
        h('button.tbtn', { onclick: () => F.ui.openTopic(mid) }, 'Back to the call'))))];
  }

  function mobileTabs() {
    const tab = (id, label) => h('button' + (app.ui.mtab === id ? '.on' : ''), { onclick: () => { app.ui.mtab = id; app.render(); } }, label);
    return h('nav.mtabs', tab('q', 'Question'), tab('pitch', 'Pitch'));
  }

  F.screens.interview = function () {
    return h('div.interview', { 'data-mtab': app.ui.mtab },
      header(),
      stepper(),
      h('div.cols',
        h('main.main', { 'data-scroll': 'main' }, h('div.main-in', app.ui.topic ? topicView(app.ui.topic) : questionView())),
        h('aside.side', { 'data-scroll': 'side', 'aria-label': 'Likely pitch' }, F.ui.radar())),
      mobileTabs());
  };

  // ── add a topic the customer raised ──
  F.screens.addTopic = function () {
    const close = () => { app.ui.addTopic = false; app.render(); };
    return h('div.overlay', { onclick: close },
      h('div.modal', { onclick: (e) => e.stopPropagation(), role: 'dialog', 'aria-label': 'Add a topic' },
        h('h2', 'Add a topic the customer raised'),
        h('p.muted', 'Its questions join the flow, and it’s added to “why now” as a lower priority.'),
        h('div.rows', lockedTopics().map((m) => h('button.row', { onclick: () => app.unlockModule(m.id) },
          h('span.row-q', m.label), h('span.row-a', m.desc)))),
        h('div.modal-foot', h('button.tbtn', { onclick: close }, 'Cancel'))));
  };

  // ── search ──
  function statusOf(q) {
    const { d, s } = app;
    const a = s.answers[q.id];
    if (d.stale[q.id]) return 'no longer applies';
    if (F.isAnswered(q, a)) return 'answered';
    if (a && a.skipped) return 'skipped';
    if (!d.eligible[q.id]) return 'not in play yet';
    return 'open';
  }
  function searchResults() {
    const words = (app.ui.search || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const rank = { open: 0, 'no longer applies': 1, skipped: 1, answered: 2, 'not in play yet': 3 };
    return F.questions.filter((q) => {
      const hay = `${q.text} ${q.short} ${MOD[q.module].label} ${(q.options || []).map((o) => o.label).join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }).map((q, i) => ({ q, i, r: words.length ? rank[statusOf(q)] : 0 }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .slice(0, 12)
      .map((x) => x.q);
  }
  F.ui.searchPick = function (q) {
    if (!q) return;
    const modOpen = F.router.cond(MOD[q.module].when, app.s, app.d.valid);
    if (!modOpen && Object.values(F.meta.triggerModule).includes(q.module)) app.unlockModule(q.module);
    app.pin(q.id);
  };
  F.ui.openSearch = function () {
    app.ui.search = '';
    app.ui.searchIdx = 0;
    app.render();
    const el = document.querySelector('[data-key="search"]');
    if (el) el.focus();
  };
  F.screens.search = function () {
    const results = searchResults();
    const idx = Math.max(0, Math.min(app.ui.searchIdx, results.length - 1));
    const close = () => { app.ui.search = null; app.render(); };
    return h('div.overlay', { onclick: close },
      h('div.palette', { onclick: (e) => e.stopPropagation(), role: 'dialog', 'aria-label': 'Search questions' },
        h('input.pal-input', {
          'data-key': 'search', value: app.ui.search, placeholder: 'Find a question — e.g. backup, NSX, GPU, budget',
          oninput: (e) => { app.ui.search = e.target.value; app.ui.searchIdx = 0; app.render(); },
          onkeydown: (e) => {
            e.stopPropagation();
            if (e.key === 'ArrowDown') { e.preventDefault(); app.ui.searchIdx = Math.min(idx + 1, results.length - 1); app.render(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); app.ui.searchIdx = Math.max(idx - 1, 0); app.render(); }
            else if (e.key === 'Enter') { e.preventDefault(); F.ui.searchPick(results[idx]); }
            else if (e.key === 'Escape') { e.preventDefault(); close(); }
          },
        }),
        h('div.pal-list', results.length ? results.map((q, i) => h('button.pal-item' + (i === idx ? '.sel' : ''), {
          onclick: () => F.ui.searchPick(q), onmouseenter: () => { app.ui.searchIdx = i; },
        },
        h('span.pal-text', q.text),
        h('span.pal-meta', `${MOD[q.module].label} · ${statusOf(q)}`))) : h('p.muted.pad', 'No matching questions.')),
        h('div.pal-foot', '↑ ↓ to move · Enter to open · Esc to close · topics not in play open automatically')));
  };

  // ── help & settings ──
  F.screens.help = function () {
    const rows = [
      ['1 – 9, 0', 'Answer the question'], ['Enter', 'Done (multi-select) or next question'], ['↑  ↓', 'Switch to an “up next” question'],
      ['S', 'Skip'], ['B', 'Undo the last answer'], ['H', 'How to ask it (DISC)'], ['N', 'Add a note'], ['Q', 'Capture a quote'],
      ['/', 'Search every question'], ['P', 'Open the pitch card'], ['L', 'Switch the side panel to License'], ['C', 'Coaching on / off'],
      ['W', 'Wrap up'], ['Esc', 'Close panels · hide the screen'], ['?', 'This panel'],
    ];
    const close = () => { app.ui.help = false; app.render(); };
    return h('div.overlay', { onclick: close },
      h('div.modal', { onclick: (e) => e.stopPropagation(), role: 'dialog', 'aria-label': 'Help' },
        h('h2', 'Shortcuts'),
        h('table.keys', rows.map(([k, v]) => h('tr', h('td.mono', k), h('td', v)))),
        h('h2.mt', 'Settings'),
        h('label.check', h('input', { type: 'checkbox', checked: app.ui.coaching, onchange: (e) => app.setPref('coaching', e.target.checked) }),
          h('span', 'Coaching — show why each question matters, tips, and listening cues')),
        h('div.modal-foot',
          h('button.tbtn', { onclick: () => { prefs.set('introSeen', false); close(); } }, 'Show the intro again'),
          h('button.tbtn', { onclick: () => F.ui.toggleTheme() }, 'Light / dark'),
          h('button.btn.primary', { onclick: close }, 'Close'))));
  };

  F.screens.blur = function () {
    return h('div.blur', { onclick: () => { app.ui.blur = false; app.render(); } },
      h('div.blur-msg', h('strong', 'Screen hidden'), h('span', 'Press Esc or click to show')));
  };
})(globalThis.Fivo = globalThis.Fivo || {});
