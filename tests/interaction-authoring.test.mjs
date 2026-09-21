import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { collectActionableInventory } from '../tools/interaction-coverage.mjs';
import { AUTHORING_POLICIES, analyzeInteractionLanguage, authorActionableInventory, authorInteractionCandidate, buildInteractionComposition, validateAuthoring } from '../tools/interaction-authoring.mjs';
import { discoverInteractionPlan, validateInteractionPlan } from '../tools/interaction-plan.mjs';

const language = { version: 1, character: 'editorial / restrained / tactile', visualCues: { lineUsage: { borderedVisibleElements: 4 }, imageTreatment: { imageCount: 2 } }, linkBehavior: ['underline-reveal', 'opacity-shift'], buttonBehavior: ['fill', 'border-transition'], mediaBehavior: ['crop-shift', 'caption-reveal'], stateTransition: ['crossfade', 'clip'], navigationBehavior: ['underline', 'active-bar'], banned: ['generic-card-lift', 'global-scale-1.05', 'decorative-arrow-default', 'all-elements-opacity-only'] };
const candidate = (id, recipe, semanticType, provenance = 'source-annotation', confidence = 'high', implementation = 'required') => ({ id, recipe, semanticType, provenance, confidence, implementation, evidence: [`explicit ${recipe} evidence`] });
const candidateWithAuthoring = (item, designMode = 'reference', motionLanguage = null) => { const authoring = authorInteractionCandidate(item, { designMode, interactionLanguage: language, motionLanguage }); return { ...item, implementation: authoring.implementation || item.implementation, authoring }; };
const planFrom = ({ coverage = [], actionableAuthoring = [], candidates = [], interactionComposition, designMode = 'reference', interactionLanguage = language } = {}) => ({ version: 1, designMode, interactionLanguage, coverage: { actionable: coverage }, actionableAuthoring, candidates, interactionComposition: interactionComposition || buildInteractionComposition({ candidates, actionableAuthoring, interactionLanguage }) });
const group = ({ id, selectors, semanticType, primitive, policy = AUTHORING_POLICIES.REQUIRED_BASELINE }) => ({ id, selectors, elementCount: selectors.length, elements: selectors.map((selector) => ({ selector, semanticType })), semanticType, intent: 'navigate', interactionFamily: `${semanticType.toLowerCase()}-feedback`, primitive, policy, rationale: `Fixture ${primitive} authoring.`, vocabularySource: ['regression fixture'], requiredFeedback: ['hover', 'focus-visible', 'active/tap'], behavior: { required: policy === AUTHORING_POLICIES.AFFORDANCE_DRIVEN, candidateIds: [] }, verificationRoute: 'interaction-coverage' });

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });

  // A: NAV, BUTTON, and CARD_LINK receive different semantic families.
  const page = await context.newPage();
  await page.setContent('<style>a,button{display:inline-block;width:80px;height:30px}img{width:40px;height:20px}</style><header><nav><a id="nav" href="#main">Stories</a></nav></header><main id="main"><button id="button" type="button">Save</button><a id="card" href="#story"><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Story"></a></main>');
  const actionable = await collectActionableInventory(page); const analyzed = await analyzeInteractionLanguage(page, { designMode: 'reference' }); const authored = await authorActionableInventory(page, actionable, { interactionLanguage: analyzed });
  assert.deepEqual(new Set(authored.map((group) => group.semanticType)), new Set(['NAV', 'BUTTON', 'CARD_LINK']), 'A semantic authoring mapping');
  assert.ok(new Set(authored.map((group) => group.interactionFamily)).size >= 3, 'A semantic groups use meaningful families');
  assert.equal(validateAuthoring(planFrom({ coverage: actionable, actionableAuthoring: authored, interactionLanguage: analyzed })).valid, true);

  // B: three semantic groups using opacity-only feedback fail.
  const opacityPlan = planFrom({ coverage: actionable, actionableAuthoring: authored.map((group) => ({ ...group, primitive: 'opacity-shift' })), interactionLanguage: analyzed });
  assert.equal(validateAuthoring(opacityPlan).valid, false, 'B all-opacity authoring must fail');

  // C: a small two-link page may intentionally share one primitive.
  const small = { selectors: ['#one', '#two'], semanticType: 'TEXT_LINK', intent: 'navigate', interactionFamily: 'text-feedback', primitive: 'underline-reveal', policy: AUTHORING_POLICIES.REQUIRED_BASELINE, rationale: 'Two links share the restrained text language.', vocabularySource: ['KUHNIL underline navigation'], requiredFeedback: ['hover', 'focus-visible', 'active/tap'], verificationRoute: 'interaction-coverage' };
  assert.equal(validateAuthoring(planFrom({ coverage: small.selectors.map((selector) => ({ selector })), actionableAuthoring: [{ id: 'text-links', ...small }], interactionLanguage: analyzed })).valid, true, 'C small page may share a primitive');

  // D: numbered controls become STATE_NAV with affordance-driven behavior.
  const numberPage = await context.newPage(); await numberPage.setContent('<style>button{display:inline-block;width:40px;height:30px}</style><div id="pages"><button>01</button><button>02</button><button>03</button></div>');
  const numberItems = await collectActionableInventory(numberPage); const numberGroups = await authorActionableInventory(numberPage, numberItems, { interactionLanguage: analyzed });
  assert.equal(numberGroups[0].semanticType, 'STATE_NAV'); assert.equal(numberGroups[0].policy, AUTHORING_POLICIES.AFFORDANCE_DRIVEN); assert.equal(numberGroups[0].behavior.required, true);

  // E: next/prev controls become directional carousel authoring.
  const arrowPage = await context.newPage(); await arrowPage.setContent('<style>button{display:inline-block;width:40px;height:30px}</style><section id="carousel" data-carousel><button data-prev aria-label="Previous">←</button><button data-next aria-label="Next">→</button></section>');
  const arrowItems = await collectActionableInventory(arrowPage); const arrowGroups = await authorActionableInventory(arrowPage, arrowItems, { interactionLanguage: analyzed });
  assert.equal(arrowGroups[0].semanticType, 'CAROUSEL_CONTROL'); assert.equal(arrowGroups[0].intent, 'retreat'); assert.equal(arrowGroups[0].behavior.required, true);

  // F: decorative imagery is not actionable authoring.
  const decorativePage = await context.newPage(); await decorativePage.setContent('<img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Decorative">');
  const decorativeItems = await collectActionableInventory(decorativePage); assert.equal(decorativeItems.length, 0); assert.equal(validateAuthoring(planFrom({ coverage: [], actionableAuthoring: [], interactionLanguage: analyzed })).valid, true);

  // G/H: Reference enhanced motion without evidence must be skipped, not required.
  const weakPin = candidateWithAuthoring(candidate('pin', 'pin-scrub-track', 'pin-scrub', 'dom-affordance', 'medium'));
  const weakRequired = { ...weakPin, implementation: 'required' }; assert.equal(validateAuthoring(planFrom({ candidates: [weakRequired], interactionLanguage: analyzed })).valid, false, 'G weak Reference enhanced motion cannot remain required');
  assert.equal(validateAuthoring(planFrom({ candidates: [weakPin], interactionLanguage: analyzed })).valid, true, 'H weak Reference enhanced motion may be skipped');

  // I/J: Design motionLanguage participates in actual selection.
  const preferredScene = candidateWithAuthoring(candidate('scene', 'scene-transition', 'scene-transition'), 'design', { preferredFamilies: ['scene-transition'], bannedFamilies: [], pointerUsage: 'minimal', continuousMotionUsage: 'restricted', scrollStory: 'contract', character: 'editorial', pace: 'measured' });
  assert.equal(preferredScene.authoring.selection.status, 'preferred'); assert.equal(validateAuthoring(planFrom({ candidates: [preferredScene], designMode: 'design', interactionLanguage: analyzed })).valid, true);
  const bannedParallax = candidateWithAuthoring(candidate('parallax', 'parallax', 'parallax'), 'design', { preferredFamilies: [], bannedFamilies: ['parallax'], pointerUsage: 'minimal', continuousMotionUsage: 'restricted', scrollStory: 'contract', character: 'editorial', pace: 'measured' });
  assert.equal(bannedParallax.authoring.selection.status, 'banned'); assert.equal(bannedParallax.implementation, 'skip');

  const tab = candidateWithAuthoring(candidate('state-nav', 'tabs', 'tabs')); const marquee = candidateWithAuthoring(candidate('theme-marquee', 'marquee', 'marquee'));
  const stateGroup = { id: 'state-nav', selectors: ['#state'], semanticType: 'STATE_NAV', intent: 'change-state', interactionFamily: 'state-navigation', primitive: 'active-number-emphasis', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, rationale: 'Numbered state navigation is visible.', vocabularySource: ['Star room tabs'], requiredFeedback: ['hover', 'focus-visible', 'active/tap'], behavior: { required: true, candidateIds: ['state-nav'] }, verificationRoute: 'interaction-coverage' };
  // K: stateful controls plus continuous motion cannot have an empty primary composition.
  assert.equal(validateAuthoring(planFrom({ coverage: [{ selector: '#state' }], candidates: [tab, marquee], actionableAuthoring: [stateGroup], interactionComposition: { primary: [], secondary: [], continuous: ['theme-marquee'], restraint: [] }, interactionLanguage: analyzed })).valid, false, 'K marquee-only composition must fail');
  // L: the same page passes when primary and continuous roles are explicit.
  assert.equal(validateAuthoring(planFrom({ coverage: [{ selector: '#state' }], candidates: [tab, marquee], actionableAuthoring: [stateGroup], interactionComposition: { primary: ['state-nav'], secondary: ['state-nav'], continuous: ['theme-marquee'], restraint: ['dense-editorial-copy'] }, interactionLanguage: analyzed })).valid, true);

  // M/N: coverage and actionableAuthoring must match in both directions.
  assert.equal(validateAuthoring(planFrom({ coverage: [{ selector: '#one' }, { selector: '#two' }], actionableAuthoring: [{ id: 'one', ...small, selectors: ['#one'] }], interactionLanguage: analyzed })).valid, false, 'M uncovered actionable must fail');
  assert.equal(validateAuthoring(planFrom({ coverage: [{ selector: '#one' }], actionableAuthoring: [{ id: 'other', ...small, selectors: ['#other'] }], interactionLanguage: analyzed })).valid, false, 'N orphan authoring selector must fail');

  // O: the real discover path resolves one effective DESIGN_MODE language before authoring.
  const designPage = await context.newPage();
  await designPage.setContent('<style>section,[data-motion-sample],[data-scene]{display:block;width:240px;height:80px}</style><section id="scene" data-motion-recipe="scene-transition"><div data-motion-sample data-state="previous-scene"></div><div data-scene class="active"></div></section>');
  const customMotionLanguage = { character: 'editorial', pace: 'measured', preferredFamilies: ['scene-transition'], bannedFamilies: [], preferredPrimitives: ['text-image-shift'], bannedPrimitives: [], sectionEntryVariation: 'section intent에 따라 변주', pointerUsage: 'affordance only', continuousMotionUsage: 'limited', scrollStory: 'contract' };
  const customDesignPlan = await discoverInteractionPlan(designPage, { designMode: 'design', sourceRoot: process.cwd(), motionLanguage: customMotionLanguage });
  const defaultDesignPlan = await discoverInteractionPlan(designPage, { designMode: 'design', sourceRoot: process.cwd() });
  assert.equal(customDesignPlan.motionLanguage, customMotionLanguage, 'O plan records the exact motionLanguage used by authoring');
  assert.equal(customDesignPlan.candidates[0].authoring.primitive, 'text-image-shift', 'O supplied motionLanguage changes production-path primitive selection');
  assert.notEqual(customDesignPlan.candidates[0].authoring.primitive, defaultDesignPlan.candidates[0].authoring.primitive, 'O default and supplied motionLanguage produce different deterministic authoring');
  assert.equal(validateInteractionPlan(customDesignPlan).valid, true, 'O production discover plan validates');
  await designPage.close();

  // P: hard banned primitives precede motion preference, then interaction-language preference.
  const preferredTab = candidateWithAuthoring(candidate('preferred-tab', 'tabs', 'tabs'), 'design', { preferredFamilies: [], bannedFamilies: [], preferredPrimitives: ['active-bar'], bannedPrimitives: [], pointerUsage: 'affordance', continuousMotionUsage: 'limited', scrollStory: 'contract' });
  const bannedPreferredTab = candidateWithAuthoring(candidate('banned-preferred-tab', 'tabs', 'tabs'), 'design', { preferredFamilies: [], bannedFamilies: [], preferredPrimitives: ['active-bar', 'clip'], bannedPrimitives: ['active-bar'], pointerUsage: 'affordance', continuousMotionUsage: 'limited', scrollStory: 'contract' });
  assert.equal(preferredTab.authoring.primitive, 'active-bar');
  assert.equal(bannedPreferredTab.authoring.primitive, 'clip', 'P banned primitive is removed before deterministic preferred selection');

  // Q/R: a true continuous-only page fails; a primary state interaction plus marquee passes.
  const onlyMarquee = candidateWithAuthoring(candidate('only-marquee', 'marquee', 'marquee'));
  assert.equal(validateAuthoring(planFrom({ candidates: [onlyMarquee], interactionComposition: { primary: [], secondary: [], continuous: ['only-marquee'], restraint: ['non-interactive-content'] }, interactionLanguage: analyzed })).valid, false, 'Q continuous-only composition must fail without stateful affordances');
  assert.equal(validateAuthoring(planFrom({ candidates: [tab, onlyMarquee], interactionComposition: { primary: ['state-nav'], secondary: [], continuous: ['only-marquee'], restraint: ['dense-editorial-copy'] }, interactionLanguage: analyzed })).valid, true, 'R primary interaction plus marquee may pass');

  // S: grouped cards use actionable element count, so one multi-card group cannot hide scale spam.
  const cardSelectors = ['#card-1', '#card-2', '#card-3']; const scaledCards = group({ id: 'editorial-card-links', selectors: cardSelectors, semanticType: 'CARD_LINK', primitive: 'restrained-image-scale' });
  assert.equal(validateAuthoring(planFrom({ coverage: cardSelectors.map((selector) => ({ selector })), actionableAuthoring: [scaledCards], interactionLanguage: analyzed })).valid, false, 'S grouped image/card scale spam must fail by element count');
  const twoCardSelectors = ['#small-card-1', '#small-card-2']; const twoScaledCards = group({ id: 'small-card-links', selectors: twoCardSelectors, semanticType: 'CARD_LINK', primitive: 'restrained-image-scale' });
  assert.equal(validateAuthoring(planFrom({ coverage: twoCardSelectors.map((selector) => ({ selector })), actionableAuthoring: [twoScaledCards], interactionLanguage: analyzed })).valid, true, 'S small one-to-two card exception remains valid');

  // T: generic translateY/card-lift repeated across three semantic groups fails.
  const lifted = [group({ id: 'lift-nav', selectors: ['#lift-nav'], semanticType: 'NAV', primitive: 'translateY(4px)' }), group({ id: 'lift-button', selectors: ['#lift-button'], semanticType: 'BUTTON', primitive: 'generic-card-lift' }), group({ id: 'lift-card', selectors: ['#lift-card'], semanticType: 'CARD_LINK', primitive: 'translateY-card-lift' })];
  assert.equal(validateAuthoring(planFrom({ coverage: lifted.flatMap((item) => item.selectors).map((selector) => ({ selector })), actionableAuthoring: lifted, interactionLanguage: analyzed })).valid, false, 'T repeated translateY/card-lift must fail');

  // U: decorative arrows fail on CTA/BUTTON but remain legal for semantic arrow controls.
  const arrowCta = group({ id: 'arrow-cta', selectors: ['#arrow-cta'], semanticType: 'CTA', primitive: 'decorative-arrow-default' });
  const arrowIcon = group({ id: 'arrow-icon', selectors: ['#arrow-icon'], semanticType: 'ICON_BUTTON', primitive: 'decorative-arrow-default', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN });
  assert.equal(validateAuthoring(planFrom({ coverage: [{ selector: '#arrow-cta' }], actionableAuthoring: [arrowCta], interactionLanguage: analyzed })).valid, false, 'U decorative CTA arrow must fail');
  assert.equal(validateAuthoring(planFrom({ coverage: [{ selector: '#arrow-icon' }], actionableAuthoring: [arrowIcon], interactionLanguage: analyzed })).valid, true, 'U semantic icon arrow remains allowed');

  // V/W: current authoring plans require composition and all four role arrays.
  const missingComposition = planFrom({ interactionLanguage: analyzed }); delete missingComposition.interactionComposition;
  assert.equal(validateInteractionPlan(missingComposition).valid, false, 'V production validator requires interactionComposition for latest authoring plans');
  for (const role of ['primary', 'secondary', 'continuous', 'restraint']) {
    const missingRole = planFrom({ interactionLanguage: analyzed }); delete missingRole.interactionComposition[role];
    assert.equal(validateAuthoring(missingRole).valid, false, `W interactionComposition.${role} is required`);
  }

  await context.close();
} finally { await browser.close(); }

console.log('interaction authoring A-W contracts: PASS');
