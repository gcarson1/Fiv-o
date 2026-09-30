// The five-phase call flow and the number behind every pain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFivo, answer } from './load.mjs';

const F = loadFivo();
const fresh = () => F.state.newSession({ account: 'Acme' });
const ev = (s, ui) => F.router.evaluate(s, ui);
const phaseOf = (id) => F.questionById[id].phase;
const terms = (c) => (c ? [...(c.any || []), ...(c.all || []), ...(c.not || [])] : []);
const first = (s, id) => {
  const q = F.questionById[id];
  if (q.type === 'single') answer(F, s, id, q.options[0].id);
  else if (q.type === 'multi') answer(F, s, id, [q.options[0].id]);
  else if (q.type === 'fields') answer(F, s, id, { [q.fields[0].id]: '10' });
  else answer(F, s, id, 'x');
};

// ── Content ───────────────────────────────────────────────────────────────────
test('every question belongs to one of the five phases, written in phase order', () => {
  assert.deepEqual(F.meta.phases.map((p) => p.id), [1, 2, 3, 4, 5]);
  let prev = 1;
  for (const q of F.questions) {
    assert.ok([1, 2, 3, 4, 5].includes(q.phase), `${q.id}: bad phase ${q.phase}`);
    assert.ok(q.phase >= prev, `${q.id} (phase ${q.phase}) is written after a phase-${prev} question`);
    prev = q.phase;
  }
});

test('a question only waits on its own or an earlier phase (no jumping back)', () => {
  for (const q of F.questions) {
    for (const t of terms(q.when)) {
      const src = t.split(':')[0];
      assert.ok(phaseOf(src) <= q.phase, `${q.id} (phase ${q.phase}) waits on ${src} (phase ${phaseOf(src)})`);
    }
  }
});

test('pains live in why-now or pain & cost, and each has a question that asks for its number', () => {
  const units = new Set(F.meta.units.map((u) => u.id));
  let n = 0;
  for (const q of F.questions) {
    for (const o of q.options || []) {
      if (!o.pain) continue;
      n++;
      assert.ok([1, 3].includes(q.phase), `${q.id}.${o.id}: pain in phase ${q.phase}`);
      const c = o.cost || q.cost;
      assert.ok(c && /\?$/.test(c[0]), `${q.id}.${o.id}: no "get the number" question`);
      assert.ok(units.has(c[1]), `${q.id}.${o.id}: unknown unit ${c[1]}`);
    }
  }
  assert.ok(n > 40);
});

// ── Flow ──────────────────────────────────────────────────────────────────────
test('a call walks the phases in order — stepping back only to catch up on a topic that just came up', () => {
  const calls = [['vmware'], ['resilience', 'hardware'], ['ops', 'cloud'], ['storage', 'euc', 'db'], ['edge', 'ai', 'k8s'], ['cost'], ['explore']];
  for (const trig of calls) {
    const s = fresh();
    answer(F, s, 'trigger', trig);
    const asked = [];
    for (let i = 0; i < 200; i++) {
      const d = ev(s);
      const id = d.queue[0];
      if (!id) break;
      asked.push({ id, phase: phaseOf(id), topics: d.topics.slice() });
      first(s, id);
    }
    assert.ok(asked.length > 15, `${trig}: walked a real call`);
    for (let i = 1; i < asked.length; i++) {
      if (asked[i].phase >= asked[i - 1].phase) continue;
      const opened = asked[i].topics.filter((t) => !asked[i - 1].topics.includes(t));
      assert.ok(opened.includes(F.questionById[asked[i].id].module),
        `${trig}: ${asked[i - 1].id} → ${asked[i].id} went back a phase without a new topic`);
    }
    assert.equal(asked[asked.length - 1].id, 'dec.nextstep', `${trig}: the call ends on the next step`);
  }
});

test('why now goes event → date → consequence, top-ranked topic first', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['resilience', 'vmware', 'cloud']);
  assert.deepEqual(ev(s).queue.filter((id) => phaseOf(id) === 1),
    ['res.event', 'cloud.direction', 'why.urgency', 'vmw.renewal', 'cloud.deadline', 'why.consequence']);
});

