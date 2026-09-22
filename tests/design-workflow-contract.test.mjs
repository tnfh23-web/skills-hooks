import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decideWorkflowRoute } from '../tools/workflow-router.mjs';
import { evaluateDesignGate, validateDesignCritique, validateDesignPlan } from '../tools/design-gate.mjs';
import { createDesignHandoff, PUBLISHING_QA_CHAIN, validateDesignHandoff } from '../tools/design-handoff.mjs';

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
      entryBehavior: 'static first paint', restraint: 'one primary action'
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
  return {
    version: 1,
    status: 'PASS',
    renderedReview: true,
    revisionCount: 1,
    aiTellAudit: { status: 'PASS', findings: [] },
    issues: [{ issue: 'Resolved spacing inconsistency', blocking: false, resolved: true, rootOwner: 'DESIGN_COMPOSER', reason: 'Rendered spacing departed from the section rhythm.' }]
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function makeValidPackage(dir, route = 'DESIGN_AND_PUBLISH') {
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  for (const name of ['desktop', 'tablet', 'mobile']) fs.writeFileSync(path.join(dir, 'review', `${name}.png`), Buffer.from('chromium-review'));
  writeJson(path.join(dir, 'design-plan.json'), validPlan());
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

const unfrozen = createDesignHandoff();
unfrozen.designFrozen = false;
assert.equal(validateDesignHandoff(unfrozen, { forPublishing: true }).valid, false, 'J: unfrozen design cannot enter publishing');

const ready = reset('ready');
assert.equal(evaluateDesignGate({ designDir: ready, forPublishing: true }).status, 'DESIGN_READY', 'K: complete PASS package becomes DESIGN_READY');

const publishingHandoff = createDesignHandoff({ route: 'DESIGN_AND_PUBLISH' });
assert.equal(publishingHandoff.publishingAdapter.bypassAllowed, false, 'L: publishing QA cannot be bypassed');
assert.deepEqual(publishingHandoff.publishingAdapter.requiredPublishingQa, PUBLISHING_QA_CHAIN, 'L: existing Publishing QA chain remains required');
assert.equal(validateDesignHandoff(publishingHandoff, { forPublishing: true }).valid, true, 'L: frozen adapter is valid for existing reference-publish');

fs.rmSync(testRoot, { recursive: true, force: true });
console.log('design workflow routing, gate, ownership, freeze, and publishing bridge A-L: PASS');
