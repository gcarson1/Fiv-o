/* Fiv-o engine: eligibility, stale answers, question ordering (next-best-question),
   gaps, and the single `evaluate()` the UI and report read from. */
(function (F) {
  'use strict';

  const MOD = Object.fromEntries(F.meta.modules.map((m) => [m.id, m]));
  const QIDX = Object.fromEntries(F.questions.map((q, i) => [q.id, i]));
  const FIXED = ['why', 'env', 'decision'];

  function term(t, s, valid) {
    const [qid, opt] = t.split(':');
    if (!valid[qid]) return false;
    if (opt === undefined) return true;
    return F.selected(F.questionById[qid], s.answers[qid]).includes(opt);
  }
  function cond(c, s, valid) {
    if (!c) return true;
    if (c.any && !c.any.some((t) => term(t, s, valid))) return false;
    if (c.all && !c.all.every((t) => term(t, s, valid))) return false;
    if (c.not && c.not.some((t) => term(t, s, valid))) return false;
    return true;
  }
  const isEligible = (q, s, valid) => cond(MOD[q.module] && MOD[q.module].when, s, valid) && cond(q.when, s, valid);
  const refs = (c) => (c ? [...(c.any || []), ...(c.all || []), ...(c.not || [])].map((t) => t.split(':')[0]) : []);
  const sameKeys = (a, b) => { const ka = Object.keys(a); return ka.length === Object.keys(b).length && ka.every((k) => b[k]); };

  function evaluate(s, ui) {
    ui = ui || {};

    // 1. Valid answers: answered AND still eligible given the other valid answers (fixpoint).
    const has = {};
    F.questions.forEach((q) => { if (F.hasValue(q, s.answers[q.id])) has[q.id] = true; });
    let valid = Object.assign({}, has);
    for (let i = 0; i < 10; i++) {
      const next = {};
      for (const qid in has) if (isEligible(F.questionById[qid], s, valid)) next[qid] = true;
      const done = sameKeys(next, valid);
      valid = next;
      if (done) break;
    }
    const eligible = {};
    F.questions.forEach((q) => { if (isEligible(q, s, valid)) eligible[q.id] = true; });
    const stale = {};
    for (const qid in has) if (!valid[qid]) stale[qid] = true;

    // 2. Scores.
    const scores = F.scoring.compute(s, valid);
    const L = scores.list;

    // 3. Pains, flags, coaching tips, quotes.
    const pains = [], flags = [], tips = [], quotes = [];
    for (const q of F.questions) {
      const a = s.answers[q.id];
      if (a && a.quote && a.quote.trim()) quotes.push({ qid: q.id, short: q.short, text: a.quote.trim() });
      if (!valid[q.id]) continue;
      F.selected(q, a).forEach((optId) => {
        const o = (q.options || []).find((x) => x.id === optId);
        if (!o) return;
        if (o.pain) {
          const p = a.pains[o.id] || {};
          pains.push({ qid: q.id, opt: o.id, label: o.painLabel || `${q.short}: ${o.label}`, impact: (p.impact || '').trim(), metric: (p.metric || '').trim() });
        }
        if (o.flag) flags.push({ qid: q.id, text: o.flag });
        if (o.tip) tips.push({ qid: q.id, opt: o.id, text: o.tip });
      });
    }

    // 4. Topic order: why → env → triggered (ranked) → other unlocked topics → late env → decision.
    const trig = valid.trigger ? F.selected(F.questionById.trigger, s.answers.trigger) : [];
    const topicHasEligible = (mid) => F.questions.some((q) => q.module === mid && eligible[q.id]);
    const triggered = [...new Set(trig.map((t) => F.meta.triggerModule[t]).filter(Boolean))].filter(topicHasEligible);
    const others = F.meta.modules.map((m) => m.id).filter((id) => !FIXED.includes(id) && !triggered.includes(id) && topicHasEligible(id));
    const order = ['why', 'env', ...triggered, ...others, 'late', 'decision'];
    const modules = ['why', 'env', ...triggered, ...others, 'decision'];
    const rankOf = (q) => { const i = order.indexOf(q.late ? 'late' : q.module); return i < 0 ? 99 : i; };

    // 5. Next-best-question: which unanswered questions split the leading plays / variants?
    const pairs = [];
    if (L[0] && L[0].score > 0) {
      for (let j = 1; j < Math.min(3, L.length); j++) {
        if (L[j].score > 0 && L[0].conf - L[j].conf < 0.15) pairs.push([L[0].id, L[j].id, `${L[0].play.short} vs ${L[j].play.short}`]);
      }
      const v = L[0].variants;
      if (v.length >= 2) {
        const decided = v[0].score > 0 && v[0].share >= 0.7 && v[0].score - v[1].score >= 15;
        if (!decided) for (let j = 1; j < v.length; j++) pairs.push([`${L[0].id}.${v[0].id}`, `${L[0].id}.${v[j].id}`, `${v[0].name} vs ${v[j].name}`]);
      }
    }
    const isOpen = (q) => eligible[q.id] && !F.isAnswered(q, s.answers[q.id]);
    const split = {};
    F.questions.forEach((q) => {
      if (!isOpen(q)) return;
      for (const [x, y, label] of pairs) {
        if (F.scoring.discrimination(q, x, y) >= 10) { split[q.id] = label; break; }
      }
    });

    // 6. Queue (skipped questions drop out but stay reachable via search / topics).
    // Drill-down: children of the last answer — and its siblings (same parent) — come first.
    const last = s.lastAnswered;
    const lastParents = last && F.questionById[last] ? refs(F.questionById[last].when) : [];
    const isChild = (q) => !!last && refs(q.when).some((r) => r === last || lastParents.includes(r));
    const queue = F.questions
      .filter((q) => isOpen(q) && !(s.answers[q.id] && s.answers[q.id].skipped))
      .sort((a, b) => {
        const k = (q) => [
          ui.focusModule ? (q.module === ui.focusModule ? 0 : 1) : 0,
          rankOf(q),
          isChild(q) ? 0 : 1,
          q.mustAsk ? 0 : 1,
          split[q.id] ? 0 : 1,
          QIDX[q.id],
        ];
        const ka = k(a), kb = k(b);
        for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
        return 0;
      })
      .map((q) => q.id);

    // 7. Topic progress.
    const progress = {};
    F.meta.modules.forEach((m) => {
      const qs = F.questions.filter((q) => q.module === m.id && eligible[q.id]);
      progress[m.id] = { eligible: qs.length, answered: qs.filter((q) => F.isAnswered(q, s.answers[q.id])).length };
    });

    // 8. Must-asks left and gaps for the next-call agenda.
    const mustLeft = F.questions.filter((q) => q.mustAsk && isOpen(q) && !(s.answers[q.id] && s.answers[q.id].skipped)).length;
    const topIds = L.slice(0, 2).filter((r) => r.score > 0).map((r) => r.id);
    const quals = L[0] && L[0].score > 0 ? L[0].play.qualifiers || [] : [];
    const gaps = F.questions
      .filter((q) => isOpen(q) && ((q.weight || 1) >= 2 || q.mustAsk))
      .map((q) => ({
        q,
        score: (q.weight || 1) * 10 + (q.mustAsk ? 15 : 0) + (topIds.some((p) => F.scoring.touchesPlay(q, p)) ? 10 : 0) + (quals.includes(q.id) ? 20 : 0),
      }))
      .sort((a, b) => b.score - a.score || QIDX[a.q.id] - QIDX[b.q.id])
      .slice(0, 10)
      .map((g) => g.q.id);

    const mp = F.meddpicc.compute(s, valid, pains);
    const primary = (s.primaryPlay && scores.byId[s.primaryPlay]) || L[0];

    return { valid, eligible, stale, scores, primary, pains, flags, tips, quotes, order, modules, triggered, queue, split, progress, mustLeft, gaps, mp };
  }

  F.router = { evaluate, isEligible, cond };
})(globalThis.Fivo = globalThis.Fivo || {});
