import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const VISUAL_REFERENCE_MODES = Object.freeze([
  'GENERATED_SECTION_REFERENCES',
  'LOCAL_COMPOSITION_PROTOTYPE',
  'ART_DIRECTION_BRIEF'
]);

export const VISUAL_MEDIA_CHOICES = Object.freeze([
  'photography',
  'project imagery',
  'illustration',
  '3D',
  'video',
  'texture/material',
  'generative visual',
  'typography-only'
]);
export const PRODUCTION_VALUE_CHECKS = Object.freeze([
  'materialEssential', 'mediaStructural', 'scaleVariation', 'compositionVariation',
  'depthBeyondShadow', 'mediaPresence', 'postHeroIntensity', 'memorableAnchors',
  'brandLinkedTreatment', 'brandSpecificity'
]);

const VISUAL_DIRECTION_FIELDS = [
  'visualConcept', 'mediaStrategy', 'composition', 'typographyBehavior',
  'backgroundStrategy', 'cropGrammar', 'signatureVisualDevices',
  'assetRequirements', 'avoid', 'referenceStrategy'
];
const MEDIA_FIELDS = ['dominance', 'role', 'source', 'treatment', 'primaryMedium', 'rationale'];
const COMPOSITION_FIELDS = ['hero', 'sectionAnchors', 'scaleRhythm', 'depthStrategy'];

