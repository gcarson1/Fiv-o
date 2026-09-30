/* Fiv-o engine: the number behind each pain — the prompt to ask, reading what was typed,
   a per-year value, and the running total for the business case.
   Hours are valued at a loaded hourly rate (s.wrap.rate, default F.meta.hourlyRate). */
(function (F) {
  'use strict';

  const UNIT = Object.fromEntries(F.meta.units.map((u) => [u.id, u]));
  const DEFAULT_ASK = ['What does that cost — in hours, dollars, or people affected?', 'hpm'];
  const TEAM = { t1: 1.5, t2: 4, t3: 10, t4: 20 }; // people, for "% of team time"
  const FTE_HOURS = 2080;

  const rate = (s) => Number(s && s.wrap && s.wrap.rate) || F.meta.hourlyRate;
  const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
  const num = (n) => round(n, 1).toLocaleString('en-US');

  function money(n) {
    const a = Math.abs(n);
    if (a >= 1e6) return `$${round(n / 1e6, 1)}M`;
    if (a >= 1e4) return `$${Math.round(n / 1e3)}k`;
    if (a >= 1e3) return `$${round(n / 1e3, 1)}k`;
    return `$${Math.round(n)}`;
  }

  // The question to ask for a pain's number: option → question → default.
  function ask(q, o) {
    const c = (o && o.cost) || (q && q.cost) || DEFAULT_ASK;
    return { text: c[0], unit: UNIT[c[1]] ? c[1] : 'other' };
  }

  // "16" → 16 · "$40k" → 40000 · "1.2M" → 1200000 · "12-16" → 14 · "4 x 3" → 12 · "about 20 hrs" → 20.
  function parse(v) {
    const str = String(v == null ? '' : v).toLowerCase().replace(/,/g, '');
    const nums = [...str.matchAll(/(\d+(?:\.\d+)?)(k|m)?(?![a-z0-9.])/g)]
      .map((m) => parseFloat(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1));
    if (!nums.length) return null;
    if (nums.length > 1 && /\d\s*[km]?\s*(x|×|\*)\s*\$?\d/.test(str)) return nums[0] * nums[1];
    if (nums.length > 1 && /\d\s*[km]?\s*(-|–|to)\s*\$?\d/.test(str)) return (nums[0] + nums[1]) / 2;
    return nums[0];
  }

  function teamSize(s) {
    const a = s && s.answers && s.answers['env.itteam'];
    return a && TEAM[a.value];
  }

  // A pain's number → { n, unit, annual, once, perDay, text }, or null if nothing was entered.
  function value(p, s) {
    const raw = String(p.amount || '').trim();
    if (!raw) return null;
    const u = UNIT[p.unit] || UNIT.other;
    const n = u.kind === 'text' ? null : parse(raw);
    const out = { n, unit: u.id, annual: null, once: null, perDay: null, text: '' };
    if (n != null) {
      if (u.kind === 'hours') out.annual = n * u.yearly * rate(s);
      else if (u.kind === 'usd') out.annual = n * u.yearly;
      else if (u.kind === 'once') out.once = n;
      else if (u.kind === 'perDay') out.perDay = n;
      else if (u.kind === 'pct' && teamSize(s)) out.annual = (n / 100) * teamSize(s) * FTE_HOURS * rate(s);
    }
    const fmt = {
      hpw: () => `${num(n)} hrs/week`,
      hpm: () => `${num(n)} hrs/month`,
      pct: () => `${num(n)}% of team time`,
      dpy: () => `${money(n)}/year`,
      dpm: () => `${money(n)}/month`,
      usd: () => `${money(n)} one-time`,
      dpd: () => `${money(n)} per day down`,
      days: () => `${num(n)} days`,
      people: () => `${num(n)} people`,
    }[u.id];
    out.text = n != null && fmt ? fmt() : raw + (u.id !== 'other' ? ` (${u.label})` : '');
    return out;
  }

  // "≈ $14k/yr" for anything that turns into a yearly figure (hours need the rate).
  function estimate(v, s) {
    if (!v || v.annual == null) return '';
    const hours = UNIT[v.unit].kind === 'hours' || UNIT[v.unit].kind === 'pct';
    if (!hours && v.unit === 'dpy') return '';
    return `≈ ${money(v.annual)}/yr${hours ? ` at $${rate(s)}/hr` : ''}`;
  }

  // Totals across pains. Downtime estimates overlap, so per-day cost is the largest, not a sum.
  function summary(pains, s) {
    const out = { annual: 0, once: 0, perDay: 0, count: pains.length, quantified: 0, missing: [], later: [], rate: rate(s), hours: false };
    pains.forEach((p) => {
      if (p.value || p.metric) out.quantified++;
      else (p.later ? out.later : out.missing).push(p);
      if (!p.value) return;
      if (p.value.annual && ['hours', 'pct'].includes(UNIT[p.value.unit].kind)) out.hours = true;
      out.annual += p.value.annual || 0;
      out.once += p.value.once || 0;
      out.perDay = Math.max(out.perDay, p.value.perDay || 0);
    });
    return out;
  }

  // "≈ $124k/yr · $250k one-time · $50k per day down" (only the parts that exist).
  function line(sum) {
    return [
      sum.annual ? `≈ ${money(sum.annual)}/yr` : null,
      sum.once ? `${money(sum.once)} one-time` : null,
      sum.perDay ? `${money(sum.perDay)} per day down` : null,
    ].filter(Boolean).join(' · ');
  }

  F.costs = { ask, parse, value, estimate, summary, line, money, rate, units: F.meta.units, unitById: UNIT };
})(globalThis.Fivo = globalThis.Fivo || {});