test('the environment is one pass: platform, size, storage, servers, network, sites, team, backup, cloud', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  assert.deepEqual(ev(s).queue.filter((id) => phaseOf(id) === 2), [
    'env.hypervisor', 'vmw.version', 'vmw.license', 'env.counts', 'env.storage', 'env.servers',
    'vmw.nsx', 'vmw.addons', 'env.sites', 'env.itteam', 'env.backup', 'env.cloud',
  ]);
});

test('site staffing is asked with the sites, in the environment pass', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['ops']);
  answer(F, s, 'env.sites', 's6');
  const q = ev(s).queue;
  assert.equal(q.filter((id) => phaseOf(id) === 2)[0], 'edge.staff');
  assert.ok(q.indexOf('edge.staff') < q.indexOf('ops.cost'), 'long before cost visibility');
});

test('pain & cost takes topics in the customer’s order', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['ops', 'vmware']);
  const q3 = ev(s).queue.filter((id) => phaseOf(id) === 3);
  assert.equal(q3[0], 'ops.upgrades');
  assert.equal(q3[q3.length - 1], 'vmw.price');
});

test('a topic found in the environment pass catches up on its deadline, then the pass continues', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['ops']);
  first(s, 'why.urgency');
  first(s, 'why.consequence');
  answer(F, s, 'env.hypervisor', ['vsphere']);
  const q = ev(s).queue;
  assert.equal(q[0], 'vmw.renewal');
  assert.equal(q[1], 'vmw.version');
});

test('a topic added mid-call catches up to the current phase, then the phase carries on', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['ops']);
  for (const id of ev(s).queue.filter((x) => phaseOf(x) < 3)) F.state.skip(s, id);
  s.answers.trigger.value.push('euc');
  const d = ev(s, { focusModule: 'euc' });
  assert.deepEqual(d.queue.slice(0, 5), ['euc.platform', 'euc.users', 'euc.type', 'euc.gpu', 'euc.pain']);
  assert.equal(F.questionById[d.queue[5]].module, 'ops');
  assert.equal(d.focusLeft, 5);
});

test('jumping to Decision puts its questions first', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  assert.equal(ev(s, { focusPhase: 5 }).queue[0], 'dec.eb');
});

test('phase progress counts what is left in each phase', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  first(s, 'why.urgency');
  F.state.skip(s, 'vmw.renewal');
  const p = ev(s).phases[1];
  assert.deepEqual(p, { eligible: 4, answered: 2, open: 1, skipped: 1 });
});

// ── The number behind each pain ───────────────────────────────────────────────
test('amounts read the way people say them', () => {
  const p = F.costs.parse;
  assert.equal(p('16'), 16);
  assert.equal(p('$40k'), 40000);
  assert.equal(p('1.2M'), 1.2e6);
  assert.equal(p('$180,000'), 180000);
  assert.equal(p('12-16'), 14);
  assert.equal(p('4 x 3'), 12);
  assert.equal(p('about 20 hrs'), 20);
  assert.equal(p('40%'), 40);
  assert.equal(p('no idea'), null);
});

test('a pain comes with its own question and unit, and its number becomes a yearly cost', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['ops']);
  answer(F, s, 'ops.upgrades', 'weekends');
  let d = ev(s);
  let pain = d.pains.find((p) => p.qid === 'ops.upgrades');
  assert.match(pain.ask, /hours/);
  assert.equal(pain.unit, 'hpm');
  assert.equal(pain.value, null);
  assert.equal(d.costs.missing.length, 1);
  F.state.setPain(s, 'ops.upgrades', 'weekends', 'amount', '16');
  d = ev(s);
  pain = d.pains[0];
  assert.equal(pain.value.text, '16 hrs/month');
  assert.equal(pain.value.annual, 16 * 12 * 75);
  assert.equal(F.costs.estimate(pain.value, s), '≈ $14k/yr at $75/hr');
  assert.equal(d.costs.annual, 14400);
  assert.equal(d.costs.quantified, 1);
  assert.equal(d.mp.byKey.M.level, 2, 'a number is a metric');

  s.wrap.rate = '100';
  assert.equal(ev(s).costs.annual, 16 * 12 * 100);
  F.state.setPain(s, 'ops.upgrades', 'weekends', 'unit', 'dpy');
  F.state.setPain(s, 'ops.upgrades', 'weekends', 'amount', '$50k');
  d = ev(s);
  assert.equal(d.costs.annual, 50000);
  assert.equal(F.costs.estimate(d.pains[0].value, s), '', 'already a yearly figure');
});

