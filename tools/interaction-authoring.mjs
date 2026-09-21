import { PATTERN_REGISTRY } from './interaction-patterns.mjs';

export const AUTHORING_POLICIES = Object.freeze({
  REQUIRED_BASELINE: 'required-baseline',
  AFFORDANCE_DRIVEN: 'affordance-driven',
  ENHANCED_MOTION: 'enhanced-motion'
});

const BASELINE_FEEDBACK = Object.freeze(['hover', 'focus-visible', 'active/tap']);
const DEFAULT_BANNED = Object.freeze(['generic-card-lift', 'global-scale-1.05', 'decorative-arrow-default', 'all-elements-opacity-only']);

// Vocabulary offers candidates. Pattern registry remains the verification route.
const VOCABULARY = Object.freeze({
  tabs: { semanticType: 'TAB', intent: 'select', family: 'state-navigation', primitives: ['active-bar', 'crossfade', 'clip'], policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['Star room tabs', 'KUMU tabs'] },
  accordion: { semanticType: 'STATE NAV', intent: 'open', family: 'disclosure', primitives: ['reveal', 'clip', 'crossfade'], policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['KUMU accordion'] },
  dropdown: { semanticType: 'SEARCH', intent: 'open', family: 'dropdown', primitives: ['reveal', 'clip', 'opacity-shift'], policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['KUMU dropdown'] },
  drawer: { semanticType: 'MENU', intent: 'open', family: 'drawer', primitives: ['clip', 'reveal', 'opacity-shift'], policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['KUMU sidebar', 'Main Portfolio mobile close'] },
  'menu-state': { semanticType: 'MENU', intent: 'open', family: 'menu-state', primitives: ['reveal', 'clip', 'opacity-shift'], policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['Star side menu', 'React Modoo mobile menu'] },
  'carousel-state': { semanticType: 'CAROUSEL', intent: 'advance', family: 'carousel', primitives: ['slide', 'crossfade', 'clip', 'text-image-shift'], policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['Star hero slider', 'React Modoo portfolio slider'] },
  'hover-reveal': { semanticType: 'IMAGE CARD', intent: 'preview', family: 'hover-reveal', primitives: ['crop-shift', 'caption-reveal', 'metadata-reveal', 'title-underline'], policy: AUTHORING_POLICIES.REQUIRED_BASELINE, corpus: ['KUMU image hover', 'Star event hover'] },
  marquee: { semanticType: 'MARQUEE', intent: 'browse', family: 'continuous-content', primitives: ['continuous-movement', 'hover-pause', 'speed-adjustment'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['KUMU marquee', 'React Modoo dual marquee'] },
  ticker: { semanticType: 'MARQUEE', intent: 'browse', family: 'continuous-content', primitives: ['continuous-movement', 'hover-pause'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['KUMU ticker'] },
  'continuous-loop': { semanticType: 'MARQUEE', intent: 'browse', family: 'continuous-content', primitives: ['continuous-movement', 'hover-pause'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['React Modoo dual marquee'] },
  'auto-sequence': { semanticType: 'STORY SECTION', intent: 'change-state', family: 'auto-sequence', primitives: ['crossfade', 'clip'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['loading intro / morph'] },
  'floating-motion': { semanticType: 'IMAGE CARD', intent: 'emphasize', family: 'floating-motion', primitives: ['image-position', 'restrained-image-scale'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO floating'] },
  'scroll-reveal': { semanticType: 'STORY SECTION', intent: 'reveal', family: 'scroll-reveal', primitives: ['clip', 'crossfade', 'image-position'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO curtain / saturation'] },
  'scroll-header-state': { semanticType: 'NAV', intent: 'change-state', family: 'scroll-header', primitives: ['opacity-shift', 'active-bar', 'clip'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['KUMU scroll header'] },
  'split-text-reveal': { semanticType: 'STORY SECTION', intent: 'reveal', family: 'split-text', primitives: ['mask-clip', 'clip', 'text-shift'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['Main Portfolio split text'] },
  'pin-scrub-track': { semanticType: 'STORY SECTION', intent: 'inspect', family: 'pin-scrub', primitives: ['clip', 'text-image-shift', 'crossfade'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO pinned scene', 'KUHNIL pinned section'] },
  'scene-transition': { semanticType: 'STORY SECTION', intent: 'change-state', family: 'scene-transition', primitives: ['crossfade', 'clip', 'text-image-shift'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['Main Portfolio active scene'] },
  'horizontal-pin-scroll': { semanticType: 'STORY SECTION', intent: 'browse', family: 'horizontal-scroll', primitives: ['clip', 'text-image-shift'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['Main Portfolio pinned scenes'] },
  parallax: { semanticType: 'IMAGE CARD', intent: 'emphasize', family: 'parallax', primitives: ['image-position', 'crop-shift'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO image treatment'] },
  'image-sequence': { semanticType: 'IMAGE CARD', intent: 'change-state', family: 'image-sequence', primitives: ['crop-shift', 'image-position'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO image progression'] },
  'scroll-story': { semanticType: 'STORY SECTION', intent: 'inspect', family: 'scroll-story', primitives: ['clip', 'text-image-shift', 'crossfade'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO graph/path progression'] },
  'pointer-reactive': { semanticType: 'MEDIA CONTROL', intent: 'inspect', family: 'pointer-reactive', primitives: ['image-position', 'reveal'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO pointer tooltip'] },
  'cursor-tooltip': { semanticType: 'MEDIA CONTROL', intent: 'inspect', family: 'cursor-tooltip', primitives: ['reveal', 'caption-reveal'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['EATGO pointer tooltip'] },
  'speed-control': { semanticType: 'MARQUEE', intent: 'pause', family: 'speed-control', primitives: ['restrained-icon-motion', 'border-transition'], policy: AUTHORING_POLICIES.AFFORDANCE_DRIVEN, corpus: ['KUMU marquee pause'] },
  'canvas-interaction': { semanticType: 'MEDIA CONTROL', intent: 'inspect', family: 'advanced-canvas', primitives: ['manual-contract'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['canvas / WebGL'] },
  'webgl-scene': { semanticType: 'STORY SECTION', intent: 'inspect', family: 'advanced-webgl', primitives: ['manual-contract'], policy: AUTHORING_POLICIES.ENHANCED_MOTION, corpus: ['canvas / WebGL'] }
});

const ACTIONABLE_POOLS = Object.freeze({
  NAV: ['underline-reveal', 'active-bar', 'opacity-shift', 'text-shift'], TEXT_LINK: ['underline-reveal', 'opacity-shift', 'text-shift', 'active-bar'],
  BUTTON: ['fill', 'border-transition', 'background-inversion', 'text-shift', 'text-mask'], CTA: ['fill', 'background-inversion', 'border-transition', 'text-shift', 'text-mask'],
  ICON_BUTTON: ['border-transition', 'background-reveal', 'icon-translate', 'icon-rotate'], TAB: ['active-bar', 'underline-reveal', 'crossfade', 'clip'],
  STATE_NAV: ['active-number-emphasis', 'crossfade', 'clip', 'text-image-shift'], CAROUSEL_CONTROL: ['border-transition', 'fill', 'background-reveal', 'icon-translate'],
  MENU_CONTROL: ['border-transition', 'fill', 'background-reveal'], SEARCH_CONTROL: ['border-transition', 'fill', 'background-inversion'],
  CARD_LINK: ['crop-shift', 'caption-reveal', 'metadata-reveal', 'title-underline', 'restrained-image-scale'], MEDIA_CONTROL: ['border-transition', 'background-reveal', 'icon-translate', 'crop-shift']
});

const ACTIONABLE_FAMILIES = Object.freeze({ NAV: 'text-feedback', TEXT_LINK: 'text-feedback', BUTTON: 'button-feedback', CTA: 'button-feedback', ICON_BUTTON: 'icon-button-feedback', TAB: 'state-navigation', STATE_NAV: 'state-navigation', CAROUSEL_CONTROL: 'carousel-control', MENU_CONTROL: 'menu-control', SEARCH_CONTROL: 'search-control', CARD_LINK: 'media-feedback', MEDIA_CONTROL: 'media-feedback' });
const ACTIONABLE_CORPUS = Object.freeze({ NAV: ['KUMU navigation', 'KUHNIL underline navigation'], TEXT_LINK: ['KUHNIL underline navigation'], BUTTON: ['KUHNIL CTA fill'], CTA: ['KUHNIL CTA fill'], ICON_BUTTON: ['Star directional control'], TAB: ['KUMU tabs', 'Star room tabs'], STATE_NAV: ['Star current/total/progress'], CAROUSEL_CONTROL: ['Star hero slider', 'React Modoo portfolio slider'], MENU_CONTROL: ['Star side menu', 'React Modoo mobile menu'], SEARCH_CONTROL: ['KUMU dropdown'], CARD_LINK: ['KUMU image/card hover', 'Star event hover'], MEDIA_CONTROL: ['EATGO pointer/media control'] });

function preferredPrimitives(semanticType, interactionLanguage) {
  if (['NAV', 'TEXT_LINK'].includes(semanticType)) return interactionLanguage?.linkBehavior || [];
  if (['BUTTON', 'CTA', 'ICON_BUTTON', 'CAROUSEL_CONTROL', 'MENU_CONTROL', 'SEARCH_CONTROL', 'MEDIA_CONTROL'].includes(semanticType)) return interactionLanguage?.buttonBehavior || [];
  if (['CARD_LINK', 'IMAGE CARD'].includes(semanticType)) return interactionLanguage?.mediaBehavior || [];
  if (['TAB', 'STATE_NAV'].includes(semanticType)) return [...(interactionLanguage?.navigationBehavior || []), ...(interactionLanguage?.stateTransition || [])];
  return interactionLanguage?.stateTransition || [];
}

function choosePrimitive(pool, semanticType, interactionLanguage, motionLanguage) {
  const banned = new Set([...(interactionLanguage?.banned || []), ...(motionLanguage?.bannedPrimitives || [])]);
  const allowed = pool.filter((primitive) => !banned.has(primitive));
  const preferred = preferredPrimitives(semanticType, interactionLanguage);
  return preferred.find((primitive) => allowed.includes(primitive)) || allowed[0] || pool[0] || 'border-transition';
}

function rationaleFor(primitive, semanticType, interactionLanguage, motionLanguage = null) {
  const cues = [];
  if (interactionLanguage?.visualCues?.lineUsage?.borderedVisibleElements >= 3) cues.push('observed repeated rules/borders');
  if (interactionLanguage?.visualCues?.imageTreatment?.imageCount > 0) cues.push('observed image-led content');
  if (interactionLanguage?.character?.includes('restrained')) cues.push('observed restrained shape language');
  if (motionLanguage?.character) cues.push(`DESIGN_MODE character=${motionLanguage.character}`);
  if (motionLanguage?.pace) cues.push(`pace=${motionLanguage.pace}`);
  return `Selected ${primitive} for ${semanticType} from ${cues.length ? cues.join(', ') : 'deterministic interaction-language evidence'}.`;
}

function slug(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page'; }

function evidencePassed(candidate) {
  return ['source-annotation', 'reference-state', 'design-language'].includes(candidate?.provenance)
    || (candidate?.provenance === 'dom-affordance' && candidate?.confidence === 'high' && candidate?.evidence?.some((item) => /moving track|carousel|marquee|explicit/i.test(item)));
}

function motionSelection(candidate, { designMode, motionLanguage }) {
  if (designMode !== 'design' || !motionLanguage) return { status: 'selected', reason: null };
  const family = VOCABULARY[candidate.recipe]?.family || candidate.recipe;
  if ((motionLanguage.bannedFamilies || []).includes(family) || (motionLanguage.bannedFamilies || []).includes(candidate.recipe)) return { status: 'banned', reason: `motionLanguage.bannedFamilies excludes ${family}.` };
  if (['pointer-reactive', 'cursor-tooltip'].includes(candidate.recipe) && /minimal|limited|none/i.test(motionLanguage.pointerUsage || '')) return { status: 'restricted', reason: 'motionLanguage.pointerUsage restricts pointer-reactive authoring.' };
  if (['marquee', 'ticker', 'continuous-loop'].includes(candidate.recipe) && /minimal|restricted|limited|none/i.test(motionLanguage.continuousMotionUsage || '')) return { status: 'restricted', reason: 'motionLanguage.continuousMotionUsage restricts continuous motion.' };
  if (['scroll-story', 'scroll-reveal', 'parallax', 'scene-transition', 'pin-scrub-track', 'split-text-reveal', 'horizontal-pin-scroll'].includes(candidate.recipe) && /avoid|none|static/i.test(motionLanguage.scrollStory || '')) return { status: 'restricted', reason: 'motionLanguage.scrollStory restricts enhanced scroll authoring.' };
  const preferred = (motionLanguage.preferredFamilies || []).includes(family) || (motionLanguage.preferredFamilies || []).includes(candidate.recipe);
  return { status: preferred ? 'preferred' : 'selected', reason: preferred ? `motionLanguage.preferredFamilies includes ${family}.` : null };
}

export async function analyzeInteractionLanguage(page, { designMode = 'reference' } = {}) {
  const observed = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const visible = (node) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'; };
    const visibleNodes = all.filter(visible); const images = [...document.images].filter(visible);
    const borders = visibleNodes.filter((node) => { const style = getComputedStyle(node); return ['borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle'].some((property) => style[property] !== 'none' && parseFloat(style[property.replace('Style', 'Width')]) > 0); });
    const radii = visibleNodes.map((node) => parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0).filter(Boolean);
    const controls = [...document.querySelectorAll('a[href], button, [role="tab"], [aria-expanded], summary')].filter(visible);
    const transitions = visibleNodes.filter((node) => { const style = getComputedStyle(node); return style.transitionProperty !== 'all 0s ease 0s' || style.animationName !== 'none'; });
    const textColors = [...new Set(visibleNodes.map((node) => getComputedStyle(node).color).filter(Boolean))]; const backgrounds = [...new Set(visibleNodes.map((node) => getComputedStyle(node).backgroundColor).filter(Boolean))];
    const families = [...new Set(visibleNodes.map((node) => getComputedStyle(node).fontFamily).filter(Boolean))];
    return { typography: { fontFamilies: families.slice(0, 8), textColorCount: textColors.length }, lineUsage: { borderedVisibleElements: borders.length, ratio: visibleNodes.length ? borders.length / visibleNodes.length : 0 }, shapeLanguage: { roundedVisibleElements: radii.length, maxRadius: radii.length ? Math.max(...radii) : 0 }, imageTreatment: { imageCount: images.length, objectFitValues: [...new Set(images.map((node) => getComputedStyle(node).objectFit))] }, density: { visibleElementCount: visibleNodes.length, actionableCount: controls.length }, contrast: { textColorCount: textColors.length, backgroundColorCount: backgrounds.length }, motionCues: { transitionedOrAnimatedElements: transitions.length } };
  });
  const lineHeavy = observed.lineUsage.ratio >= 0.04 || observed.lineUsage.borderedVisibleElements >= 3; const photographic = observed.imageTreatment.imageCount > 0; const restrained = observed.shapeLanguage.maxRadius <= 12;
  return { version: 1, mode: designMode, source: 'deterministic-dom-analysis', character: [lineHeavy ? 'editorial' : 'structured', restrained ? 'restrained' : 'soft', photographic ? 'tactile' : 'functional'].join(' / '), typography: observed.typography, visualCues: observed, linkBehavior: lineHeavy ? ['underline-reveal', 'opacity-shift'] : ['opacity-shift', 'text-shift'], buttonBehavior: lineHeavy ? ['fill', 'text-shift'] : ['border-transition', 'fill'], mediaBehavior: photographic ? ['crop-shift', 'caption-reveal'] : ['reveal'], stateTransition: ['crossfade', 'clip'], navigationBehavior: lineHeavy ? ['underline', 'active-bar'] : ['active-bar', 'opacity-shift'], banned: [...DEFAULT_BANNED], evidence: observed };
}

export function authorInteractionCandidate(candidate, { designMode = 'reference', interactionLanguage, motionLanguage = null } = {}) {
  const vocabulary = VOCABULARY[candidate.recipe] || { semanticType: String(candidate.semanticType || 'CONTROL').toUpperCase(), intent: candidate.intent || 'change-state', family: candidate.recipe || 'shared-control', primitives: ['border-transition'], policy: AUTHORING_POLICIES.REQUIRED_BASELINE, corpus: ['interaction vocabulary baseline'] };
  const selection = motionSelection(candidate, { designMode, motionLanguage }); const enhancedEvidence = evidencePassed(candidate); const policy = vocabulary.policy;
  const primitive = choosePrimitive(vocabulary.primitives, vocabulary.semanticType, interactionLanguage, motionLanguage); const blocked = selection.status === 'banned' || selection.status === 'restricted';
  return { policy, semanticType: vocabulary.semanticType, intent: vocabulary.intent, interactionFamily: vocabulary.family, primitive, primitiveCandidates: [...vocabulary.primitives], rationale: blocked ? `Authoring skipped: ${selection.reason}` : rationaleFor(primitive, vocabulary.semanticType, interactionLanguage, motionLanguage), vocabularySource: [...vocabulary.corpus], requiredFeedback: policy === AUTHORING_POLICIES.REQUIRED_BASELINE ? [...BASELINE_FEEDBACK] : [], behavior: { required: policy === AUTHORING_POLICIES.AFFORDANCE_DRIVEN, rationale: policy === AUTHORING_POLICIES.AFFORDANCE_DRIVEN ? 'Visible control affordance maps to the most conservative semantic state change.' : 'Feedback authoring is required; behavior is not inferred from decoration.' }, evidenceGate: { required: policy === AUTHORING_POLICIES.ENHANCED_MOTION, passed: policy === AUTHORING_POLICIES.ENHANCED_MOTION ? enhancedEvidence : true, reason: enhancedEvidence ? 'Explicit source/reference/design or known moving-structure evidence exists.' : 'Enhanced motion needs explicit evidence in Reference Mode.' }, selection: { status: selection.status, reason: selection.reason, preferredFamily: Boolean(motionLanguage?.preferredFamilies?.includes(vocabulary.family) || motionLanguage?.preferredFamilies?.includes(candidate.recipe)) }, visualLanguage: { character: interactionLanguage?.character || 'restrained', preferred: preferredPrimitives(vocabulary.semanticType, interactionLanguage), banned: interactionLanguage?.banned || [...DEFAULT_BANNED] }, verificationRoute: PATTERN_REGISTRY[candidate.recipe]?.verifier || 'interaction-coverage', designMode, implementation: blocked || (designMode === 'reference' && policy === AUTHORING_POLICIES.ENHANCED_MOTION && !enhancedEvidence) ? 'skip' : candidate.implementation };
}

export async function authorActionableInventory(page, actionable, { candidates = [], interactionLanguage, motionLanguage = null } = {}) {
  const candidateInfo = candidates.map((candidate) => ({ id: candidate.id, selector: candidate.selector, recipe: candidate.recipe }));
  const classified = await page.evaluate(({ actionable, candidateInfo }) => {
    const candidateFor = (node) => candidateInfo.find((candidate) => { const root = document.querySelector(candidate.selector); return root && (root === node || root.contains(node)); }) || null;
    const textOf = (node) => (node.textContent || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(); const numeric = (value) => /^(?:0?\d|\d{1,2})(?:\s*[/|-]\s*\d{1,2})?$/.test(value);
    return actionable.map((item) => {
      const node = document.querySelector(item.selector); const text = node ? textOf(node) : item.text || ''; const role = node?.getAttribute('role') || ''; const label = `${text} ${node?.getAttribute('aria-label') || ''} ${node?.className || ''}`.toLowerCase();
      const context = node?.closest('header, footer, nav, section, [data-carousel], [data-slider], form'); const hasImage = Boolean(node?.querySelector('img, picture, svg') || node?.closest('article, .card, .story-card')?.querySelector('img, picture')); const candidate = node ? candidateFor(node) : null;
      const siblings = node ? [...(node.parentElement?.children || [])].filter((child) => child.matches?.('button, a, [role="tab"], [data-page]')) : [];
      let semanticType = 'BUTTON';
      if (node?.matches('[data-next], [data-prev]')) semanticType = node.closest('[data-carousel], [data-slider], [aria-roledescription="carousel"], .carousel') ? 'CAROUSEL_CONTROL' : 'MEDIA_CONTROL';
      else if (numeric(text) && siblings.length > 1) semanticType = 'STATE_NAV';
      else if (role === 'tab') semanticType = 'TAB';
      else if (/search|검색/.test(label)) semanticType = 'SEARCH_CONTROL';
      else if (node?.matches('[aria-expanded]') && /menu|nav|hamburger|drawer|sidebar/.test(label)) semanticType = 'MENU_CONTROL';
      else if (node?.matches('a[href]') && node.closest('header, nav')) semanticType = 'NAV';
      else if (node?.matches('a[href]') && hasImage) semanticType = 'CARD_LINK';
      else if (node?.matches('a[href]')) semanticType = 'TEXT_LINK';
      else if (node?.matches('button') && /\+|→|←|arrow|next|prev|close|play|pause/i.test(label)) semanticType = 'ICON_BUTTON';
      else if (node?.matches('button') && /cta|read|view|learn|start|submit|continue|go/i.test(label)) semanticType = 'CTA';
      else if (node?.matches('[role="button"]') && hasImage) semanticType = 'MEDIA_CONTROL';
      const intent = semanticType === 'CAROUSEL_CONTROL' ? (node?.matches('[data-prev]') || /prev|previous|←|back/i.test(label) ? 'retreat' : 'advance') : semanticType === 'STATE_NAV' || semanticType === 'TAB' ? 'change-state' : ['MENU_CONTROL', 'SEARCH_CONTROL'].includes(semanticType) ? 'open' : ['NAV', 'TEXT_LINK', 'CARD_LINK'].includes(semanticType) ? 'navigate' : node?.matches('form button[type="submit"]') ? 'submit' : semanticType === 'MEDIA_CONTROL' ? 'inspect' : /\+|open|reveal|more/i.test(label) ? 'reveal' : 'change-state';
      return { ...item, text, semanticType, intent, candidateId: candidate?.id || null, groupContext: node?.closest('header') ? 'header-nav' : node?.closest('footer') ? 'footer-links' : context?.id || context?.className || context?.tagName || null };
    });
  }, { actionable, candidateInfo });
  const groups = new Map();
  for (const item of classified) {
    const semanticType = item.semanticType; const candidate = candidates.find((entry) => entry.id === item.candidateId); const behaviorCandidate = candidate && ['TAB', 'STATE_NAV', 'CAROUSEL_CONTROL', 'MENU_CONTROL', 'SEARCH_CONTROL', 'MEDIA_CONTROL'].includes(semanticType) ? candidate : null; const recipe = behaviorCandidate?.recipe || null; const vocabulary = recipe ? VOCABULARY[recipe] : null;
    const groupId = item.groupContext === 'header-nav' && ['NAV', 'TEXT_LINK'].includes(semanticType) ? 'header-nav' : item.groupContext === 'footer-links' && ['NAV', 'TEXT_LINK'].includes(semanticType) ? 'footer-links' : semanticType === 'CAROUSEL_CONTROL' ? `${slug(item.groupContext || 'carousel')}-controls` : semanticType === 'CTA' ? `${slug(item.groupContext || 'section')}-cta` : semanticType === 'CARD_LINK' ? 'editorial-card-links' : semanticType === 'NAV' || semanticType === 'TEXT_LINK' ? 'text-links' : `${slug(semanticType)}-feedback`;
    const family = ACTIONABLE_FAMILIES[semanticType] || `${slug(semanticType)}-feedback`; const pool = ACTIONABLE_POOLS[semanticType] || vocabulary?.primitives || ['border-transition']; const primitive = choosePrimitive(pool, semanticType, interactionLanguage, motionLanguage);
    const behaviorRequired = ['TAB', 'STATE_NAV', 'CAROUSEL_CONTROL', 'MENU_CONTROL', 'SEARCH_CONTROL', 'MEDIA_CONTROL'].includes(semanticType) || item.behaviorHint === 'explicit-handler';
    if (!groups.has(groupId)) groups.set(groupId, { id: groupId, selectors: [], semanticType, intent: item.intent, interactionFamily: family, primitive, primitiveCandidates: [...pool], policy: behaviorRequired ? AUTHORING_POLICIES.AFFORDANCE_DRIVEN : AUTHORING_POLICIES.REQUIRED_BASELINE, rationale: rationaleFor(primitive, semanticType, interactionLanguage, motionLanguage), vocabularySource: [...(ACTIONABLE_CORPUS[semanticType] || vocabulary?.corpus || ['interaction vocabulary baseline'])], requiredFeedback: [...BASELINE_FEEDBACK], behavior: { required: behaviorRequired, intent: item.intent, candidateIds: [] }, verificationRoute: behaviorCandidate ? (PATTERN_REGISTRY[recipe]?.verifier || 'interaction-qa') : 'interaction-coverage', elements: [] });
    const group = groups.get(groupId); group.selectors.push(item.selector); group.behavior.candidateIds = [...new Set([...group.behavior.candidateIds, ...(behaviorCandidate ? [behaviorCandidate.id] : [])])]; group.elements.push({ selector: item.selector, text: item.text, semanticType, intent: item.intent, candidateId: item.candidateId });
  }
  return [...groups.values()].map((group) => ({ ...group, selectors: [...new Set(group.selectors)], elementCount: group.selectors.length }));
}

export function buildInteractionComposition({ candidates = [], actionableAuthoring = [], interactionLanguage = null } = {}) {
  const stateRecipes = new Set(['tabs', 'accordion', 'dropdown', 'drawer', 'menu-state', 'carousel-state', 'scene-transition']); const continuousRecipes = new Set(['marquee', 'ticker', 'continuous-loop', 'auto-sequence', 'floating-motion']);
  const primary = candidates.filter((candidate) => stateRecipes.has(candidate.recipe) && candidate.implementation !== 'skip').map((candidate) => candidate.id);
  const statefulGroups = actionableAuthoring.filter((group) => ['TAB', 'STATE_NAV', 'CAROUSEL_CONTROL', 'MENU_CONTROL', 'SEARCH_CONTROL'].includes(group.semanticType)).map((group) => group.id);
  for (const groupId of statefulGroups) if (!primary.includes(groupId)) primary.push(groupId);
  const continuous = candidates.filter((candidate) => continuousRecipes.has(candidate.recipe) && candidate.implementation !== 'skip').map((candidate) => candidate.id); const primarySet = new Set(primary);
  const secondary = actionableAuthoring.filter((group) => !primarySet.has(group.id) && !group.behavior?.candidateIds?.some((id) => primarySet.has(id))).map((group) => group.id); const restraint = interactionLanguage?.character?.includes('editorial') ? ['dense-editorial-copy'] : ['non-interactive-content'];
  return { primary, secondary, continuous, restraint };
}

function validateCoverageConnection(plan, errors) {
  if (Array.isArray(plan?.coverage?.actionable) && !Array.isArray(plan?.actionableAuthoring)) { errors.push('actionableAuthoring is required when coverage.actionable exists'); return; }
  if (!Array.isArray(plan?.coverage?.actionable) || !Array.isArray(plan?.actionableAuthoring)) return;
  const coverageSelectors = new Set(plan.coverage.actionable.map((item) => item.selector)); const authoredSelectors = new Set(plan.actionableAuthoring.flatMap((group) => group.selectors || []));
  const authoredSelectorCount = plan.actionableAuthoring.reduce((total, group) => total + (group.selectors?.length || 0), 0);
  for (const selector of coverageSelectors) if (!authoredSelectors.has(selector)) errors.push(`actionableAuthoring is missing coverage selector: ${selector}`);
  for (const selector of authoredSelectors) if (!coverageSelectors.has(selector)) errors.push(`actionableAuthoring selector is not in coverage.actionable: ${selector}`);
  for (const [index, group] of plan.actionableAuthoring.entries()) { if (!group.id || !Array.isArray(group.selectors) || !group.selectors.length) errors.push(`actionableAuthoring[${index}] requires id and selectors`); for (const field of ['semanticType', 'intent', 'interactionFamily', 'primitive', 'policy', 'rationale', 'vocabularySource', 'verificationRoute']) if (!group[field]) errors.push(`actionableAuthoring[${index}].${field} is required`); if (group.policy === AUTHORING_POLICIES.REQUIRED_BASELINE && JSON.stringify(group.requiredFeedback) !== JSON.stringify(BASELINE_FEEDBACK)) errors.push(`actionableAuthoring[${index}] must require baseline feedback`); }
  if (authoredSelectors.size !== coverageSelectors.size) errors.push('coverage.actionable and actionableAuthoring must have equal selector coverage');
  if (authoredSelectorCount !== authoredSelectors.size) errors.push('actionableAuthoring contains a selector in more than one group');
}

export function validateInteractionDiversity(plan) {
  const errors = []; const groups = plan?.actionableAuthoring || []; if (!groups.length) return { valid: true, errors };
  const semanticCount = new Set(groups.map((group) => group.semanticType)).size; const primitiveCounts = new Map(); let totalElements = 0; let opacityElements = 0;
  for (const group of groups) { const count = group.selectors?.length || 0; totalElements += count; primitiveCounts.set(group.primitive, (primitiveCounts.get(group.primitive) || 0) + count); if (group.primitive === 'opacity-shift' || group.primitive === 'all-elements-opacity-only') opacityElements += count; }
  if (semanticCount >= 3 && primitiveCounts.size === 1) errors.push('Anti-generic interaction failure: three or more semantic groups use one primitive.');
  if (semanticCount >= 3 && totalElements > 0 && opacityElements / totalElements >= 0.8) errors.push('Anti-generic interaction failure: opacity-only feedback covers at least 80% of actionable elements.');
  const translateGroups = groups.filter((group) => /translateY|generic-card-lift/i.test(group.primitive || '')); if (new Set(translateGroups.map((group) => group.semanticType)).size >= 3) errors.push('Anti-generic interaction failure: generic translateY/card-lift is repeated across semantic groups.');
  const imageGroups = groups.filter((group) => ['CARD_LINK', 'IMAGE_CARD'].includes(group.semanticType)); if (imageGroups.length >= 2 && imageGroups.every((group) => /scale|global-scale/i.test(group.primitive || ''))) errors.push('Anti-generic interaction failure: all image/card groups use generic scale.');
  for (const group of groups) if (group.primitive === 'decorative-arrow-default' && !['ICON_BUTTON', 'CAROUSEL_CONTROL', 'MEDIA_CONTROL'].includes(group.semanticType)) errors.push(`Anti-generic interaction failure: decorative arrow was added to ${group.semanticType}.`);
  return { valid: errors.length === 0, errors };
}

export function validateAuthoring(plan) {
  const errors = []; if (!plan?.interactionLanguage || plan.interactionLanguage.version !== 1) errors.push('interactionLanguage.version must be 1'); validateCoverageConnection(plan, errors); errors.push(...validateInteractionDiversity(plan).errors);
  if (plan?.interactionComposition) { for (const role of ['primary', 'secondary', 'continuous', 'restraint']) if (!Array.isArray(plan.interactionComposition[role])) errors.push(`interactionComposition.${role} must be an array`); const stateful = (plan.candidates || []).some((candidate) => ['tabs', 'accordion', 'dropdown', 'drawer', 'menu-state', 'carousel-state', 'scene-transition'].includes(candidate.recipe) && candidate.implementation !== 'skip') || (plan.actionableAuthoring || []).some((group) => ['TAB', 'STATE_NAV', 'CAROUSEL_CONTROL', 'MENU_CONTROL', 'SEARCH_CONTROL'].includes(group.semanticType)); if (stateful && plan.interactionComposition.primary.length === 0) errors.push('Stateful affordances require at least one primary interaction.'); if (plan.interactionComposition.continuous.length > 0 && stateful && plan.interactionComposition.primary.length === 0) errors.push('Continuous motion cannot be the only page-level interaction.'); }
  for (const [index, candidate] of (plan?.candidates || []).entries()) { const authoring = candidate.authoring; if (!authoring) continue; const at = `candidates[${index}].authoring`; if (!Object.values(AUTHORING_POLICIES).includes(authoring.policy)) errors.push(`${at}.policy is invalid`); for (const field of ['semanticType', 'intent', 'interactionFamily', 'primitive', 'rationale', 'vocabularySource', 'verificationRoute']) if (!authoring[field]) errors.push(`${at}.${field} is required`); if (authoring.policy === AUTHORING_POLICIES.REQUIRED_BASELINE && JSON.stringify(authoring.requiredFeedback) !== JSON.stringify(BASELINE_FEEDBACK)) errors.push(`${at}.requiredFeedback must require hover, focus-visible, and active/tap`); if (authoring.policy === AUTHORING_POLICIES.AFFORDANCE_DRIVEN && authoring.behavior?.required !== true) errors.push(`${at}.behavior.required must be true for affordance-driven behavior`); if (authoring.policy === AUTHORING_POLICIES.ENHANCED_MOTION && authoring.evidenceGate?.required !== true) errors.push(`${at}.evidenceGate is required for enhanced motion`); if (plan.designMode === 'reference' && authoring.policy === AUTHORING_POLICIES.ENHANCED_MOTION && authoring.evidenceGate?.required === true && authoring.evidenceGate?.passed !== true && candidate.implementation !== 'skip') errors.push(`${at} lacks enhanced-motion evidence and must use implementation "skip" in REFERENCE_MODE`); if (authoring.selection?.status === 'banned' && candidate.implementation !== 'skip') errors.push(`${at} is banned by DESIGN_MODE motionLanguage and must use implementation "skip"`); }
  return { valid: errors.length === 0, errors };
}

export { ACTIONABLE_POOLS, BASELINE_FEEDBACK, DEFAULT_BANNED, VOCABULARY as INTERACTION_VOCABULARY };
