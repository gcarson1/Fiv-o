/* Fiv-o engine: eligibility, stale answers, question ordering, gaps, and the single
   `evaluate()` the UI and report read from.

   Ordering follows the five phases (F.meta.phases): a phase is finished before the next
   one starts, so the call follows the customer's story instead of hopping between topics.
   The only way back to an earlier phase is a topic that surfaces late (its "why now" and
   environment questions are asked as a quick catch-up). */
(function (F) {
  'use strict';

  const MOD = Object.fromEntries(F.meta.modules.map((m) => [m.id, m]));
  const PHASE = Object.fromEntries(F.meta.phases.map((p) => [p.id, p]));
  const QIDX = Object.fromEntries(F.questions.map((q, i) => [q.id, i]));
  const generic = (mid) => !!(MOD[mid] && MOD[mid].generic);

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

    // 2. Scores, then the technologies they point to.
    const scores = F.scoring.compute(s, valid);
    const L = scores.list;
    const tech = F.techEngine.evaluate(s, valid, scores);

    // Topics whose pitches were all turned down are set aside: their open questions leave
    // the flow (they stay reachable through search and phase review).
    const aside = {};
    F.meta.modules.forEach((m) => {
      if (m.serves && m.serves.length && m.serves.every((pid) => scores.byId[pid] && scores.byId[pid].declined)) aside[m.id] = true;
    });

    // 3. Pains (each with the number behind it), flags, coaching tips, quotes.
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
          const c = F.costs.ask(q, o);
          const pain = {
            qid: q.id, opt: o.id, phase: q.phase, label: o.painLabel || `${q.short}: ${o.label}`,
            ask: c.text, unit: p.unit || c.unit, amount: String(p.amount || '').trim(),
            impact: (p.impact || '').trim(), later: !!p.later, metric: (p.metric || '').trim(),
          };
          pain.value = F.costs.value(pain, s);
          if (pain.value) pain.metric = pain.value.text; // what MEDDPICC and the notes show
          pains.push(pain);
        }
        if (o.flag) flags.push({ qid: q.id, text: o.flag });
        if (o.tip) tips.push({ qid: q.id, opt: o.id, text: o.tip });
      });
    }
    const costs = F.costs.summary(pains, s);

    // 4. Topics in play: the customer's ranked triggers, then topics opened by answers.
    const trig = valid.trigger ? F.selected(F.questionById.trigger, s.answers.trigger) : [];
    const topicHasEligible = (mid) => F.questions.some((q) => q.module === mid && eligible[q.id]);
    const triggered = [...new Set(trig.map((t) => F.meta.triggerModule[t]).filter(Boolean))].filter(topicHasEligible);
    const others = F.meta.modules.filter((m) => !m.generic && !triggered.includes(m.id) && topicHasEligible(m.id)).map((m) => m.id);
    const topics = [...triggered, ...others];
    const order = ['why', 'env', ...topics, 'change', 'decision'];
    const modules = order;
    const rankOf = (q) => (generic(q.module) ? -1 : topics.indexOf(q.module) < 0 ? 99 : topics.indexOf(q.module));

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
    const isOpen = (q) => eligible[q.id] && !aside[q.module] && !F.isAnswered(q, s.answers[q.id]);
    const split = {};
    F.questions.forEach((q) => {
      if (!isOpen(q)) return;
      for (const [x, y, label] of pairs) {
        if (F.scoring.discrimination(q, x, y) >= 10) { split[q.id] = label; break; }
      }
    });

    // 6. Queue (skipped questions drop out but stay reachable via search / phase review).
    //    Phase first. Inside a phase: follow-ups to the last answer, then the phase's own
    //    order (seq), then — in "by topic" phases — the topic being discussed and the
    //    customer's ranking, then the order questions are written in.
    //    A topic the customer just raised (ui.focusModule) catches up to the current phase first;
    //    ui.focusPhase jumps to a phase (e.g., decision questions before time runs out).
    const candidates = F.questions.filter((q) => isOpen(q) && !(s.answers[q.id] && s.answers[q.id].skipped));
    const phaseNow = Math.min(Infinity, ...candidates.filter((q) => q.module !== ui.focusModule).map((q) => q.phase));
    const catchUp = (q) => !!ui.focusModule && q.module === ui.focusModule && q.phase <= phaseNow;
    const lastQ = s.lastAnswered && F.questionById[s.lastAnswered];
    const lastParents = lastQ ? refs(lastQ.when) : [];
    const isChild = (q) => !!lastQ && refs(q.when).some((r) => r === lastQ.id || lastParents.includes(r));
    const sameTopic = (q) => !!lastQ && !generic(lastQ.module) && lastQ.phase === q.phase && lastQ.module === q.module;
    const queue = candidates
      .sort((a, b) => {
        const k = (q) => {
          const byTopic = PHASE[q.phase] && PHASE[q.phase].byTopic;
          return [
            catchUp(q) ? 0 : 1,
            ui.focusPhase ? (q.phase === ui.focusPhase ? 0 : 1) : 0,
            q.phase,
            isChild(q) ? 0 : 1,
            q.seq || 0,
            byTopic && sameTopic(q) ? 0 : 1,
            byTopic ? rankOf(q) : 0,
            QIDX[q.id],
          ];
        };
        const ka = k(a), kb = k(b);
        for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
        return 0;
      })
      .map((q) => q.id);
    const focusLeft = candidates.filter(catchUp).length;

    // 7. Progress per topic and per phase (set-aside topics don't count).
    const progress = {};
    F.meta.modules.forEach((m) => {
      const qs = F.questions.filter((q) => q.module === m.id && eligible[q.id]);
      progress[m.id] = { eligible: qs.length, answered: qs.filter((q) => F.isAnswered(q, s.answers[q.id])).length };
    });
    const phases = {};
    F.meta.phases.forEach((ph) => {
      const qs = F.questions.filter((q) => q.phase === ph.id && eligible[q.id] && !aside[q.module]);
      const answered = qs.filter((q) => F.isAnswered(q, s.answers[q.id])).length;
      const open = qs.filter((q) => !F.isAnswered(q, s.answers[q.id]) && !(s.answers[q.id] && s.answers[q.id].skipped)).length;
      phases[ph.id] = { eligible: qs.length, answered, open, skipped: qs.length - answered - open };
    });

    // 8. Must-asks left and gaps for the next-call agenda.
    const mustLeft = candidates.filter((q) => q.mustAsk).length;
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
    const pinnedPlay = s.primaryPlay && scores.byId[s.primaryPlay];
    const primary = (pinnedPlay && !pinnedPlay.declined && pinnedPlay) || L[0];
    const license = F.licensingEngine.recommend(s, { valid, scores, primary, tech });

    return {
      valid, eligible, stale, scores, primary, tech, aside, license, pains, costs, flags, tips, quotes,
      order, modules, topics, triggered, queue, focusLeft, split, progress, phases, mustLeft, gaps, mp,
    };
  }

  F.router = { evaluate, isEligible, cond };
})(globalThis.Fivo = globalThis.Fivo || {});
