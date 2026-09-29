/* Fiv-o UI: home (sessions), call setup, and the second-call recap. */
(function (F) {
  'use strict';

  const { h, toast, download, slug, pct, ago, prefs } = F.dom;
  const app = F.app;

  function importButton() {
    const input = h('input', {
      type: 'file', accept: '.json,application/json', class: 'hidden',
      onchange: async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const s = F.state.importJSON(await file.text());
          if (F.state.get(s.id) && !confirm(`Replace the saved copy of “${s.setup.account || 'this session'}” with the imported file?`)) return;
          F.state.save(s);
          toast(`Imported ${s.setup.account || 'session'}`, 'good');
          app.render();
        } catch (err) {
          toast(`Import failed: ${err.message}`, 'bad');
        }
      },
    });
    return h('label.btn', input, 'Import session (.json)');
  }

  function newSession() {
    app.open(F.state.newSession({ se: prefs.get('se', '') }), 'setup');
  }

  F.screens.home = function () {
    const sessions = F.state.list();
    const rows = sessions.map((s) => {
      F.state.migrate(s);
      const d = F.router.evaluate(s);
      const top = d.primary && d.primary.score > 0 ? d.primary : null;
      return h('div.srow',
        h('div.srow-main',
          h('div.srow-title', s.setup.account || 'Untitled account'),
          h('div.srow-sub',
            `Call ${s.calls.length} · ${s.calls[s.calls.length - 1].date} · updated ${ago(s.updatedAt)}`,
            top ? h('span.pill.accent', `${top.play.short}${top.variant ? ' → ' + top.variant.name : ''} · ${pct(top.conf)}`) : null)),
        h('div.srow-actions',
          h('button.btn.primary', { onclick: () => app.open(F.state.get(s.id), 'interview') }, 'Continue'),
          h('button.btn', {
            title: 'Start the next call with a recap of what you learned',
            onclick: () => { const x = F.state.startNextCall(F.state.get(s.id)); F.state.save(x); app.open(x, 'recap'); },
          }, `Start call ${s.calls.length + 1}`),
          h('button.btn.ghost', { onclick: () => download(`fivo-${slug(s.setup.account)}.json`, F.state.exportJSON(s), 'application/json') }, 'Export'),
          h('button.btn.ghost.danger', {
            onclick: () => { if (confirm(`Delete “${s.setup.account || 'this session'}” from this browser? Export it first if you want a copy.`)) { F.state.remove(s.id); app.render(); } },
          }, 'Delete')));
    });

    return h('div.page.home',
      h('header.hero',
        h('div.brand', h('span.logo', 'Fiv-o'), h('span.brand-tag', 'Discovery Navigator'),
          h('button.btn.ghost.sm', { onclick: () => F.ui.toggleTheme(), title: 'Light / dark', style: { marginLeft: 'auto' } }, '◐ Theme')),
        h('p.lede', 'Run discovery on a live call: it suggests the next question to ask, narrows to a Nutanix pitch as you go, and gives you CRM-ready notes at the end.'),
        h('div.row',
          h('button.btn.primary.lg', { onclick: newSession }, 'Start new discovery'),
          importButton())),
      h('section.panel',
        h('h2', 'Saved sessions'),
        rows.length ? h('div.slist', rows) : h('p.muted', 'Nothing saved yet. Sessions autosave in this browser; export a .json to move one to another machine.')),
      h('section.how',
        [
          ['1', 'Set up in 30 seconds', 'Account, who’s on the call, partner. Attendee roles tailor the talk tracks.'],
          ['2', 'Ask, click, listen', 'Three questions on screen. Each answer reorders what comes next and updates the Pitch Radar.'],
          ['3', 'Wrap up', 'Confirm the play, fill MEDDPICC gaps, and copy notes into Salesforce.'],
        ].map(([n, t, p]) => h('div.how-step', h('span.how-n', n), h('div', h('strong', t), h('p', p))))),
      h('footer.foot',
        h('p', `Pitch content comes from public Nutanix sources as of ${F.CONTENT_DATE || 'Sept 2026'}. Check proof points marked “verify” against internal enablement before quoting them.`),
        h('p', 'Everything stays in this browser. Nothing is sent anywhere. Press ? on any screen for keyboard shortcuts.')));
  };

  F.screens.newSession = newSession;

  F.screens.setup = function () {
    const su = app.s.setup;
    const input = (label, key, attrs) => h('label.field',
      h('span.field-label', label),
      h('input', Object.assign({ value: su[key] || '', 'data-key': `setup.${key}`, oninput: (e) => app.soft((s) => { s.setup[key] = e.target.value; }) }, attrs || {})));
    const select = (label, key, options) => h('label.field',
      h('span.field-label', label),
      h('select', { onchange: (e) => app.act((s) => { s.setup[key] = e.target.value; }) },
        h('option', { value: '' }, '—'),
        options.map((o) => h('option', { value: o, selected: su[key] === o ? 'selected' : null }, o))));

    const start = () => {
      if (!su.account.trim()) { toast('Add the account name first', 'warn'); document.querySelector('[data-key="setup.account"]').focus(); return; }
      prefs.set('se', su.se || '');
      app.go('interview');
    };

    return h('div.page.setup',
      h('div.topbar', h('button.btn.ghost', { onclick: () => app.go('home') }, '← Home'), h('span.muted', `Call ${app.s.calls.length} setup`)),
      h('section.panel',
        h('h1', 'Who are we talking to?'),
        h('div.form-grid',
          input('Account *', 'account', { placeholder: 'Acme Corp', autofocus: true }),
          input('Opportunity', 'opp', { placeholder: 'Optional' }),
          input('Your name (SE)', 'se', {}),
          input('Partner / VAR', 'partner', { placeholder: 'e.g., CDW, SHI, WWT' }),
          select('Industry', 'industry', F.meta.industries),
          select('Segment', 'segment', F.meta.segments)),
        h('div.field',
          h('span.field-label', 'Who’s on the call? (tailors the talk tracks)'),
          h('div.chips', F.meta.personas.map((p) => {
            const on = su.attendees.includes(p.id);
            return h('button.chip' + (on ? '.on' : ''), {
              'aria-pressed': on ? 'true' : 'false',
              onclick: () => app.act((s) => {
                const i = s.setup.attendees.indexOf(p.id);
                if (i >= 0) s.setup.attendees.splice(i, 1); else s.setup.attendees.push(p.id);
              }),
            }, p.label);
          }))),
        h('label.field',
          h('span.field-label', 'Names & titles (optional)'),
          h('textarea', { rows: 2, 'data-key': 'setup.contacts', placeholder: 'Jane Smith – IT Director; Raj – Sysadmin', oninput: (e) => app.soft((s) => { s.setup.contacts = e.target.value; }) }, su.contacts || '')),
        h('div.row.end', h('button.btn.primary.lg', { onclick: start }, 'Start the call →'))));
  };

  F.screens.recap = function () {
    const s = app.s;
    const d = app.d;
    const n = s.calls.length;
    const plays = d.scores.list.filter((r) => r.score > 0).slice(0, 3);
    const confirmed = s.recap.confirmed || (s.recap.confirmed = {});
    return h('div.page.recap',
      h('div.topbar', h('button.btn.ghost', { onclick: () => app.go('home') }, '← Home'), h('span.muted', `${s.setup.account} · recap before call ${n}`)),
      h('section.panel',
        h('h1', `Recap & confirm — call ${n}`),
        h('p.muted', 'Open with what you heard last time. Confirming pains out loud builds trust and catches anything that has changed.'),
        h('div.recap-grid',
          h('div',
            h('h3', 'Where we landed'),
            plays.length ? plays.map((r) => h('div.recap-play',
              h('strong', r.play.name), r.variant ? h('span.muted', ` → ${r.variant.name}`) : null, h('span.pill', pct(r.conf)))) : h('p.muted', 'No play yet.'),
            h('h3', 'Agreed next step last time'),
            h('p', s.recap.prevNextStep || h('span.muted', 'None recorded')),
            s.recap.prevNextSteps ? h('pre.small', s.recap.prevNextSteps) : null,
            d.quotes.length ? [h('h3', 'In their words'), d.quotes.map((x) => h('blockquote', `“${x.text}”`))] : null),
          h('div',
            h('h3', 'Pains to confirm'),
            d.pains.length ? d.pains.map((p) => {
              const k = `${p.qid}:${p.opt}`;
              return h('label.check',
                h('input', { type: 'checkbox', checked: !!confirmed[k], onchange: (e) => app.act((x) => { x.recap.confirmed[k] = e.target.checked; }) }),
                h('span', p.label, p.impact ? h('span.muted', ` — ${p.impact}`) : null));
            }) : h('p.muted', 'No pains captured yet — make finding them the goal of this call.'),
            h('h3', 'Agenda: open questions'),
            h('ol.agenda', d.gaps.slice(0, 8).map((id) => h('li', F.questionById[id].text))))),
        h('div.row.end', h('button.btn.primary.lg', { onclick: () => app.go('interview') }, `Start call ${n} →`))));
  };
})(globalThis.Fivo = globalThis.Fivo || {});
