import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createReferenceSpec, validateReferenceSpec } from '../tools/reference-spec.mjs';
import { measureGeometry } from '../tools/geometry-qa.mjs';
import { runResponsiveQa } from '../tools/responsive-qa.mjs';
import { createSourceFingerprint, sourceFiles } from '../tools/source-fingerprint.mjs';
import { resolveLatestRun } from '../tools/qa-run.mjs';

const root = process.cwd();
const out = path.join(root, 'work', 'workflow-contract');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const geometryFixture = path.join(root, 'tests', 'fixtures', 'geometry.html');
const geometrySpec = { reference: { width: 200, height: 200 }, captureMode: 'viewport', viewport: { width: 200, height: 200 }, sections: [], majorElements: [
  { selector: '#box', x: 12, y: 18, width: 100, height: 50, confidence: 'high' },
  { selector: '#text', x: 12, y: 100, width: 134.5, height: 24, confidence: 'high', typography: { fontFamily: 'Arial', fontSize: '20px', lineHeight: '24px', fontWeight: '700' } }
] };
assert.equal(validateReferenceSpec(geometrySpec).valid, true);
assert.equal(validateReferenceSpec({}).valid, false);
const geometryReport = await measureGeometry({ url: geometryFixture, spec: geometrySpec, output: path.join(out, 'geometry.json'), width: 200, height: 200 });
assert.equal(geometryReport.status, 'PASS');
assert.ok(geometryReport.sourceFingerprint.value);
assert.equal(geometryReport.elements.find((entry) => entry.selector === '#box').deltas.dx, 0);
const typographyIgnored = await measureGeometry({ url: geometryFixture, spec: { ...geometrySpec, majorElements: [{ ...geometrySpec.majorElements[1], typography: { fontFamily: null, fontSize: null } }] }, output: path.join(out, 'typography-null.json'), width: 200, height: 200 });
assert.equal(typographyIgnored.status, 'PASS');
const geometryMismatch = await measureGeometry({ url: geometryFixture, spec: { ...geometrySpec, majorElements: [{ ...geometrySpec.majorElements[0], x: 30 }] }, output: path.join(out, 'geometry-fail.json'), width: 200, height: 200 });
assert.equal(geometryMismatch.status, 'FAIL');

const responsivePass = await runResponsiveQa({ url: path.join(root, 'tests', 'fixtures', 'responsive.html'), output: path.join(out, 'responsive.json') });
assert.equal(responsivePass.status, 'PASS');
assert.ok(responsivePass.sourceFingerprint.value);
const responsiveFail = await runResponsiveQa({ url: path.join(root, 'tests', 'fixtures', 'responsive-overflow.html'), output: path.join(out, 'responsive-fail.json') });
assert.equal(responsiveFail.status, 'FAIL');
const responsiveIntentional = await runResponsiveQa({ url: path.join(root, 'tests', 'fixtures', 'responsive-intentional-clip.html'), output: path.join(out, 'responsive-intentional.json') });
assert.equal(responsiveIntentional.status, 'PASS');
assert.ok(responsiveIntentional.viewports.some((viewport) => viewport.allowedClipping?.length));

const externalRoot = path.join(out, 'external-target');
const externalQa = path.join(externalRoot, 'qa');
fs.mkdirSync(path.join(externalRoot, 'src'), { recursive: true });
fs.copyFileSync(path.join(root, 'tests', 'fixtures', 'index.html'), path.join(externalRoot, 'src', 'index.html'));
const externalUrl = path.join(externalRoot, 'src', 'index.html');
const externalBootstrap = path.join(externalRoot, 'work', 'bootstrap');
execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', externalUrl, '--output', externalBootstrap, '--capture-only', '--source-root', externalRoot], { stdio: 'pipe' });
fs.copyFileSync(path.join(externalBootstrap, 'actual.png'), path.join(externalRoot, 'reference.png'));
const externalRun = spawnSync(process.execPath, ['tools/visual-qa.mjs', '--url', externalUrl, '--reference', path.join(externalRoot, 'reference.png'), '--output', externalQa, '--source-root', externalRoot, '--set-latest'], { stdio: 'pipe' });
assert.equal(externalRun.status, 0, externalRun.stderr?.toString());
const externalReport = JSON.parse(fs.readFileSync(path.join(externalQa, 'report.json'), 'utf8'));
assert.equal(path.resolve(externalReport.sourceRoot), path.resolve(externalRoot));
assert.equal(externalReport.sourceRootContract.explicit, true);
assert.equal(resolveLatestRun(externalRoot).outputDir, path.resolve(externalQa));
assert.equal(JSON.parse(fs.readFileSync(path.join(externalQa, 'interaction-report.json'), 'utf8')).sourceRoot, path.resolve(externalRoot));

