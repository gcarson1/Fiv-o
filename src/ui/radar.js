/* Fiv-o UI: Pitch Radar (live play ranking) and the Pitch Card drawer. */
(function (F) {
  'use strict';

  const { h, pct } = F.dom;
  const app = F.app;
  const personaLabel = (id) => (F.meta.personas.find((p) => p.id === id) || { label: id }).label;

  F.ui.openDrawer = function (pid) { app.ui.drawer = pid; app.ui.drawerTab = null; app.render(); };
  const closeDrawer = () => { app.ui.drawer = null; app.render(); };

  function whyTitle(r) {
    const t = r.trace.slice(0, 5).map((x) => `${x.delta > 0 ? '+' : ''}${x.delta}  ${x.label}`).join('\n');
    return t ? `Why:\n${t}` : 'No signals yet';
  }

  function bar(r, big) {
    const from = pct(app.ui.prevConf[r.id] || 0);
    return h('div.bar' + (big ? '.big' : ''), h('div.bar-fill' + (r.ready ? '.ready' : ''), { style: { width: from }, 'data-w': pct(r.conf) }));
  }

  function leadCard(r) {
    const p = r.play;
    const variant = r.variant && p.variants.find((v) => v.id === r.variant.id);
    return h('div.lead' + (r.ready ? '.ready' : ''),
      h('div.lead-k', r.ready ? 'Pitch ready' : 'Leading pitch', app.s.primaryPlay === r.id ? h('span.pill.tiny', 'your pick') : null),
      h('div.lead-name', p.name),
      variant ? h('div.lead-var', '→ ', variant.name)
        : p.variants ? h('div.lead-var.muted', 'Variant not decided yet') : null,
      bar(r, true),
      h('div.lead-meta', h('strong', pct(r.conf)), h('span.muted', ' confidence')),
      r.missingQualifiers.length ? h('div.lead-q',
        h('span.muted', 'To lock it in, confirm: '),
        r.missingQualifiers.map((qid) => h('button.link', { onclick: () => app.pin(qid) }, F.questionById[qid].short))) : null,
      h('p.lead-line', variant ? variant.pitch : p.oneLiner),
      h('button.btn.primary.block', { onclick: () => F.ui.openDrawer(r.id) }, 'Open pitch card', h('kbd', 'P')));
  }

  F.ui.radar = function () {
    const d = app.d;
    const list = d.scores.list;
    const live = list.filter((r) => r.score > 0);
    const idle = list.filter((r) => r.score === 0);
    const lead = d.primary && d.primary.score > 0 ? leadCard(d.primary)
      : h('div.lead.empty', h('div.lead-k', 'Pitch radar'), h('p.muted', 'Answer “why now” and the plays will start ranking here as you learn more.'));

    return h('div.radar',
      h('div.col-title', 'Pitch radar'),
      lead,
      live.length ? h('div.radar-list',
        h('div.radar-sub', h('span', 'All plays'), h('span.muted', 'hover for why · click for card')),
        live.map((r) => {
          const delta = app.ui.rankDelta[r.id];
          return h('button.pbar' + (r.ready ? '.ready' : '') + (d.primary === r ? '.lead-row' : ''), { onclick: () => F.ui.openDrawer(r.id), title: whyTitle(r) },
            h('div.pbar-top',
              h('span.pbar-name', r.play.short),
              delta ? h('span.delta' + (delta > 0 ? '.up' : '.down'), delta > 0 ? '▲' : '▼') : null,
              r.variant ? h('span.pbar-var', r.variant.name) : null,
              h('span.pbar-pct', pct(r.conf))),
            bar(r));
        })) : null,
      idle.length ? h('details.idle', { open: app.ui.idleOpen ? true : null, ontoggle: (e) => { app.ui.idleOpen = e.target.open; } },
        h('summary', `${idle.length} play${idle.length > 1 ? 's' : ''} not indicated yet`),
        idle.map((r) => h('button.idle-item', { onclick: () => F.ui.openDrawer(r.id) }, r.play.name))) : null,
      d.flags.length ? h('div.flags', h('div.radar-sub', 'Risks'), d.flags.map((f) => h('div.flagline', h('span.tip-k.bad', 'Risk'), f.text))) : null,
      h('div.signals', `${d.pains.length} pain${d.pains.length === 1 ? '' : 's'} · ${d.quotes.length} quote${d.quotes.length === 1 ? '' : 's'} captured`));
  };

  // ── Pitch card ──
  function section(title, ...body) {
    return h('section.dsec', h('h3', title), body);
  }

  F.screens.drawer = function () {
    const r = app.d.scores.byId[app.ui.drawer];
    if (!r) return h('div');
    const p = r.play;
    const s = app.s;
    const isPrimary = s.primaryPlay === p.id;
    const variant = r.variant && p.variants.find((v) => v.id === r.variant.id);

    // Talk tracks: attendees first, then the rest.
    const trackIds = Object.keys(p.personas);
    const ordered = [...s.setup.attendees.filter((id) => trackIds.includes(id)), ...trackIds.filter((id) => !s.setup.attendees.includes(id))];
    const tab = app.ui.drawerTab && ordered.includes(app.ui.drawerTab) ? app.ui.drawerTab : ordered[0];

    const comps = F.selected(F.questionById['dec.competition'], s.answers['dec.competition']).filter((id) => F.competitors[id]);
    const compCard = (id) => {
      const c = F.competitors[id];
      return h('div.comp',
        h('div.comp-name', c.name),
        h('p.muted', h('em', 'Their pitch: '), c.theirPitch),
        h('div.coach-k', 'Plant these'),
        h('ul', c.landmines.map((x) => h('li', x))),
        h('p', h('strong', 'Our angle: '), c.counter));
    };
    const confirms = s.confirms[p.id] || [];

    return h('div.overlay.drawer-wrap', { onclick: closeDrawer },
      h('aside.drawer', { onclick: (e) => e.stopPropagation(), 'data-scroll': 'drawer', role: 'dialog', 'aria-label': `Pitch card: ${p.name}` },
        h('div.dhead',
          h('div', h('div.lead-k', 'Pitch card'), h('h2', p.name)),
          h('button.btn.ghost', { onclick: closeDrawer }, 'Close', h('kbd', 'Esc'))),
        h('div.dmeta',
          h('span.pill.accent', `${pct(r.conf)} confidence`),
          r.ready ? h('span.pill.good', 'ready to pitch') : r.missingQualifiers.length ? h('span.pill.warn', `confirm ${r.missingQualifiers.length} qualifier${r.missingQualifiers.length > 1 ? 's' : ''}`) : null,
          h('button.btn.sm' + (isPrimary ? '.on' : ''), {
            onclick: () => app.act((x) => { x.primaryPlay = isPrimary ? null : p.id; }),
            title: 'Override the auto-ranking for the report',
          }, isPrimary ? '✓ Your primary play' : 'Make primary play')),

        p.variants ? section('Which version of this pitch',
          h('div.variants', r.variants.map((v) => {
            const def = p.variants.find((x) => x.id === v.id);
            const on = variant && variant.id === v.id;
            return h('div.variant' + (on ? '.on' : ''),
              h('div.variant-top', h('strong', def.name), h('span.muted', v.score ? pct(v.share) : '—')),
              h('p', def.pitch),
              h('p.small.muted', def.products.join(' · ')));
          }))) : null,

        h('p.oneliner', p.oneLiner),
        h('div.ba',
          h('div.ba-col.before', h('div.coach-k', 'Before'), h('p', p.before)),
          h('div.ba-col.after', h('div.coach-k', 'After'), h('p', p.after))),

        section('Talk track',
          h('div.tabs', ordered.map((id) => h('button.tab' + (id === tab ? '.on' : '') + (s.setup.attendees.includes(id) ? '.attending' : ''), {
            onclick: () => { app.ui.drawerTab = id; app.render(); },
            title: s.setup.attendees.includes(id) ? 'On this call' : '',
          }, personaLabel(id)))),
          h('p.track', p.personas[tab])),

        section('Why this play — from their answers',
          r.trace.length ? h('ul.trace', r.trace.slice(0, 8).map((t) => h('li',
            h('span.delta-n' + (t.delta > 0 ? '.up' : '.down'), `${t.delta > 0 ? '+' : ''}${t.delta}`),
            h('button.link', { onclick: () => { app.ui.drawer = null; app.pin(t.qid); } }, t.label),
            t.target.includes('.') ? h('span.muted.small', ` → ${(p.variants.find((v) => `${p.id}.${v.id}` === t.target) || {}).name || ''}`) : null))) : h('p.muted', 'No signals yet.')),

        section('Capabilities to confirm',
          p.capabilities.map((c, i) => h('label.check',
            h('input', { type: 'checkbox', checked: !!confirms[i], onchange: (e) => app.act((x) => { (x.confirms[p.id] = x.confirms[p.id] || [])[i] = e.target.checked; }) }),
            h('span', c)))),

        section('Proof points',
          h('ul.proof', p.proof.map((x) => h('li',
            h('span', x.t), ' ',
            x.verify ? h('span.pill.warn.tiny', { title: 'Check against current internal enablement before quoting' }, 'verify') : null, ' ',
            h('a', { href: x.src, target: '_blank', rel: 'noopener noreferrer' }, 'source'))))),

        section('Objections',
          p.objections.map((o) => h('details.obj', h('summary', o.q), h('p', o.a)))),

        section('Competitive landmines',
          comps.length ? comps.map(compCard)
            : h('details.obj', h('summary', 'No competitors captured yet — show all battlecards'), Object.keys(F.competitors).map(compCard))),

        section('Recommended next steps', h('ol', p.nextSteps.map((x) => h('li', x)))),

        section('Products', h('p', (variant ? variant.products : p.products).join(' · '))),

        section('Licensing hint', h('p', p.editions, ' ', h('a', { href: p.editionsSrc, target: '_blank', rel: 'noopener noreferrer' }, 'source'))),
        h('p.small.muted.pad', 'Public-source content. Validate proof points and editions against current internal enablement.')));
  };
})(globalThis.Fivo = globalThis.Fivo || {});
