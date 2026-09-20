import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { discoverInteractionPlan, validateInteractionPlan } from '../tools/interaction-plan.mjs';
import { runInteractionQa } from '../tools/interaction-qa.mjs';
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

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const page = await context.newPage(); await page.goto(fileUrl(fixture('interaction-motion.html')), { waitUntil: 'load' });
  const discovered = await discoverInteractionPlan(page, { designMode: 'reference', sourceRoot: root });
  for (const type of ['tabs', 'accordion', 'drawer', 'carousel', 'hover', 'marquee', 'scroll-story']) assert.ok(discovered.candidates.some((item) => item.semanticType === type), `discovery should find ${type}`);

  const decorative = await context.newPage(); await decorative.setContent('<main><div class="ornament">decorative circle</div></main>');
  const emptyDiscovery = await discoverInteractionPlan(decorative, { designMode: 'reference', sourceRoot: root });
  assert.equal(emptyDiscovery.candidates.length, 0, 'plain decoration must not become required interaction'); await decorative.close();

  const interactionPlan = plan([
    candidate('tabs', '#tabs', 'tabs', 'tabs'),
    candidate('accordion', '#accordion', 'accordion', 'accordion', { controlSelector: '#accordion-toggle', panelSelector: '#accordion-panel' }),
    candidate('drawer', '#drawer-shell', 'drawer', 'drawer', { controlSelector: '#drawer-toggle', panelSelector: '#drawer-panel', closeOnEscape: true, closeOnOutside: true, focusInside: true }),
    candidate('carousel', '#carousel', 'carousel', 'carousel-state'),
    candidate('hover', '#hover-card', 'hover', 'hover-reveal', { stateSelector: '#hover-card', essentialSelector: '.hover-meta', reversible: true })
  ]);
  const interaction = await runInteractionQa({ page, output: path.join(out, 'interaction.json'), plan: interactionPlan, sourceRoot: root });
  assert.equal(interaction.status, 'PASS');
  for (const id of ['tabs', 'accordion', 'drawer', 'carousel', 'hover']) assert.equal(interaction.checks.find((item) => item.candidateId === id)?.status, 'PASS', `${id} semantic contract should pass`);
  assert.equal(interaction.checks.find((item) => item.candidateId === 'drawer').evidence.outsideClosed, true);
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

  const staticContext = await browser.newContext({ viewport: { width: 800, height: 600 } }); const staticPage = await staticContext.newPage(); await staticPage.setContent('<main><h1>Static page</h1></main>');
  const staticReport = await runInteractionQa({ page: staticPage, output: path.join(out, 'static.json'), plan: plan([]), sourceRoot: root });
  assert.equal(staticReport.status, 'NOT_REQUIRED'); await staticContext.close();

  const routedContext = await browser.newContext({ viewport: { width: 1000, height: 800 } }); const routedPage = await routedContext.newPage(); await routedPage.goto(fileUrl(fixture('interaction-motion.html')), { waitUntil: 'load' });
  const routedPlan = plan([
    candidate('scene', '#story', 'scene-transition', 'scene-transition'),
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
} finally { await browser.close(); }

const motionPlan = plan([
  candidate('marquee', '#marquee', 'marquee', 'marquee', { trackSelector: '[data-marquee-track]', originalSelector: '[data-marquee-original]', duplicateSelector: '[data-marquee-copy]' }),
  candidate('story', '#story', 'scroll-story', 'scroll-story', { sampleSelector: '#story-sample', progressAttribute: 'data-progress', essentialSelector: '#story-sample' }),
  candidate('scene', '#story', 'scene-transition', 'scene-transition', { sampleSelector: '#story-sample', progressAttribute: 'data-progress', essentialSelector: '#story-sample' }),
  candidate('reveal', '#story', 'scroll-reveal', 'scroll-reveal', { sampleSelector: '#story-sample', progressAttribute: 'data-progress', essentialSelector: '#story-sample' })
]);
const motionPlanPath = path.join(out, 'motion-plan.json'); fs.writeFileSync(motionPlanPath, `${JSON.stringify(motionPlan, null, 2)}\n`);
const motion = await runMotionQa({ url: fixture('interaction-motion.html'), output: path.join(out, 'motion.json'), planPath: motionPlanPath, sourceRoot: root, width: 1000, height: 800 });
assert.equal(motion.status, 'PASS');
assert.equal(motion.checks.find((item) => item.candidateId === 'marquee').reducedMotion.safe, true);
assert.equal(motion.checks.find((item) => item.candidateId === 'story').samples.length, 5);
assert.equal(motion.checks.find((item) => item.candidateId === 'story').runtimeErrors.length, 0);
assert.equal(motion.checks.find((item) => item.candidateId === 'story').reducedMotion.safe, true);
assert.equal(motion.checks.find((item) => item.candidateId === 'scene').status, 'PASS');
assert.equal(motion.checks.find((item) => item.candidateId === 'reveal').status, 'PASS');

const deferredPlanPath = path.join(out, 'deferred-plan.json');
fs.writeFileSync(deferredPlanPath, `${JSON.stringify(plan([candidate('pointer', '#hover-card', 'pointer-reactive', 'pointer-reactive')]), null, 2)}\n`);
const deferredMotion = await runMotionQa({ url: fixture('interaction-motion.html'), output: path.join(out, 'deferred-motion.json'), planPath: deferredPlanPath, sourceRoot: root, width: 1000, height: 800 });
assert.equal(deferredMotion.status, 'DEFERRED');
assert.equal(deferredMotion.checks[0].status, 'DEFERRED');
assert.equal(deferredMotion.checks[0].evidence.clicked, false);

console.log('registry, interaction routing, semantic interaction, marquee, deterministic/deferred motion contracts: PASS');