function normalizedArtifactPath(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const slashed = value.trim().replaceAll('\\', '/');
  if (slashed.startsWith('/') || /^[a-zA-Z]:\//.test(slashed)) return null;
  const normalized = path.posix.normalize(slashed);
  return normalized.startsWith('visual-reference/') && normalized !== 'visual-reference/'
    ? normalized : null;
}

export function validateVisualReferenceSections(plan) {
  const errors = [];
  if (!Array.isArray(plan?.sectionPlan) || plan.sectionPlan.length === 0) {
    return { valid: false, errors: ['design-plan.sectionPlan requires at least one section'] };
  }
  const ids = new Set();
  plan.sectionPlan.forEach((section, index) => {
    const label = `design-plan.sectionPlan[${index}]`;
    if (typeof section?.sectionId !== 'string' || !section.sectionId.trim() || section.sectionId !== section.sectionId.trim()) {
      errors.push(`${label}.sectionId must be a non-empty trimmed string`);
    }
    else if (ids.has(section.sectionId)) errors.push(`${label}.sectionId is duplicated: ${section.sectionId}`);
    else ids.add(section.sectionId);
    if (typeof section?.visualReference?.required !== 'boolean') {
      errors.push(`${label}.visualReference.required must be a boolean`);
    }
    if (typeof section?.visualReference?.reason !== 'string' || !section.visualReference.reason.trim()) {
      errors.push(`${label}.visualReference.reason is required`);
    }
  });
  return { valid: errors.length === 0, errors };
}

function populated(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function readJson(file, label, errors) {
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

function validateArtifact(file, label) {
  const errors = [];
  if (!fs.existsSync(file)) return { valid: false, errors: [`${label} is missing: ${file}`] };
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size <= 0) errors.push(`${label} must be a non-empty file: ${file}`);
  if (path.extname(file).toLowerCase() === '.png') {
    try {
      const image = PNG.sync.read(fs.readFileSync(file));
      if (image.width <= 0 || image.height <= 0) errors.push(`${label} PNG must have positive dimensions: ${file}`);
    } catch (error) {
      errors.push(`${label} is not a decodable PNG: ${file} (${error.message})`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateVisualDirection(direction, { pageKind = '' } = {}) {
  const errors = [];
  if (!direction || typeof direction !== 'object' || Array.isArray(direction)) {
    return { valid: false, errors: ['visual direction must be an object'] };
  }
  for (const field of VISUAL_DIRECTION_FIELDS) {
    if (!populated(direction[field])) errors.push(`visual-direction.${field} is required`);
  }
  for (const field of MEDIA_FIELDS) {
    if (!populated(direction.mediaStrategy?.[field])) errors.push(`visual-direction.mediaStrategy.${field} is required`);
  }
  for (const field of COMPOSITION_FIELDS) {
    if (!populated(direction.composition?.[field])) errors.push(`visual-direction.composition.${field} is required`);
  }
  if (populated(direction.mediaStrategy?.primaryMedium) && !VISUAL_MEDIA_CHOICES.includes(direction.mediaStrategy.primaryMedium)) {
    errors.push(`visual-direction.mediaStrategy.primaryMedium must be one of: ${VISUAL_MEDIA_CHOICES.join(', ')}`);
  }
  const visualHeavy = /creative agency|portfolio|\bbrand\b|campaign|editorial|premium marketing/i.test(pageKind);
  if (visualHeavy && !populated(direction.mediaStrategy?.primaryMedium)) {
    errors.push('visual-heavy briefs require an explicit primary media strategy');
  }
  if (direction.mediaStrategy?.primaryMedium === 'typography-only') {
    const rationale = direction.mediaStrategy?.typographyOnlyRationale;
    for (const field of ['reason', 'mediaUnnecessaryBecause', 'productionValueSource']) {
      if (!populated(rationale?.[field])) errors.push(`typography-only media strategy requires typographyOnlyRationale.${field}`);
    }
  }

  const strategy = direction.referenceStrategy;
  if (!['AVAILABLE', 'UNAVAILABLE'].includes(strategy?.capability)) {
    errors.push('visual-direction.referenceStrategy.capability must be AVAILABLE or UNAVAILABLE');
  }
  if (!VISUAL_REFERENCE_MODES.includes(strategy?.mode)) {
    errors.push(`visual-direction.referenceStrategy.mode must be one of: ${VISUAL_REFERENCE_MODES.join(', ')}`);
  }
  if (!populated(strategy?.rationale)) errors.push('visual-direction.referenceStrategy.rationale is required');
  if (strategy?.capability === 'AVAILABLE' && strategy?.status !== 'READY') {
    errors.push('available visual reference capability requires referenceStrategy.status=READY');
  }
  if (strategy?.capability === 'UNAVAILABLE') {
    if (strategy.status !== 'VISUAL_REFERENCE_TOOL_UNAVAILABLE') {
      errors.push('unavailable capability must preserve referenceStrategy.status=VISUAL_REFERENCE_TOOL_UNAVAILABLE');
    }
    if (!['LOCAL_COMPOSITION_PROTOTYPE', 'ART_DIRECTION_BRIEF'].includes(strategy.mode)) {
      errors.push('unavailable capability requires LOCAL_COMPOSITION_PROTOTYPE or ART_DIRECTION_BRIEF fallback');
    }
  }
  if (strategy?.mode === 'GENERATED_SECTION_REFERENCES' && strategy?.capability !== 'AVAILABLE') {
    errors.push('generated section references require an available image generation capability');
  }
  if (strategy?.mode === 'GENERATED_SECTION_REFERENCES') {
    const evidence = strategy.capabilityEvidence;
    if (evidence?.source !== 'active-session-tool') errors.push('generated references require capabilityEvidence.source=active-session-tool');
    if (typeof evidence?.tool !== 'string' || !evidence.tool.trim()) errors.push('generated references require capabilityEvidence.tool');
    if (evidence?.verified !== true) errors.push('generated references require capabilityEvidence.verified=true');
  }
  return { valid: errors.length === 0, errors, visualHeavy };
}

export function validateSectionReferenceManifest(manifest, direction, plan) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { valid: false, errors: ['section reference manifest must be an object'] };
  }
  if (manifest.version !== 1) errors.push('section reference manifest version must be 1');
  if (manifest.strategy !== direction?.referenceStrategy?.mode) {
    errors.push('section reference manifest strategy must match visual direction referenceStrategy.mode');
  }
  if (!Array.isArray(manifest.sections) || manifest.sections.length === 0) {
    errors.push('section reference manifest requires at least one section artifact');
  } else {
    const planSections = new Map(Array.isArray(plan?.sectionPlan)
      ? plan.sectionPlan.filter((section) => populated(section?.sectionId)).map((section) => [section.sectionId, section]) : []);
    const covered = new Set();
    const artifactPaths = new Set();
    manifest.sections.forEach((section, index) => {
      for (const field of ['sectionId', 'role', 'artifact', 'evidenceType']) {
        if (!populated(section?.[field])) errors.push(`section-reference-manifest.sections[${index}].${field} is required`);
      }
      if (typeof section?.sectionId !== 'string' || section.sectionId !== section.sectionId.trim()) {
        errors.push(`section-reference-manifest.sections[${index}].sectionId must be a trimmed string`);
      }
      if (section?.reviewable !== true) errors.push(`section-reference-manifest.sections[${index}].reviewable must be true`);
      if (populated(section?.sectionId)) {
        if (!planSections.has(section.sectionId)) errors.push(`manifest orphan sectionId: ${section.sectionId}`);
        covered.add(section.sectionId);
      }
      const normalized = normalizedArtifactPath(section?.artifact);
      if (!normalized) errors.push(`section-reference-manifest.sections[${index}].artifact must stay under visual-reference`);
      else if (artifactPaths.has(normalized)) errors.push(`manifest duplicate artifact: ${section.artifact}`);
      else artifactPaths.add(normalized);
      if (direction?.referenceStrategy?.mode === 'GENERATED_SECTION_REFERENCES') {
        if (section?.evidenceType !== 'generated-section-reference') errors.push(`generated artifact ${index} requires generated-section-reference evidenceType`);
        if (section?.provenance?.source !== 'image-generation') errors.push(`generated artifact ${index} requires provenance.source=image-generation`);
        if (section?.provenance?.verified !== true) errors.push(`generated artifact ${index} requires provenance.verified=true`);
      }
    });
    for (const section of planSections.values()) {
      if (section.visualReference?.required === true && !covered.has(section.sectionId)) {
        errors.push(`required visual reference is missing for sectionId: ${section.sectionId}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateVisualReferenceReview(review, direction, manifest) {
  const errors = [];
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    return { valid: false, errors: ['visual reference review must be an object'] };
  }
  if (review.version !== 1) errors.push('visual reference review version must be 1');
  if (!Array.isArray(review.reviewedArtifacts) || review.reviewedArtifacts.length === 0) {
    errors.push('visual reference review requires reviewedArtifacts');
  } else if (Array.isArray(manifest?.sections)) {
    const expected = new Set(manifest.sections.filter((section) => section?.reviewable === true)
      .map((section) => normalizedArtifactPath(section.artifact)).filter(Boolean));
    const reviewed = new Set();
    review.reviewedArtifacts.forEach((artifact) => {
      const normalized = normalizedArtifactPath(artifact);
      if (!normalized || !expected.has(normalized)) errors.push(`reviewed artifact is not in manifest: ${artifact}`);
      else if (reviewed.has(normalized)) errors.push(`reviewed artifact is duplicated: ${artifact}`);
      else reviewed.add(normalized);
    });
    for (const artifact of expected) {
      if (!reviewed.has(artifact)) errors.push(`reviewable manifest artifact was not reviewed: ${artifact}`);
    }
  }
  if (!Array.isArray(review.issues)) errors.push('visual reference review issues must be an array');
  const unavailableBrief = direction?.referenceStrategy?.capability === 'UNAVAILABLE'
    && direction?.referenceStrategy?.mode === 'ART_DIRECTION_BRIEF';
  if (unavailableBrief) {
    if (review.status !== 'VISUAL_REFERENCE_TOOL_UNAVAILABLE') {
      errors.push('art-direction brief fallback must preserve VISUAL_REFERENCE_TOOL_UNAVAILABLE review status');
    }
  } else if (review.status !== 'PASS') {
    errors.push('visual reference review must PASS before Design Composer');
  }
  if (direction?.referenceStrategy?.capability === 'UNAVAILABLE'
    && direction?.referenceStrategy?.mode === 'LOCAL_COMPOSITION_PROTOTYPE'
    && (!Array.isArray(review.limitations) || review.limitations.length === 0)) {
    errors.push('local composition fallback requires an explicit visual reference limitation');
  }
  return { valid: errors.length === 0, errors, composerReady: review.status === 'PASS' && !unavailableBrief };
}

export function validateRenderedVisualAudit(critique) {
  const errors = [];
  if (!['PASS', 'FAIL'].includes(critique?.productionValueAudit?.status)) {
    errors.push('design-critique.productionValueAudit.status is invalid');
  }
  if (!Array.isArray(critique?.productionValueAudit?.findings)) {
    errors.push('design-critique.productionValueAudit.findings must be an array');
  }
  for (const checkName of PRODUCTION_VALUE_CHECKS) {
    const check = critique?.productionValueAudit?.checks?.[checkName];
    if (!['PASS', 'FAIL'].includes(check?.status) || !populated(check?.evidence)) {
      errors.push(`design-critique.productionValueAudit.checks.${checkName} requires PASS|FAIL status and evidence`);
    }
    if (critique?.productionValueAudit?.status === 'PASS' && check?.status !== 'PASS') {
      errors.push(`design-critique.productionValueAudit cannot PASS while ${checkName} is not PASS`);
    }
  }
  if (!['PASS', 'FAIL'].includes(critique?.visualFidelityReview?.status)) {
    errors.push('design-critique.visualFidelityReview.status is invalid');
  }
  if (!Array.isArray(critique?.visualFidelityReview?.findings)) {
    errors.push('design-critique.visualFidelityReview.findings must be an array');
  }
  if (!Array.isArray(critique?.visualFidelityReview?.comparedArtifacts)
    || critique.visualFidelityReview.comparedArtifacts.length === 0) {
    errors.push('design-critique.visualFidelityReview.comparedArtifacts is required');
  }
  return { valid: errors.length === 0, errors };
}

export function inspectVisualReferenceEvidence({ designDir = 'work/design', pageKind = '' } = {}) {
  const root = path.resolve(designDir);
  const visualRoot = path.join(root, 'visual-reference');
  const errors = [];
  const plan = readJson(path.join(root, 'design-plan.json'), 'design plan', errors);
  const direction = readJson(path.join(visualRoot, 'visual-direction.json'), 'visual direction', errors);
  const manifest = readJson(path.join(visualRoot, 'section-reference-manifest.json'), 'section reference manifest', errors);
  const review = readJson(path.join(visualRoot, 'visual-reference-review.json'), 'visual reference review', errors);
  if (plan) errors.push(...validateVisualReferenceSections(plan).errors);
  if (direction) errors.push(...validateVisualDirection(direction, { pageKind: pageKind || plan?.designRead?.pageKind || '' }).errors);
  if (manifest) errors.push(...validateSectionReferenceManifest(manifest, direction, plan).errors);
  const reviewResult = review ? validateVisualReferenceReview(review, direction, manifest) : { composerReady: false, errors: [] };
  if (review) errors.push(...reviewResult.errors);

  if (Array.isArray(manifest?.sections)) {
    manifest.sections.forEach((section, index) => {
      if (!populated(section?.artifact)) return;
      const normalized = normalizedArtifactPath(section.artifact);
      if (!normalized) return;
      const artifact = path.resolve(root, ...normalized.split('/'));
      const relative = path.relative(visualRoot, artifact);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        errors.push(`section reference artifact must stay under visual-reference: ${section.artifact}`);
        return;
      }
      errors.push(...validateArtifact(artifact, `section reference artifact ${index}`).errors);
    });
  }

  const unavailableBrief = direction?.referenceStrategy?.capability === 'UNAVAILABLE'
    && direction?.referenceStrategy?.mode === 'ART_DIRECTION_BRIEF';
  return {
    valid: errors.length === 0,
    composerReady: errors.length === 0 && reviewResult.composerReady === true,
    status: unavailableBrief ? 'VISUAL_REFERENCE_TOOL_UNAVAILABLE' : (errors.length ? 'FAIL' : 'READY'),
    errors,
    root,
    plan,
    direction,
    manifest,
    review
  };
}

export function assertComposerReady(options = {}) {
  const evidence = inspectVisualReferenceEvidence(options);
  if (!evidence.composerReady) {
    const reason = evidence.errors.length ? evidence.errors.join('; ') : evidence.status;
    throw new Error(`Design Composer requires approved visual reference evidence: ${reason}`);
  }
  return evidence;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; index += 1; }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidence = args['for-composer']
    ? assertComposerReady({ designDir: args['design-dir'], pageKind: args['page-kind'] })
    : inspectVisualReferenceEvidence({ designDir: args['design-dir'], pageKind: args['page-kind'] });
  console.log(JSON.stringify(evidence, null, 2));
  if (!evidence.valid) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
