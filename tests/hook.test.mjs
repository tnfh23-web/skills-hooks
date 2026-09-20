import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failDir = path.join(root, 'work', 'qa-contract', 'fail');
const passDir = path.join(root, 'work', 'qa-contract', 'pass');
const interactionFailDir = path.join(root, 'work', 'qa-contract', 'interaction-fail');
const staleDir = path.join(root, 'work', 'qa-contract', 'stale');
const interactionStaleDir = path.join(root, 'work', 'qa-contract', 'interaction-stale');
const canonicalDir = path.join(root, 'work', 'qa-contract', 'canonical');
const motionStaleDir = path.join(root, 'work', 'qa-contract', 'motion-stale');
const geometryStaleDir = path.join(root, 'work', 'qa-contract', 'geometry-stale');
const responsiveStaleDir = path.join(root, 'work', 'qa-contract', 'responsive-stale');
const missingEvidenceDir = path.join(root, 'work', 'qa-contract', 'missing-evidence');
fs.rmSync(interactionFailDir, { recursive: true, force: true });
fs.rmSync(staleDir, { recursive: true, force: true });
fs.rmSync(interactionStaleDir, { recursive: true, force: true });
fs.rmSync(canonicalDir, { recursive: true, force: true });
fs.rmSync(motionStaleDir, { recursive: true, force: true });
fs.rmSync(geometryStaleDir, { recursive: true, force: true });
fs.rmSync(responsiveStaleDir, { recursive: true, force: true });
fs.rmSync(missingEvidenceDir, { recursive: true, force: true });
fs.mkdirSync(path.join(interactionFailDir, 'qa'), { recursive: true });
fs.mkdirSync(path.join(staleDir, 'qa'), { recursive: true });
fs.mkdirSync(path.join(interactionStaleDir, 'qa'), { recursive: true });
fs.mkdirSync(path.join(canonicalDir, 'qa'), { recursive: true });
fs.mkdirSync(path.join(motionStaleDir, 'qa'), { recursive: true });
fs.mkdirSync(path.join(geometryStaleDir, 'qa'), { recursive: true });
fs.mkdirSync(path.join(responsiveStaleDir, 'qa'), { recursive: true });
fs.mkdirSync(path.join(missingEvidenceDir, 'qa'), { recursive: true });
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
for (const name of ['actual.png', 'diff.png']) fs.copyFileSync(path.join(passDir, 'qa', name), path.join(staleDir, 'qa', name));
const staleReport = JSON.parse(fs.readFileSync(path.join(passDir, 'qa', 'report.json'), 'utf8'));
staleReport.sourceFingerprint.value = 'stale-source-fingerprint';
fs.writeFileSync(path.join(staleDir, 'qa', 'report.json'), `${JSON.stringify(staleReport, null, 2)}\n`);
const stale = run(staleDir);
assert.equal(stale.continue, false);
assert.match(stale.stopReason, /stale|source changed/i);

for (const name of ['report.json', 'actual.png', 'diff.png', 'interaction-report.json']) fs.copyFileSync(path.join(passDir, 'qa', name), path.join(interactionStaleDir, 'qa', name));
const interactionStaleReport = JSON.parse(fs.readFileSync(path.join(interactionStaleDir, 'qa', 'interaction-report.json'), 'utf8'));
interactionStaleReport.sourceFingerprint.value = 'stale-interaction-fingerprint';
fs.writeFileSync(path.join(interactionStaleDir, 'qa', 'interaction-report.json'), `${JSON.stringify(interactionStaleReport, null, 2)}\n`);
const interactionStale = run(interactionStaleDir);
assert.equal(interactionStale.continue, false);
assert.match(interactionStale.stopReason, /interaction.*stale|stale.*interaction/i);

const selectedQa = path.join(canonicalDir, 'qa-v12', 'final'); fs.mkdirSync(selectedQa, { recursive: true });
for (const name of ['report.json', 'actual.png', 'diff.png', 'interaction-report.json']) fs.copyFileSync(path.join(passDir, 'qa', name), path.join(selectedQa, name));
fs.copyFileSync(path.join(failDir, 'qa', 'report.json'), path.join(canonicalDir, 'qa', 'report.json'));
fs.writeFileSync(path.join(canonicalDir, 'qa', 'latest-run.json'), `${JSON.stringify({ version: 1, outputDir: 'qa-v12/final' }, null, 2)}\n`);
const canonical = run(canonicalDir);
assert.equal(canonical.continue, true, 'hook must trust the selected latest run instead of stale qa/report.json');
assert.match(canonical.systemMessage, /qa-v12/i);

