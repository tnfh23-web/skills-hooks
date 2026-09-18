import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';

const root = process.cwd();
const testRoot = path.join(root, 'work', 'qa-contract');
const passDir = path.join(testRoot, 'pass');
const lowDir = path.join(testRoot, 'low-noise');
const failDir = path.join(testRoot, 'fail');
fs.rmSync(testRoot, { recursive: true, force: true });
fs.mkdirSync(passDir, { recursive: true });
fs.mkdirSync(lowDir, { recursive: true });
fs.mkdirSync(failDir, { recursive: true });
const fixture = path.join(root, 'tests', 'fixtures', 'index.html');

function runQa(referencePath, outputDir) {
  return spawnSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--reference', referencePath, '--output', outputDir], { stdio: 'inherit' });
}

execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--output', path.join(passDir, 'bootstrap'), '--capture-only'], { stdio: 'inherit' });
const reference = path.join(passDir, 'reference.png');
fs.copyFileSync(path.join(passDir, 'bootstrap', 'actual.png'), reference);
execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--reference', reference, '--output', path.join(passDir, 'qa')], { stdio: 'inherit' });
const passReport = JSON.parse(fs.readFileSync(path.join(passDir, 'qa', 'report.json'), 'utf8'));
assert.equal(passReport.status, 'PASS');
assert.equal(passReport.mismatchPixelCount, 0);
assert.equal(passReport.interactionQa.status, 'PASS');
const interactionChecks = JSON.parse(fs.readFileSync(path.join(passDir, 'qa', 'interaction-report.json'), 'utf8')).checks;
assert.ok(interactionChecks.some((check) => check.type === 'tab' && check.status === 'PASS'));
assert.ok(interactionChecks.some((check) => check.type === 'accordion' && check.status === 'PASS'));
assert.ok(interactionChecks.some((check) => check.type === 'aria-expanded-toggle' && check.status === 'PASS'));

const lowNoise = PNG.sync.read(fs.readFileSync(reference));
for (let i = 0; i < 80; i += 1) {
  const x = 8 + (i % 20) * 32;
  const y = 8 + Math.floor(i / 20) * 32;
  const index = (lowNoise.width * y + x) * 4;
  lowNoise.data[index] = 200; lowNoise.data[index + 1] = 170; lowNoise.data[index + 2] = 130;
}
const lowNoiseReference = path.join(lowDir, 'reference.png');
fs.writeFileSync(lowNoiseReference, PNG.sync.write(lowNoise));
const lowNoiseRun = runQa(lowNoiseReference, path.join(lowDir, 'qa'));
assert.equal(lowNoiseRun.status, 0, 'low-value noise should be tolerated');
const lowNoiseReport = JSON.parse(fs.readFileSync(path.join(lowDir, 'qa', 'report.json'), 'utf8'));
assert.equal(lowNoiseReport.status, 'PASS');
assert.ok(lowNoiseReport.mismatchPixelCount > 0);
assert.equal(lowNoiseReport.visualDecision.ignoredLowValueMismatch, true);

const changed = PNG.sync.read(fs.readFileSync(reference));
for (let y = 80; y < 140; y += 1) for (let x = 100; x < 420; x += 1) {
  const i = (changed.width * y + x) * 4; changed.data[i] = 220; changed.data[i + 1] = 40; changed.data[i + 2] = 40;
}
const changedReference = path.join(failDir, 'reference.png');
fs.writeFileSync(changedReference, PNG.sync.write(changed));
const mismatchRun = runQa(changedReference, path.join(failDir, 'qa'));
assert.equal(mismatchRun.status, 1, 'large mismatch visual QA should fail with exit code 1');
const failReport = JSON.parse(fs.readFileSync(path.join(failDir, 'qa', 'report.json'), 'utf8'));
assert.equal(failReport.status, 'FAIL');
assert.ok(failReport.mismatchPixelCount > 0);
assert.ok(failReport.majorMismatchRegions.length > 0);
assert.ok(failReport.failureReasons.some((reason) => /large mismatch region|ratio/i.test(reason)));
console.log('identical, low-noise, large-mismatch visual QA and click interaction checks: PASS');
