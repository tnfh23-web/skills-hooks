import { PATTERN_REGISTRY } from './interaction-patterns.mjs';

export const AUTHORING_POLICIES = Object.freeze({
  REQUIRED_BASELINE: 'required-baseline',
  AFFORDANCE_DRIVEN: 'affordance-driven',
  ENHANCED_MOTION: 'enhanced-motion'
});

const VOCABULARY = Object.freeze({
  tabs: { semanticType: 'TAB', intent: 'select', family: 'state-navigation', primitive: 'active-bar', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['Star room tabs', 'KUMU tabs'] },
  accordion: { semanticType: 'STATE NAV', intent: 'open', family: 'disclosure', primitive: 'reveal', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['KUMU accordion'] },
  dropdown: { semanticType: 'SEARCH', intent: 'open', family: 'dropdown', primitive: 'reveal', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['KUMU dropdown'] },
  drawer: { semanticType: 'MENU', intent: 'open', family: 'drawer', primitive: 'clip', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['KUMU sidebar', 'Main Portfolio mobile close'] },
  'menu-state': { semanticType: 'MENU', intent: 'open', family: 'menu-state', primitive: 'reveal', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['Star side menu', 'React Modoo mobile menu'] },
  'carousel-state': { semanticType: 'CAROUSEL', intent: 'advance', family: 'carousel', primitive: 'slide', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['Star hero slider', 'React Modoo portfolio slider'] },
  'hover-reveal': { semanticType: 'IMAGE CARD', intent: 'preview', family: 'hover-reveal', primitive: 'crop-shift', policy: AUTHORING_POLICIES.REQUIRED_BASELINE, corpus: ['KUMU image hover', 'Star event hover'] },
  marquee: { semanticType: 'MARQUEE', intent: 'browse', family: 'continuous-content', primitive: 'continuous-movement', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['KUMU marquee', 'React Modoo dual marquee'] },
  ticker: { semanticType: 'MARQUEE', intent: 'browse', family: 'continuous-content', primitive: 'continuous-movement', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['KUMU ticker'] },
  'continuous-loop': { semanticType: 'MARQUEE', intent: 'browse', family: 'continuous-content', primitive: 'continuous-movement', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['React Modoo dual marquee'] },
  'auto-sequence': { semanticType: 'STORY SECTION', intent: 'change-state', family: 'auto-sequence', primitive: 'crossfade', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['loading intro / morph'] },
  'floating-motion': { semanticType: 'IMAGE CARD', intent: 'emphasize', family: 'floating-motion', primitive: 'image-position', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO floating'] },
  'scroll-reveal': { semanticType: 'STORY SECTION', intent: 'reveal', family: 'scroll-reveal', primitive: 'clip', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO curtain / saturation'] },
  'scroll-header-state': { semanticType: 'NAV', intent: 'change-state', family: 'scroll-header', primitive: 'opacity-shift', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['KUMU scroll header'] },
  'split-text-reveal': { semanticType: 'STORY SECTION', intent: 'reveal', family: 'split-text', primitive: 'mask-clip', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['Main Portfolio split text'] },
  'pin-scrub-track': { semanticType: 'STORY SECTION', intent: 'inspect', family: 'pin-scrub', primitive: 'clip', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO pinned scene', 'KUHNIL pinned section'] },
  'scene-transition': { semanticType: 'STORY SECTION', intent: 'change-state', family: 'scene-transition', primitive: 'crossfade', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['Main Portfolio active scene'] },
  'horizontal-pin-scroll': { semanticType: 'STORY SECTION', intent: 'browse', family: 'horizontal-scroll', primitive: 'clip', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['Main Portfolio pinned scenes'] },
  parallax: { semanticType: 'IMAGE CARD', intent: 'emphasize', family: 'parallax', primitive: 'image-position', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO image treatment'] },
  'image-sequence': { semanticType: 'IMAGE CARD', intent: 'change-state', family: 'image-sequence', primitive: 'crop-shift', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO image progression'] },
  'scroll-story': { semanticType: 'STORY SECTION', intent: 'inspect', family: 'scroll-story', primitive: 'clip', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO graph/path progression'] },
  'pointer-reactive': { semanticType: 'MEDIA CONTROL', intent: 'inspect', family: 'pointer-reactive', primitive: 'image-position', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO pointer tooltip'] },
  'cursor-tooltip': { semanticType: 'MEDIA CONTROL', intent: 'inspect', family: 'cursor-tooltip', primitive: 'reveal', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO pointer tooltip'] },
  'speed-control': { semanticType: 'MARQUEE', intent: 'pause', family: 'speed-control', primitive: 'restrained-icon-motion', policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['KUMU marquee pause'] },
  'canvas-interaction': { semanticType: 'MEDIA CONTROL', intent: 'inspect', family: 'advanced-canvas', primitive: 'manual-contract', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['canvas / WebGL'] },
  'webgl-scene': { semanticType: 'STORY SECTION', intent: 'inspect', family: 'advanced-webgl', primitive: 'manual-contract', policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['canvas / WebGL'] }
});

const DEFAULT_BANNED = Object.freeze(['generic-card-lift', 'global-scale-1.05', 'decorative-arrow-default', 'all-elements-opacity-only']);

function count(values, predicate) {
  return values.filter(predicate).length;
}

export async function analyzeInteractionLanguage(page, { designMode = 'reference' } = {}) {
  const observed = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const visible = (node) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
    const visibleNodes = all.filter(visible);
    const images = [...document.images].filter(visible);
    const borders = visibleNodes.filter((node) => { const style = getComputedStyle(node); return ['borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle'].some((property) => style[property] !== 'none' && parseFloat(style[property.replace('Style', 'Width')]) > 0); });
    const radii = visibleNodes.map((node) => parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0).filter(Boolean);
    const controls = [...document.querySelectorAll('a[href], button, [role="tab"], [aria-expanded], summary')].filter(visible);
    const transitions = visibleNodes.filter((node) => { const style = getComputedStyle(node); return style.transitionProperty !== 'all 0s ease 0s' || style.animationName !== 'none'; });
    const textColors = [...new Set(visibleNodes.map((node) => getComputedStyle(node).color).filter(Boolean))];
    const backgrounds = [...new Set(visibleNodes.map((node) => getComputedStyle(node).backgroundColor).filter(Boolean))];
    const families = [...new Set(visibleNodes.map((node) => getComputedStyle(node).fontFamily).filter(Boolean))];
    return {
      typography: { fontFamilies: families.slice(0, 8), textColorCount: textColors.length },
      lineUsage: { borderedVisibleElements: borders.length, ratio: visibleNodes.length ? borders.length / visibleNodes.length : 0 },
      shapeLanguage: { roundedVisibleElements: radii.length, maxRadius: radii.length ? Math.max(...radii) : 0 },
      imageTreatment: { imageCount: images.length, objectFitValues: [...new Set(images.map((node) => getComputedStyle(node).objectFit))] },
      density: { visibleElementCount: visibleNodes.length, actionableCount: controls.length },
      contrast: { textColorCount: textColors.length, backgroundColorCount: backgrounds.length },
      motionCues: { transitionedOrAnimatedElements: transitions.length }
    };
  });
  const lineHeavy = observed.lineUsage.ratio >= 0.04 || observed.lineUsage.borderedVisibleElements >= 3;
  const photographic = observed.imageTreatment.imageCount > 0;
  const restrained = observed.shapeLanguage.maxRadius <= 12;
  const character = [lineHeavy ? 'editorial' : 'structured', restrained ? 'restrained' : 'soft', photographic ? 'tactile' : 'functional'].join(' / ');
  return {
    version: 1,
    mode: designMode,
    source: 'deterministic-dom-analysis',
    character,
    typography: observed.typography,
    visualCues: { lineUsage: observed.lineUsage, shapeLanguage: observed.shapeLanguage, imageTreatment: observed.imageTreatment, density: observed.density, contrast: observed.contrast, motionCues: observed.motionCues },
    linkBehavior: lineHeavy ? ['underline-reveal', 'opacity-shift'] : ['opacity-shift', 'text-shift'],
    buttonBehavior: lineHeavy ? ['fill', 'text-shift'] : ['border-transition', 'fill'],
    mediaBehavior: photographic ? ['crop-shift', 'caption-reveal'] : ['reveal'],
    stateTransition: ['crossfade', 'clip'],
    navigationBehavior: lineHeavy ? ['underline', 'active-bar'] : ['active-bar', 'opacity-shift'],
    banned: [...DEFAULT_BANNED],
    evidence: observed
  };
}

export function authorInteractionCandidate(candidate, { designMode = 'reference', interactionLanguage } = {}) {
  const vocabulary = VOCABULARY[candidate.recipe] || {
    semanticType: String(candidate.semanticType || 'CONTROL').toUpperCase(), intent: candidate.intent || 'change-state', family: candidate.recipe || 'shared-control', primitive: 'restrained-icon-motion', policy: AUTHORING_POLICIES.REQUIRED_BASELINE, corpus: ['interaction vocabulary baseline']
  };
  const enhancedEvidence = ['source-annotation', 'reference-state', 'design-language'].includes(candidate.provenance)
    || (candidate.provenance === 'dom-affordance' && candidate.confidence === 'high' && candidate.evidence?.some((item) => /moving track|carousel|marquee|explicit/i.test(item)));
  const policy = vocabulary.policy;
  const requiredFeedback = policy === AUTHORING_POLICIES.REQUIRED_BASELINE ? ['hover', 'focus-visible', 'active/tap'] : [];
  const behavior = policy === AUTHORING_POLICIES.AFFORDANCE_DRIVEN ? { required: true, rationale: 'Visible control affordance maps to the most conservative semantic state change.' } : { required: false, rationale: 'Decorative or continuous behavior requires evidence before authoring.' };
  return {
    policy,
    semanticType: vocabulary.semanticType,
    intent: vocabulary.intent,
    interactionFamily: vocabulary.family,
    primitive: vocabulary.primitive,
    vocabularySource: vocabulary.corpus,
    requiredFeedback,
    behavior,
    evidenceGate: policy === AUTHORING_POLICIES.ENHANCED_MOTION ? { required: true, passed: enhancedEvidence, reason: enhancedEvidence ? 'Explicit source/reference/design evidence exists.' : 'Enhanced motion needs explicit evidence in Reference Mode.' } : { required: false, passed: true, reason: 'Baseline or visible affordance behavior.' },
    visualLanguage: { character: interactionLanguage?.character || 'restrained', preferred: policy === AUTHORING_POLICIES.REQUIRED_BASELINE ? interactionLanguage?.linkBehavior || [] : interactionLanguage?.stateTransition || [], banned: interactionLanguage?.banned || [...DEFAULT_BANNED] },
    verificationRoute: PATTERN_REGISTRY[candidate.recipe]?.verifier || 'interaction-qa',
    designMode
  };
}

export function validateAuthoring(plan) {
  const errors = [];
  if (!plan?.interactionLanguage || plan.interactionLanguage.version !== 1) errors.push('interactionLanguage.version must be 1');
  for (const [index, candidate] of (plan?.candidates || []).entries()) {
    const authoring = candidate.authoring;
    if (!authoring) continue;
    const at = `candidates[${index}].authoring`;
    if (!Object.values(AUTHORING_POLICIES).includes(authoring.policy)) errors.push(`${at}.policy is invalid`);
    if (!authoring.semanticType || !authoring.intent || !authoring.interactionFamily || !authoring.primitive) errors.push(`${at} requires semanticType, intent, interactionFamily, and primitive`);
    if (authoring.policy === AUTHORING_POLICIES.REQUIRED_BASELINE && JSON.stringify(authoring.requiredFeedback) !== JSON.stringify(['hover', 'focus-visible', 'active/tap'])) errors.push(`${at}.requiredFeedback must require hover, focus-visible, and active/tap`);
    if (authoring.policy === AUTHORING_POLICIES.AFFORDANCE_DRIVEN && authoring.behavior?.required !== true) errors.push(`${at}.behavior.required must be true for affordance-driven behavior`);
    if (authoring.policy === AUTHORING_POLICIES.ENHANCED_MOTION && authoring.evidenceGate?.required !== true) errors.push(`${at}.evidenceGate is required for enhanced motion`);
    if (!Array.isArray(authoring.vocabularySource) || authoring.vocabularySource.length === 0) errors.push(`${at}.vocabularySource must identify corpus vocabulary`);
  }
  return { valid: errors.length === 0, errors };
}

export { DEFAULT_BANNED, VOCABULARY as INTERACTION_VOCABULARY };
