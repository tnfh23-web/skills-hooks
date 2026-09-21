import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { discoverInteractionPlan, validateInteractionPlan } from '../tools/interaction-plan.mjs';
import { runInteractionQa } from '../tools/interaction-qa.mjs';
import { collectActionableInventory, runInteractionCoverage } from '../tools/interaction-coverage.mjs';
import { runMotionQa } from '../tools/motion-qa.mjs';
import { assertPatternRegistry, PATTERN_REGISTRY } from '../tools/interaction-patterns.mjs';

const root = process.cwd();
const out = path.join(root, 'work', 'interaction-motion-contract');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const fixture = (name) => path.join(root, 'tests', 'fixtures', name);
const fileUrl = (file) => new URL(`file://${file.replaceAll('\\', '/')}`).href;

function candidate(id, selector, semanticType, recipe, verification = {}) {
  return { id, selector, semanticType, intent: 'contract-test', evidence: ['explicit fixture contract'], provenance: 'source-annotation', confidence: 'high', implementation: 'required', recipe, requiredStates: PATTERN_REGISTRY[recipe]?.requiredStates || ['rest', 'active'], responsiveBehavior: 'Preserve reachable semantic controls on mobile.', reducedMotionBehavior: 'Preserve state while removing decorative motion.', verification };
}
function plan(candidates = [], designMode = 'reference') {
  return { version: 1, designMode, motionLanguage: designMode === 'design' ? { character: 'editorial', pace: 'moderate', preferredFamilies: ['scene'], bannedFamilies: ['all-sections-fade-up'], sectionEntryVariation: 'section intent에 따라 변주', pointerUsage: 'affordance에만 사용', continuousMotionUsage: '정보를 방해하지 않게 제한', scrollStory: '순차 이해에 필요한 경우만 사용' } : null, candidates };
}

