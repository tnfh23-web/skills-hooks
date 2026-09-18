import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failDir = path.join(root, 'work', 'qa-contract', 'fail');
const passDir = path.join(root, 'work', 'qa-contract', 'pass');
const interactionFailDir = path.join(root, 'work', 'qa-contract', 'interaction-fail');
fs.rmSync(interactionFailDir, { recursive: true, force: true });
fs.mkdirSync(path.join(interactionFailDir, 'qa'), { recursive: true });
fs.copyFileSync(path.join(passDir, 'qa', 'report.json'), path.join(interactionFailDir, 'qa', 'report.json'));
fs.copyFileSync(path.join(passDir, 'qa', 'actual.png'), path.join(interactionFailDir, 'qa', 'actual.png'));
fs.copyFileSync(path.join(passDir, 'qa', 'diff.png'), path.join(interactionFailDir, 'qa', 'diff.png'));
const interactionReport = JSON.parse(fs.readFileSync(path.join(passDir, 'qa', 'interaction-report.json'), 'utf8'));
interactionReport.status = 'FAIL';
interactionReport.failureReasons = ['Test control: click produced no observable state change.'];
fs.writeFileSync(path.join(interactionFailDir, 'qa', 'interaction-report.json'), `${JSON.stringify(interactionReport, null, 2)}\n`);
const visualReport = JSON.parse(fs.readFileSync(path.join(interactionFailDir, 'qa', 'report.json'), 'utf8'));
visualReport.status = 'PASS';
visualReport.failureReasons = [];
visualReport.interactionQa = { required: true, status: 'FAIL' };
fs.writeFileSync(path.join(interactionFailDir, 'qa', 'report.json'), `${JSON.stringify(visualReport, null, 2)}\n`);
function run(cwd) {
  const result = spawnSync(process.execPath, [path.join(root, '.codex', 'hooks', 'stop-reference-publish.mjs')], { cwd, input: '{}\n', encoding: 'utf8' });
  assert.equal(result.status, 0);
  return JSON.parse(result.stdout.trim());
}
const blocked = run(failDir);
assert.equal(blocked.continue, false);
assert.match(blocked.stopReason, /failed/i);
const interactionBlocked = run(interactionFailDir);
assert.equal(interactionBlocked.continue, false);
assert.match(interactionBlocked.stopReason, /interaction/i);
const allowed = run(passDir);
assert.equal(allowed.continue, true);
console.log('Stop Hook FAIL block and PASS allow: PASS');
