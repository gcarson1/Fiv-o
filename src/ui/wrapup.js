/* Fiv-o UI: wrap-up — confirm the play, close MEDDPICC gaps, export CRM notes. */
(function (F) {
  'use strict';

  const { h, pct, copy, download, slug } = F.dom;
  const app = F.app;

  F.screens.wrap = function () {
    const s = app.s;
    const d = app.d;
    const notes = F.report.crm(s, d);
    const plays = d.scores.list.filter((r) => r.score > 0).slice(0, 4);
    const Q = F.questionById;
    const fname = `${slug(s.setup.account)}-call${s.calls.length}-${s.calls[s.calls.length - 1].date}`;

    const playPicker = plays.length ? plays.map((r) => {
      const on = d.primary === r;
      return h('label.pickrow' + (on ? '.on' : ''),
        h('input', { type: 'radio', name: 'primary', checked: on, onchange: () => app.act((x) => { x.primaryPlay = r.id; }) }),
        h('span.pick-main', h('strong', r.play.name), r.variant ? h('span.muted', ` → ${r.variant.name}`) : null),
        h('span.pill' + (r.ready ? '.good' : ''), pct(r.conf)),
        h('button.link', { onclick: (e) => { e.preventDefault(); app.go('interview'); F.ui.openDrawer(r.id); } }, 'card'));
    }) : h('p.muted', 'No play indicated yet — go back and answer “why now”.');

    const pains = d.pains.length ? d.pains.map((p) => h('div.painrow',
      h('div.painrow-label', p.label),
      h('div.pc-row',
        h('input', { placeholder: 'Impact', value: p.impact, 'data-key': `wpi.${p.qid}.${p.opt}`, oninput: (e) => app.soft((x) => F.state.setPain(x, p.qid, p.opt, 'impact', e.target.value)) }),
        h('input', { placeholder: 'Metric', value: p.metric, 'data-key': `wpm.${p.qid}.${p.opt}`, oninput: (e) => app.soft((x) => F.state.setPain(x, p.qid, p.opt, 'metric', e.target.value)) }))))
      : h('p.muted', 'No pains captured. That’s the first thing to fix on the next call.');

    const mp = d.mp.letters.map((l) => {
      const auto = l.items.join('; ');
      return h('div.mprow',
        h('div.mprow-head',
          h(`span.mp-cell.l${l.level}`, l.k),
          h('strong', l.label),
          h('span.muted.small', ['gap', 'partial', 'solid'][l.level]),
          h('button.link', { onclick: () => copy(F.report.mpText(s, d, l.k), `${l.label}`) }, 'copy')),
        h('textarea', {
          rows: 2, 'data-key': `mp.${l.k}`, placeholder: auto || 'Gap — what do you know?',
          oninput: (e) => app.soft((x) => { x.wrap.mp[l.k] = e.target.value; }),
        }, s.wrap.mp[l.k] || ''));
    });

    const gaps = d.gaps.length ? d.gaps.map((id) => h('label.check',
      h('input', { type: 'checkbox', checked: !s.wrap.gapsExcluded[id], onchange: (e) => app.act((x) => { x.wrap.gapsExcluded[id] = !e.target.checked; }) }),
      h('span', Q[id].text, ' ', h('button.link', { onclick: (e) => { e.preventDefault(); app.go('interview'); app.pin(id); } }, 'answer now')))) : h('p.muted', 'No open high-value questions.');

    const agreed = d.valid['dec.nextstep'] ? F.answerText(Q['dec.nextstep'], s.answers['dec.nextstep']) : null;

    return h('div.page.wrap',
      h('div.topbar',
        h('button.btn.ghost', { onclick: () => app.go('interview') }, '← Back to the call'),
        h('span.muted', `${s.setup.account} · call ${s.calls.length} wrap-up`),
        h('button.btn.ghost', { onclick: () => app.go('home') }, 'Home')),
      h('div.wrap-grid',
        h('div.wrap-left',
          h('section.panel', h('h2', 'Recommended play'), h('p.muted.small', 'Pick the primary play for the notes. The top ones are ranked from their answers.'), playPicker),
          h('section.panel', h('h2', 'Pains — quantify them'), pains),
          h('section.panel', h('h2', 'MEDDPICC'), h('p.muted.small', 'Auto-filled from answers (shown as placeholder). Type to override what goes into the notes.'), mp),
          h('section.panel', h('h2', 'Open questions for the next call'), gaps),
          h('section.panel',
            h('h2', 'Next steps'),
            agreed ? h('p', h('strong', 'Agreed: '), agreed) : h('p.muted', 'No next step recorded — add one below with an owner and date.'),
            h('textarea', { rows: 3, 'data-key': 'wrap.next', placeholder: 'Owner — action — date (one per line)', oninput: (e) => app.soft((x) => { x.wrap.nextSteps = e.target.value; }) }, s.wrap.nextSteps || '')),
          h('section.panel',
            h('h2', 'Notes'),
            h('textarea', { rows: 3, 'data-key': 'wrap.notes', placeholder: 'Anything else for the opportunity record', oninput: (e) => app.soft((x) => { x.wrap.notes = e.target.value; }) }, s.wrap.notes || ''))),
        h('div.wrap-right',
          h('section.panel.sticky',
            h('h2', 'CRM notes'),
            h('div.export',
              h('button.btn.primary', { onclick: () => copy(notes, 'Notes') }, 'Copy full notes'),
              h('button.btn', { onclick: () => copy(F.report.meddpicc(s, d), 'MEDDPICC') }, 'Copy MEDDPICC'),
              h('button.btn', { onclick: () => download(`${fname}.txt`, notes) }, 'Download .txt'),
              h('button.btn', { onclick: () => download(`fivo-${slug(s.setup.account)}.json`, F.state.exportJSON(s), 'application/json'), title: 'Keep this to resume or run call 2 on another machine' }, 'Save session (.json)'),
              h('button.btn.ghost', { onclick: () => window.print() }, 'Print / PDF')),
            h('pre.notes', { id: 'print-notes', 'data-scroll': 'notes' }, notes)))));
  };
})(globalThis.Fivo = globalThis.Fivo || {});
