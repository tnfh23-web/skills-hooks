import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';

const root = process.cwd();
const testRoot = path.join(root, 'work', 'qa-contract');
const passDir = path.join(testRoot, 'pass');
const failDir = path.join(testRoot, 'fail');
fs.rmSync(testRoot, { recursive: true, force: true });
fs.mkdirSync(passDir, { recursive: true });
fs.mkdirSync(failDir, { recursive: true });
const fixture = path.join(root, 'tests', 'fixtures', 'index.html');

execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--output', path.join(passDir, 'bootstrap'), '--capture-only'], { stdio: 'inherit' });
const reference = path.join(passDir, 'reference.png');
fs.copyFileSync(path.join(passDir, 'bootstrap', 'actual.png'), reference);
execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--reference', reference, '--output', path.join(passDir, 'qa')], { stdio: 'inherit' });
const passReport = JSON.parse(fs.readFileSync(path.join(passDir, 'qa', 'report.json'), 'utf8'));
assert.equal(passReport.status, 'PASS');
assert.equal(passReport.mismatchPixelCount, 0);

const changed = PNG.sync.read(fs.readFileSync(reference));
for (let y = 80; y < 140; y += 1) for (let x = 100; x < 420; x += 1) {
  const i = (changed.width * y + x) * 4; changed.data[i] = 220; changed.data[i + 1] = 40; changed.data[i + 2] = 40;
}
const changedReference = path.join(failDir, 'reference.png');
fs.writeFileSync(changedReference, PNG.sync.write(changed));
const mismatchRun = spawnSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--reference', changedReference, '--output', path.join(failDir, 'qa')], { stdio: 'inherit' });
assert.equal(mismatchRun.status, 1, 'mismatch visual QA should fail with exit code 1');
const failReport = JSON.parse(fs.readFileSync(path.join(failDir, 'qa', 'report.json'), 'utf8'));
assert.equal(failReport.status, 'FAIL');
assert.ok(failReport.mismatchPixelCount > 0);
assert.ok(failReport.majorMismatchRegions.length > 0);
console.log('identical and mismatch visual QA: PASS');
