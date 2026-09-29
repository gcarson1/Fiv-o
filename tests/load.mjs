// Loads the browser-agnostic Fiv-o files into this Node process and returns the namespace.
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CORE } from '../build.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadFivo() {
  delete globalThis.Fivo;
  for (const f of CORE) runInThisContext(readFileSync(join(root, f), 'utf8'), { filename: f });
  return globalThis.Fivo;
}

// Scenario helper: answer(session, 'qid', 'opt' | ['a','b'] | {field: v} | 'text')
export function answer(F, s, qid, value, extra = {}) {
  const q = F.questionById[qid];
  if (!q) throw new Error(`Unknown question ${qid}`);
  if (q.type === 'single') F.state.selectOption(s, qid, value);
  else if (q.type === 'multi') { [].concat(value).forEach((v) => F.state.selectOption(s, qid, v)); F.state.markDone(s, qid); }
  else if (q.type === 'fields') { Object.entries(value).forEach(([k, v]) => F.state.setField(s, qid, k, v)); F.state.markDone(s, qid); }
  else { F.state.setText(s, qid, value); F.state.markDone(s, qid); }
  if (extra.note) F.state.setNote(s, qid, extra.note);
  if (extra.quote) F.state.setQuote(s, qid, extra.quote);
  return s;
}
