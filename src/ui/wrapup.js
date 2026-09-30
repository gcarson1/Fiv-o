/* Fiv-o UI: wrap-up — five quick checks, then copy the CRM notes. */
(function (F) {
  'use strict';

  const { h, pct, copy, download, slug } = F.dom;
  const app = F.app;

  const step = (n, title, hint, ...body) => h('section.wstep',
    h('div.wstep-head', h('span.wstep-n', String(n)), h('div', h('h2', title), hint ? h('p.muted.small', hint) : null)),
    h('div.wstep-body', body));

  F.screens.wrap = function () {
    const s = app.s;
    const d = app.d;
    const Q = F.questionById;
    const notes = F.report.crm(s, d);
    const plays = d.scores.list.filter((r) => r.score > 0).slice(0, 4);
    const fname = `${slug(s.setup.account)}-call${s.calls.length}-${s.calls[s.calls.length - 1].date}`;
    const backTo = (fn) => (e) => { e.preventDefault(); app.go('interview'); fn(); };

    const pitch = plays.length ? h('div.rows', plays.map((r) => {
      const on = d.primary === r;
      return h('label.row.pick' + (on ? '.on' : ''),
        h('input', { type: 'radio', name: 'primary', checked: on, onchange: () => app.act((x) => { x.primaryPlay = r.id; }) }),
        h('span.row-q', r.play.name, r.variant ? h('span.muted', ` · ${r.variant.name}`) : null),
        h('span.row-a.mono', pct(r.conf)),
        h('button.tbtn.small', { onclick: backTo(() => F.ui.openDrawer(r.id)) }, 'Card'));
    })) : h('p.muted', 'No pitch indicated yet — go back and answer “why now”.');

    // Cost of pain: every pain with its number, the hourly rate, and the total.
    const c = d.costs;
    const painRow = (p) => {
      const set = (k) => (e) => app.soft((x) => F.state.setPain(x, p.qid, p.opt, k, e.target.value));
      const est = p.value ? F.costs.estimate(p.value, s) : '';
      return h('div.row.static.stack',
        h('span.row-q', p.label, p.later && !p.amount ? h('span.muted', ' · no number yet — on the next call’s agenda') : null),
        h('p.num-ask.small', `“${p.ask}”`),
        h('div.num-row',
          h('input.num-amt', { placeholder: F.costs.unitById[p.unit].eg, value: p.amount, 'data-key': `wpa.${p.qid}.${p.opt}`, 'aria-label': `The number for: ${p.label}`, oninput: set('amount') }),
          h('select.num-unit', { 'data-key': `wpu.${p.qid}.${p.opt}`, 'aria-label': 'Unit', onchange: (e) => app.act((x) => F.state.setPain(x, p.qid, p.opt, 'unit', e.target.value)) },
            F.meta.units.map((u) => h('option', { value: u.id, selected: u.id === p.unit ? 'selected' : null }, u.label))),
          h('input.num-impact', { placeholder: 'What it means for the business', value: p.impact, 'data-key': `wpi.${p.qid}.${p.opt}`, 'aria-label': 'Impact', oninput: set('impact') })),
        est ? h('span.num-est', est) : p.metric && !p.value ? h('span.num-est', `Noted earlier: ${p.metric}`) : null);
    };
    const pains = d.pains.length ? [
      h('div.rows', d.pains.map(painRow)),
      h('div.cost-total',
        h('p', h('strong', F.costs.line(c) || 'No numbers yet'), h('span.muted', ` · ${c.quantified} of ${c.count} pain${c.count === 1 ? ' has' : 's have'} a number`)),
        h('label.rate', h('span', 'Hours valued at $'),
          h('input.rate-in', { inputmode: 'numeric', value: String(s.wrap.rate), 'data-key': 'wrap.rate', 'aria-label': 'Loaded hourly rate', oninput: (e) => app.soft((x) => { x.wrap.rate = e.target.value.replace(/[^\d.]/g, ''); }) }),
          h('span', ' an hour (loaded cost of an IT hour)'))),
    ] : h('p.muted', 'No pains captured. Finding them is the first job of the next call.');

    const mp = h('div.rows', d.mp.letters.map((l) => h('div.row.static.stack',
      h('div.mprow',
        h(`span.mp-l.l${l.level}`, l.k),
        h('strong', l.label),
        h('span.muted.small', ['gap', 'partial', 'solid'][l.level]),
        h('button.tbtn.small', { onclick: () => copy(F.report.mpText(s, d, l.k), l.label), style: { marginLeft: 'auto' } }, 'Copy')),
      h('textarea', {
        rows: 1, 'data-key': `mp.${l.k}`, placeholder: l.items.join('; ') || 'Gap — what do you know?',
        oninput: (e) => app.soft((x) => { x.wrap.mp[l.k] = e.target.value; }),
      }, s.wrap.mp[l.k] || ''))));

    const gaps = d.gaps.length ? d.gaps.map((id) => h('label.check',
      h('input', { type: 'checkbox', checked: !s.wrap.gapsExcluded[id], onchange: (e) => app.act((x) => { x.wrap.gapsExcluded[id] = !e.target.checked; }) }),
      h('span', Q[id].text, ' ', h('button.link.small', { onclick: backTo(() => app.pin(id)) }, 'ask now')))) : h('p.muted', 'No open high-value questions.');

    const agreed = d.valid['dec.nextstep'] ? F.answerText(Q['dec.nextstep'], s.answers['dec.nextstep']) : null;

    // Technology interest (with a reason for every "not interested") + the license headline.
    const yes = d.tech.filter((t) => t.status === 'interested');
    const no = d.tech.filter((t) => t.status === 'declined');
    const open = d.tech.filter((t) => t.suggested && !t.status);
    const statusBtns = (t) => h('div.tech-act',
      h('button.tbtn.small' + (t.status === 'interested' ? '.chosen' : ''), { onclick: () => app.setTech(t.id, t.status === 'interested' ? null : 'interested') }, 'Interested'),
      h('button.tbtn.small' + (t.status === 'declined' ? '.chosen.no' : ''), { onclick: () => app.setTech(t.id, t.status === 'declined' ? null : 'declined') }, 'Not interested'));
    const lic = d.license;
    const tech = [
      yes.length || no.length || open.length ? h('div.rows',
        [...yes, ...no, ...open].map((t) => h('div.row.static.wtech',
          h('div.wtech-main', h('strong', t.tech.name), h('span.muted.small', t.status === 'interested' ? 'Interested' : t.status === 'declined' ? 'Not interested' : 'Suggested — not pitched yet')),
          statusBtns(t),
          t.status === 'declined' ? h('input', {
            placeholder: 'Why not? (goes in the notes)', value: t.note, 'data-key': `tn.${t.id}`,
            oninput: (e) => app.soft((x) => F.state.setTechNote(x, t.id, e.target.value)),
          }) : null)))
        : h('p.muted', 'No technologies suggested or marked yet.'),
      lic && lic.ready ? h('p.lic-sum', h('span.muted', 'License sketch: '), h('strong', lic.headline),
        lic.core[0].qty ? h('span.muted', ` · ${lic.core[0].qty}`) : null,
        lic.addons.length ? h('span.muted', ` · plus ${lic.addons.map((a) => a.title).join(', ')}`) : null,
        ' ', h('button.link.small', { onclick: () => copy(F.licensingEngine.toText(lic), 'License sketch') }, 'copy')) : null,
    ];

    return h('div.page.wrap',
      h('div.topbar',
        h('button.tbtn', { onclick: () => app.go('interview') }, '← Back to the call'),
        h('button.tbtn', { onclick: () => app.go('home'), style: { marginLeft: 'auto' } }, 'Home')),
      h('h1', `Wrap up — ${s.setup.account}`),
      h('p.muted', 'Six quick checks, then copy the notes into Salesforce. Everything you change here updates the notes on the right.'),
      h('div.wrap-grid',
        h('div.wrap-left',
          step(1, 'Primary pitch', 'Ranked from their answers. Pick the one to lead with.', pitch),
          step(2, 'Technology and licensing', 'What they want, what they turned down (and why), and the license it adds up to.', tech),
          step(3, 'Cost of pain', 'The number behind each pain, from the call. Blanks go on the next call’s agenda. The total adds numbers as given — check for overlap before using it in a business case.', pains),
          step(4, 'MEDDPICC', 'Filled from their answers (shown in grey). Type to replace what goes into the notes.', mp),
          step(5, 'Open questions for next time', 'Checked items go into the notes as the next call’s agenda.', gaps),
          step(6, 'Next steps and notes', null,
            agreed ? h('p', h('span.muted', 'Agreed on the call: '), agreed) : h('p.muted', 'No next step was recorded — add one with an owner and a date.'),
            h('label.lf', h('span', 'Next steps'), h('textarea', { rows: 3, 'data-key': 'wrap.next', placeholder: 'Owner — action — date (one per line)', oninput: (e) => app.soft((x) => { x.wrap.nextSteps = e.target.value; }) }, s.wrap.nextSteps || '')),
            h('label.lf', h('span', 'Other notes'), h('textarea', { rows: 3, 'data-key': 'wrap.notes', placeholder: 'Anything else for the opportunity record', oninput: (e) => app.soft((x) => { x.wrap.notes = e.target.value; }) }, s.wrap.notes || '')))),
        h('div.wrap-right',
          h('section.notes-panel',
            h('div.notes-head', h('h2', 'CRM notes'), h('span.muted.small', 'Plain text — pastes cleanly into Salesforce')),
            h('div.notes-actions',
              h('button.btn.primary', { onclick: () => copy(notes, 'Notes') }, 'Copy notes'),
              h('button.btn', { onclick: () => copy(F.report.meddpicc(s, d), 'MEDDPICC') }, 'Copy MEDDPICC')),
            h('div.notes-more',
              h('button.tbtn.small', { onclick: () => download(`${fname}.txt`, notes) }, 'Download .txt'),
              h('button.tbtn.small', { onclick: () => download(`fivo-${slug(s.setup.account)}.json`, F.state.exportJSON(s), 'application/json'), title: 'Keep this to resume or run call 2 on another machine' }, 'Save session (.json)'),
              h('button.tbtn.small', { onclick: () => window.print() }, 'Print')),
            h('pre.notes', { id: 'print-notes', 'data-scroll': 'notes' }, notes)))));
  };
})(globalThis.Fivo = globalThis.Fivo || {});
