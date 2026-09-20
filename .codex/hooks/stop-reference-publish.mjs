import fs from 'node:fs';
import path from 'node:path';
import { createSourceFingerprint } from '../../tools/source-fingerprint.mjs';
import { validateInteractionPlan } from '../../tools/interaction-plan.mjs';
import { resolveLatestRun } from '../../tools/qa-run.mjs';

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function block(stopReason, systemMessage) {
  emit({ continue: false, stopReason, systemMessage });
  process.exit(0);
}

function assertFresh(candidateReport, label) {
  if (!candidateReport.sourceFingerprint?.value || !candidateReport.sourceRoot) return;
  const current = createSourceFingerprint(candidateReport.sourceRoot);
  if (current.value !== candidateReport.sourceFingerprint.value) {
    block(`The ${label} verification is stale.`, `Source changed after the latest ${label} verification. Run it again.`);
  }
}

const cwd = process.cwd();
let latestRun;
try { latestRun = resolveLatestRun(cwd); }
catch (error) { block('The canonical QA run pointer is invalid.', error.message); }
const qaDir = latestRun.outputDir;
const reportPath = path.join(qaDir, 'report.json');
const interactionPath = path.join(qaDir, 'interaction-report.json');
const motionPath = path.join(qaDir, 'motion-report.json');
const geometryPath = path.join(qaDir, 'geometry-report.json');
const responsivePath = path.join(qaDir, 'responsive-report.json');

if (!fs.existsSync(reportPath)) {
  emit({
    continue: false,
    stopReason: 'Reference publishing visual verification has not run.',
    systemMessage: 'Visual verification is required before completion. Run npm run qa, then inspect qa/actual.png, qa/diff.png, and qa/report.json.'
  });
  process.exit(0);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (error) {
  emit({
    continue: false,
    stopReason: 'The visual verification report is not valid JSON.',
    systemMessage: `Fix ${reportPath} and run visual verification again. ${error.message}`
  });
  process.exit(0);
}

const missingArtifacts = ['actual.png', 'diff.png']
  .map((name) => path.join(qaDir, name))
  .filter((file) => !fs.existsSync(file));

if (report.status !== 'PASS' || missingArtifacts.length > 0) {
  const reason = report.failureReasons?.join(' ') || 'The latest visual verification is not PASS.';
  emit({
    continue: false,
    stopReason: 'Visual verification failed.',
    systemMessage: `Fix the largest remaining mismatch and run verification again. ${reason} Inspect qa/actual.png, qa/diff.png, and qa/report.json.`
  });
  process.exit(0);
}

assertFresh(report, 'visual');

for (const gate of [
  { key: 'geometryRequired', file: geometryPath, label: 'geometry' },
  { key: 'responsiveRequired', file: responsivePath, label: 'responsive' }
]) {
  if (!report.qualityGates?.[gate.key]) continue;
  if (!fs.existsSync(gate.file)) {
    emit({ continue: false, stopReason: `Required ${gate.label} verification has not run.`, systemMessage: `Run ${gate.label} QA and create ${gate.file} before completion.` });
    process.exit(0);
  }
  try {
    const gateReport = JSON.parse(fs.readFileSync(gate.file, 'utf8'));
    if (gateReport.status !== 'PASS') {
      emit({ continue: false, stopReason: `Required ${gate.label} verification failed.`, systemMessage: `Fix ${gate.label} QA failures in ${gate.file} before completion.` });
      process.exit(0);
    }
    assertFresh(gateReport, gate.label);
  } catch (error) {
    emit({ continue: false, stopReason: `The ${gate.label} verification report is not valid JSON.`, systemMessage: `Fix ${gate.file} and run verification again. ${error.message}` });
    process.exit(0);
  }
}

let interaction = null;
if (report.interactionQa?.required === true) {
  if (!fs.existsSync(interactionPath)) {
    emit({
      continue: false,
      stopReason: 'Required interaction verification has not run.',
      systemMessage: 'Run visual QA with interaction checks and create qa/interaction-report.json before completion.'
    });
    process.exit(0);
  }
  try {
    interaction = JSON.parse(fs.readFileSync(interactionPath, 'utf8'));
  } catch (error) {
    emit({
      continue: false,
      stopReason: 'The interaction verification report is not valid JSON.',
      systemMessage: `Fix ${interactionPath} and run verification again. ${error.message}`
    });
    process.exit(0);
  }
  if (interaction.status !== 'PASS') {
    emit({
      continue: false,
      stopReason: 'Required interaction verification failed.',
      systemMessage: 'Fix the failed interaction checks in qa/interaction-report.json and run verification again.'
    });
    process.exit(0);
  }
  assertFresh(interaction, 'interaction');
}

let motion = null;
if (report.qualityGates?.motionRequired) {
  if (!fs.existsSync(motionPath)) block('Required motion verification has not run.', `Run motion QA and create ${motionPath} before completion.`);
  try { motion = JSON.parse(fs.readFileSync(motionPath, 'utf8')); }
  catch (error) { block('The motion verification report is not valid JSON.', `Fix ${motionPath} and run motion QA again. ${error.message}`); }
  if (motion.status !== 'PASS') block('Required motion verification failed.', `Fix failed motion checks in ${motionPath}.`);
  assertFresh(motion, 'motion');
}

if (report.qualityGates?.interactionPlanRequired) {
  const planPath = report.interactionPlan;
  if (!planPath || !fs.existsSync(planPath)) block('Required interaction plan is missing.', 'Create and validate work/interaction-plan.json, then rerun QA.');
  let plan;
  try { plan = JSON.parse(fs.readFileSync(planPath, 'utf8')); }
  catch (error) { block('The interaction plan is not valid JSON.', error.message); }
  const validation = validateInteractionPlan(plan);
  if (!validation.valid) block('The interaction plan is invalid.', validation.errors.join('; '));
  if (plan.sourceFingerprint?.value && plan.sourceRoot) {
    const current = createSourceFingerprint(plan.sourceRoot);
    if (current.value !== plan.sourceFingerprint.value) block('The interaction plan is stale.', 'Source changed after interaction planning. Rediscover or review the plan, then rerun QA.');
  }
  const evidence = new Map([...(interaction?.checks || []), ...(motion?.checks || [])].map((check) => [check.candidateId, check.status]));
  const missing = plan.candidates.filter((candidate) => candidate.confidence === 'high' && candidate.implementation !== 'skip' && evidence.get(candidate.id) !== 'PASS');
  if (missing.length) block('High-confidence interaction verification evidence is missing.', `Run the appropriate interaction or motion QA for: ${missing.map((candidate) => candidate.id).join(', ')}.`);
}

emit({
  continue: true,
  systemMessage: `Canonical visual and required interaction/motion verification passed: ${qaDir}`
});