const fingerprintRoot = path.join(out, 'fingerprint-root');
for (const directory of ['qa', 'qa-v12', 'qa_output', 'qa.archive', 'qaSomething']) fs.mkdirSync(path.join(fingerprintRoot, directory), { recursive: true });
fs.writeFileSync(path.join(fingerprintRoot, 'index.html'), '<main>source</main>');
fs.writeFileSync(path.join(fingerprintRoot, 'qa', 'report.json'), 'artifact');
fs.writeFileSync(path.join(fingerprintRoot, 'qa-v12', 'report.json'), 'artifact');
fs.writeFileSync(path.join(fingerprintRoot, 'qa_output', 'report.json'), 'artifact');
fs.writeFileSync(path.join(fingerprintRoot, 'qa.archive', 'report.json'), 'artifact');
fs.writeFileSync(path.join(fingerprintRoot, 'qaSomething', 'source.js'), 'real source');
const fingerprintFiles = sourceFiles(fingerprintRoot);
assert.deepEqual(fingerprintFiles, ['index.html', 'qaSomething/source.js']);
const beforeFingerprint = createSourceFingerprint(fingerprintRoot).value;
fs.writeFileSync(path.join(fingerprintRoot, 'qa', 'report.json'), 'changed artifact');
assert.equal(createSourceFingerprint(fingerprintRoot).value, beforeFingerprint, 'exact QA artifact roots must be ignored');
fs.writeFileSync(path.join(fingerprintRoot, 'qaSomething', 'source.js'), 'changed real source');
assert.notEqual(createSourceFingerprint(fingerprintRoot).value, beforeFingerprint, 'qa-prefixed source directories must remain fingerprinted');

function runVisual(fixture, name) {
  const bootstrap = path.join(out, `${name}-bootstrap`); const qa = path.join(out, name);
  execFileSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--output', bootstrap, '--capture-only', '--no-interaction-qa'], { stdio: 'pipe' });
  fs.mkdirSync(qa, { recursive: true }); fs.copyFileSync(path.join(bootstrap, 'actual.png'), path.join(out, `${name}.png`));
  return spawnSync(process.execPath, ['tools/visual-qa.mjs', '--url', fixture, '--reference', path.join(out, `${name}.png`), '--output', qa], { stdio: 'pipe' });
}
const carousel = path.join(root, 'tests', 'fixtures', 'carousel.html');
const carouselRun = runVisual(carousel, 'carousel'); assert.equal(carouselRun.status, 0);
assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'carousel', 'interaction-report.json'), 'utf8')).status, 'PASS');
const broken = path.join(root, 'tests', 'fixtures', 'broken-carousel.html');
const brokenRun = runVisual(broken, 'broken-carousel'); assert.equal(brokenRun.status, 1);
const brokenInteraction = JSON.parse(fs.readFileSync(path.join(out, 'broken-carousel', 'interaction-report.json'), 'utf8'));
assert.equal(brokenInteraction.status, 'FAIL');
assert.match(brokenInteraction.failureReasons[0], /active slide did not change|semantic contract/i);

console.log('reference spec, deterministic measurement, geometry, typography, responsive, carousel semantics: PASS');
