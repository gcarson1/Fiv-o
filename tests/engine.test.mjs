// Engine unit tests + scripted customer scenarios (expected play and variant).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFivo, answer } from './load.mjs';

const F = loadFivo();
const fresh = () => F.state.newSession({ account: 'Acme' });
const top = (d) => d.scores.list[0];

test('a new session starts on the why-now question', () => {
  const d = F.router.evaluate(fresh());
  assert.equal(d.queue[0], 'trigger');
  assert.equal(d.scores.list.every((r) => r.score === 0), true);
});

test('VMware module only unlocks with a VMware trigger or vSphere', () => {
  const s = fresh();
  assert.ok(!F.router.evaluate(s).eligible['vmw.license']);
  answer(F, s, 'env.hypervisor', ['vsphere']);
  assert.ok(F.router.evaluate(s).eligible['vmw.license']);
});

test('ranked trigger order drives topic order and weighting', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['resilience', 'vmware']);
  const d = F.router.evaluate(s);
  assert.deepEqual(d.triggered, ['resilience', 'vmware']);
  assert.ok(d.order.indexOf('resilience') < d.order.indexOf('vmware'));
  // First pick gets the 1.4x multiplier.
  assert.equal(d.scores.byId.dr.score, 28);
  assert.equal(d.scores.byId.vmw.score, 30 * 1.15);
});

test('changing an answer marks dependent answers stale and drops their signals', () => {
  const s = fresh();
  answer(F, s, 'env.storage', 'san');
  answer(F, s, 'env.array.vendor', 'everpure');
  let d = F.router.evaluate(s);
  assert.ok(d.valid['env.array.vendor']);
  const before = d.scores.raw['vmw.ext'];
  answer(F, s, 'env.storage', 'vsan');
  d = F.router.evaluate(s);
  assert.ok(d.stale['env.array.vendor'], 'array vendor should be stale after switching to vSAN');
  assert.ok(!d.valid['env.array.vendor']);
  assert.ok((d.scores.raw['vmw.ext'] || 0) < before);
  assert.ok(s.answers['env.array.vendor'], 'stale answers are kept, not deleted');
});

test('child questions jump to the front after their parent is answered', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  answer(F, s, 'env.storage', 'san');
  const d = F.router.evaluate(s);
  assert.equal(d.queue.find((id) => id.startsWith('env.')), 'env.array.vendor');
});

test('siblings of the last answer stay together (array vendor → array age)', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  answer(F, s, 'env.storage', 'san');
  answer(F, s, 'env.array.vendor', 'everpure');
  assert.equal(F.router.evaluate(s).queue.find((id) => id.startsWith('env.')), 'env.array.age');
});

test('multi-select signals count live, before Done', () => {
  const s = fresh();
  F.state.selectOption(s, 'trigger', 'db');
  const d = F.router.evaluate(s);
  assert.ok(d.scores.byId.ndb.score > 0);
  assert.ok(d.queue.includes('trigger'), 'still open until Done');
});

test('Done with nothing selected counts as a skip', () => {
  const s = fresh();
  F.state.markDone(s, 'env.cloud');
  assert.equal(s.answers['env.cloud'].skipped, true);
  assert.ok(!F.router.evaluate(s).queue.includes('env.cloud'));
});

test('pains capture impact/metric and feed MEDDPICC I and M', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  answer(F, s, 'vmw.price', '2to3');
  let d = F.router.evaluate(s);
  assert.equal(d.pains.length, 1);
  assert.equal(d.mp.byKey.I.level, 1);
  F.state.setPain(s, 'vmw.price', '2to3', 'impact', '$180k unbudgeted');
  F.state.setPain(s, 'vmw.price', '2to3', 'metric', '+$180k/yr');
  d = F.router.evaluate(s);
  assert.equal(d.mp.byKey.I.level, 2);
  assert.equal(d.mp.byKey.M.level, 2);
});

