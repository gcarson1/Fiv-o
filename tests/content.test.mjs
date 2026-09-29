// Content lint: catches broken references before they become silent dead ends in a live call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFivo } from './load.mjs';

const F = loadFivo();
const playIds = new Set(F.plays.map((p) => p.id));
const variantIds = new Set(F.plays.flatMap((p) => (p.variants || []).map((v) => `${p.id}.${v.id}`)));
const moduleIds = new Set(F.meta.modules.map((m) => m.id));
const mpKeys = new Set(F.meta.meddpicc.map((m) => m.k));

const terms = (c) => (c ? [...(c.any || []), ...(c.all || []), ...(c.not || [])] : []);

test('question ids are unique', () => {
  const seen = new Set();
  for (const q of F.questions) { assert.ok(!seen.has(q.id), `duplicate ${q.id}`); seen.add(q.id); }
});

test('every question is well-formed', () => {
  for (const q of F.questions) {
    assert.ok(moduleIds.has(q.module), `${q.id}: unknown module ${q.module}`);
    assert.ok(['single', 'multi', 'fields', 'text'].includes(q.type), `${q.id}: bad type`);
    assert.ok(q.text && q.short, `${q.id}: missing text/short`);
    assert.ok(q.why, `${q.id}: missing coaching "why"`);
    if (q.mp) assert.ok(mpKeys.has(q.mp), `${q.id}: bad mp ${q.mp}`);
    if (q.type === 'single' || q.type === 'multi') {
      assert.ok(q.options && q.options.length >= 2, `${q.id}: needs options`);
      const ids = new Set();
      for (const o of q.options) {
        assert.ok(!ids.has(o.id), `${q.id}: duplicate option ${o.id}`); ids.add(o.id);
        for (const k of Object.keys(o.signals || {})) {
          assert.ok(playIds.has(k) || variantIds.has(k), `${q.id}.${o.id}: signal to unknown target ${k}`);
        }
        for (const k of Object.keys(o.mp || {})) assert.ok(mpKeys.has(k), `${q.id}.${o.id}: bad mp ${k}`);
      }
      // Hotkeys cover 1–9 and 0; only the why-now trigger list may run past them.
      if (q.id !== 'trigger') assert.ok(q.options.length <= 10, `${q.id}: more than 10 options breaks 1–9/0 hotkeys`);
    }
    if (q.type === 'fields') assert.ok(q.fields && q.fields.length, `${q.id}: needs fields`);
  }
});

test('every condition references a real question and option', () => {
  const check = (where, c) => {
    for (const t of terms(c)) {
      const [qid, opt] = t.split(':');
      const q = F.questionById[qid];
      assert.ok(q, `${where}: unknown question ${qid}`);
      if (opt !== undefined) assert.ok((q.options || []).some((o) => o.id === opt), `${where}: ${qid} has no option ${opt}`);
    }
  };
  F.meta.modules.forEach((m) => check(`module ${m.id}`, m.when));
  F.questions.forEach((q) => check(q.id, q.when));
});

test('triggers map to modules that exist', () => {
  for (const [t, m] of Object.entries(F.meta.triggerModule)) {
    assert.ok(F.questionById.trigger.options.some((o) => o.id === t), `trigger ${t} missing`);
    assert.ok(moduleIds.has(m), `trigger ${t} → unknown module ${m}`);
  }
});

test('every play is reachable (some option signals it) and well-formed', () => {
  const signalled = new Set(F.questions.flatMap((q) => (q.options || []).flatMap((o) => Object.keys(o.signals || {}))));
  for (const p of F.plays) {
    assert.ok(signalled.has(p.id), `play ${p.id} has no signals`);
    for (const v of p.variants || []) assert.ok(signalled.has(`${p.id}.${v.id}`), `variant ${p.id}.${v.id} has no signals`);
    for (const qid of p.qualifiers || []) assert.ok(F.questionById[qid], `${p.id}: unknown qualifier ${qid}`);
    assert.ok(p.proof.length && p.proof.every((x) => /^https:\/\//.test(x.src)), `${p.id}: proof points need https sources`);
    assert.ok(p.nextSteps.length && p.objections.length && p.capabilities.length, `${p.id}: incomplete pitch card`);
  }
});

test('every competition option has a battlecard', () => {
  for (const o of F.questionById['dec.competition'].options) {
    if (o.id === 'unknown') continue;
    assert.ok(F.competitors[o.id], `no competitor entry for ${o.id}`);
  }
});

test('every question can become eligible (reachability)', () => {
  // Answer everything with every option: all module/question gates should open.
  const s = F.state.newSession();
  for (const q of F.questions) {
    if (q.type === 'single') s.answers[q.id] = { value: null, done: true, pains: {} };
    else if (q.type === 'multi') s.answers[q.id] = { value: q.options.map((o) => o.id), done: true, pains: {} };
  }
  // A single can hold one option; try each option of gating singles one at a time.
  const reachable = new Set();
  const gatingSingles = F.questions.filter((q) => q.type === 'single');
  const d0 = F.router.evaluate(s);
  Object.keys(d0.eligible).forEach((id) => reachable.add(id));
  for (const g of gatingSingles) {
    for (const o of g.options) {
      s.answers[g.id].value = o.id;
      Object.keys(F.router.evaluate(s).eligible).forEach((id) => reachable.add(id));
    }
    s.answers[g.id].value = null;
  }
  for (const q of F.questions) assert.ok(reachable.has(q.id), `${q.id} can never become eligible`);
});
