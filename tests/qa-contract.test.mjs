import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';

const root = process.cwd();
const testRoot = path.join(root, 'work', 'qa-contract');
const passDir = path.join(testRoot, 'pass');
const lowDir = path.join(testRoot, 'low-noise');
const aaDir = path.join(testRoot, 'aa');
const fullPageDir = path.join(testRoot, 'full-page');
const failDir = path.join(testRoot, 'fail');
fs.rmSync(testRoot, { recursive: true, force: true });
fs.mkdirSync(passDir, { recursive: true });
fs.mkdirSync(lowDir, { recursive: true });
fs.mkdirSync(aaDir, { recursive: true });
fs.mkdirSync(fullPageDir, { recursive: true });
fs.mkdirSync(failDir, { recursive: true });
const fixture = path.join(root, 'tests', 'fixtures', 'index.html');
const aaFixture = path.join(root, 'tests', 'fixtures', 'aa.html');
const fullPageFixture = path.join(root, 'tests', 'fixtures', 'full-page.html');

function runQa(referencePath, outputDir, targetFixture = fixture, extraArgs = []) {
  return spawnSync(process.execPath, ['tools/visual-qa.mjs', '--url', targetFixture, '--reference', referencePath, '--output', outputDir, ...extraArgs], { stdio: 'inherit' });
}

execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--output', path.join(passDir, 'bootstrap'), '--capture-only'], { stdio: 'inherit' });
const reference = path.join(passDir, 'reference.png');
fs.copyFileSync(path.join(passDir, 'bootstrap', 'actual.png'), reference);
execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--reference', reference, '--output', path.join(passDir, 'qa')], { stdio: 'inherit' });
const passReport = JSON.parse(fs.readFileSync(path.join(passDir, 'qa', 'report.json'), 'utf8'));
assert.equal(passReport.status, 'PASS');
assert.equal(passReport.mismatchPixelCount, 0);
assert.equal(passReport.captureMode, 'viewport');
assert.equal(passReport.interactionQa.status, 'PASS');
const interactionChecks = JSON.parse(fs.readFileSync(path.join(passDir, 'qa', 'interaction-report.json'), 'utf8')).checks;
assert.ok(interactionChecks.some((check) => check.type === 'tabs' && check.status === 'PASS'));
assert.ok(interactionChecks.some((check) => check.type === 'accordion' && check.status === 'PASS'));
assert.ok(interactionChecks.filter((check) => check.type === 'accordion' && check.status === 'PASS').length >= 2);

execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', aaFixture, '--output', path.join(aaDir, 'bootstrap'), '--capture-only'], { stdio: 'inherit' });
const aaReference = path.join(aaDir, 'reference.png');
fs.copyFileSync(path.join(aaDir, 'bootstrap', 'actual.png'), aaReference);
const aaImage = PNG.sync.read(fs.readFileSync(aaReference));
const aaCenter = (3 * aaImage.width + 3) * 4;
aaImage.data[aaCenter] = 1; aaImage.data[aaCenter + 1] = 1; aaImage.data[aaCenter + 2] = 1;
fs.writeFileSync(aaReference, PNG.sync.write(aaImage));
const aaRun = runQa(aaReference, path.join(aaDir, 'qa'), aaFixture);
assert.equal(aaRun.status, 0, 'AA-only diff should not fail visual QA');
const aaReport = JSON.parse(fs.readFileSync(path.join(aaDir, 'qa', 'report.json'), 'utf8'));
assert.equal(aaReport.mismatchPixelCount, 0);
assert.equal(aaReport.visualDecision.ignoredLowValueMismatch, false);
assert.equal(aaReport.majorMismatchRegions.length, 0, 'AA-only diff must not create a mismatch region');
const aaMask = PNG.sync.read(fs.readFileSync(path.join(aaDir, 'qa', 'mask.png')));
assert.equal(aaMask.data.reduce((sum, value, index) => sum + (index % 4 === 0 && value > 0 ? 1 : 0), 0), 0, 'AA-only diff must not activate mask pixels');

const fullPageArgs = ['--capture-mode', 'fullPage', '--width', '1440', '--height', '900'];
execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', fullPageFixture, '--output', path.join(fullPageDir, 'bootstrap'), '--capture-only', ...fullPageArgs], { stdio: 'inherit' });
const fullPageReference = path.join(fullPageDir, 'reference.png');
fs.copyFileSync(path.join(fullPageDir, 'bootstrap', 'actual.png'), fullPageReference);
const fullPageRun = runQa(fullPageReference, path.join(fullPageDir, 'qa'), fullPageFixture, fullPageArgs);
assert.equal(fullPageRun.status, 0, 'matching full-page reference should pass');
const fullPageReport = JSON.parse(fs.readFileSync(path.join(fullPageDir, 'qa', 'report.json'), 'utf8'));
assert.equal(fullPageReport.status, 'PASS');
assert.equal(fullPageReport.captureMode, 'fullPage');
assert.deepEqual({ width: fullPageReport.viewport.width, height: fullPageReport.viewport.height }, { width: 1440, height: 900 });
assert.equal(fullPageReport.reference.width, fullPageReport.actual.width);
assert.ok(fullPageReport.actual.height > fullPageReport.viewport.height);
assert.equal(fullPageReport.document.height, fullPageReport.actual.height);

const tooTallReferenceImage = PNG.sync.read(fs.readFileSync(fullPageReference));
const extendedReference = new PNG({ width: tooTallReferenceImage.width, height: tooTallReferenceImage.height + 100 });
for (let y = 0; y < extendedReference.height; y += 1) {
  const sourceY = Math.min(y, tooTallReferenceImage.height - 1);
  tooTallReferenceImage.data.copy(extendedReference.data, y * extendedReference.width * 4, sourceY * tooTallReferenceImage.width * 4, (sourceY + 1) * tooTallReferenceImage.width * 4);
}
const tooTallReferencePath = path.join(fullPageDir, 'too-tall-reference.png');
fs.writeFileSync(tooTallReferencePath, PNG.sync.write(extendedReference));
const fullPageDimensionRun = runQa(tooTallReferencePath, path.join(fullPageDir, 'dimension-fail'), fullPageFixture, fullPageArgs);
assert.equal(fullPageDimensionRun.status, 1, 'full-page height mismatch should fail');
const fullPageDimensionReport = JSON.parse(fs.readFileSync(path.join(fullPageDir, 'dimension-fail', 'report.json'), 'utf8'));
assert.equal(fullPageDimensionReport.status, 'FAIL');
assert.ok(fullPageDimensionReport.failureReasons.some((reason) => /Full-page capture\/reference dimensions/i.test(reason)));

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
