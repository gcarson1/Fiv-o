/* Fiv-o UI: home (saved sessions), call setup, and the second-call recap. */
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
          toast(`Imported ${s.setup.account || 'session'}`);
          app.render();
        } catch (err) {
          toast(`Import failed: ${err.message}`, 'bad');
        }
      },
    });
    return h('label.tbtn', { title: 'Open a session you saved as .json' }, input, 'Import a saved session');
  }

  function newSession() {
    app.ui.setupMore = false;
    app.open(F.state.newSession({ se: prefs.get('se', '') }), 'setup');
  }
  F.screens.newSession = newSession;

  F.screens.home = function () {
    const sessions = F.state.list();
    const rows = sessions.map((s) => {
      F.state.migrate(s);
      const d = F.router.evaluate(s);
      const top = d.primary && d.primary.score > 0 ? d.primary : null;
      return h('div.srow',
        h('div.srow-main',
          h('div.srow-title', s.setup.account || 'Untitled account'),
          h('div.srow-sub', `Call ${s.calls.length} · ${s.calls[s.calls.length - 1].date} · updated ${ago(s.updatedAt)}`)),
        h('div.srow-pitch', top ? [h('span', top.play.short + (top.variant ? ` · ${top.variant.name}` : '')), h('span.muted.mono', ` ${pct(top.conf)}`)] : h('span.muted', 'No pitch yet')),
        h('div.srow-actions',
          h('button.btn', { onclick: () => app.open(F.state.get(s.id), 'interview') }, 'Continue'),
          h('button.tbtn', {
            title: 'Start the next call with a recap of what you learned',
            onclick: () => { const x = F.state.startNextCall(F.state.get(s.id)); F.state.save(x); app.open(x, 'recap'); },
          }, `Start call ${s.calls.length + 1}`),
          h('button.tbtn', { onclick: () => download(`fivo-${slug(s.setup.account)}.json`, F.state.exportJSON(s), 'application/json') }, 'Export'),
          h('button.tbtn.danger', {
            onclick: () => { if (confirm(`Delete “${s.setup.account || 'this session'}” from this browser? Export it first if you want a copy.`)) { F.state.remove(s.id); app.render(); } },
          }, 'Delete')));
    });

    return h('div.page.home',
      h('header.home-head',
        h('span.wordmark.lg', 'Fiv-o'),
        h('span.muted', 'Discovery Navigator'),
        h('button.tbtn.small', { onclick: () => F.ui.toggleTheme(), style: { marginLeft: 'auto' } }, 'Light / dark')),
      h('section.home-hero',
        h('h1', 'Run the discovery call. Fiv-o keeps track.'),
        h('p.lede', 'Ask the question on screen and click what they say. It suggests what to ask next, narrows to the Nutanix pitch that fits, and writes your CRM notes at the end.'),
        h('div.hstack',
          h('button.btn.primary.lg', { onclick: newSession }, 'Start a new discovery'),
          importButton())),
      rows.length
        ? h('section.home-sec', h('h2', 'Saved sessions'), h('div.slist', rows))
        : h('section.home-sec',
          h('h2', 'How it works'),
          h('ol.steps-list',
            h('li', h('strong', 'Set up in 30 seconds. '), 'Account and who’s on the call. Their roles decide which talk tracks you see.'),
            h('li', h('strong', 'Ask and click. '), 'One question at a time. Each answer decides what comes next and updates the likely pitch.'),
            h('li', h('strong', 'Wrap up. '), 'Confirm the pitch, fill any MEDDPICC gaps, and copy the notes into Salesforce.'))),
      h('footer.foot',
        h('p', `Pitch content comes from public Nutanix sources as of ${F.CONTENT_DATE || 'Sept 2026'}. Check proof points marked “verify” against internal enablement before quoting them.`),
        h('p', 'Everything stays in this browser — nothing is sent anywhere. Sessions save automatically; export one to move it to another machine.')));
  };

  F.screens.setup = function () {
    const su = app.s.setup;
    const ui = app.ui;
    const input = (label, key, attrs) => h('label.field',
      h('span.field-label', label),
      h('input', Object.assign({ value: su[key] || '', 'data-key': `setup.${key}`, oninput: (e) => app.soft((s) => { s.setup[key] = e.target.value; }) }, attrs || {})));
    const select = (label, key, options) => h('label.field',
      h('span.field-label', label),
      h('select', { onchange: (e) => app.act((s) => { s.setup[key] = e.target.value; }) },
        h('option', { value: '' }, '—'),
        options.map((o) => h('option', { value: o, selected: su[key] === o ? 'selected' : null }, o))));

    const start = () => {
      if (!su.account.trim()) {
        toast('Add the account name first', 'warn');
        const el = document.querySelector('[data-key="setup.account"]');
        if (el) el.focus();
        return;
      }
      prefs.set('se', su.se || '');
      app.go('interview');
    };

    return h('div.page.setup',
      h('div.topbar', h('button.tbtn', { onclick: () => app.go('home') }, '← Home')),
      h('h1', app.s.calls.length > 1 ? `Call ${app.s.calls.length} setup` : 'New discovery'),
      h('p.muted', 'Only the account is required. You can fill in the rest later.'),
      h('div.form',
        input('Account', 'account', { placeholder: 'e.g., Acme Credit Union', autofocus: true, onkeydown: (e) => { if (e.key === 'Enter') start(); } }),
        input('Partner / reseller', 'partner', { placeholder: 'e.g., CDW, SHI, WWT' }),
        h('div.field',
          h('span.field-label', 'Who’s on the call?'),
          h('div.toggles', F.meta.personas.map((p) => {
            const on = su.attendees.includes(p.id);
            return h('button.toggle' + (on ? '.on' : ''), {
              'aria-pressed': on ? 'true' : 'false',
              onclick: () => app.act((s) => {
                const i = s.setup.attendees.indexOf(p.id);
                if (i >= 0) s.setup.attendees.splice(i, 1); else s.setup.attendees.push(p.id);
              }),
            }, p.label);
          })),
          h('span.field-hint', 'Decides which talk tracks you see first on the pitch card.')),
        h('details.more', { open: ui.setupMore ? true : null, ontoggle: (e) => { ui.setupMore = e.target.open; } },
          h('summary', 'More details (optional)'),
          h('div.form-grid',
            input('Opportunity', 'opp', {}),
            input('Your name', 'se', {}),
            select('Industry', 'industry', F.meta.industries),
            select('Segment', 'segment', F.meta.segments)),
          h('label.field',
            h('span.field-label', 'Names and titles'),
            h('textarea', { rows: 2, 'data-key': 'setup.contacts', placeholder: 'Jane Smith – IT Director; Raj – Sysadmin', oninput: (e) => app.soft((s) => { s.setup.contacts = e.target.value; }) }, su.contacts || ''))),
        h('div.form-foot', h('button.btn.primary.lg', { onclick: start }, 'Start the call'))));
  };

  F.screens.recap = function () {
    const s = app.s;
    const d = app.d;
    const n = s.calls.length;
    const plays = d.scores.list.filter((r) => r.score > 0).slice(0, 3);
    const confirmed = s.recap.confirmed || (s.recap.confirmed = {});
    return h('div.page.recap',
      h('div.topbar', h('button.tbtn', { onclick: () => app.go('home') }, '← Home')),
      h('h1', `${s.setup.account} — before call ${n}`),
      h('p.muted', 'Open the call with what you heard last time. Confirming pains out loud builds trust and catches anything that has changed.'),
      h('div.recap',
        h('section.home-sec',
          h('h2', 'Where you landed'),
          plays.length ? h('div.rows', plays.map((r) => h('div.row.static',
            h('span.row-q', r.play.name, r.variant ? h('span.muted', ` · ${r.variant.name}`) : null),
            h('span.row-a.mono', pct(r.conf))))) : h('p.muted', 'No pitch yet.'),
          h('h2.mt', 'Agreed next step'),
          h('p', s.recap.prevNextStep || h('span.muted', 'None recorded')),
          s.recap.prevNextSteps ? h('pre.small', s.recap.prevNextSteps) : null,
          d.quotes.length ? [h('h2.mt', 'In their words'), d.quotes.map((x) => h('blockquote', `“${x.text}”`))] : null),
        h('section.home-sec',
          h('h2', 'Pains to confirm'),
          d.pains.length ? d.pains.map((p) => {
            const k = `${p.qid}:${p.opt}`;
            return h('label.check',
              h('input', { type: 'checkbox', checked: !!confirmed[k], onchange: (e) => app.act((x) => { x.recap.confirmed[k] = e.target.checked; }) }),
              h('span', p.label, p.impact ? h('span.muted', ` — ${p.impact}`) : null));
          }) : h('p.muted', 'No pains captured yet — make finding them the goal of this call.'),
          h('h2.mt', 'Agenda: open questions'),
          h('ol', d.gaps.slice(0, 8).map((id) => h('li', F.questionById[id].text))))),
      h('div.form-foot', h('button.btn.primary.lg', { onclick: () => app.go('interview') }, `Start call ${n}`)));
  };
})(globalThis.Fivo = globalThis.Fivo || {});
