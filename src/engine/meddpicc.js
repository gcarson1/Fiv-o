/* Fiv-o engine: MEDDPICC auto-fill. Level 0 = gap, 1 = partial, 2 = solid. */
(function (F) {
  'use strict';

  function compute(session, valid, pains) {
    const L = {};
    F.meta.meddpicc.forEach((m) => { L[m.k] = { k: m.k, label: m.label, level: 0, items: [] }; });

    for (const q of F.questions) {
      if (!valid[q.id]) continue;
      const a = session.answers[q.id];
      const opts = F.selected(q, a).map((id) => (q.options || []).find((o) => o.id === id)).filter(Boolean);
      const letters = new Set(q.mp ? [q.mp] : []);
      opts.forEach((o) => Object.keys(o.mp || {}).forEach((k) => letters.add(k)));
      const def = a.note && a.note.trim() ? 2 : 1;

      for (const k of letters) {
        if (!L[k]) continue;
        const levels = [];
        opts.forEach((o) => {
          if (o.mp && k in o.mp) levels.push(o.mp[k]);
          else if (q.mp === k) levels.push(def);
        });
        if (!opts.length && q.mp === k) levels.push(def);
        if (!levels.length) continue;
        L[k].level = Math.max(L[k].level, ...levels);
        L[k].items.push(`${q.short}: ${F.answerText(q, a)}${a.note && a.note.trim() ? ' (' + a.note.trim() + ')' : ''}`);
      }
    }

    if (pains.length) {
      L.I.level = Math.max(L.I.level, pains.some((p) => p.impact) ? 2 : 1);
      pains.forEach((p) => L.I.items.push(p.label + (p.impact ? ` (impact: ${p.impact})` : '')));
    }
    const metrics = pains.filter((p) => p.metric);
    if (metrics.length) {
      L.M.level = 2;
      metrics.forEach((p) => L.M.items.push(`${p.metric} (${p.label})`));
    }

    const letters = F.meta.meddpicc.map((m) => L[m.k]);
    return { letters, byKey: L, total: letters.reduce((t, l) => t + l.level, 0), max: letters.length * 2 };
  }

  F.meddpicc = { compute };
})(globalThis.Fivo = globalThis.Fivo || {});
