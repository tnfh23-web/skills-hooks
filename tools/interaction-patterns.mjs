export const INTERACTION_CATEGORIES = Object.freeze({
  STATE_INTERACTION: 'STATE_INTERACTION',
  POINTER_INTERACTION: 'POINTER_INTERACTION',
  CONTINUOUS_MOTION: 'CONTINUOUS_MOTION',
  SCROLL_MOTION: 'SCROLL_MOTION',
  ADVANCED: 'ADVANCED'
});

const pattern = (category, verifier, automation, layer, requiredStates) => Object.freeze({ category, verifier, automation, layer, requiredStates });

export const PATTERN_REGISTRY = Object.freeze({
  tabs: pattern('STATE_INTERACTION', 'interaction-qa', 'automatic', 'primitive', ['selected-tab', 'visible-panel']),
  accordion: pattern('STATE_INTERACTION', 'interaction-qa', 'automatic', 'primitive', ['collapsed', 'expanded', 'visible-panel']),
  dropdown: pattern('STATE_INTERACTION', 'interaction-qa', 'automatic', 'shared-recipe', ['closed', 'open', 'dismissed']),
  drawer: pattern('STATE_INTERACTION', 'interaction-qa', 'automatic', 'shared-recipe', ['closed', 'open', 'close']),
  'menu-state': pattern('STATE_INTERACTION', 'interaction-qa', 'automatic', 'shared-recipe', ['closed', 'open', 'dismissed']),
  'carousel-state': pattern('STATE_INTERACTION', 'interaction-qa', 'automatic', 'dedicated-skill', ['active-slide', 'counter', 'pagination', 'progress', 'thumbnail']),
  'hover-reveal': pattern('POINTER_INTERACTION', 'interaction-qa', 'automatic', 'shared-recipe', ['rest', 'hover', 'restored', 'mobile-access']),
  'pointer-reactive': pattern('POINTER_INTERACTION', 'motion-qa', 'deferred', 'shared-recipe', ['rest', 'pointer-sample', 'restored']),
  'cursor-tooltip': pattern('POINTER_INTERACTION', 'motion-qa', 'deferred', 'shared-recipe', ['hidden', 'pointer-sample', 'hidden']),
  'speed-control': pattern('POINTER_INTERACTION', 'motion-qa', 'deferred', 'shared-recipe', ['normal-speed', 'controlled-speed', 'restored-speed']),
  marquee: pattern('CONTINUOUS_MOTION', 'motion-qa', 'automatic', 'dedicated-skill', ['moving-track', 'accessible-duplicate', 'seamless-loop', 'reduced-motion']),
  ticker: pattern('CONTINUOUS_MOTION', 'motion-qa', 'deferred', 'shared-recipe', ['moving-track', 'loop', 'reduced-motion']),
  'continuous-loop': pattern('CONTINUOUS_MOTION', 'motion-qa', 'deferred', 'shared-recipe', ['start', 'loop', 'reduced-motion']),
  'auto-sequence': pattern('CONTINUOUS_MOTION', 'motion-qa', 'deferred', 'shared-recipe', ['initial', 'advanced', 'pause']),
  'floating-motion': pattern('CONTINUOUS_MOTION', 'motion-qa', 'deferred', 'shared-recipe', ['rest', 'loop', 'reduced-motion']),
  'scroll-reveal': pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'shared-recipe', ['start', 'intermediate', 'final']),
  'scroll-header-state': pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'shared-recipe', ['shown', 'hidden', 'restored']),
  'split-text-reveal': pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'dedicated-skill', ['unsplit-accessible-text', 'split-ready', 'revealed', 'reduced-motion']),
  'pin-scrub-track': pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'dedicated-skill', ['start', 'intermediate', 'final', 'pin-released']),
  'scene-transition': pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'dedicated-skill', ['previous-scene', 'active-scene', 'next-scene', 'final-safe-state']),
  'horizontal-pin-scroll': pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'dedicated-skill', ['start', 'track-progress', 'end', 'pin-released']),
  parallax: pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'shared-recipe', ['start', 'intermediate', 'final']),
  'image-sequence': pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'shared-recipe', ['first-frame', 'intermediate-frame', 'last-frame']),
  'scroll-story': pattern('SCROLL_MOTION', 'motion-qa', 'contract', 'shared-recipe', ['start', 'intermediate', 'final']),
  'canvas-interaction': pattern('ADVANCED', 'manual', 'unsupported', 'deferred', ['manual-contract']),
  'webgl-scene': pattern('ADVANCED', 'manual', 'unsupported', 'deferred', ['manual-contract'])
});

export const KNOWN_RECIPES = new Set(Object.keys(PATTERN_REGISTRY));

export function patternForCandidate(candidate) {
  return PATTERN_REGISTRY[candidate?.recipe] || null;
}

export function assertPatternRegistry() {
  const errors = [];
  for (const [recipe, entry] of Object.entries(PATTERN_REGISTRY)) {
    if (!Object.values(INTERACTION_CATEGORIES).includes(entry.category)) errors.push(`${recipe}: invalid category`);
    if (!['interaction-qa', 'motion-qa', 'manual'].includes(entry.verifier)) errors.push(`${recipe}: invalid verifier`);
    if (!['automatic', 'contract', 'deferred', 'unsupported'].includes(entry.automation)) errors.push(`${recipe}: invalid automation`);
    if (!Array.isArray(entry.requiredStates) || entry.requiredStates.length === 0) errors.push(`${recipe}: requiredStates missing`);
  }
  return { valid: errors.length === 0, errors };
}
