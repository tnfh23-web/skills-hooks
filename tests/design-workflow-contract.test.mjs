import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { decideWorkflowRoute } from '../tools/workflow-router.mjs';
import { evaluateDesignGate, validateDesignCritique, validateDesignPlan } from '../tools/design-gate.mjs';
import { createDesignHandoff, PUBLISHING_QA_CHAIN, validateDesignHandoff } from '../tools/design-handoff.mjs';
import {
  assertComposerReady,
  inspectVisualReferenceEvidence,
  validateVisualDirection
} from '../tools/design-visual-reference.mjs';

const testRoot = path.resolve('work/design-workflow-contract-test');

function validPlan() {
  return {
    brief: { objective: 'Explain a focused editorial service', evidence: ['user brief'] },
    designRead: {
      pageKind: 'editorial landing page', audience: 'culture readers', brandPersonality: 'precise and curious',
      contentPriority: 'lead story then supporting stories', communicationGoal: 'invite deliberate exploration',
      desiredEmotion: 'quiet curiosity', constraints: ['local assets', 'responsive']
    },
    designThesis: { statement: 'Editorial rhythm creates discovery', evidence: ['audience', 'content priority'] },
    dials: {
      designVariance: { value: 6, reason: 'distinctive without reducing editorial clarity' },
      motionIntensity: { value: 3, reason: 'reading remains primary' },
      visualDensity: { value: 7, reason: 'multiple stories need visible hierarchy' }
    },
    visualLanguage: { principle: 'contrasting editorial scales' },
    signatureDevices: [{ device: 'indexed story rail', reason: 'supports browsing' }],
    typography: { display: 'local serif', body: 'local sans' },
    palette: { ink: '#111111', paper: '#f3f0ea' },
    shapeLanguage: { corners: 'mostly square', reason: 'editorial tone' },
    assetStrategy: { source: 'project-local', treatment: 'documented crops' },
    sectionPlan: [{
      role: 'lead', contentPriority: 'primary', compositionLogic: 'asymmetric split', visualAnchor: 'lead image',
      layoutTension: 'headline against image edge', relationshipToPrevious: 'page entry',
      relationshipToNext: 'hands off to story index', interactionOpportunity: 'story navigation',
      entryBehavior: 'static first paint', restraint: 'one primary action', sectionRole: 'opening scene',
      mediaRole: 'lead editorial material', compositionAnchor: 'cropped image edge', scaleContrast: 'large image against compact index',
      depthMode: 'overlap without shadow', backgroundMode: 'paper field', transitionIntent: 'image edge hands off to story rail'
    }],
    motionDirection: {
      motionCharacter: 'quiet and measured', primaryMovement: 'state change supports navigation',
      secondaryMovement: 'subtle feedback only', continuousMovement: 'none by default',
      sectionEntryVariation: 'composition-led, not one repeated reveal', pointerUsage: 'affordance feedback',
      scrollUsage: 'only when section relationship requires it', restraint: 'no decorative loop'
    },
    avoidedDefaults: ['unmotivated card grid', 'generic gradient glow']
  };
}

function validCritique() {
  const productionChecks = Object.fromEntries([
    'materialEssential', 'mediaStructural', 'scaleVariation', 'compositionVariation',
    'depthBeyondShadow', 'mediaPresence', 'postHeroIntensity', 'memorableAnchors',
    'brandLinkedTreatment', 'brandSpecificity'
  ].map((name) => [name, { status: 'PASS', evidence: `${name} is visible in the rendered review.` }]));
  return {
    version: 1,
    status: 'PASS',
    renderedReview: true,
    revisionCount: 1,
    aiTellAudit: { status: 'PASS', findings: [] },
    productionValueAudit: {
      status: 'PASS', findings: ['Lead media remains a structural layout material.'], checks: productionChecks
    },
    visualFidelityReview: {
      status: 'PASS', findings: ['Rendered crop and hierarchy match the approved reference.'],
      comparedArtifacts: ['visual-reference/hero.png', 'review/desktop.png']
    },
    issues: [{ issue: 'Resolved spacing inconsistency', blocking: false, resolved: true, rootOwner: 'DESIGN_COMPOSER', reason: 'Rendered spacing departed from the section rhythm.' }]
  };
}

