/* Fiv-o UI: the side panel (Pitch / License), technology suggestions, and the pitch card. */
(function (F) {
  'use strict';

  const { h, pct, copy } = F.dom;
  const app = F.app;
  const personaLabel = (id) => (F.meta.personas.find((p) => p.id === id) || { label: id }).label;

  F.ui.openDrawer = function (pid) { app.ui.drawer = pid; app.ui.drawerTab = null; app.ui.pitchTab = 'pitch'; app.render(); };
  const closeDrawer = () => { app.ui.drawer = null; app.render(); };
  const openLicense = () => { app.ui.drawer = null; app.ui.sideTab = 'license'; app.ui.mtab = 'pitch'; app.render(); };

  function whyTitle(r) {
    const t = [...new Set(r.trace.filter((x) => x.delta > 0).map((x) => x.label))].slice(0, 4).join('\n');
    return t ? `Because:\n${t}` : 'No signals yet';
  }
  const meter = (r, cls) => h('div.meter' + (cls ? '.' + cls : ''),
    h('div.meter-fill' + (r.ready ? '.ready' : ''), { style: { width: pct(app.ui.prevConf[r.id] || 0) }, 'data-w': pct(r.conf) }));

  function lead(r) {
    const p = r.play;
    const variant = r.variant && p.variants.find((v) => v.id === r.variant.id);
    return h('div.lead',
      h('div.lead-status' + (r.ready ? '.ready' : ''), r.ready ? 'Ready to pitch' : 'Building confidence'),
      h('div.lead-name', p.name),
      variant ? h('div.lead-var', variant.name)
        : p.variants ? h('div.lead-var.muted', 'Version not decided yet') : null,
      h('div.lead-meter', meter(r), h('span.mono', pct(r.conf))),
      r.missingQualifiers.length ? h('p.lead-need', 'To confirm: ',
        r.missingQualifiers.map((qid, i) => [i ? ', ' : '', h('button.link', { onclick: () => app.pin(qid) }, F.questionById[qid].short)])) : null,
      h('button.btn.full', { onclick: () => F.ui.openDrawer(r.id), title: 'Pitch card  (P)' }, 'Open pitch card'));
  }

  // ── Suggested technology ──
  function techActions(t) {
    return h('div.tech-act',
      h('button.tbtn.small' + (t.status === 'interested' ? '.chosen' : ''), { onclick: () => app.setTech(t.id, t.status === 'interested' ? null : 'interested') }, t.status === 'interested' ? '✓ Interested' : 'Interested'),
      h('button.tbtn.small' + (t.status === 'declined' ? '.chosen.no' : ''), { onclick: () => app.setTech(t.id, t.status === 'declined' ? null : 'declined') }, t.status === 'declined' ? '✕ Not interested' : 'Not interested'));
  }

  function techRow(t) {
    const fresh = app.ui.freshTech[t.id] && Date.now() - app.ui.freshTech[t.id] < 90000;
    return h('div.tech',
      h('div.tech-top',
        h('button.tech-name', { onclick: () => F.ui.openDrawer(t.tech.play), title: `${t.tech.what}\n\nClick for the pitch card.` }, t.tech.name),
        fresh ? h('span.step-new', 'new') : null),
      t.why.length ? h('p.tech-why', t.why.slice(0, 2).join(' · ')) : null,
      techActions(t));
  }

  function techSection() {
    const d = app.d;
    const ui = app.ui;
    const open = d.tech.filter((t) => t.suggested && !t.status);
    const yes = d.tech.filter((t) => t.status === 'interested');
    const no = d.tech.filter((t) => t.status === 'declined');
    const shown = ui.techAll ? open : open.slice(0, 3);
    const names = (list) => list.map((t, i) => [i ? ', ' : '', h('button.link', { onclick: () => app.setTech(t.id, null), title: 'Click to undo' }, t.tech.name)]);
    return h('section.side-sec',
      h('div.eyebrow', 'Suggested technology'),
      open.length ? shown.map(techRow)
        : h('p.muted.small', yes.length || no.length ? 'Nothing new to suggest right now.' : 'Specific technologies appear here once their answers point clearly to them.'),
      open.length > 3 ? h('button.tbtn.small', { onclick: () => { ui.techAll = !ui.techAll; app.render(); } }, ui.techAll ? 'Show fewer' : `${open.length - 3} more suggested`) : null,
      yes.length ? h('p.tech-sum', h('span.muted', 'Interested: '), names(yes)) : null,
      no.length ? h('p.tech-sum', h('span.muted', 'Not interested: '), names(no)) : null,
      h('button.tbtn.small', { onclick: () => { ui.techPicker = true; app.render(); }, title: 'Mark any technology you pitched' }, 'All technologies'));
  }

  function pitchTab() {
    const d = app.d;
    const ui = app.ui;
    const all = d.scores.list;
    const top = d.primary && d.primary.score > 0 ? d.primary : null;
    const rest = all.filter((r) => r !== top && (ui.showAll || r.score > 0));
    const shown = ui.showAll ? rest : rest.slice(0, 2);
    return [
      h('section.side-sec',
        h('div.eyebrow', 'Likely pitch'),
        top ? lead(top) : h('p.muted.small', 'Nothing yet. As they answer, the best-fit Nutanix pitch shows up here.')),
      techSection(),
      shown.length ? h('section.side-sec',
        h('div.eyebrow', 'Also in play'),
        shown.map((r) => h('button.prow' + (r.declined ? '.declined' : ''), { onclick: () => F.ui.openDrawer(r.id), title: r.declined ? 'Customer not interested' : whyTitle(r) },
          h('span.prow-name', r.play.short),
          meter(r, 'thin'),
          h('span.prow-v.mono', r.declined ? 'no' : r.score ? pct(r.conf) : '—'))),
        h('button.tbtn.small', { onclick: () => { ui.showAll = !ui.showAll; app.render(); } }, ui.showAll ? 'Show fewer' : `See all ${all.length} pitches`)) : null,
      d.flags.length ? h('section.side-sec', h('div.eyebrow', 'Risks'), d.flags.map((f) => h('p.risk', f.text))) : null,
      h('section.side-sec',
        h('div.eyebrow', 'MEDDPICC'),
        h('div.mp', d.mp.letters.map((l) => h(`span.mp-l.l${l.level}`, { title: `${l.label} — ${['gap', 'partial', 'solid'][l.level]}${l.items.length ? ': ' + l.items.join('; ') : ''}` }, l.k))),
        h('p.muted.small', `${d.pains.length} pain${d.pains.length === 1 ? '' : 's'} · ${d.quotes.length} quote${d.quotes.length === 1 ? '' : 's'} captured`)),
    ];
  }

  // ── License sketch ──
  function licLine(l, main) {
    return h('div.lic' + (main ? '.main' : ''),
      h('div.lic-top', h('span.lic-title', l.title), l.qty ? h('span.lic-qty', l.qty) : null),
      l.detail ? h('p.lic-detail', l.detail) : null,
      l.why && l.why.length ? h('ul.lic-why', l.why.map((w) => h('li', w))) : null);
  }

  function licenseTab() {
    const r = app.d.license;
    if (!r || !r.ready) return [h('p.muted.small', r ? r.note : '')];
    return [
      h('section.side-sec', h('div.eyebrow', 'Recommended license'), r.core.map((l) => licLine(l, true))),
      r.addons.length ? h('section.side-sec', h('div.eyebrow', 'Add-ons and separate licenses'), r.addons.map((l) => licLine(l))) : null,
      h('section.side-sec', h('div.eyebrow', 'Included at no extra cost'), h('ul.lic-list', r.included.map((x) => h('li', x)))),
      r.alternatives.length ? h('section.side-sec', h('div.eyebrow', 'Other options'), r.alternatives.map((a) => h('div.lic', h('div.lic-top', h('span.lic-title', a.title)), h('p.lic-detail', a.detail)))) : null,
      r.excluded.length ? h('section.side-sec', h('div.eyebrow', 'Left out'), h('ul.lic-list', r.excluded.map((x) => h('li', `${x.title} — ${x.detail}${x.reason ? ` (“${x.reason}”)` : ''}`)))) : null,
      r.notes.length ? h('section.side-sec', h('div.eyebrow', 'Notes'), h('ul.lic-list', r.notes.map((x) => h('li', x)))) : null,
      h('section.side-sec',
        h('p.muted.small', r.assumptions.join(' ')),
        h('button.btn.full', { onclick: () => copy(F.licensingEngine.toText(r), 'License sketch') }, 'Copy license sketch'),
        h('p.small', h('a', { href: F.licensing.src.options, target: '_blank', rel: 'noopener noreferrer' }, 'Nutanix software options'))),
    ];
  }

  F.ui.radar = function () {
    const ui = app.ui;
    const r = app.d.license;
    const tab = (id, label, extra) => h('button.utab' + (ui.sideTab === id ? '.on' : ''), { onclick: () => { ui.sideTab = id; app.render(); } }, label, extra);
    return h('div.side-in',
      h('div.utabs.side-tabs',
        tab('pitch', 'Pitch'),
        tab('license', 'License', r && r.ready ? h('span.tab-hint', ` · ${r.headline}`) : null)),
      ui.sideTab === 'license' ? licenseTab() : pitchTab());
  };

  // ── All technologies (mark anything you pitched) ──
  F.screens.techPicker = function () {
    const close = () => { app.ui.techPicker = false; app.render(); };
    return h('div.overlay', { onclick: close },
      h('div.modal.wide', { onclick: (e) => e.stopPropagation(), role: 'dialog', 'aria-label': 'All technologies' },
        h('h2', 'Technologies'),
        h('p.muted', 'Mark how the customer reacted to anything you pitched. “Not interested” takes it out of the suggestions and the license, and skips questions that only it needed.'),
        h('div.rows', app.d.tech.map((t) => h('div.row.static.tech-pick',
          h('span.row-q', t.tech.name,
            t.suggested && !t.status ? h('span.key', 'Suggested') : null,
            h('span.row-sub', t.tech.what)),
          techActions(t)))),
        h('div.modal-foot', h('button.btn.primary', { onclick: close }, 'Done'))));
  };

  // ── Pitch card ──
  const sec = (title, ...body) => h('section.dsec', h('h3', title), body);

  function pitchCardTab(r, p, variant) {
    const s = app.s;
    const trackIds = Object.keys(p.personas);
    const ordered = [...s.setup.attendees.filter((id) => trackIds.includes(id)), ...trackIds.filter((id) => !s.setup.attendees.includes(id))];
    const tab = app.ui.drawerTab && ordered.includes(app.ui.drawerTab) ? app.ui.drawerTab : ordered[0];
    const techs = app.d.tech.filter((t) => t.tech.play === p.id);
    return [
      p.variants ? sec('Which version',
        h('div.rows', r.variants.map((v) => {
          const def = p.variants.find((x) => x.id === v.id);
          const on = variant && variant.id === v.id;
          return h('div.row.static' + (on ? '.on' : ''),
            h('span.row-q', def.name, on ? h('span.must', 'Best fit') : v.declined ? h('span.muted', ' · not interested') : null),
            h('span.row-a', def.pitch));
        }))) : null,
      h('p.oneliner', p.oneLiner),
      h('div.ba',
        h('div', h('h3', 'Before'), h('p', p.before)),
        h('div', h('h3', 'After'), h('p', p.after))),
      sec('Talk track',
        h('div.utabs', ordered.map((id) => h('button.utab' + (id === tab ? '.on' : ''), {
          onclick: () => { app.ui.drawerTab = id; app.render(); },
          title: s.setup.attendees.includes(id) ? 'On this call' : '',
        }, personaLabel(id), s.setup.attendees.includes(id) ? ' •' : ''))),
        h('p.track', p.personas[tab])),
      techs.length ? sec('Technologies in this pitch — did they want it?',
        h('div.rows', techs.map((t) => h('div.row.static.tech-pick',
          h('span.row-q', t.tech.name, t.suggested && !t.status ? h('span.key', 'Suggested') : null, h('span.row-sub', t.tech.what)),
          techActions(t))))) : null,
    ];
  }

  function proofTab(r, p) {
    const confirms = app.s.confirms[p.id] || [];
    const why = [];
    const seen = new Set();
    r.trace.forEach((t) => { const k = t.qid + t.opt; if (!seen.has(k)) { seen.add(k); why.push(t); } });
    return [
      sec('Why this pitch — from their answers',
        why.length ? h('div.rows', why.slice(0, 8).map((t) => h('button.row', { onclick: () => { app.ui.drawer = null; app.pin(t.qid); } },
          h('span.row-q', t.label), h('span.row-a.mono', `${t.delta > 0 ? '+' : ''}${t.delta}`)))) : h('p.muted', 'No signals yet.')),
      sec('Capabilities to confirm',
        p.capabilities.map((c, i) => h('label.check',
          h('input', { type: 'checkbox', checked: !!confirms[i], onchange: (e) => app.act((x) => { (x.confirms[p.id] = x.confirms[p.id] || [])[i] = e.target.checked; }) }),
          h('span', c)))),
      sec('Proof points',
        h('ul.plain', p.proof.map((x) => h('li',
          x.t, ' ',
          x.verify ? h('span.verify', { title: 'Check against current internal enablement before quoting' }, 'verify') : null, ' ',
          h('a', { href: x.src, target: '_blank', rel: 'noopener noreferrer' }, 'source'))))),
    ];
  }

  function objectionsTab(p) {
    const s = app.s;
    const comps = F.selected(F.questionById['dec.competition'], s.answers['dec.competition']).filter((id) => F.competitors[id]);
    const compBlock = (id) => {
      const c = F.competitors[id];
      return h('div.comp',
        h('h4', c.name),
        h('p.muted', `Their pitch: ${c.theirPitch}`),
        h('div.follow-k', 'Questions to plant'),
        h('ul', c.landmines.map((x) => h('li', x))),
        h('p', h('strong', 'Our angle: '), c.counter));
    };
    return [
      sec('Objections', p.objections.map((o) => h('details.obj', h('summary', o.q), h('p', o.a)))),
      sec('Competition',
        comps.length ? comps.map(compBlock)
          : [h('p.muted', 'No competitors captured yet. All battlecards:'), Object.keys(F.competitors).map((id) => h('details.obj', h('summary', F.competitors[id].name), compBlock(id)))]),
    ];
  }

  function nextTab(p, variant) {
    const lic = app.d.license;
    return [
      sec('Recommended next steps', h('ol', p.nextSteps.map((x) => h('li', x)))),
      sec('Products', h('p', (variant ? variant.products : p.products).join(' · '))),
      sec('Licensing',
        lic && lic.ready ? h('p', h('strong', 'For this customer: '), lic.headline, ' — ', h('button.link', { onclick: openLicense }, 'open the license sketch')) : null,
        h('p', p.editions, ' ', h('a', { href: p.editionsSrc, target: '_blank', rel: 'noopener noreferrer' }, 'source'))),
    ];
  }

  F.screens.drawer = function () {
    const r = app.d.scores.byId[app.ui.drawer];
    if (!r) return h('div');
    const p = r.play;
    const s = app.s;
    const isPrimary = s.primaryPlay === p.id;
    const variant = r.variant && p.variants.find((v) => v.id === r.variant.id);
    const tabs = [['pitch', 'Pitch'], ['proof', 'Proof'], ['objections', 'Objections'], ['next', 'Next steps']];
    const tab = app.ui.pitchTab || 'pitch';
    const status = r.declined ? 'customer not interested'
      : r.ready ? 'ready to pitch'
        : r.missingQualifiers.length ? `to confirm: ${r.missingQualifiers.map((q) => F.questionById[q].short).join(', ')}` : 'still building';

    return h('div.overlay.drawer-wrap', { onclick: closeDrawer },
      h('aside.drawer', { onclick: (e) => e.stopPropagation(), 'data-scroll': 'drawer', role: 'dialog', 'aria-label': `Pitch card: ${p.name}` },
        h('div.dhead',
          h('div',
            h('div.eyebrow', 'Pitch card'),
            h('h2', p.name),
            h('p.muted.small', `${pct(r.conf)} confidence · ${status}`)),
          h('button.tbtn', { onclick: closeDrawer }, 'Close')),
        h('div.dbar',
          h('div.utabs', tabs.map(([id, label]) => h('button.utab' + (id === tab ? '.on' : ''), { onclick: () => { app.ui.pitchTab = id; app.render(); } }, label))),
          r.declined ? null : h('button.tbtn.small', {
            onclick: () => app.act((x) => { x.primaryPlay = isPrimary ? null : p.id; }),
            title: 'Use this pitch as the primary play in your notes',
          }, isPrimary ? '✓ Primary pitch' : 'Make primary')),
        h('div.dbody',
          tab === 'pitch' ? pitchCardTab(r, p, variant)
            : tab === 'proof' ? proofTab(r, p)
              : tab === 'objections' ? objectionsTab(p)
                : nextTab(p, variant)),
        h('p.small.muted.dfoot', 'Public-source content. Validate proof points and licensing against current internal enablement.')));
  };
})(globalThis.Fivo = globalThis.Fivo || {});
