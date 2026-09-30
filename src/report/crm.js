/* Fiv-o report: plain-text CRM / Salesforce notes (no markdown, paste-safe).
   The body follows the call's five phases, so the notes read like the conversation. */
(function (F) {
  'use strict';

  const pct = (x) => `${Math.round(x * 100)}%`;
  const personaLabel = (id) => (F.meta.personas.find((p) => p.id === id) || { label: id }).label;

  function answerLine(s, d, q) {
    const a = s.answers[q.id];
    if (!d.valid[q.id]) return null;
    const n = s.calls.length;
    const note = a.note && a.note.trim() ? ` (${a.note.trim()})` : '';
    const isNew = n > 1 && a.call === n ? ' [new]' : '';
    return `- ${q.short}: ${F.answerText(q, a)}${note}${isNew}`;
  }

  // A pain, the number behind it (and what that adds up to a year), and the impact.
  function painLine(s, p) {
    const est = p.value ? F.costs.estimate(p.value, s) : '';
    const num = p.value ? p.value.text + (est ? ` (${est})` : '')
      : p.metric || (p.later ? 'no number yet — ask next call' : 'no number');
    return `- ${p.label} — ${num}${p.impact ? ` — impact: ${p.impact}` : ''}`;
  }

  function mpText(s, d, k) {
    const o = (s.wrap.mp[k] || '').trim();
    if (o) return o;
    const l = d.mp.byKey[k];
    return l.items.length ? l.items.join('; ') : '(gap)';
  }

  function meddpicc(s, d) {
    return F.meta.meddpicc.map((m) => {
      const lvl = ['GAP', 'PARTIAL', 'SOLID'][d.mp.byKey[m.k].level];
      return `${m.k.padEnd(2)} ${m.label} [${lvl}]: ${mpText(s, d, m.k)}`;
    }).join('\n');
  }

  function playBlock(r, i) {
    const p = r.play;
    const status = r.ready ? 'ready' : r.missingQualifiers.length ? `confirm: ${r.missingQualifiers.map((q) => F.questionById[q].short).join(', ')}` : 'building';
    const why = [...new Set(r.trace.filter((t) => t.delta > 0).map((t) => t.label))].slice(0, 4).join('; ');
    const products = r.variant ? (p.variants.find((x) => x.id === r.variant.id) || {}).products || p.products : p.products;
    return [
      `${i + 1}) ${p.name} — ${pct(r.conf)} (${status})`,
      r.variant ? `   Variant: ${r.variant.name}` : null,
      why ? `   Why: ${why}` : null,
      `   Products: ${products.join(', ')}`,
      `   Suggested next step: ${p.nextSteps[0]}`,
    ].filter(Boolean).join('\n');
  }

  // Interested / explicitly not interested / suggested but not pitched yet.
  function technology(d) {
    const names = (list) => list.map((t) => t.tech.name).join('; ');
    const yes = d.tech.filter((t) => t.status === 'interested');
    const no = d.tech.filter((t) => t.status === 'declined');
    const open = d.tech.filter((t) => t.suggested && !t.status);
    return [
      yes.length ? `- Interested: ${names(yes)}` : null,
      ...no.map((t) => `- Not interested (explicit): ${t.tech.name}${t.note ? ` — ${t.note}` : ''}`),
      open.length ? `- Suggested, not pitched yet: ${names(open)}` : null,
    ];
  }

  function crm(s, d) {
    const su = s.setup;
    const n = s.calls.length;
    const out = [];
    const push = (...lines) => lines.forEach((l) => { if (l !== null && l !== undefined) out.push(l); });
    const section = (title, lines) => {
      const body = lines.filter(Boolean);
      if (body.length) push('', title, ...body);
    };

    push(`DISCOVERY NOTES — ${su.account || 'Account'} — Call ${n} — ${s.calls[n - 1].date}`);
    const meta = [su.opp && `Opportunity: ${su.opp}`, su.se && `SE: ${su.se}`, su.partner && `Partner: ${su.partner}`].filter(Boolean);
    if (meta.length) push(meta.join(' | '));
    const firm = [su.industry, su.segment].filter(Boolean);
    if (firm.length) push(firm.join(' | '));
    if (su.attendees.length) push(`Attendees: ${su.attendees.map(personaLabel).join(', ')}`);
    if (su.contacts && su.contacts.trim()) push(`Contacts: ${su.contacts.trim()}`);
    const style = su.disc && F.disc.styles.find((x) => x.k === su.disc);
    if (style) push(`Buyer style (DISC): ${style.label} — ${style.name}. ${style.adapt}`);

    // The body follows the five phases of the call.
    const Q = F.questionById;
    const inPhase = (n) => F.questions.filter((q) => q.phase === n);
    const onlyPains = (q) => {
      const sel = F.selected(q, s.answers[q.id]);
      return sel.length > 0 && sel.every((id) => (q.options.find((x) => x.id === id) || {}).pain);
    };

    section('WHY NOW', inPhase(1).map((q) => (q.id === 'trigger'
      ? (d.valid.trigger ? `- Triggers (ranked): ${F.answerText(Q.trigger, s.answers.trigger)}` : null)
      : answerLine(s, d, q))));

    section('CURRENT ENVIRONMENT', inPhase(2).map((q) => answerLine(s, d, q)));

    const c = d.costs;
    section('PAIN AND COST', [
      ...d.pains.map((p) => painLine(s, p)),
      c.quantified && F.costs.line(c)
        ? `- Total: ${F.costs.line(c)} — ${c.quantified} of ${c.count} pain${c.count === 1 ? ' has' : 's have'} a number${c.hours ? ` (hours at $${c.rate}/hr loaded)` : ''}`
        : null,
      ...inPhase(3).filter((q) => !onlyPains(q)).map((q) => answerLine(s, d, q)),
    ]);

    section('CHANGE AND RISK', inPhase(4).map((q) => answerLine(s, d, q)));

    section('DECISION', inPhase(5).filter((q) => q.id !== 'dec.nextstep').map((q) => answerLine(s, d, q)));

    section('IN THEIR WORDS', d.quotes.map((x) => `- "${x.text}" (re: ${x.short})`));

    const plays = d.scores.list.filter((r) => r.score > 0).slice(0, 3);
    if (d.primary && d.primary.score > 0 && plays[0] !== d.primary) {
      plays.splice(plays.indexOf(d.primary) >= 0 ? plays.indexOf(d.primary) : plays.length - 1, 1);
      plays.unshift(d.primary);
    }
    section('RECOMMENDED PLAY', plays.map(playBlock));

    section('TECHNOLOGY', technology(d));

    section(`LICENSE SKETCH (validate in Sizer / the quote)`, [d.license && d.license.ready ? F.licensingEngine.toText(d.license) : null]);

    section('RISKS / LANDMINES', d.flags.map((f) => `- ${f.text}`));

    section('MEDDPICC', [meddpicc(s, d)]);

    section('OPEN QUESTIONS FOR NEXT CALL', [
      ...d.gaps.filter((id) => !s.wrap.gapsExcluded[id]).map((id) => `- ${Q[id].text}`),
      ...[...c.later, ...c.missing].map((p) => `- Put a number on: ${p.label}`),
    ]);

    section('NEXT STEPS', [
      answerLine(s, d, Q['dec.nextstep']),
      ...(s.wrap.nextSteps || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `- ${l}`),
    ]);

    if ((s.wrap.notes || '').trim()) section('NOTES', [s.wrap.notes.trim()]);

    return out.join('\n');
  }

  F.report = { crm, meddpicc, mpText };
})(globalThis.Fivo = globalThis.Fivo || {});
