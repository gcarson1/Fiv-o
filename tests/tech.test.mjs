// DISC content, technology suggestions, "not interested" handling, and the license sketch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFivo, answer } from './load.mjs';

const F = loadFivo();
const fresh = () => F.state.newSession({ account: 'Acme' });
const ev = (s) => F.router.evaluate(s);
const techOf = (d, id) => d.tech.find((t) => t.id === id);
const run = (steps) => {
  const s = fresh();
  for (const [qid, v] of steps) answer(F, s, qid, v);
  return s;
};

// ── DISC ──────────────────────────────────────────────────────────────────────
test('every question has four distinct DISC phrasings', () => {
  const keys = F.disc.styles.map((x) => x.k);
  assert.deepEqual(keys, ['D', 'I', 'S', 'C']);
  for (const q of F.questions) {
    const a = F.disc.ask[q.id];
    assert.ok(a, `${q.id}: no DISC phrasings`);
    for (const k of keys) assert.ok(a[k] && a[k].trim().length > 5, `${q.id}: missing ${k}`);
    assert.equal(new Set(keys.map((k) => a[k])).size, 4, `${q.id}: phrasings should differ`);
  }
  for (const id of Object.keys(F.disc.ask)) assert.ok(F.questionById[id], `DISC entry for unknown question ${id}`);
});

// ── Technology content ────────────────────────────────────────────────────────
test('technology evidence and core links point at real questions, pitches and versions', () => {
  const playIds = new Set(F.plays.map((p) => p.id));
  const variantIds = new Set(F.plays.flatMap((p) => (p.variants || []).map((v) => `${p.id}.${v.id}`)));
  const ids = new Set();
  for (const t of F.tech) {
    assert.ok(!ids.has(t.id), `duplicate tech ${t.id}`); ids.add(t.id);
    assert.ok(t.name && t.what, `${t.id}: needs name and what`);
    assert.ok(playIds.has(t.play), `${t.id}: unknown pitch ${t.play}`);
    for (const c of t.core) assert.ok(playIds.has(c) || variantIds.has(c), `${t.id}: unknown core target ${c}`);
    for (const [term, w] of t.evidence) {
      assert.ok(w > 0 && w <= 1, `${t.id}: weight ${w}`);
      const [kind, rest] = [term.slice(0, term.indexOf(':')), term.slice(term.indexOf(':') + 1)];
      if (kind === 'play') assert.ok(playIds.has(rest), `${t.id}: ${term}`);
      else if (kind === 'variant') assert.ok(variantIds.has(rest), `${t.id}: ${term}`);
      else {
        const q = F.questionById[kind];
        assert.ok(q, `${t.id}: unknown question in ${term}`);
        assert.ok(q.options.some((o) => o.id === rest), `${t.id}: unknown option in ${term}`);
      }
    }
  }
});

test('every topic that serves pitches names real ones', () => {
  const playIds = new Set(F.plays.map((p) => p.id));
  for (const m of F.meta.modules) for (const p of m.serves || []) assert.ok(playIds.has(p), `${m.id} serves unknown ${p}`);
});

// ── Suggestions ───────────────────────────────────────────────────────────────
test('a flat network suggests Flow Network Security, with the reason', () => {
  const d = ev(run([['trigger', ['resilience']], ['res.network', 'flat']]));
  const flow = techOf(d, 'flow');
  assert.equal(flow.suggested, true);
  assert.ok(flow.why.some((w) => /Mostly flat/.test(w)));
  assert.equal(techOf(d, 'ndb').suggested, false);
});

test('nothing is suggested on a blank session', () => {
  assert.equal(ev(fresh()).tech.filter((t) => t.suggested).length, 0);
});

// ── Not interested ────────────────────────────────────────────────────────────
test('declining a technology removes it from scope and the license, and records it', () => {
  const s = run([['trigger', ['resilience']], ['res.network', 'flat'], ['res.dr', 'manual']]);
  F.state.setTech(s, 'flow', 'declined');
  F.state.setTechNote(s, 'flow', 'Firewall team owns segmentation');
  const d = ev(s);
  const flow = techOf(d, 'flow');
  assert.equal(flow.inScope, false);
  assert.equal(flow.status, 'declined');
  assert.ok(!/Microsegmentation/.test(d.license.core[0].why.join(' ')), 'no longer drives the license');
  assert.ok(d.license.excluded.some((x) => x.title === 'Flow Network Security'));
  assert.match(F.report.crm(s, d), /Not interested \(explicit\): Flow Network Security — Firewall team owns segmentation/);
});

