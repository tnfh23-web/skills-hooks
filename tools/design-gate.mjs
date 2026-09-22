import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { validateDesignHandoff, validatePngEvidence } from './design-handoff.mjs';

export const ROOT_OWNERS = Object.freeze([
  'DESIGN_DIRECTOR', 'UI_PLANNER', 'DESIGN_COMPOSER', 'VISUAL_CRITIC'
]);

const PLAN_FIELDS = [
  'brief', 'designRead', 'designThesis', 'dials', 'visualLanguage', 'signatureDevices',
  'typography', 'palette', 'shapeLanguage', 'assetStrategy', 'sectionPlan',
  'motionDirection', 'avoidedDefaults'
];
const DESIGN_READ_FIELDS = [
  'pageKind', 'audience', 'brandPersonality', 'contentPriority',
  'communicationGoal', 'desiredEmotion', 'constraints'
];
const SECTION_FIELDS = [
  'role', 'contentPriority', 'compositionLogic', 'visualAnchor', 'layoutTension',
  'relationshipToPrevious', 'relationshipToNext', 'interactionOpportunity',
  'entryBehavior', 'restraint'
];
const MOTION_FIELDS = [
  'motionCharacter', 'primaryMovement', 'secondaryMovement', 'continuousMovement',
  'sectionEntryVariation', 'pointerUsage', 'scrollUsage', 'restraint'
];

function populated(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export function validateDesignPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== 'object') return { valid: false, errors: ['design plan must be an object'] };
  for (const field of PLAN_FIELDS) if (!populated(plan[field])) errors.push(`design-plan.${field} is required`);
  for (const field of DESIGN_READ_FIELDS) if (!populated(plan.designRead?.[field])) errors.push(`design-plan.designRead.${field} is required`);
  for (const name of ['designVariance', 'motionIntensity', 'visualDensity']) {
    const dial = plan.dials?.[name];
    if (!dial || !Number.isFinite(dial.value) || !populated(dial.reason)) errors.push(`design-plan.dials.${name} requires numeric value and reason`);
  }
  if (Array.isArray(plan.sectionPlan)) {
    plan.sectionPlan.forEach((section, index) => {
      for (const field of SECTION_FIELDS) if (!populated(section?.[field])) errors.push(`design-plan.sectionPlan[${index}].${field} is required`);
    });
  }
  for (const field of MOTION_FIELDS) if (!populated(plan.motionDirection?.[field])) errors.push(`design-plan.motionDirection.${field} is required`);
  return { valid: errors.length === 0, errors };
}

export function validateDesignCritique(critique) {
  const errors = [];
  if (!critique || typeof critique !== 'object') return { valid: false, errors: ['design critique must be an object'] };
  if (!['PASS', 'FAIL', 'DESIGN_REVIEW_BLOCKED'].includes(critique.status)) errors.push('design-critique.status is invalid');
  if (critique.status === 'DESIGN_REVIEW_BLOCKED') {
    if (critique.renderedReview !== false) errors.push('DESIGN_REVIEW_BLOCKED requires renderedReview=false');
  } else if (critique.renderedReview !== true) errors.push(`${critique.status} critique requires renderedReview=true`);
  if (!Number.isInteger(critique.revisionCount) || critique.revisionCount < 0) errors.push('design-critique.revisionCount must be a non-negative integer');
  if (!['PASS', 'FAIL'].includes(critique.aiTellAudit?.status)) errors.push('design-critique.aiTellAudit.status is invalid');
  if (!Array.isArray(critique.aiTellAudit?.findings)) errors.push('design-critique.aiTellAudit.findings must be an array');
  if (!Array.isArray(critique.issues)) errors.push('design-critique.issues must be an array');
  else critique.issues.forEach((issue, index) => {
    if (!ROOT_OWNERS.includes(issue?.rootOwner)) errors.push(`design-critique.issues[${index}].rootOwner is invalid`);
    if (!populated(issue?.reason)) errors.push(`design-critique.issues[${index}].reason is required`);
  });
  return { valid: errors.length === 0, errors };
}

function readJson(file, label, errors) {
  if (!fs.existsSync(file)) { errors.push(`${label} is missing: ${file}`); return null; }
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { errors.push(`${label} is invalid JSON: ${error.message}`); return null; }
}

export function evaluateDesignGate({ designDir = 'work/design', forPublishing = false } = {}) {
  const root = path.resolve(designDir);
  const errors = [];
  const plan = readJson(path.join(root, 'design-plan.json'), 'design plan', errors);
  const critique = readJson(path.join(root, 'design-critique.json'), 'design critique', errors);
  const manifest = readJson(path.join(root, 'asset-manifest.json'), 'asset manifest', errors);
  const handoff = readJson(path.join(root, 'handoff.json'), 'design handoff', errors);
  for (const name of ['desktop', 'tablet', 'mobile']) {
    errors.push(...validatePngEvidence(path.join(root, 'review', `${name}.png`), `${name} review screenshot`).errors);
  }

  if (plan) errors.push(...validateDesignPlan(plan).errors);
  if (manifest && (manifest.version !== 1 || !Array.isArray(manifest.assets))) errors.push('asset manifest requires version 1 and assets array');
  if (critique) {
    errors.push(...validateDesignCritique(critique).errors);
    if (critique.status !== 'PASS') errors.push(`critic status is ${critique.status}`);
    if (critique.aiTellAudit?.status !== 'PASS') errors.push('AI-TELL audit did not PASS');
    const unresolved = Array.isArray(critique.issues) ? critique.issues.filter((issue) => issue.blocking === true && issue.resolved !== true) : [];
    if (unresolved.length) errors.push(`${unresolved.length} unresolved blocking critique issue(s)`);
  }
  if (handoff) errors.push(...validateDesignHandoff(handoff, { forPublishing }).errors);

  const revisionCount = critique?.revisionCount;
  let status;
  if (critique?.status === 'DESIGN_REVIEW_BLOCKED') status = 'DESIGN_REVIEW_BLOCKED';
  else if (Number.isInteger(revisionCount) && (revisionCount > 3 || (revisionCount >= 3 && critique?.status === 'FAIL'))) status = 'DESIGN_BLOCKED';
  else status = errors.length ? 'FAIL' : 'DESIGN_READY';
  return { version: 1, status, designDir: root, revisionCount: revisionCount ?? null, errors };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = evaluateDesignGate({ designDir: args['design-dir'], forPublishing: Boolean(args['for-publishing']) });
  if (args.output) {
    const output = path.resolve(args.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'DESIGN_READY') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