assert.deepEqual(assertPatternRegistry(), { valid: true, errors: [] });
for (const [recipe, route] of Object.entries(PATTERN_REGISTRY)) assert.ok(route.verifier && route.automation && route.category, `${recipe} must have one complete verifier route`);
const valid = plan([candidate('tabs', '#tabs', 'tabs', 'tabs')]);
assert.equal(validateInteractionPlan(valid).valid, true);
assert.equal(validateInteractionPlan(plan([{ ...valid.candidates[0], selector: '' }])).valid, false, 'invalid candidate must fail');
assert.equal(validateInteractionPlan(plan([{ ...valid.candidates[0], confidence: 'certain' }])).valid, false, 'unknown confidence must fail');
assert.equal(validateInteractionPlan(plan([{ ...valid.candidates[0], recipe: 'unknown-effect' }])).valid, false, 'unknown recipe must fail');
assert.equal(validateInteractionPlan(plan([{ ...valid.candidates[0], confidence: 'low', implementation: 'required' }])).valid, false, 'REFERENCE_MODE low-confidence invention must fail');
const dedicatedWithoutContract = candidate('scene', '#story', 'scene-transition', 'scene-transition');
assert.equal(validateInteractionPlan(plan([dedicatedWithoutContract])).valid, false, 'dedicated recipes require their verification contract');
const dedicatedWithWrongStates = candidate('scene', '#story', 'scene-transition', 'scene-transition', { sampleSelector: '#story-sample', sceneSelector: '[data-scene]', activeSelector: '[data-scene].active', stateAttribute: 'data-state', expectedStates: ['start', 'active', 'final', 'released'] });
assert.equal(validateInteractionPlan(plan([dedicatedWithWrongStates])).valid, false, 'dedicated expectedStates must match the registry');

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const page = await context.newPage(); await page.goto(fileUrl(fixture('interaction-motion.html')), { waitUntil: 'load' });
  const discovered = await discoverInteractionPlan(page, { designMode: 'reference', sourceRoot: root });
  for (const type of ['tabs', 'accordion', 'drawer', 'carousel', 'hover', 'marquee', 'scroll-story', 'dropdown', 'menu-state']) assert.ok(discovered.candidates.some((item) => item.semanticType === type), `discovery should find ${type}`);
  assert.equal(validateInteractionPlan(discovered).valid, true, 'discovered dropdown/menu-state contracts must validate');
  const annotated = await context.newPage();
  await annotated.setContent('<main><section id="pin" data-motion-recipe="pin-scrub-track"><div data-motion-sample data-state="start"></div><div data-pin></div></section><section id="scene" data-motion-recipe="scene-transition"><div data-motion-sample data-state="previous-scene"></div><div data-scene class="active"></div></section><section id="split" data-motion-recipe="split-text-reveal"><span class="sr-only" data-accessible-text>Text</span><span data-split>Text</span></section><section id="horizontal" data-motion-recipe="horizontal-pin-scroll"><div data-horizontal-viewport><div data-horizontal-pin><div data-horizontal-track data-state="start"></div></div></div><div data-mobile-fallback></div></section></main>');
  const annotatedPlan = await discoverInteractionPlan(annotated, { designMode: 'reference', sourceRoot: root });
  assert.equal(validateInteractionPlan(annotatedPlan).valid, true, 'dedicated source annotations must emit a complete verification contract');
  await annotated.close();

  const decorative = await context.newPage(); await decorative.setContent('<main><div class="ornament">decorative circle</div></main>');
  const emptyDiscovery = await discoverInteractionPlan(decorative, { designMode: 'reference', sourceRoot: root });
  assert.equal(emptyDiscovery.candidates.length, 0, 'plain decoration must not become required interaction'); await decorative.close();

  const interactionPlan = plan([
    candidate('tabs', '#tabs', 'tabs', 'tabs'),
    candidate('accordion', '#accordion', 'accordion', 'accordion', { controlSelector: '#accordion-toggle', panelSelector: '#accordion-panel' }),
    candidate('drawer', '#drawer-shell', 'drawer', 'drawer', { controlSelector: '#drawer-toggle', panelSelector: '#drawer-panel', closeOnEscape: true, closeOnOutside: true, focusInside: true }),
    candidate('carousel', '#carousel', 'carousel', 'carousel-state'),
    candidate('hover', '#hover-card', 'hover', 'hover-reveal', { stateSelector: '#hover-card', essentialSelector: '.hover-meta', reversible: true }),
    candidate('dropdown', '#dropdown-root', 'dropdown', 'dropdown', { controlSelector: '#dropdown-control', panelSelector: '#dropdown-panel', dismissBehavior: ['escape'] }),
    candidate('menu-state', '#menu-root', 'menu-state', 'menu-state', { controlSelector: '#menu-control', panelSelector: '#menu-panel', dismissBehavior: ['outside'] })
  ]);
  const interaction = await runInteractionQa({ page, output: path.join(out, 'interaction.json'), plan: interactionPlan, sourceRoot: root });
  assert.equal(interaction.status, 'PASS');
  for (const id of ['tabs', 'accordion', 'drawer', 'carousel', 'hover', 'dropdown', 'menu-state']) assert.equal(interaction.checks.find((item) => item.candidateId === id)?.status, 'PASS', `${id} semantic contract should pass`);
  assert.equal(interaction.checks.find((item) => item.candidateId === 'drawer').evidence.outsideClosed, true);
  assert.equal(interaction.checks.find((item) => item.candidateId === 'dropdown').evidence.dismissed, true);
  assert.equal(interaction.checks.find((item) => item.candidateId === 'menu-state').evidence.dismissed, true);
  assert.equal(interaction.mobileChecks.find((item) => item.candidateId === 'hover').status, 'PASS');
  await context.close();

  async function expectInteractionFailure(name, candidatePlan, reason) {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } }); const testPage = await ctx.newPage(); await testPage.goto(fileUrl(fixture(name)), { waitUntil: 'load' });
    const report = await runInteractionQa({ page: testPage, output: path.join(out, `${name}.json`), plan: candidatePlan, sourceRoot: root, checkMobile: false });
    assert.equal(report.status, 'FAIL', reason); await ctx.close(); return report;
  }
  const carouselPlan = (selector = '#carousel') => plan([candidate('carousel', selector, 'carousel', 'carousel-state')]);
  assert.match((await expectInteractionFailure('carousel-stale-counter.html', carouselPlan(), 'stale counter must fail')).failureReasons[0], /out of sync/i);
  assert.match((await expectInteractionFailure('carousel-stale-slide.html', carouselPlan(), 'stale slide must fail')).failureReasons[0], /did not change/i);
  assert.match((await expectInteractionFailure('broken-carousel.html', carouselPlan('button'), 'dummy marker must fail')).failureReasons[0], /did not change/i);
  assert.match((await expectInteractionFailure('tabs-split-state.html', plan([candidate('tabs', '#tabs', 'tabs', 'tabs')]), 'split tab/panel state must fail')).failureReasons[0], /semantic contract/i);
  const dropdownPlan = (recipe, rootSelector, controlSelector, panelSelector) => plan([candidate(recipe, rootSelector, recipe, recipe, { controlSelector, panelSelector, dismissBehavior: ['escape'] })]);
  assert.match((await expectInteractionFailure('dropdown-unsynced.html', dropdownPlan('dropdown', '#dropdown-root', '#dropdown-control', '#dropdown-panel'), 'unsynchronized dropdown must fail')).failureReasons[0], /visible synchronized panel|dismiss/i);
  assert.match((await expectInteractionFailure('menu-state-unsynced.html', dropdownPlan('menu-state', '#menu-root', '#menu-control', '#menu-panel'), 'unsynchronized menu must fail')).failureReasons[0], /synchronized panel|dismiss/i);

  const staticContext = await browser.newContext({ viewport: { width: 800, height: 600 } }); const staticPage = await staticContext.newPage(); await staticPage.setContent('<main><h1>Static page</h1></main>');
  const staticReport = await runInteractionQa({ page: staticPage, output: path.join(out, 'static.json'), plan: plan([]), sourceRoot: root });
  assert.equal(staticReport.status, 'NOT_REQUIRED'); await staticContext.close();

  const routedContext = await browser.newContext({ viewport: { width: 1000, height: 800 } }); const routedPage = await routedContext.newPage(); await routedPage.goto(fileUrl(fixture('interaction-motion.html')), { waitUntil: 'load' });
  const routedPlan = plan([
    candidate('scene', '#story', 'scene-transition', 'scene-transition', { sampleSelector: '#story-sample', sceneSelector: '[data-scene]', activeSelector: '[data-scene].active', stateAttribute: 'data-state', expectedStates: PATTERN_REGISTRY['scene-transition'].requiredStates }),
    candidate('reveal', '#story', 'scroll-reveal', 'scroll-reveal'),
    candidate('advanced', '#story', 'canvas-interaction', 'canvas-interaction')
  ]);
  const routed = await runInteractionQa({ page: routedPage, output: path.join(out, 'routed.json'), plan: routedPlan, sourceRoot: root, checkMobile: false });
  assert.equal(routed.status, 'NOT_REQUIRED');
  for (const id of ['scene', 'reveal']) {
    const check = routed.checks.find((item) => item.candidateId === id);
    assert.equal(check.status, 'DEFERRED');
    assert.equal(check.routing.verifier, 'motion-qa');
    assert.equal(check.evidence.clicked, false, `${id} must not fall through to click QA`);
  }
  const unsupported = routed.checks.find((item) => item.candidateId === 'advanced');
  assert.equal(unsupported.status, 'UNSUPPORTED');
  assert.equal(unsupported.evidence.clicked, false);
  await routedContext.close();

  async function coverageFixture(name) {
    const coverageContext = await browser.newContext({ viewport: { width: 800, height: 600 } });
    const coveragePage = await coverageContext.newPage(); await coveragePage.goto(fileUrl(fixture(name)), { waitUntil: 'load' });
    const actionable = await collectActionableInventory(coveragePage);
    const coverage = await runInteractionCoverage({ page: coveragePage, actionable, candidates: [] });
    await coverageContext.close();
    return coverage;
  }
  const coveragePass = await coverageFixture('coverage-positive.html');
  assert.equal(coveragePass.status, 'PASS');
  assert.deepEqual({ visible: coveragePass.visibleActionableElements, hover: coveragePass.withHoverFeedback, focus: coveragePass.withFocusVisibleFeedback, click: coveragePass.withClickBehavior }, { visible: 2, hover: 2, focus: 2, click: 2 });
  const noHover = await coverageFixture('clickable-without-hover.html');
  assert.equal(noHover.status, 'FAIL');
  assert.ok(noHover.missingHoverFeedback.includes('#dead-hover'));
  assert.ok(noHover.missingBehavior.includes('#dead-hover'));
  const noFocus = await coverageFixture('missing-focus-feedback.html');
  assert.equal(noFocus.status, 'FAIL');
  assert.ok(noFocus.missingFocusFeedback.includes('#missing-focus'));

  const perceptibilityContext = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const perceptibilityPage = await perceptibilityContext.newPage(); await perceptibilityPage.goto(fileUrl(fixture('carousel-index-only.html')), { waitUntil: 'load' });
  const perceptibilityReport = await runInteractionQa({ page: perceptibilityPage, output: path.join(out, 'carousel-index-only.json'), plan: plan([candidate('carousel', '#carousel', 'carousel', 'carousel-state')]), sourceRoot: root, checkMobile: false });
  assert.equal(perceptibilityReport.status, 'FAIL');
  assert.match(perceptibilityReport.failureReasons[0], /visible slide\/media\/content projection/i);
  await perceptibilityContext.close();

  const deadArrowContext = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const deadArrowPage = await deadArrowContext.newPage(); await deadArrowPage.goto(fileUrl(fixture('dead-arrow-control.html')), { waitUntil: 'load' });
  const deadArrowReport = await runInteractionQa({ page: deadArrowPage, output: path.join(out, 'dead-arrow-control.json'), plan: plan([candidate('carousel', '#carousel', 'carousel', 'carousel-state')]), sourceRoot: root, checkMobile: false });
  assert.equal(deadArrowReport.status, 'FAIL');
  assert.match(deadArrowReport.failureReasons[0], /did not change/i);
  await deadArrowContext.close();
} finally { await browser.close(); }

