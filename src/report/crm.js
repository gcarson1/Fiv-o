/* Fiv-o report: plain-text CRM / Salesforce notes (no markdown, paste-safe). */
(function (F) {
  'use strict';

  const pct = (x) => `${Math.round(x * 100)}%`;
  const personaLabel = (id) => (F.meta.personas.find((p) => p.id === id) || { label: id }).label;
  const modLabel = (id) => (F.meta.modules.find((m) => m.id === id) || { label: id }).label;

  function answerLine(s, d, q) {
    const a = s.answers[q.id];
    if (!d.valid[q.id]) return null;
    const n = s.calls.length;
    const note = a.note && a.note.trim() ? ` (${a.note.trim()})` : '';
    const isNew = n > 1 && a.call === n ? ' [new]' : '';
    return `- ${q.short}: ${F.answerText(q, a)}${note}${isNew}`;
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

    const Q = F.questionById;
    section('WHY NOW', [
      d.valid.trigger ? `- Triggers (ranked): ${F.answerText(Q.trigger, s.answers.trigger)}` : null,
      ...['why.urgency', 'vmw.renewal', 'hw.when', 'cloud.deadline'].map((id) => answerLine(s, d, Q[id])),
    ]);

    section('CURRENT STATE', F.questions.filter((q) => q.module === 'env').map((q) => answerLine(s, d, q)));

    const detail = [];
    d.modules.filter((m) => !['why', 'env', 'decision'].includes(m)).forEach((mid) => {
      const lines = F.questions.filter((q) => q.module === mid && !['vmw.renewal', 'hw.when', 'cloud.deadline'].includes(q.id)).map((q) => answerLine(s, d, q)).filter(Boolean);
      if (lines.length) detail.push(`[${modLabel(mid)}]`, ...lines);
    });
    section('DISCOVERY DETAIL', detail);

    section('PAINS (impact / metric)', d.pains.map((p) => {
      const extra = [p.impact && `impact: ${p.impact}`, p.metric && `metric: ${p.metric}`].filter(Boolean).join(' / ');
      return `- ${p.label}${extra ? ` (${extra})` : ''}`;
    }));

    section('IN THEIR WORDS', d.quotes.map((x) => `- "${x.text}" (re: ${x.short})`));

    const plays = d.scores.list.filter((r) => r.score > 0).slice(0, 3);
    if (d.primary && d.primary.score > 0 && plays[0] !== d.primary) {
      plays.splice(plays.indexOf(d.primary) >= 0 ? plays.indexOf(d.primary) : plays.length - 1, 1);
      plays.unshift(d.primary);
    }
    section('RECOMMENDED PLAY', plays.map(playBlock));

    section('RISKS / LANDMINES', d.flags.map((f) => `- ${f.text}`));

    section('MEDDPICC', [meddpicc(s, d)]);

    section('OPEN QUESTIONS FOR NEXT CALL', d.gaps.filter((id) => !s.wrap.gapsExcluded[id]).map((id) => `- ${Q[id].text}`));

    section('NEXT STEPS', [
      answerLine(s, d, Q['dec.nextstep']),
      ...(s.wrap.nextSteps || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `- ${l}`),
    ]);

    if ((s.wrap.notes || '').trim()) section('NOTES', [s.wrap.notes.trim()]);

    return out.join('\n');
  }

  F.report = { crm, meddpicc, mpText };
})(globalThis.Fivo = globalThis.Fivo || {});