for (const name of ['report.json', 'actual.png', 'diff.png', 'interaction-report.json']) fs.copyFileSync(path.join(passDir, 'qa', name), path.join(motionStaleDir, 'qa', name));
const motionVisual = JSON.parse(fs.readFileSync(path.join(motionStaleDir, 'qa', 'report.json'), 'utf8'));
motionVisual.qualityGates.motionRequired = true;
fs.writeFileSync(path.join(motionStaleDir, 'qa', 'report.json'), `${JSON.stringify(motionVisual, null, 2)}\n`);
fs.writeFileSync(path.join(motionStaleDir, 'qa', 'motion-report.json'), `${JSON.stringify({ status: 'PASS', sourceRoot: motionVisual.sourceRoot, sourceFingerprint: { ...motionVisual.sourceFingerprint, value: 'stale-motion-fingerprint' }, checks: [] }, null, 2)}\n`);
const motionStale = run(motionStaleDir);
assert.equal(motionStale.continue, false);
assert.match(motionStale.stopReason, /motion.*stale|stale.*motion/i);

for (const [gate, directory, reportName] of [['geometryRequired', geometryStaleDir, 'geometry-report.json'], ['responsiveRequired', responsiveStaleDir, 'responsive-report.json']]) {
  for (const name of ['report.json', 'actual.png', 'diff.png', 'interaction-report.json']) fs.copyFileSync(path.join(passDir, 'qa', name), path.join(directory, 'qa', name));
  const gatedVisual = JSON.parse(fs.readFileSync(path.join(directory, 'qa', 'report.json'), 'utf8'));
  gatedVisual.qualityGates[gate] = true;
  fs.writeFileSync(path.join(directory, 'qa', 'report.json'), `${JSON.stringify(gatedVisual, null, 2)}\n`);
  fs.writeFileSync(path.join(directory, 'qa', reportName), `${JSON.stringify({ status: 'PASS', sourceRoot: gatedVisual.sourceRoot, sourceFingerprint: { ...gatedVisual.sourceFingerprint, value: `stale-${gate}` }, failureReasons: [] }, null, 2)}\n`);
  const result = run(directory);
  assert.equal(result.continue, false);
  assert.match(result.stopReason, new RegExp(`${gate.replace('Required', '')}.*stale|stale.*${gate.replace('Required', '')}`, 'i'));
}

for (const name of ['report.json', 'actual.png', 'diff.png', 'interaction-report.json']) fs.copyFileSync(path.join(passDir, 'qa', name), path.join(missingEvidenceDir, 'qa', name));
const evidencePlanPath = path.join(missingEvidenceDir, 'interaction-plan.json');
fs.writeFileSync(evidencePlanPath, `${JSON.stringify({ version: 1, designMode: 'reference', motionLanguage: null, candidates: [{ id: 'missing-high', selector: '#control', semanticType: 'tabs', intent: 'test', evidence: ['explicit test'], provenance: 'source-annotation', confidence: 'high', implementation: 'required', recipe: 'tabs', requiredStates: ['selected-tab', 'visible-panel'], responsiveBehavior: 'preserve controls', reducedMotionBehavior: 'preserve state', verification: {} }] }, null, 2)}\n`);
const evidenceVisual = JSON.parse(fs.readFileSync(path.join(missingEvidenceDir, 'qa', 'report.json'), 'utf8'));
evidenceVisual.qualityGates.interactionPlanRequired = true; evidenceVisual.interactionPlan = evidencePlanPath;
fs.writeFileSync(path.join(missingEvidenceDir, 'qa', 'report.json'), `${JSON.stringify(evidenceVisual, null, 2)}\n`);
const missingEvidence = run(missingEvidenceDir);
assert.equal(missingEvidence.continue, false);
assert.match(missingEvidence.stopReason, /evidence/i);

console.log('Stop Hook visual/interaction/freshness/canonical-run contracts: PASS');
