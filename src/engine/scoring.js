/* Fiv-o engine: answers → play and variant scores, confidence, and a "why" trace. */
(function (F) {
  'use strict';

  const K = 40;            // confidence = score / (score + K)
  const READY = 0.6;       // confidence needed (plus qualifiers) to lock in a pitch
  const RANK_MULT = [1.4, 1.15]; // ranked multi-selects: first and second picks weigh more

  function compute(session, valid) {
    const raw = {};        // id or id.variant → number
    const trace = {};      // play id → [{ qid, opt, label, delta, target }]
    const add = (key, delta, entry) => {
      raw[key] = (raw[key] || 0) + delta;
      const pid = key.split('.')[0];
      (trace[pid] = trace[pid] || []).push(Object.assign({ target: key, delta }, entry));
    };

    for (const q of F.questions) {
      if (!valid[q.id] || !q.options) continue;
      const a = session.answers[q.id];
      F.selected(q, a).forEach((optId, idx) => {
        const o = q.options.find((x) => x.id === optId);
        if (!o || !o.signals) return;
        const mult = q.ranked ? (RANK_MULT[idx] || 1) : 1;
        for (const [key, w] of Object.entries(o.signals)) {
          if (!w) continue;
          add(key, Math.round(w * mult * 10) / 10, { qid: q.id, opt: o.id, label: `${q.short}: ${o.label}` });
        }
      });
    }

    const list = F.plays.map((p) => {
      const score = Math.max(0, raw[p.id] || 0);
      const conf = score / (score + K);
      const variants = (p.variants || []).map((v) => ({ id: v.id, name: v.name, score: Math.max(0, raw[`${p.id}.${v.id}`] || 0) }));
      const vTotal = variants.reduce((t, v) => t + v.score, 0);
      variants.forEach((v) => { v.share = vTotal ? v.score / vTotal : 1 / variants.length; });
      const vSorted = variants.slice().sort((x, y) => y.score - x.score);
      const variant = vSorted.length && vSorted[0].score > 0 ? vSorted[0] : null;
      const missingQualifiers = (p.qualifiers || []).filter((qid) => {
        const q = F.questionById[qid];
        return q && !F.isAnswered(q, session.answers[qid]);
      });
      const t = (trace[p.id] || []).slice().sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
      return {
        id: p.id, play: p, score, conf, variants: vSorted, variant,
        missingQualifiers, ready: conf >= READY && missingQualifiers.length === 0, trace: t,
      };
    });

    list.sort((a, b) => b.score - a.score || F.plays.indexOf(a.play) - F.plays.indexOf(b.play));
    const byId = Object.fromEntries(list.map((r) => [r.id, r]));
    return { list, byId, raw };
  }

  // How strongly a question's options pull two targets apart (for "next-best-question").
  function discrimination(q, x, y) {
    if (!q.options) return 0;
    let best = 0;
    for (const o of q.options) {
      const s = o.signals || {};
      best = Math.max(best, Math.abs((s[x] || 0) - (s[y] || 0)));
    }
    return best;
  }

  // Does any option on this question push toward the given play (or its variants)?
  function touchesPlay(q, pid) {
    return (q.options || []).some((o) => Object.keys(o.signals || {}).some((k) => k === pid || k.startsWith(pid + '.')));
  }

  F.scoring = { K, READY, compute, discrimination, touchesPlay };
})(globalThis.Fivo = globalThis.Fivo || {});