const motionPlan = plan([
  candidate('marquee', '#marquee', 'marquee', 'marquee', { trackSelector: '[data-marquee-track]', originalSelector: '[data-marquee-original]', duplicateSelector: '[data-marquee-copy]' }),
  candidate('story', '#story', 'scroll-story', 'scroll-story', { sampleSelector: '#story-sample', progressAttribute: 'data-progress', essentialSelector: '#story-sample' }),
  candidate('reveal', '#story', 'scroll-reveal', 'scroll-reveal', { sampleSelector: '#story-sample', progressAttribute: 'data-progress', essentialSelector: '#story-sample' })
]);
const motionPlanPath = path.join(out, 'motion-plan.json'); fs.writeFileSync(motionPlanPath, `${JSON.stringify(motionPlan, null, 2)}\n`);
const motion = await runMotionQa({ url: fixture('interaction-motion.html'), output: path.join(out, 'motion.json'), planPath: motionPlanPath, sourceRoot: root, width: 1000, height: 800 });
assert.equal(motion.status, 'PASS');
assert.equal(motion.checks.find((item) => item.candidateId === 'marquee').reducedMotion.safe, true);
assert.equal(motion.checks.find((item) => item.candidateId === 'story').samples.length, 5);
assert.equal(motion.checks.find((item) => item.candidateId === 'story').runtimeErrors.length, 0);
assert.equal(motion.checks.find((item) => item.candidateId === 'story').reducedMotion.safe, true);
assert.equal(motion.checks.find((item) => item.candidateId === 'reveal').status, 'PASS');