test('declining the only technology behind a pitch sets the pitch and its topic aside', () => {
  const s = run([['trigger', ['db', 'vmware']], ['db.engines', ['mssql']], ['db.provision', 'weeks']]);
  let d = ev(s);
  assert.ok(d.scores.byId.ndb.score > 0);
  assert.ok(d.queue.some((id) => id.startsWith('db.')));
  F.state.setTech(s, 'ndb', 'declined');
  d = ev(s);
  assert.equal(d.scores.byId.ndb.declined, true);
  assert.equal(d.scores.byId.ndb.score, 0);
  assert.equal(d.aside.db, true);
  assert.ok(!d.queue.some((id) => id.startsWith('db.')), 'database questions leave the flow');
  assert.ok(!d.gaps.some((id) => id.startsWith('db.')), 'and the next-call agenda');
});

test('a pitch with several technologies stays until all of them are declined', () => {
  const s = run([['trigger', ['resilience']], ['res.network', 'flat'], ['res.event', ['insurance']], ['res.files', 'lots']]);
  F.state.setTech(s, 'flow', 'declined');
  assert.equal(ev(s).scores.byId.cyber.declined, false);
  F.state.setTech(s, 'datalens', 'declined');
  F.state.setTech(s, 'encryption', 'declined');
  assert.equal(ev(s).scores.byId.cyber.declined, true);
});

test('declining NC2 knocks out the cloud-landing version of VMware exit', () => {
  const s = run([['trigger', ['vmware']], ['env.hypervisor', ['vsphere']], ['env.cloud', ['vmc']], ['vmw.license', 'cloud']]);
  assert.equal(ev(s).scores.byId.vmw.variant.id, 'nc2');
  F.state.setTech(s, 'nc2', 'declined');
  const d = ev(s);
  assert.notEqual(d.scores.byId.vmw.variant && d.scores.byId.vmw.variant.id, 'nc2');
  assert.equal(d.scores.byId.nc2.declined, true);
});

test('interested keeps a technology in scope even below the suggestion threshold', () => {
  const s = run([['trigger', ['vmware']]]);
  assert.equal(techOf(ev(s), 'nc2').inScope, false);
  F.state.setTech(s, 'nc2', 'interested');
  const d = ev(s);
  assert.equal(techOf(d, 'nc2').inScope, true);
  assert.ok(d.license.addons.some((a) => a.title.startsWith('NC2')));
});

// ── License sketch ────────────────────────────────────────────────────────────
const vmwBase = [
  ['trigger', ['vmware']], ['env.hypervisor', ['vsphere']], ['env.storage', 'vsan'],
  ['env.counts', { hosts: '6', cores: '192' }], ['vmw.renewal', '3to6'], ['vmw.intent', 'exit'],
];

test('license: plain VMware exit lands on NCI Pro with NKP Starter and Move included', () => {
  const d = ev(run(vmwBase));
  assert.equal(d.license.ready, true);
  assert.equal(d.license.headline, 'NCI Pro');
  assert.equal(d.license.core[0].qty, '192 cores');
  assert.ok(d.license.included.some((x) => /NKP Starter/.test(x)));
  assert.ok(d.license.included.some((x) => /Nutanix Move/.test(x)));
});

test('license: one Ultimate-level need → Pro plus the add-on, Ultimate as the alternative', () => {
  const d = ev(run([...vmwBase, ['res.rpo', 'zero']].concat([['trigger', ['vmware', 'resilience']]])));
  assert.equal(d.license.headline, 'NCI Pro');
  assert.ok(d.license.addons.some((a) => a.title === 'Advanced Replication add-on'));
  assert.ok(d.license.alternatives.some((a) => a.title === 'NCI Ultimate'));
});

test('license: two Ultimate-level needs → NCI Ultimate', () => {
  const s = run([['trigger', ['vmware', 'resilience']], ['env.hypervisor', ['vsphere']], ['env.storage', 'vsan'], ['vmw.intent', 'exit'], ['res.rpo', 'zero'], ['res.network', 'flat']]);
  const d = ev(s);
  assert.equal(d.license.headline, 'NCI Ultimate');
  assert.ok(d.license.core[0].why.some((w) => /Microsegmentation/.test(w)));
  assert.ok(d.license.core[0].why.some((w) => /Metro/.test(w)));
});

