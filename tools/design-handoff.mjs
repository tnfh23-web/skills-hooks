import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const PUBLISHING_QA_CHAIN = Object.freeze([
  'Visual', 'Geometry', 'Responsive', 'Interaction', 'Motion', 'StopHook'
]);
export const DESIGN_HANDOFF_ROUTES = Object.freeze(['DESIGN_ONLY', 'DESIGN_AND_PUBLISH']);

function readEvidenceJson(file, label, errors) {
  if (!fs.existsSync(file)) {
    errors.push(`${label} is missing: ${file}`);
    return null;
  }
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) errors.push(`${label} must be a JSON object`);
    return value;
  } catch (error) {
    errors.push(`${label} is invalid JSON: ${error.message}`);
    return null;
  }
}

export function validatePngEvidence(file, label = 'review screenshot') {
  const errors = [];
  if (!fs.existsSync(file)) return { valid: false, errors: [`${label} is missing: ${file}`] };
  try {
    const image = PNG.sync.read(fs.readFileSync(file));
    if (!Number.isInteger(image.width) || image.width <= 0 || !Number.isInteger(image.height) || image.height <= 0) {
      errors.push(`${label} must have positive width and height: ${file}`);
    }
  } catch (error) {
    errors.push(`${label} is not a decodable PNG: ${file} (${error.message})`);
  }
  return { valid: errors.length === 0, errors };
}

export function inspectDesignEvidence({ designDir = 'work/design' } = {}) {
  const root = path.resolve(designDir);
  const errors = [];
  const plan = readEvidenceJson(path.join(root, 'design-plan.json'), 'design plan', errors);
  const critique = readEvidenceJson(path.join(root, 'design-critique.json'), 'design critique', errors);
  const manifest = readEvidenceJson(path.join(root, 'asset-manifest.json'), 'asset manifest', errors);

  for (const name of ['desktop', 'tablet', 'mobile']) {
    errors.push(...validatePngEvidence(path.join(root, 'review', `${name}.png`), `${name} review screenshot`).errors);
  }

  if (critique) {
    if (critique.status !== 'PASS') errors.push(`critic status must be PASS, received ${critique.status}`);
    if (critique.renderedReview !== true) errors.push('PASS critique requires renderedReview=true');
    if (critique.aiTellAudit?.status !== 'PASS') errors.push(`AI-TELL audit must be PASS, received ${critique.aiTellAudit?.status}`);
    if (!Number.isInteger(critique.revisionCount) || critique.revisionCount < 0) errors.push('revisionCount must be a non-negative integer');
    else if (critique.revisionCount > 3) errors.push('revisionCount exceeds the maximum of 3');
    if (!Array.isArray(critique.issues)) errors.push('critique issues must be an array');
    else if (critique.issues.some((issue) => issue.blocking === true && issue.resolved !== true)) errors.push('unresolved blocking critique issue exists');
  }

  return { valid: errors.length === 0, errors, root, plan, critique, manifest };
}

export function createDesignHandoff({ route, designDir = 'work/design' } = {}) {
  if (!DESIGN_HANDOFF_ROUTES.includes(route)) throw new Error(`Invalid design handoff route: ${route ?? 'undefined'}`);
  const evidence = inspectDesignEvidence({ designDir });
  if (!evidence.valid) throw new Error(`Cannot create DESIGN_READY handoff: ${evidence.errors.join('; ')}`);
  const normalized = designDir.replaceAll('\\', '/').replace(/\/$/, '');
  return {
    version: 1,
    status: 'DESIGN_READY',
    source: 'design-workflow',
    designFrozen: true,
    critic: evidence.critique.status,
    aiTellAudit: evidence.critique.aiTellAudit.status,
    primaryReference: `${normalized}/review/desktop.png`,
    responsiveReferences: {
      tablet: `${normalized}/review/tablet.png`,
      mobile: `${normalized}/review/mobile.png`
    },
    designPlan: `${normalized}/design-plan.json`,
    assetManifest: `${normalized}/asset-manifest.json`,
    route,
    publishingAdapter: route === 'DESIGN_AND_PUBLISH' ? {
      workflow: 'reference-publish',
      primaryReference: `${normalized}/review/desktop.png`,
      responsiveIntent: {
        tabletReference: `${normalized}/review/tablet.png`,
        mobileReference: `${normalized}/review/mobile.png`,
        designPlan: `${normalized}/design-plan.json`
      },
      requiredPublishingQa: [...PUBLISHING_QA_CHAIN],
      bypassAllowed: false
    } : null
  };
}

export function validateDesignHandoff(handoff, { forPublishing = false } = {}) {
  const errors = [];
  if (!handoff || typeof handoff !== 'object') return { valid: false, errors: ['handoff must be an object'] };
  if (handoff.version !== 1) errors.push('handoff.version must be 1');
  if (handoff.status !== 'DESIGN_READY') errors.push('handoff.status must be DESIGN_READY');
  if (handoff.source !== 'design-workflow') errors.push('handoff.source must be design-workflow');
  if (!DESIGN_HANDOFF_ROUTES.includes(handoff.route)) errors.push('handoff.route must be DESIGN_ONLY or DESIGN_AND_PUBLISH');
  if (handoff.designFrozen !== true) errors.push('handoff.designFrozen must be true');
  if (handoff.critic !== 'PASS') errors.push('handoff.critic must be PASS');
  if (handoff.aiTellAudit !== 'PASS') errors.push('handoff.aiTellAudit must be PASS');
  for (const field of ['primaryReference', 'designPlan', 'assetManifest']) {
    if (typeof handoff[field] !== 'string' || !handoff[field]) errors.push(`handoff.${field} is required`);
  }
  for (const name of ['tablet', 'mobile']) {
    if (typeof handoff.responsiveReferences?.[name] !== 'string') errors.push(`handoff.responsiveReferences.${name} is required`);
  }
  if (forPublishing) {
    if (handoff.route !== 'DESIGN_AND_PUBLISH') errors.push('publishing requires DESIGN_AND_PUBLISH route');
    if (handoff.publishingAdapter?.workflow !== 'reference-publish') errors.push('publishing adapter must target reference-publish');
    if (handoff.publishingAdapter?.bypassAllowed !== false) errors.push('publishing QA bypass must be disabled');
    const required = handoff.publishingAdapter?.requiredPublishingQa || [];
    for (const qa of PUBLISHING_QA_CHAIN) if (!required.includes(qa)) errors.push(`publishing adapter requires ${qa}`);
  }
  return { valid: errors.length === 0, errors };
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
  const designDir = (args['design-dir'] || 'work/design').replaceAll('\\', '/');
  const handoff = createDesignHandoff({ route: args.route, designDir });
  const validation = validateDesignHandoff(handoff, { forPublishing: handoff.route === 'DESIGN_AND_PUBLISH' });
  if (!validation.valid) throw new Error(validation.errors.join('; '));
  const output = path.resolve(args.output || `${designDir}/handoff.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(handoff, null, 2)}\n`);
  console.log(`DESIGN_READY: ${output}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
