import fs from 'node:fs';
import path from 'node:path';
import { createSourceFingerprint } from '../../tools/source-fingerprint.mjs';

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

const cwd = process.cwd();
const reportPath = path.join(cwd, 'qa', 'report.json');
const interactionPath = path.join(cwd, 'qa', 'interaction-report.json');
const geometryPath = path.join(cwd, 'qa', 'geometry-report.json');
const responsivePath = path.join(cwd, 'qa', 'responsive-report.json');

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
  .map((name) => path.join(cwd, 'qa', name))
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

if (report.sourceFingerprint?.value && report.sourceRoot) {
  const current = createSourceFingerprint(report.sourceRoot);
  if (current.value !== report.sourceFingerprint.value) {
    emit({
      continue: false,
      stopReason: 'The source changed after the latest visual verification.',
      systemMessage: 'Run visual QA again after the latest source change. The PASS report is stale.'
    });
    process.exit(0);
  }
}

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
  } catch (error) {
    emit({ continue: false, stopReason: `The ${gate.label} verification report is not valid JSON.`, systemMessage: `Fix ${gate.file} and run verification again. ${error.message}` });
    process.exit(0);
  }
}

if (report.interactionQa?.required === true) {
  if (!fs.existsSync(interactionPath)) {
    emit({
      continue: false,
      stopReason: 'Required interaction verification has not run.',
      systemMessage: 'Run visual QA with interaction checks and create qa/interaction-report.json before completion.'
    });
    process.exit(0);
  }
  let interaction;
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
}

emit({
  continue: true,
  systemMessage: 'Reference publishing visual and required interaction verification passed.'
});