test('license: NCM Pro needs switch to the NCP bundle (NCP Starter = NCI Pro + NCM Pro)', () => {
  const d = ev(run([...vmwBase, ['env.itteam', 't2'], ['ops.selfservice', 'weeks']]));
  assert.equal(d.license.headline, 'NCP Starter');
  assert.match(d.license.core[0].detail, /NCI Pro \+ NCM Pro/);
  assert.ok(d.license.included.some((x) => /Nutanix Central/.test(x)));
});

test('license: Ultimate infrastructure plus NCM Pro → NCP Pro', () => {
  const s = run([['trigger', ['vmware', 'resilience']], ['env.itteam', 't2'], ['env.hypervisor', ['vsphere']], ['env.storage', 'vsan'], ['vmw.intent', 'exit'], ['res.rpo', 'zero'], ['res.network', 'flat'], ['ops.cost', 'both']]);
  const d = ev(s);
  assert.equal(d.license.headline, 'NCP Pro');
  assert.match(d.license.core[0].detail, /NCI Ultimate \+ NCM Pro/);
});

test('license: only Intelligent Operations → NCI + NCM Starter, with the NCP upgrade noted', () => {
  const d = ev(run([...vmwBase, ['env.itteam', 't2'], ['ops.capacity', 'surprise']]));
  assert.equal(d.license.headline, 'NCI Pro + NCM Starter');
  assert.ok(d.license.alternatives.some((a) => a.title === 'NCP Starter'));
});

test('license: keep-your-array uses NCI-Compute', () => {
  const s = run([['trigger', ['vmware']], ['env.hypervisor', ['vsphere']], ['env.storage', 'san'], ['env.array.vendor', 'everpure'], ['env.array.age', 'new'], ['vmw.intent', 'exit'], ['vmw.renewal', '3to6']]);
  const d = ev(s);
  assert.equal(techOf(d, 'extstorage').inScope, true);
  assert.equal(d.license.headline, 'NCI-C Pro');
});

test('license: VDI with GPU users → NCI-VDI Ultimate; files → NUS Pro; databases → NDB', () => {
  const s = run([
    ['trigger', ['euc', 'storage', 'db']], ['euc.platform', 'citrix'], ['euc.gpu', 'yes'], ['euc.users', '250to1k'],
    ['stor.types', ['fileservers']], ['stor.size', '50to250'],
    ['db.engines', ['mssql']], ['db.count', '100to500'], ['db.provision', 'days'],
  ]);
  const d = ev(s);
  const titles = d.license.addons.map((a) => a.title);
  assert.ok(titles.includes('NCI-VDI Ultimate'), titles.join(', '));
  assert.ok(titles.includes('NUS Pro — Files'), titles.join(', '));
  assert.ok(titles.includes('NDB — per cluster'), titles.join(', '));
  assert.equal(d.license.addons.find((a) => a.title === 'NUS Pro — Files').qty, '50–250 TiB');
});

test('license: NKP across environments → NKP Ultimate instead of the included Starter', () => {
  const s = run([['trigger', ['k8s']], ['k8s.stage', 'broad'], ['k8s.platform', ['tanzu']], ['k8s.where', ['onprem', 'cloud']]]);
  const d = ev(s);
  assert.ok(d.license.addons.some((a) => a.title === 'NKP Ultimate'));
  assert.ok(!d.license.included.some((x) => /NKP Starter/.test(x)));
});

test('license text lands in the CRM notes', () => {
  const s = run([...vmwBase, ['ops.selfservice', 'weeks'], ['env.itteam', 't2']]);
  const txt = F.report.crm(s, ev(s));
  assert.match(txt, /LICENSE SKETCH/);
  assert.match(txt, /- NCP Starter — 192 cores/);
  assert.match(txt, /Included: .*NKP Starter/);
});

test('buyer DISC style shows in the notes', () => {
  const s = fresh();
  s.setup.disc = 'C';
  answer(F, s, 'trigger', ['vmware']);
  assert.match(F.report.crm(s, ev(s)), /Buyer style \(DISC\): C — Conscientiousness/);
});
