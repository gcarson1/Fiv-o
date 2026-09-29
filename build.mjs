#!/usr/bin/env node
// Zero-dependency build: inline CSS + JS into one self-contained HTML file you can
// drop into Slack, download, and open offline.   Usage: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE, UI } from './build.config.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(root, f), 'utf8');
const pkg = JSON.parse(read('package.json'));
const built = new Date().toISOString().slice(0, 10);

const header = `/* Fiv-o ${pkg.version} · built ${built} */\nglobalThis.Fivo = { VERSION: ${JSON.stringify(pkg.version)}, BUILT: ${JSON.stringify(built)}, CONTENT_DATE: ${JSON.stringify(pkg.contentDate)} };\n`;
const js = header + [...CORE, ...UI].map((f) => `\n/* ── ${f} ── */\n${read(f)}`).join('\n');
// A literal "</script" inside the bundle would end the inline script early.
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const html = read('src/index.template.html')
  .replace('<!--STYLES-->', () => `<style>\n${read('src/styles.css')}\n</style>`)
  .replace('<!--SCRIPTS-->', () => `<script>\n${safeJs}\n</script>`);

// Guard the offline promise: no external scripts or stylesheets.
const external = html.match(/<(script|link)[^>]+(src|href)=["']https?:/gi);
if (external) {
  console.error('Build refused: external resources found:\n' + external.join('\n'));
  process.exit(1);
}

const out = join(root, 'dist', 'fivo-discovery.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Built ${out} (${(statSync(out).size / 1024).toFixed(0)} KB)`);