test('option-level MEDDPICC levels override the question default', () => {
  const s = fresh();
  answer(F, s, 'dec.eb', 'unknown', { note: 'maybe CFO' });
  assert.equal(F.router.evaluate(s).mp.byKey.E.level, 0);
  answer(F, s, 'dec.eb', 'engaged');
  assert.equal(F.router.evaluate(s).mp.byKey.E.level, 2);
  answer(F, s, 'dec.competition', ['vcf', 'unknown']);
  assert.equal(F.router.evaluate(s).mp.byKey.CO.level, 1);
});

test('a play locks in only when confident and qualified', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  answer(F, s, 'env.hypervisor', ['vsphere']);
  answer(F, s, 'vmw.price', 'gt3');
  let r = F.router.evaluate(s).scores.byId.vmw;
  assert.ok(r.conf >= F.scoring.READY);
  assert.equal(r.ready, false, 'qualifiers still missing');
  answer(F, s, 'vmw.renewal', '3to6');
  answer(F, s, 'vmw.intent', 'exit');
  answer(F, s, 'env.storage', 'vsan');
  r = F.router.evaluate(s).scores.byId.vmw;
  assert.equal(r.ready, true);
});

test('next-best-question flags questions that split the leading variants', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  answer(F, s, 'env.hypervisor', ['vsphere']);
  const d = F.router.evaluate(s);
  assert.match(d.split['env.storage'] || '', /Full-stack HCI vs/);
});

test('report contains the key sections and no stale answers', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['vmware']);
  answer(F, s, 'env.storage', 'san');
  answer(F, s, 'env.array.vendor', 'everpure');
  answer(F, s, 'env.storage', 'vsan');
  answer(F, s, 'vmw.renewal', '3to6', { quote: 'We are not paying triple.' });
  answer(F, s, 'dec.nextstep', ['collector'], { note: 'Jane, by 10/6' });
  const d = F.router.evaluate(s);
  const txt = F.report.crm(s, d);
  for (const h of ['DISCOVERY NOTES — Acme', 'WHY NOW', 'CURRENT ENVIRONMENT', 'RECOMMENDED PLAY', 'MEDDPICC', 'OPEN QUESTIONS FOR NEXT CALL', 'NEXT STEPS', 'IN THEIR WORDS']) {
    assert.ok(txt.includes(h), `missing ${h}`);
  }
  assert.ok(!txt.includes('Everpure'), 'stale array answer must not appear');
  assert.ok(txt.includes('Jane, by 10/6'));
  assert.ok(!/[*#`]/.test(txt), 'CRM notes should be plain text');
});

test('sessions save, list, reload and delete through localStorage', () => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  try {
    const s = fresh();
    answer(F, s, 'trigger', ['vmware']);
    assert.equal(F.state.save(s), true);
    assert.equal(F.state.list().length, 1);
    assert.deepEqual(F.state.get(s.id).answers, s.answers);
    F.state.remove(s.id);
    assert.equal(F.state.list().length, 0);
  } finally {
    delete globalThis.localStorage;
  }
  assert.equal(F.state.save(fresh()), false, 'no storage → save reports failure instead of throwing');
});

test('starting call 2 reopens the next-step question and keeps it for the recap', () => {
  const s = fresh();
  answer(F, s, 'dec.nextstep', ['collector'], { note: 'by Friday' });
  F.state.startNextCall(s);
  assert.equal(s.calls.length, 2);
  assert.equal(s.answers['dec.nextstep'], undefined);
  assert.equal(s.recap.prevNextStep, 'Collector / RVTools sizing (by Friday)');
});

test('session JSON round-trips', () => {
  const s = fresh();
  answer(F, s, 'trigger', ['ai']);
  const back = F.state.importJSON(F.state.exportJSON(s));
  assert.deepEqual(back.answers, s.answers);
  assert.throws(() => F.state.importJSON('{"nope":1}'));
});

// ── Scripted customer scenarios ──────────────────────────────────────────────

const scenario = (steps) => {
  const s = fresh();
  for (const [qid, v] of steps) answer(F, s, qid, v);
  return F.router.evaluate(s);
};

