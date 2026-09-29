/* Fiv-o UI: the live-call screen — header, path map, question cluster, search, overlays. */
(function (F) {
  'use strict';

  const { h } = F.dom;
  const app = F.app;
  const MOD = Object.fromEntries(F.meta.modules.map((m) => [m.id, m]));
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  F.ui = F.ui || {};

  // Current question + next two. A pinned question (from search / path map) goes first.
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
  F.ui.activeId = () => activeOf(cluster());

  // Human-readable "appears when…" for a locked question.
  function requirement(q) {
    const terms = [];
    [MOD[q.module].when, q.when].forEach((c) => (c && c.any ? c.any : []).forEach((t) => {
      const [qid, opt] = t.split(':');
      const src = F.questionById[qid];
      const o = src && (src.options || []).find((x) => x.id === opt);
      terms.push(`${src ? src.short : qid} = ${o ? o.label : opt}`);
    }));
    return terms.join(' or ');
  }

  // Answering a pain, flagged, or coached option keeps the card open so you see the follow-up.
  F.ui.shouldHold = function (q, optId) {
    const o = (q.options || []).find((x) => x.id === optId);
    return !!(o && (o.pain || o.flag || (o.tip && app.ui.coaching)));
  };

  // ── header ──
  function header() {
    const s = app.s;
    const d = app.d;
    const mustLeft = d.mustLeft;
    return h('header.ibar',
      h('div.ibar-left',
        h('button.logo-btn', { onclick: () => app.go('home'), title: 'Home' }, 'Fiv-o'),
        h('span.ibar-acct', s.setup.account || 'Account'),
        h('span.pill', `Call ${s.calls.length}`),
        h('span.pill.mono', { id: 'timer', title: 'Time on this call' }, '0:00'),
        h('span.pill' + (mustLeft ? '.warn' : '.good'), { title: 'Must-ask questions still open for the topics in play' },
          mustLeft ? `${mustLeft} must-ask${mustLeft > 1 ? 's' : ''} left` : 'Must-asks covered')),
      h('div.ibar-right',
        h('button.btn.ghost', { onclick: F.ui.openSearch, title: 'Search questions (/)' }, 'Search', h('kbd', '/')),
        h('button.btn.ghost' + (app.ui.coaching ? '.on' : ''), { onclick: () => app.setPref('coaching', !app.ui.coaching), title: 'Coaching hints (C)', 'aria-pressed': app.ui.coaching ? 'true' : 'false' }, 'Coaching'),
        h('button.btn.ghost', { onclick: () => { app.ui.blur = true; app.render(); }, title: 'Privacy blur (Esc)' }, 'Blur'),
        h('button.btn.ghost', { onclick: () => { app.ui.help = true; app.render(); }, title: 'Keyboard shortcuts (?)' }, '?'),
        h('button.btn.ghost', { onclick: () => F.ui.toggleTheme(), title: 'Light / dark' }, '◐'),
        h('button.btn.primary', { onclick: () => app.go('wrap'), title: 'Wrap up (W)' }, 'Wrap up →')));
  }

  // ── left: path map ──
  function pathMap() {
    const { d, s, ui } = app;
    const firstMod = d.queue[0] ? F.questionById[d.queue[0]].module : null;
    const mods = d.modules.map((mid) => {
      const m = MOD[mid];
      const p = d.progress[mid];
      const qs = F.questions.filter((q) => q.module === mid && (d.valid[q.id] || d.stale[q.id] || (s.answers[q.id] && s.answers[q.id].skipped)));
      const state = p.eligible && p.answered === p.eligible ? 'done' : p.answered ? 'partial' : 'todo';
      const isFocus = ui.focusModule === mid;
      const isCurrent = !ui.focusModule && firstMod === mid;
      const fresh = ui.unlocked[mid] && Date.now() - ui.unlocked[mid] < 90000;
      return h(`div.pm-mod.${state}` + (isFocus ? '.focus' : '') + (isCurrent ? '.current' : ''),
        h('button.pm-head', { onclick: () => app.focusModule(mid), title: isFocus ? 'Clear focus' : 'Focus this topic — its questions come first' },
          h('span.pm-icon', m.icon),
          h('span.pm-label', m.label),
          fresh ? h('span.pill.accent.tiny', 'new') : null,
          h('span.pm-count', `${p.answered}/${p.eligible}`)),
        qs.length ? h('div.pm-answers', qs.map((q) => {
          const a = s.answers[q.id];
          const stale = d.stale[q.id];
          const skipped = a.skipped && !F.hasValue(q, a);
          return h('button.pm-ans' + (stale ? '.stale' : '') + (skipped ? '.skipped' : '') + (ui.pinned === q.id ? '.pinned' : ''), {
            onclick: () => app.pin(q.id),
            title: stale ? 'No longer applies — an earlier answer changed. Click to review.' : 'Click to edit',
          },
          h('span.pm-q', q.short),
          h('span.pm-a', stale ? '⚠ ' : '', skipped ? 'skipped' : F.answerText(q, a)));
        })) : null);
    });

    const locked = F.meta.modules.filter((m) => !d.modules.includes(m.id) && Object.values(F.meta.triggerModule).includes(m.id));
    const more = locked.length ? h('details.pm-more', { open: ui.moreOpen ? true : null, ontoggle: (e) => { ui.moreOpen = e.target.open; } },
      h('summary', `Customer raised another topic? (${locked.length})`),
      locked.map((m) => h('button.pm-lock', { onclick: () => app.unlockModule(m.id), title: 'Adds it to “why now” and opens its questions' },
        h('span.pm-icon', m.icon), h('span.pm-label', m.label), h('span.pm-add', '+ add')))) : null;

    const mp = d.mp;
    const meter = h('div.mp',
      h('div.mp-title', h('span', 'MEDDPICC'), h('span.muted', `${mp.total}/${mp.max}`)),
      h('div.mp-grid', mp.letters.map((l) => h(`div.mp-cell.l${l.level}`, { title: `${l.label}: ${l.items.length ? l.items.join('; ') : 'gap'}` }, l.k))));

    return h('nav.pathmap', { 'aria-label': 'Discovery path' }, h('div.col-title', 'Path'), mods, more, meter);
  }

  // ── center: question cards ──
  function options(q, a, isActive) {
    const sel = F.selected(q, a);
    return h('div.opts' + (q.options.length > 6 ? '.many' : ''), q.options.map((o, i) => {
      const on = sel.includes(o.id);
      const rank = q.ranked && on ? sel.indexOf(o.id) + 1 : null;
      return h('button.opt' + (on ? '.on' : ''), {
        'aria-pressed': on ? 'true' : 'false',
        onclick: (e) => { e.stopPropagation(); F.ui.pick(q.id, o.id); },
      },
      isActive && i < KEYS.length ? h('kbd', KEYS[i]) : null,
      h('span.opt-label', o.label),
      rank ? h('span.rank', `#${rank}`) : null,
      o.pain && isActive ? h('span.pain-dot', { title: 'Pain signal — you’ll be asked for impact and metric' }) : null);
    }));
  }

  F.ui.pick = function (qid, optId) {
    const q = F.questionById[qid];
    app.choose(qid, optId, q.type === 'single' && F.ui.shouldHold(q, optId));
  };

  function card(qid, isActive, isNew, idx) {
    const q = F.questionById[qid];
    const { s, d, ui } = app;
    const a = s.answers[qid];
    const sel = F.selected(q, a);
    const answered = F.isAnswered(q, a);
    const stale = d.stale[qid];
    const locked = !d.eligible[qid];
    const pinned = ui.pinned === qid;

    const head = h('div.qhead',
      h('span.qmod', `${MOD[q.module].icon} ${MOD[q.module].label}`),
      q.mustAsk ? h('span.pill.tiny', 'must-ask') : null,
      d.split[qid] ? h('span.pill.accent.tiny', { title: 'Answering this separates the leading options' }, `⚡ Splits ${d.split[qid]}`) : null,
      pinned && answered ? h('span.pill.tiny', 'editing') : null,
      !isActive ? h('span.qnext', idx === 1 ? 'up next' : 'queued') : null);

    const body = [];
    if (q.type === 'single' || q.type === 'multi') body.push(options(q, a, isActive));
    if (q.type === 'multi' && q.ranked && isActive) body.push(h('p.hint', 'Click in priority order — the first pick weighs most and sets the topic order.'));
    if (q.type === 'fields') {
      body.push(h('div.fields', q.fields.map((f) => h('label.mini',
        h('span', f.label.charAt(0).toUpperCase() + f.label.slice(1) + (f.unit ? ` (${f.unit})` : '')),
        h('input', {
          inputmode: 'numeric', value: (a && a.value && a.value[f.id]) || '', 'data-key': `f.${q.id}.${f.id}`,
          oninput: (e) => app.soft((x) => F.state.setField(x, q.id, f.id, e.target.value)),
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); app.done(q.id); } },
        })))));
    }
    if (q.type === 'text') {
      body.push(h('textarea.qtextarea', {
        rows: 2, 'data-key': `t.${q.id}`, placeholder: 'Type their answer…',
        oninput: (e) => app.soft((x) => F.state.setText(x, q.id, e.target.value)),
        onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); app.done(q.id); } },
      }, (a && a.value) || ''));
    }

    if (isActive) {
      // Coaching responses and landmines for what they just said.
      const selOpts = sel.map((id) => q.options.find((o) => o.id === id)).filter(Boolean);
      selOpts.filter((o) => o.flag).forEach((o) => body.push(h('div.flagline', h('span.tip-k.bad', 'Risk'), o.flag)));
      if (ui.coaching) selOpts.filter((o) => o.tip).forEach((o) => body.push(h('div.tip', h('span.tip-k', 'Coach'), o.tip)));

      // Pain chain: impact + metric for each selected pain.
      selOpts.filter((o) => o.pain).forEach((o) => {
        const p = (a.pains && a.pains[o.id]) || {};
        body.push(h('div.painchain',
          h('div.pc-title', h('span.tip-k.warn', 'Pain'), o.painLabel || `${q.short}: ${o.label}`),
          h('div.pc-row',
            h('input', { placeholder: 'Impact — time, money, or risk?', value: p.impact || '', 'data-key': `pi.${q.id}.${o.id}`, oninput: (e) => app.soft((x) => F.state.setPain(x, q.id, o.id, 'impact', e.target.value)) }),
            h('input', { placeholder: 'Metric — e.g., +$180k/yr, 12 hrs/month', value: p.metric || '', 'data-key': `pm.${q.id}.${o.id}`, oninput: (e) => app.soft((x) => F.state.setPain(x, q.id, o.id, 'metric', e.target.value)) })),
          ui.coaching ? h('p.hint', 'Ask: “What does that cost you?” then “How would you measure it getting better?”') : null));
      });

      if (stale) body.push(h('div.notice.warn', 'This answer no longer applies because an earlier answer changed. It’s kept for reference but no longer scored.'));
      else if (locked) body.push(h('div.notice', `Not in play yet — appears when ${requirement(q) || 'its topic is opened'}. You can still capture it.`));

      const quoteOpen = ui.openQuote[qid] || (a && a.quote);
      body.push(h('div.qnotes',
        h('input.note', {
          placeholder: q.detail ? `${q.detail}  (N)` : 'Note  (N)', value: (a && a.note) || '', 'data-key': `note.${q.id}`,
          oninput: (e) => app.soft((x) => F.state.setNote(x, q.id, e.target.value)),
          onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
        }),
        quoteOpen
          ? h('textarea.quote', {
            rows: 2, placeholder: 'Their exact words…', 'data-key': `quote.${q.id}`,
            oninput: (e) => app.soft((x) => F.state.setQuote(x, q.id, e.target.value)),
          }, (a && a.quote) || '')
          : h('button.btn.ghost.sm', { onclick: () => F.ui.openQuote(q.id) }, '❝ Capture quote', h('kbd', 'Q'))));

      if (ui.coaching) {
        body.push(h('div.coach',
          h('div.coach-col', h('div.coach-k', 'Why ask'), h('p', q.why)),
          q.listen && q.listen.length ? h('div.coach-col', h('div.coach-k', 'Listen for'), h('ul', q.listen.map((x) => h('li', x)))) : null,
          q.probes && q.probes.length ? h('div.coach-col', h('div.coach-k', 'Dig deeper'), h('ul', q.probes.map((x) => h('li', x)))) : null));
      }

      const actions = [];
      if (q.type !== 'single') actions.push(h('button.btn.primary', { onclick: () => app.done(q.id) }, F.hasValue(q, a) ? 'Done' : 'None / skip', h('kbd', '⏎')));
      else if (pinned && answered) actions.push(h('button.btn.primary', { onclick: () => { app.ui.pinned = null; app.ui.active = null; app.render(); } }, 'Next', h('kbd', '⏎')));
      if (!answered) actions.push(h('button.btn.ghost', { onclick: () => app.skip(q.id) }, 'Skip', h('kbd', 'S')));
      if (a && F.hasValue(q, a)) actions.push(h('button.btn.ghost.danger', { onclick: () => app.clear(q.id) }, 'Clear answer'));
      if (pinned && !answered) actions.push(h('button.btn.ghost', { onclick: () => { app.ui.pinned = null; app.ui.active = null; app.render(); } }, 'Unpin'));
      body.push(h('div.qactions', actions));
    }

    return h('section.qcard' + (isActive ? '.active' : '.compact') + (isNew ? '.enter' : '') + (stale ? '.stale' : ''), {
      onclick: isActive ? null : () => { app.ui.active = qid; app.render(); },
      'aria-label': q.text,
    }, head, h('h2.qtext', q.text), body);
  }

  function center() {
    const ids = cluster();
    const act = activeOf(ids);
    const prev = app.ui.prevCluster || [];
    app.ui.prevCluster = ids.slice();
    const { s, ui } = app;
    const parts = [];

    const last = s.lastAnswered && F.questionById[s.lastAnswered];
    const la = last && s.answers[last.id];
    if (last && la && F.hasValue(last, la)) {
      parts.push(h('div.just',
        h('span.just-ok', '✓'), h('span.muted', `${last.short}:`), h('span', F.answerText(last, la)),
        ui.undo ? h('button.link', { onclick: app.undo }, 'Undo', h('kbd', 'B')) : null));
    }
    if (ui.focusModule) {
      const left = app.d.queue.some((id) => F.questionById[id].module === ui.focusModule);
      parts.push(h('div.focusbar',
        h('span', `Focused on ${MOD[ui.focusModule].label}`, left ? '' : ' — all answered'),
        h('button.link', { onclick: () => app.focusModule(ui.focusModule) }, 'Clear focus')));
    }
    if (!ids.length) {
      parts.push(h('section.qcard.empty',
        h('h2.qtext', 'Every question in play is answered'),
        h('p.muted', 'Open the pitch card, add a topic the customer raised from the left, or wrap up.'),
        h('div.qactions',
          app.d.primary && app.d.primary.score > 0 ? h('button.btn', { onclick: () => F.ui.openDrawer(app.d.primary.id) }, 'Open pitch card') : null,
          h('button.btn.primary', { onclick: () => app.go('wrap') }, 'Wrap up →'))));
    }
    ids.forEach((id, i) => parts.push(card(id, id === act, !prev.includes(id), i)));
    return h('main.center', { 'data-scroll': 'center' }, parts);
  }

  function mobileTabs() {
    const tab = (id, label) => h('button' + (app.ui.mtab === id ? '.on' : ''), { onclick: () => { app.ui.mtab = id; app.render(); } }, label);
    return h('nav.mtabs', tab('path', 'Path'), tab('q', 'Questions'), tab('pitch', 'Pitch'));
  }

  F.screens.interview = function () {
    return h('div.interview', { 'data-mtab': app.ui.mtab },
      header(),
      h('div.cols',
        h('aside.left', { 'data-scroll': 'left' }, pathMap()),
        center(),
        h('aside.right', { 'data-scroll': 'right' }, F.ui.radar())),
      mobileTabs());
  };

  F.ui.openQuote = function (qid) {
    app.ui.openQuote[qid] = true;
    app.render();
    const el = document.querySelector(`[data-key="quote.${CSS.escape(qid)}"]`);
    if (el) el.focus();
  };
  F.ui.focusNote = function (qid) {
    const el = document.querySelector(`[data-key="note.${CSS.escape(qid)}"]`);
    if (el) el.focus();
  };

  // ── search palette ──
  function statusOf(q) {
    const { d, s } = app;
    const a = s.answers[q.id];
    if (d.stale[q.id]) return ['stale', 'warn'];
    if (F.isAnswered(q, a)) return ['answered', 'good'];
    if (a && a.skipped) return ['skipped', ''];
    if (!d.eligible[q.id]) return ['locked', ''];
    return ['open', 'accent'];
  }
  function searchResults() {
    const t = (app.ui.search || '').trim().toLowerCase();
    const words = t.split(/\s+/).filter(Boolean);
    const rank = { open: 0, stale: 1, skipped: 1, answered: 2, locked: 3 };
    return F.questions.filter((q) => {
      const hay = `${q.text} ${q.short} ${MOD[q.module].label} ${(q.options || []).map((o) => o.label).join(' ')}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    }).map((q, i) => ({ q, i, r: words.length ? rank[statusOf(q)[0]] : 0 }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .slice(0, 14)
      .map((x) => x.q);
  }
  F.ui.searchPick = function (q) {
    if (!q) return;
    const modOpen = F.router.cond(MOD[q.module].when, app.s, app.d.valid);
    if (!modOpen && Object.values(F.meta.triggerModule).includes(q.module)) {
      app.unlockModule(q.module);
    }
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
          'data-key': 'search', value: app.ui.search, placeholder: 'Jump to any question — e.g., “backup”, “NSX”, “GPU”',
          oninput: (e) => { app.ui.search = e.target.value; app.ui.searchIdx = 0; app.render(); },
          onkeydown: (e) => {
            e.stopPropagation();
            if (e.key === 'ArrowDown') { e.preventDefault(); app.ui.searchIdx = Math.min(idx + 1, results.length - 1); app.render(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); app.ui.searchIdx = Math.max(idx - 1, 0); app.render(); }
            else if (e.key === 'Enter') { e.preventDefault(); F.ui.searchPick(results[idx]); }
            else if (e.key === 'Escape') { e.preventDefault(); close(); }
          },
        }),
        h('div.pal-list', results.length ? results.map((q, i) => {
          const [st, cls] = statusOf(q);
          return h('button.pal-item' + (i === idx ? '.sel' : ''), { onclick: () => F.ui.searchPick(q), onmouseenter: () => { app.ui.searchIdx = i; } },
            h('span.pal-mod', MOD[q.module].icon),
            h('span.pal-text', h('span', q.text), h('span.pal-sub', MOD[q.module].label)),
            h('span.pill.tiny' + (cls ? '.' + cls : ''), st));
        }) : h('p.muted.pad', 'No matching questions.')),
        h('div.pal-foot', h('span', h('kbd', '↑'), h('kbd', '↓'), ' move'), h('span', h('kbd', '⏎'), ' open'), h('span', h('kbd', 'Esc'), ' close'), h('span.muted', 'Locked topics open automatically'))));
  };

  // ── overlays ──
  F.screens.help = function () {
    const rows = [
      ['1–9, 0', 'Answer the active question'], ['⏎', 'Done (multi-select) / next'], ['↑ ↓', 'Move between the on-screen questions'],
      ['S', 'Skip'], ['B', 'Undo last answer'], ['N', 'Focus the note field'], ['Q', 'Capture a verbatim quote'],
      ['/', 'Search every question'], ['P', 'Open the leading pitch card'], ['C', 'Toggle coaching hints'],
      ['W', 'Wrap up'], ['Esc', 'Privacy blur on/off · close panels'], ['?', 'This help'],
    ];
    const close = () => { app.ui.help = false; app.render(); };
    return h('div.overlay', { onclick: close },
      h('div.modal', { onclick: (e) => e.stopPropagation() },
        h('h2', 'Keyboard shortcuts'),
        h('table.keys', rows.map(([k, v]) => h('tr', h('td', h('kbd', k)), h('td', v)))),
        h('div.row.end', h('button.btn.primary', { onclick: close }, 'Got it'))));
  };

  F.screens.blur = function () {
    return h('div.blur', { onclick: () => { app.ui.blur = false; app.render(); } },
      h('div.blur-msg', h('strong', 'Hidden'), h('span', 'Press Esc or click to show')));
  };
})(globalThis.Fivo = globalThis.Fivo || {});
