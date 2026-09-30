/* Fiv-o engine: which technologies the customer could use, from their answers and the pitch
   ranking. A technology is "suggested" once its evidence adds up to 1. The SE records the
   customer's reaction (interested / not interested) in session.tech. */
(function (F) {
  'use strict';

  const THRESHOLD = 1;
  const PLAY_CONF = 0.5;     // "play:x" evidence counts once that pitch is at ≥50%
  const VARIANT_CONF = 0.35; // "variant:x.y" counts once y leads pitch x at ≥35%

  function termMatch(term, session, valid, scores) {
    const i = term.indexOf(':');
    const kind = term.slice(0, i);
    const rest = term.slice(i + 1);
    if (kind === 'play') {
      const r = scores.byId[rest];
      return r && !r.declined && r.conf >= PLAY_CONF ? `${r.play.short} pitch at ${Math.round(r.conf * 100)}%` : null;
    }
    if (kind === 'variant') {
      const [pid, vid] = rest.split('.');
      const r = scores.byId[pid];
      return r && !r.declined && r.conf >= VARIANT_CONF && r.variant && r.variant.id === vid ? r.variant.name : null;
    }
    // "questionId:optionId"
    if (!valid[kind]) return null;
    const q = F.questionById[kind];
    if (!F.selected(q, session.answers[kind]).includes(rest)) return null;
    const o = q.options.find((x) => x.id === rest);
    return `${q.short}: ${o ? o.label : rest}`;
  }

  function evaluate(session, valid, scores) {
    const st = session.tech || {};
    return F.tech.map((t) => {
      let score = 0;
      const why = [];
      t.evidence.forEach(([term, w]) => {
        const label = termMatch(term, session, valid, scores);
        if (label) { score += w; why.push(label); }
      });
      const rec = st[t.id] || {};
      const status = rec.status || null;
      const suggested = score >= THRESHOLD - 1e-9;
      return {
        id: t.id, tech: t, score: Math.round(score * 100) / 100, why, status, note: rec.note || '',
        suggested,
        inScope: status === 'interested' || (suggested && status !== 'declined'),
      };
    }).sort((a, b) => b.score - a.score || F.tech.indexOf(a.tech) - F.tech.indexOf(b.tech));
  }

  F.techEngine = { evaluate, THRESHOLD };
})(globalThis.Fivo = globalThis.Fivo || {});
