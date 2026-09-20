import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createReferenceSpec, validateReferenceSpec } from '../tools/reference-spec.mjs';
import { measureGeometry } from '../tools/geometry-qa.mjs';
import { runResponsiveQa } from '../tools/responsive-qa.mjs';

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
assert.equal(geometryReport.elements.find((entry) => entry.selector === '#box').deltas.dx, 0);
const typographyIgnored = await measureGeometry({ url: geometryFixture, spec: { ...geometrySpec, majorElements: [{ ...geometrySpec.majorElements[1], typography: { fontFamily: null, fontSize: null } }] }, output: path.join(out, 'typography-null.json'), width: 200, height: 200 });
assert.equal(typographyIgnored.status, 'PASS');
const geometryMismatch = await measureGeometry({ url: geometryFixture, spec: { ...geometrySpec, majorElements: [{ ...geometrySpec.majorElements[0], x: 30 }] }, output: path.join(out, 'geometry-fail.json'), width: 200, height: 200 });
assert.equal(geometryMismatch.status, 'FAIL');

const responsivePass = await runResponsiveQa({ url: path.join(root, 'tests', 'fixtures', 'responsive.html'), output: path.join(out, 'responsive.json') });
assert.equal(responsivePass.status, 'PASS');
const responsiveFail = await runResponsiveQa({ url: path.join(root, 'tests', 'fixtures', 'responsive-overflow.html'), output: path.join(out, 'responsive-fail.json') });
assert.equal(responsiveFail.status, 'FAIL');

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
