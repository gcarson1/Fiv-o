// Build sanity: every source file parses (UI files aren't loaded by the engine tests),
// and the bundle stays self-contained.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Script } from 'node:vm';
import { CORE, UI } from '../build.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every bundled source file parses', () => {
  for (const f of [...CORE, ...UI]) {
    assert.doesNotThrow(() => new Script(readFileSync(join(root, f), 'utf8'), { filename: f }), `${f} has a syntax error`);
  }
});

test('the build produces one self-contained HTML file', () => {
  execFileSync(process.execPath, [join(root, 'build.mjs')], { cwd: root, stdio: 'pipe' });
  const html = readFileSync(join(root, 'dist', 'fivo-discovery.html'), 'utf8');
  assert.ok(!/<(script|link)[^>]+(src|href)=["']https?:/i.test(html), 'no external scripts or stylesheets');
  const inline = html.match(/<script>([\s\S]*)<\/script>/);
  assert.ok(inline, 'inline script present');
  assert.doesNotThrow(() => new Script(inline[1]), 'bundled script parses');
});