const dedicatedVerification = {
  pin: { sampleSelector: '#pin-sample', pinSelector: '#pin-sample', stateAttribute: 'data-state', expectedStates: PATTERN_REGISTRY['pin-scrub-track'].requiredStates, essentialSelector: '#pin-sample' },
  scene: { sampleSelector: '#scene-sample', sceneSelector: '[data-scene]', activeSelector: '[data-scene].active', stateAttribute: 'data-state', expectedStates: PATTERN_REGISTRY['scene-transition'].requiredStates, essentialSelector: '#scene-sample' },
  split: { sampleSelector: '#split-sample', accessibleSelector: '#split-original', splitSelector: '#split-visual span', stateAttribute: 'data-state', expectedStates: PATTERN_REGISTRY['split-text-reveal'].requiredStates, essentialSelector: '#split-visual' },
  horizontal: { sampleSelector: '#horizontal-track', viewportSelector: '#horizontal-viewport', pinSelector: '#horizontal-pin', trackSelector: '#horizontal-track', stateAttribute: 'data-state', expectedStates: PATTERN_REGISTRY['horizontal-pin-scroll'].requiredStates, mobileFallbackSelector: '#horizontal-mobile-fallback', essentialSelector: '#horizontal-track' }
};
const dedicatedPlan = plan([
  candidate('pin', '#pin-root', 'pin-scrub', 'pin-scrub-track', dedicatedVerification.pin),
  candidate('scene', '#scene-root', 'scene-transition', 'scene-transition', dedicatedVerification.scene),
  candidate('split', '#split-root', 'split-text-reveal', 'split-text-reveal', dedicatedVerification.split),
  candidate('horizontal', '#horizontal-root', 'horizontal-pin-scroll', 'horizontal-pin-scroll', dedicatedVerification.horizontal)
]);
const dedicatedPlanPath = path.join(out, 'dedicated-plan.json'); fs.writeFileSync(dedicatedPlanPath, `${JSON.stringify(dedicatedPlan, null, 2)}\n`);
const dedicated = await runMotionQa({ url: fixture('dedicated-motion.html'), output: path.join(out, 'dedicated.json'), planPath: dedicatedPlanPath, sourceRoot: root, width: 1000, height: 800 });
assert.equal(dedicated.status, 'PASS', JSON.stringify(dedicated.failureReasons));
for (const id of ['pin', 'scene', 'split', 'horizontal']) {
  const check = dedicated.checks.find((item) => item.candidateId === id);
  assert.equal(check.status, 'PASS', `${id} dedicated verifier should pass: ${check.failureReason}`);
  assert.equal(check.evidence.stateCoverage.complete, true, `${id} should cover every required state`);
  assert.equal(check.runtimeErrors.length, 0, `${id} should have no runtime errors`);
}
assert.equal(dedicated.checks.find((item) => item.candidateId === 'horizontal').mobile.safe, true);
assert.equal(dedicated.checks.find((item) => item.candidateId === 'horizontal').resize.safe, true);