test('scenario: VVF renewal + vSAN → VMware exit, full-stack HCI', () => {
  const d = scenario([
    ['trigger', ['vmware']], ['env.itteam', 't2'], ['env.hypervisor', ['vsphere']], ['env.storage', 'vsan'],
    ['vmw.license', 'vvf'], ['vmw.renewal', '6to12'], ['vmw.price', '2to3'], ['vmw.intent', 'exit'],
  ]);
  assert.equal(top(d).id, 'vmw');
  assert.equal(top(d).variant.id, 'hci');
  assert.equal(top(d).ready, true);
});

test('scenario: 2-year-old Everpure array → VMware exit, keep-your-array', () => {
  const d = scenario([
    ['trigger', ['vmware']], ['env.hypervisor', ['vsphere']], ['env.storage', 'san'],
    ['env.array.vendor', 'everpure'], ['env.array.age', 'new'], ['vmw.renewal', '3to6'], ['vmw.intent', 'exit'],
  ]);
  assert.equal(top(d).id, 'vmw');
  assert.equal(top(d).variant.id, 'ext');
});

test('scenario: AVS exit → VMware exit, NC2 cloud landing', () => {
  const d = scenario([
    ['trigger', ['vmware', 'cloud']], ['env.hypervisor', ['vsphere']], ['env.cloud', ['azure', 'vmc']],
    ['vmw.license', 'cloud'], ['cloud.direction', ['exit']], ['cloud.refactor', 'none'],
  ]);
  // Both stories fit an AVS exit; the VMware play must resolve to its NC2 variant.
  assert.deepEqual(d.scores.list.slice(0, 2).map((r) => r.id).sort(), ['nc2', 'vmw']);
  assert.equal(d.scores.byId.vmw.variant.id, 'nc2');
});

test('scenario: ransomware + flat network + no second site → cyber, then DR to cloud', () => {
  const d = scenario([
    ['trigger', ['resilience']], ['env.itteam', 't2'], ['env.hypervisor', ['hyperv']],
    ['res.event', ['ransomware', 'nosite']], ['res.dr', 'none'], ['res.site2', 'cloud'],
    ['res.network', 'flat'], ['res.immutability', 'no'], ['res.recovery', 'weeks'],
  ]);
  assert.equal(d.scores.list[0].id, 'cyber');
  assert.equal(d.scores.list[1].id, 'dr');
  assert.equal(d.scores.byId.dr.variant.id, 'cloud');
});

test('scenario: three DBAs drowning in SQL sprawl → NDB', () => {
  const d = scenario([
    ['trigger', ['db']], ['env.itteam', 't3'], ['env.hypervisor', ['vsphere']],
    ['db.engines', ['mssql', 'pg']], ['db.count', '100to500'], ['db.dbas', '2to3'],
    ['db.provision', 'days'], ['db.clones', 'manual'],
  ]);
  assert.equal(top(d).id, 'ndb');
});

test('scenario: Horizon user surfaces the EUC play with the Horizon variant', () => {
  const d = scenario([
    ['trigger', ['vmware']], ['env.hypervisor', ['vsphere']], ['vmw.addons', ['horizon']],
    ['euc.platform', 'horizon'], ['euc.pain', ['bundle', 'storms']],
  ]);
  assert.ok(d.modules.includes('euc'), 'EUC topic should unlock from Horizon');
  const euc = d.scores.byId.euc;
  assert.ok(d.scores.list.indexOf(euc) <= 1, 'EUC should be a top-2 play');
  assert.equal(euc.variant.id, 'horizon');
});

test('scenario: small team, painful upgrades → simplify ops leads', () => {
  const d = scenario([
    ['trigger', ['ops']], ['env.itteam', 't1'], ['env.hypervisor', ['physical']],
    ['ops.upgrades', 'weekends'], ['ops.hours', 'gt50'], ['ops.consoles', 'many'],
  ]);
  assert.equal(top(d).id, 'ops');
});

test('scenario: regulated data + pilots → private AI', () => {
  const d = scenario([
    ['trigger', ['ai']], ['ai.stage', 'pilots'], ['ai.data', 'no'], ['ai.usecases', ['rag', 'docs']], ['ai.gpu', 'have'],
  ]);
  assert.equal(top(d).id, 'ai');
  assert.equal(top(d).variant.id, 'private');
});
