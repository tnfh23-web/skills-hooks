import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failDir = path.join(root, 'work', 'qa-contract', 'fail');
const passDir = path.join(root, 'work', 'qa-contract', 'pass');
function run(cwd) {
  const result = spawnSync(process.execPath, [path.join(root, '.codex', 'hooks', 'stop-reference-publish.mjs')], { cwd, input: '{}\n', encoding: 'utf8' });
  assert.equal(result.status, 0);
  return JSON.parse(result.stdout.trim());
}
const blocked = run(failDir);
assert.equal(blocked.continue, false);
assert.match(blocked.stopReason, /failed/i);
const allowed = run(passDir);
assert.equal(allowed.continue, true);
console.log('Stop Hook FAIL block and PASS allow: PASS');