async function expectMotionFailure(name, failedCandidate, reason) {
  const failedPlan = plan([failedCandidate]); const failedPath = path.join(out, `${name}-plan.json`); fs.writeFileSync(failedPath, `${JSON.stringify(failedPlan, null, 2)}\n`);
  const report = await runMotionQa({ url: fixture(name), output: path.join(out, `${name}.json`), planPath: failedPath, sourceRoot: root, width: 1000, height: 800 });
  assert.equal(report.status, 'FAIL', reason); return report;
}
const failedScene = await expectMotionFailure('dedicated-scene-static.html', candidate('scene', '#scene-root', 'scene-transition', 'scene-transition', dedicatedVerification.scene), 'scene without active progression must fail');
assert.match(failedScene.failureReasons[0], /semantic state progression|previous\/active\/next/i);
const failedPin = await expectMotionFailure('dedicated-pin-no-release.html', candidate('pin', '#pin-root', 'pin-scrub', 'pin-scrub-track', dedicatedVerification.pin), 'pin without release must fail');
assert.match(failedPin.failureReasons[0], /release/i);
const failedSplit = await expectMotionFailure('dedicated-split-missing.html', candidate('split', '#split-root', 'split-text-reveal', 'split-text-reveal', dedicatedVerification.split), 'split without accessible source must fail');
assert.match(failedSplit.failureReasons[0], /accessible|duplicate/i);
const failedHorizontal = await expectMotionFailure('dedicated-horizontal-overflow.html', candidate('horizontal', '#horizontal-root', 'horizontal-pin-scroll', 'horizontal-pin-scroll', dedicatedVerification.horizontal), 'horizontal overflow must fail');
assert.match(failedHorizontal.failureReasons[0], /overflow|Horizontal/i);

const deferredPlanPath = path.join(out, 'deferred-plan.json');
fs.writeFileSync(deferredPlanPath, `${JSON.stringify(plan([candidate('pointer', '#hover-card', 'pointer-reactive', 'pointer-reactive')]), null, 2)}\n`);
const deferredMotion = await runMotionQa({ url: fixture('interaction-motion.html'), output: path.join(out, 'deferred-motion.json'), planPath: deferredPlanPath, sourceRoot: root, width: 1000, height: 800 });
assert.equal(deferredMotion.status, 'DEFERRED');
assert.equal(deferredMotion.checks[0].status, 'DEFERRED');
assert.equal(deferredMotion.checks[0].evidence.clicked, false);

console.log('registry, interaction routing, semantic interaction, marquee, deterministic/deferred motion contracts: PASS');
