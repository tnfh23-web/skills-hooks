import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = ['tools/visual-qa.mjs', 'tools/source-fingerprint.mjs', 'tools/reference-measure.mjs', 'tools/reference-spec.mjs', 'tools/geometry-qa.mjs', 'tools/responsive-qa.mjs', '.codex/hooks/stop-reference-publish.mjs'];
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  assert.ok(fs.existsSync(file), `${file} should exist`);
}
JSON.parse(fs.readFileSync('.codex/hooks.json', 'utf8'));
console.log('syntax and hook JSON: PASS');