test('one-time costs and downtime are kept apart from the yearly total', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['resilience']);
  answer(F, s, 'res.event', ['ransomware', 'faileddr']);
  answer(F, s, 'res.recovery', 'weeks');
  F.state.setPain(s, 'res.event', 'ransomware', 'amount', '400k');
  F.state.setPain(s, 'res.event', 'faileddr', 'amount', '50k');
  F.state.setPain(s, 'res.recovery', 'weeks', 'amount', '80k');
  const c = ev(s).costs;
  assert.equal(c.once, 400000);
  assert.equal(c.perDay, 80000, 'downtime estimates overlap: the largest, not the sum');
  assert.equal(c.annual, 0);
  assert.equal(F.costs.line(c), '$400k one-time · $80k per day down');
});

test('% of team time converts to dollars once the team size is known', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['ops']);
  answer(F, s, 'ops.hours', 'gt50');
  F.state.setPain(s, 'ops.hours', 'gt50', 'unit', 'pct');
  F.state.setPain(s, 'ops.hours', 'gt50', 'amount', '50');
  assert.equal(ev(s).costs.annual, 0, 'no team size yet');
  answer(F, s, 'env.itteam', 't2');
  assert.equal(ev(s).costs.annual, 0.5 * 4 * 2080 * 75);
});

test('a pain with no number yet goes on the next call’s agenda', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['ops']);
  answer(F, s, 'ops.upgrades', 'behind');
  F.state.setPain(s, 'ops.upgrades', 'behind', 'later', true);
  const d = ev(s);
  assert.equal(d.costs.later.length, 1);
  const txt = F.report.crm(s, d);
  assert.match(txt, /- Patching falls behind — no number yet — ask next call/);
  assert.match(txt, /OPEN QUESTIONS FOR NEXT CALL[\s\S]*- Put a number on: Patching falls behind/);
});

test('the notes follow the five phases, each pain with its number', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  answer(F, s, 'vmw.renewal', '3to6');
  answer(F, s, 'env.hypervisor', ['vsphere']);
  answer(F, s, 'env.servers', 'old');
  answer(F, s, 'vmw.price', 'gt3');
  F.state.setPain(s, 'vmw.price', 'gt3', 'amount', '$240k');
  F.state.setPain(s, 'vmw.price', 'gt3', 'impact', 'Unbudgeted — CFO escalation');
  answer(F, s, 'vmw.intent', 'exit');
  answer(F, s, 'chg.fears', ['downtime', 'compliance']);
  answer(F, s, 'dec.budget', 'approved', { note: 'CFO above $250k' });
  const txt = F.report.crm(s, ev(s));
  const at = (h) => txt.indexOf(`\n${h}\n`);
  const order = ['WHY NOW', 'CURRENT ENVIRONMENT', 'PAIN AND COST', 'CHANGE AND RISK', 'DECISION'].map(at);
  assert.ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), `sections out of order: ${order}`);
  assert.match(txt, /- VMware renewal quoted >3x — \$240k\/year — impact: Unbudgeted — CFO escalation/);
  assert.match(txt, /- Total: ≈ \$240k\/yr — 1 of 1 pain has a number\n/);
  assert.match(txt, /- Server age: 5\+ years, or warranty ending soon/);
  assert.match(txt, /- Switching worries: Migration effort and downtime; Compliance-sensitive systems/);
  assert.match(txt, /- Budget & approval: Budgeted and approved \(CFO above \$250k\)/);
});