function validVisualDirection() {
  return {
    visualConcept: 'A reading surface organized by image edge and indexed editorial rhythm',
    mediaStrategy: {
      dominance: 'lead image carries the first scene', role: 'editorial evidence and spatial anchor',
      source: 'project-local imagery', treatment: 'decisive edge crop with quiet tonal grade',
      primaryMedium: 'project imagery', rationale: 'The publication identity depends on visible story material.'
    },
    composition: {
      hero: 'image-as-canvas with headline held against a safe edge',
      sectionAnchors: ['lead crop', 'indexed story rail'],
      scaleRhythm: 'one dominant scene followed by denser supporting material',
      depthStrategy: 'foreground type overlaps media edge without generic card elevation'
    },
    typographyBehavior: 'display scale follows story priority rather than a repeated section template',
    backgroundStrategy: 'paper field alternates with image-led scenes',
    cropGrammar: 'subject-aware crops preserve a clean text safe area',
    signatureVisualDevices: ['indexed image edge'],
    assetRequirements: ['one reviewable lead image'],
    avoid: ['three equal story cards', 'decorative CSS rectangles as primary material'],
    referenceStrategy: {
      capability: 'AVAILABLE', status: 'READY', mode: 'GENERATED_SECTION_REFERENCES',
      rationale: 'The active session exposes real image generation capability.'
    }
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeValidPng(file, width = 2, height = 2) {
  const image = new PNG({ width, height });
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = 24;
    image.data[index + 1] = 48;
    image.data[index + 2] = 72;
    image.data[index + 3] = 255;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(image));
}

function writeValidVisualReference(dir) {
  const visualDir = path.join(dir, 'visual-reference');
  writeJson(path.join(visualDir, 'visual-direction.json'), validVisualDirection());
  writeValidPng(path.join(visualDir, 'hero.png'), 8, 6);
  writeJson(path.join(visualDir, 'section-reference-manifest.json'), {
    version: 1,
    strategy: 'GENERATED_SECTION_REFERENCES',
    sections: [{
      sectionId: 'hero', role: 'opening scene', artifact: 'visual-reference/hero.png',
      evidenceType: 'generated-section-reference', reviewable: true
    }]
  });
  writeJson(path.join(visualDir, 'visual-reference-review.json'), {
    version: 1, status: 'PASS', reviewedArtifacts: ['visual-reference/hero.png'], issues: [], limitations: []
  });
}

function makeValidPackage(dir, route = 'DESIGN_AND_PUBLISH') {
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  for (const name of ['desktop', 'tablet', 'mobile']) writeValidPng(path.join(dir, 'review', `${name}.png`));
  writeJson(path.join(dir, 'design-plan.json'), validPlan());
  writeValidVisualReference(dir);
  writeJson(path.join(dir, 'design-critique.json'), validCritique());
  writeJson(path.join(dir, 'asset-manifest.json'), { version: 1, assets: [] });
  writeJson(path.join(dir, 'handoff.json'), createDesignHandoff({ route, designDir: dir.replaceAll('\\', '/') }));
}

function reset(name) {
  const dir = path.join(testRoot, name);
  fs.rmSync(dir, { recursive: true, force: true });
  makeValidPackage(dir);
  return dir;
}

fs.rmSync(testRoot, { recursive: true, force: true });

assert.equal(decideWorkflowRoute({ referencePresent: true, faithfulImplementation: true, implementationRequested: true }).route, 'REFERENCE_PUBLISH', 'A: reference + faithful implementation routes to existing publishing');
assert.equal(decideWorkflowRoute({ referencePresent: false, implementationRequested: true }).route, 'DESIGN_AND_PUBLISH', 'B: no reference + implementation routes through design');
assert.equal(decideWorkflowRoute({ designOnly: true }).route, 'DESIGN_ONLY', 'C: design-only request stops after handoff');

const missingPlanField = validPlan();
delete missingPlanField.designThesis;
assert.equal(validateDesignPlan(missingPlanField).valid, false, 'D: missing design-plan field fails');

const missingDesktop = reset('missing-desktop');
fs.rmSync(path.join(missingDesktop, 'review', 'desktop.png'));
assert.equal(evaluateDesignGate({ designDir: missingDesktop }).status, 'FAIL', 'E: missing desktop screenshot fails');

const criticFail = reset('critic-fail');
const failedCritique = validCritique();
failedCritique.status = 'FAIL';
writeJson(path.join(criticFail, 'design-critique.json'), failedCritique);
assert.notEqual(evaluateDesignGate({ designDir: criticFail }).status, 'DESIGN_READY', 'F: critic FAIL cannot become DESIGN_READY');

const auditFail = reset('audit-fail');
const auditCritique = validCritique();
auditCritique.aiTellAudit.status = 'FAIL';
writeJson(path.join(auditFail, 'design-critique.json'), auditCritique);
assert.notEqual(evaluateDesignGate({ designDir: auditFail }).status, 'DESIGN_READY', 'G: AI-TELL audit FAIL cannot become DESIGN_READY');

const ownerless = validCritique();
ownerless.status = 'FAIL';
ownerless.issues = [{ issue: 'Broken hierarchy', blocking: true, resolved: false, reason: 'Primary content is visually subordinate.' }];
assert.equal(validateDesignCritique(ownerless).valid, false, 'H: critique issue without rootOwner is invalid');

const overRevision = reset('over-revision');
const fourthCritique = validCritique();
fourthCritique.revisionCount = 4;
writeJson(path.join(overRevision, 'design-critique.json'), fourthCritique);
assert.equal(evaluateDesignGate({ designDir: overRevision }).status, 'DESIGN_BLOCKED', 'I: revisionCount over 3 blocks design');

const unfrozenDir = reset('unfrozen');
const unfrozen = createDesignHandoff({ route: 'DESIGN_AND_PUBLISH', designDir: unfrozenDir });
unfrozen.designFrozen = false;
assert.equal(validateDesignHandoff(unfrozen, { forPublishing: true }).valid, false, 'J: unfrozen design cannot enter publishing');

const ready = reset('ready');
assert.equal(evaluateDesignGate({ designDir: ready, forPublishing: true }).status, 'DESIGN_READY', 'K: complete PASS package becomes DESIGN_READY');

const publishingDir = reset('publishing-handoff');
const publishingHandoff = createDesignHandoff({ route: 'DESIGN_AND_PUBLISH', designDir: publishingDir });
assert.equal(publishingHandoff.publishingAdapter.bypassAllowed, false, 'L: publishing QA cannot be bypassed');
assert.deepEqual(publishingHandoff.publishingAdapter.requiredPublishingQa, PUBLISHING_QA_CHAIN, 'L: existing Publishing QA chain remains required');
assert.equal(validateDesignHandoff(publishingHandoff, { forPublishing: true }).valid, true, 'L: frozen adapter is valid for existing reference-publish');

const fakePng = reset('fake-png');
fs.writeFileSync(path.join(fakePng, 'review', 'desktop.png'), Buffer.from('chromium-review'));
assert.equal(evaluateDesignGate({ designDir: fakePng }).status, 'FAIL', 'M: fake non-PNG review artifact fails');
assert.throws(
  () => createDesignHandoff({ route: 'DESIGN_AND_PUBLISH', designDir: fakePng }),
  /not a decodable PNG/,
  'M: fake non-PNG review artifact cannot create a handoff'
);

const validPng = reset('valid-png');
assert.equal(evaluateDesignGate({ designDir: validPng, forPublishing: true }).status, 'DESIGN_READY', 'N: decodable positive-dimension PNG artifacts are accepted');

for (const route of ['FOO', 'REFERENCE_PUBLISH', undefined]) {
  assert.throws(() => createDesignHandoff({ route, designDir: validPng }), /Invalid design handoff route/, `O: invalid route ${route} is rejected`);
}

const reviewBlocked = reset('review-blocked');
const blockedCritique = validCritique();
blockedCritique.status = 'DESIGN_REVIEW_BLOCKED';
blockedCritique.renderedReview = false;
writeJson(path.join(reviewBlocked, 'design-critique.json'), blockedCritique);
for (const name of ['desktop', 'tablet', 'mobile']) fs.rmSync(path.join(reviewBlocked, 'review', `${name}.png`));
assert.equal(validateDesignCritique(blockedCritique).valid, true, 'P: DESIGN_REVIEW_BLOCKED permits renderedReview=false');
assert.equal(evaluateDesignGate({ designDir: reviewBlocked }).status, 'DESIGN_REVIEW_BLOCKED', 'P: gate preserves DESIGN_REVIEW_BLOCKED');
assert.throws(
  () => createDesignHandoff({ route: 'DESIGN_AND_PUBLISH', designDir: reviewBlocked }),
  /critic status must be PASS/,
  'P: DESIGN_REVIEW_BLOCKED cannot create a publishing handoff'
);

const revisionTwo = reset('revision-two-fail');
const revisionTwoCritique = validCritique();
revisionTwoCritique.status = 'FAIL';
revisionTwoCritique.revisionCount = 2;
writeJson(path.join(revisionTwo, 'design-critique.json'), revisionTwoCritique);
assert.equal(evaluateDesignGate({ designDir: revisionTwo }).status, 'FAIL', 'Q: revision 2 FAIL remains retryable');

const revisionThreeFail = reset('revision-three-fail');
const revisionThreeFailCritique = validCritique();
revisionThreeFailCritique.status = 'FAIL';
revisionThreeFailCritique.revisionCount = 3;
writeJson(path.join(revisionThreeFail, 'design-critique.json'), revisionThreeFailCritique);
assert.equal(evaluateDesignGate({ designDir: revisionThreeFail }).status, 'DESIGN_BLOCKED', 'R: revision 3 FAIL becomes DESIGN_BLOCKED');

const revisionThreePass = reset('revision-three-pass');
const revisionThreePassCritique = validCritique();
revisionThreePassCritique.revisionCount = 3;
writeJson(path.join(revisionThreePass, 'design-critique.json'), revisionThreePassCritique);
writeJson(path.join(revisionThreePass, 'handoff.json'), createDesignHandoff({ route: 'DESIGN_AND_PUBLISH', designDir: revisionThreePass }));
assert.equal(evaluateDesignGate({ designDir: revisionThreePass, forPublishing: true }).status, 'DESIGN_READY', 'S: revision 3 PASS remains DESIGN_READY');

const rejectedHandoff = reset('rejected-handoff');
const rejectedCritique = validCritique();
rejectedCritique.status = 'FAIL';
writeJson(path.join(rejectedHandoff, 'design-critique.json'), rejectedCritique);
assert.throws(
  () => createDesignHandoff({ route: 'DESIGN_AND_PUBLISH', designDir: rejectedHandoff }),
  /critic status must be PASS/,
  'T: actual critique FAIL cannot create DESIGN_READY handoff'
);

assert.ok(fs.existsSync('.agents/skills/design-art-direction/SKILL.md'), 'U: design-art-direction Skill exists');
assert.ok(fs.existsSync('.agents/skills/visual-reference-design/SKILL.md'), 'U: visual-reference-design Skill exists');
assert.match(fs.readFileSync('.codex/agents/design-art-director.toml', 'utf8'), /sandbox_mode = "read-only"/, 'U: Design Art Director is configured read-only');

const missingVisualField = validVisualDirection();
delete missingVisualField.cropGrammar;
assert.equal(validateVisualDirection(missingVisualField, { pageKind: 'creative agency' }).valid, false, 'V: missing visual-direction field is invalid');

const missingMediaStrategy = validVisualDirection();
delete missingMediaStrategy.mediaStrategy;
assert.equal(validateVisualDirection(missingMediaStrategy, { pageKind: 'creative agency' }).valid, false, 'W: visual-heavy brief without media strategy is invalid');

const unsupportedTypographyOnly = validVisualDirection();
unsupportedTypographyOnly.mediaStrategy.primaryMedium = 'typography-only';
delete unsupportedTypographyOnly.mediaStrategy.typographyOnlyRationale;
assert.equal(validateVisualDirection(unsupportedTypographyOnly, { pageKind: 'portfolio' }).valid, false, 'X: typography-only strategy requires rationale');

const composerWithoutReference = path.join(testRoot, 'composer-without-reference');
fs.mkdirSync(composerWithoutReference, { recursive: true });
assert.throws(
  () => assertComposerReady({ designDir: composerWithoutReference, pageKind: 'creative agency' }),
  /requires approved visual reference evidence/,
  'Y: Design Composer cannot start without approved visual direction evidence'
);

const missingProductionAudit = validCritique();
delete missingProductionAudit.productionValueAudit;
assert.equal(validateDesignCritique(missingProductionAudit).valid, false, 'Z: Visual Critic requires productionValueAudit');

const productionAuditFailDir = reset('production-audit-fail');
const productionAuditFail = validCritique();
productionAuditFail.productionValueAudit.status = 'FAIL';
writeJson(path.join(productionAuditFailDir, 'design-critique.json'), productionAuditFail);
assert.notEqual(evaluateDesignGate({ designDir: productionAuditFailDir }).status, 'DESIGN_READY', 'AA: productionValueAudit FAIL blocks DESIGN_READY');

const artDirectorOwned = validCritique();
artDirectorOwned.status = 'FAIL';
artDirectorOwned.issues = [{
  issue: 'Media lacks structural dominance', blocking: true, resolved: false,
  rootOwner: 'DESIGN_ART_DIRECTOR', reason: 'The approved material strategy did not establish the planned visual hierarchy.'
}];
assert.equal(validateDesignCritique(artDirectorOwned).valid, true, 'AB: DESIGN_ART_DIRECTOR is a valid critique rootOwner');

const fakeCapabilityPass = validVisualDirection();
fakeCapabilityPass.referenceStrategy.capability = 'UNAVAILABLE';
fakeCapabilityPass.referenceStrategy.status = 'READY';
fakeCapabilityPass.referenceStrategy.mode = 'LOCAL_COMPOSITION_PROTOTYPE';
assert.equal(validateVisualDirection(fakeCapabilityPass, { pageKind: 'creative agency' }).valid, false, 'AC: unavailable visual reference capability cannot be relabeled as READY');

const visualIntentDir = reset('visual-intent-handoff');
const visualIntentHandoff = createDesignHandoff({ route: 'DESIGN_AND_PUBLISH', designDir: visualIntentDir });
assert.match(visualIntentHandoff.visualIntent.visualDirection, /visual-reference\/visual-direction\.json$/, 'AD: handoff includes frozen visual direction reference');
assert.match(visualIntentHandoff.visualIntent.sectionReferences, /visual-reference\/section-reference-manifest\.json$/, 'AD: handoff includes frozen section reference manifest');

assert.deepEqual(visualIntentHandoff.publishingAdapter.requiredPublishingQa, PUBLISHING_QA_CHAIN, 'AE: existing Publishing QA chain remains unchanged');

const localFallbackDir = reset('local-composition-fallback');
const localFallbackDirection = validVisualDirection();
localFallbackDirection.referenceStrategy = {
  capability: 'UNAVAILABLE', status: 'VISUAL_REFERENCE_TOOL_UNAVAILABLE', mode: 'LOCAL_COMPOSITION_PROTOTYPE',
  rationale: 'No image generation tool is exposed, so a separate local composition artifact is used.'
};
writeJson(path.join(localFallbackDir, 'visual-reference', 'visual-direction.json'), localFallbackDirection);
const localFallbackManifest = JSON.parse(fs.readFileSync(path.join(localFallbackDir, 'visual-reference', 'section-reference-manifest.json'), 'utf8'));
localFallbackManifest.strategy = 'LOCAL_COMPOSITION_PROTOTYPE';
localFallbackManifest.sections[0].evidenceType = 'local-composition-prototype';
writeJson(path.join(localFallbackDir, 'visual-reference', 'section-reference-manifest.json'), localFallbackManifest);
writeJson(path.join(localFallbackDir, 'visual-reference', 'visual-reference-review.json'), {
  version: 1, status: 'PASS', reviewedArtifacts: ['visual-reference/hero.png'], issues: [],
  limitations: ['Image generation was unavailable; Critic reviewed a separate local composition artifact.']
});
assert.equal(assertComposerReady({ designDir: localFallbackDir, pageKind: 'creative agency' }).composerReady, true, 'AF: explicit local composition fallback can enter Composer with limitation evidence');

const briefFallbackDir = reset('art-direction-brief-fallback');
const briefFallbackDirection = validVisualDirection();
briefFallbackDirection.referenceStrategy = {
  capability: 'UNAVAILABLE', status: 'VISUAL_REFERENCE_TOOL_UNAVAILABLE', mode: 'ART_DIRECTION_BRIEF',
  rationale: 'No image generation tool is exposed; a user-facing generation brief is required.'
};
writeJson(path.join(briefFallbackDir, 'visual-reference', 'visual-direction.json'), briefFallbackDirection);
fs.writeFileSync(path.join(briefFallbackDir, 'visual-reference', 'generation-brief.md'), '# Hero visual generation brief\n\nCreate a reviewable image-led opening scene.\n');
writeJson(path.join(briefFallbackDir, 'visual-reference', 'section-reference-manifest.json'), {
  version: 1, strategy: 'ART_DIRECTION_BRIEF', sections: [{
    sectionId: 'hero', role: 'opening scene', artifact: 'visual-reference/generation-brief.md',
    evidenceType: 'art-direction-brief', reviewable: true
  }]
});
writeJson(path.join(briefFallbackDir, 'visual-reference', 'visual-reference-review.json'), {
  version: 1, status: 'VISUAL_REFERENCE_TOOL_UNAVAILABLE',
  reviewedArtifacts: ['visual-reference/generation-brief.md'], issues: [], limitations: ['Awaiting generated or user-provided visual reference.']
});
const briefFallbackEvidence = inspectVisualReferenceEvidence({ designDir: briefFallbackDir, pageKind: 'creative agency' });
assert.equal(briefFallbackEvidence.status, 'VISUAL_REFERENCE_TOOL_UNAVAILABLE', 'AG: unavailable art-direction brief preserves explicit tool-unavailable state');
assert.equal(briefFallbackEvidence.composerReady, false, 'AG: art-direction brief alone cannot enter Design Composer');

fs.rmSync(testRoot, { recursive: true, force: true });
console.log('design workflow routing, visual-first contract, gate integrity, ownership, freeze, PNG evidence, and publishing bridge A-AG: PASS');
