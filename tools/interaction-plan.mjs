import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createSourceFingerprint } from './source-fingerprint.mjs';
import { KNOWN_RECIPES, PATTERN_REGISTRY } from './interaction-patterns.mjs';
import { collectActionableInventory } from './interaction-coverage.mjs';

export { KNOWN_RECIPES } from './interaction-patterns.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2); const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true; else { args[key] = next; i += 1; }
  }
  return args;
}

const fileUrl = (value) => /^[a-z]+:\/\//i.test(value) ? value : new URL(`file://${path.resolve(value).replaceAll('\\', '/')}`).href;

export function validateInteractionPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== 'object') return { valid: false, errors: ['plan must be an object'] };
  if (plan.version !== 1) errors.push('version must be 1');
  if (!['reference', 'design'].includes(plan.designMode)) errors.push('designMode must be reference or design');
  if (!Array.isArray(plan.candidates)) errors.push('candidates must be an array');
  if (plan.coverage !== undefined && (!plan.coverage || !Array.isArray(plan.coverage.actionable))) errors.push('coverage.actionable must be an array when coverage is present');
  if (plan.designMode === 'design' && (!plan.motionLanguage || !plan.motionLanguage.character || !plan.motionLanguage.pace || !Array.isArray(plan.motionLanguage.preferredFamilies) || !Array.isArray(plan.motionLanguage.bannedFamilies) || !plan.motionLanguage.sectionEntryVariation || !plan.motionLanguage.pointerUsage || !plan.motionLanguage.continuousMotionUsage || !plan.motionLanguage.scrollStory)) {
    errors.push('DESIGN_MODE requires a complete motionLanguage contract');
  }
  const ids = new Set();
  for (const [index, candidate] of (plan.candidates || []).entries()) {
    const at = `candidates[${index}]`;
    if (!candidate?.id || typeof candidate.id !== 'string') errors.push(`${at}.id is required`);
    else if (ids.has(candidate.id)) errors.push(`${at}.id must be unique`); else ids.add(candidate.id);
    if (!candidate?.selector || typeof candidate.selector !== 'string') errors.push(`${at}.selector is required`);
    if (!candidate?.semanticType || typeof candidate.semanticType !== 'string') errors.push(`${at}.semanticType is required`);
    if (!['high', 'medium', 'low'].includes(candidate?.confidence)) errors.push(`${at}.confidence must be high, medium, or low`);
    if (!['reference-state', 'source-annotation', 'annotation', 'dom-affordance', 'design-language'].includes(candidate?.provenance)) errors.push(`${at}.provenance is invalid`);
    if (!candidate?.recipe || !KNOWN_RECIPES.has(candidate.recipe)) errors.push(`${at}.recipe is unknown: ${candidate?.recipe || '(missing)'}`);
    if (!Array.isArray(candidate?.evidence) || candidate.evidence.length === 0) errors.push(`${at}.evidence must contain at least one fact`);
    if (!Array.isArray(candidate?.requiredStates)) errors.push(`${at}.requiredStates must be an array`);
    else if (PATTERN_REGISTRY[candidate?.recipe] && JSON.stringify(candidate.requiredStates) !== JSON.stringify(PATTERN_REGISTRY[candidate.recipe].requiredStates)) errors.push(`${at}.requiredStates must match the pattern registry`);
    if (!candidate?.responsiveBehavior) errors.push(`${at}.responsiveBehavior is required`);
    if (!candidate?.reducedMotionBehavior) errors.push(`${at}.reducedMotionBehavior is required`);
    if (!candidate?.verification || typeof candidate.verification !== 'object') errors.push(`${at}.verification is required`);
    const verificationSchema = PATTERN_REGISTRY[candidate?.recipe]?.verification;
    if (verificationSchema && candidate?.verification && typeof candidate.verification === 'object') {
      for (const field of verificationSchema.requiredFields) {
        const value = candidate.verification[field];
        const missing = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
        if (missing) errors.push(`${at}.verification.${field} is required for ${candidate.recipe}`);
      }
      if (Array.isArray(candidate.verification.expectedStates) && JSON.stringify(candidate.verification.expectedStates) !== JSON.stringify(PATTERN_REGISTRY[candidate.recipe].requiredStates)) errors.push(`${at}.verification.expectedStates must match the pattern registry for ${candidate.recipe}`);
    }
    if (plan.designMode === 'reference' && candidate?.confidence === 'low' && candidate?.implementation !== 'skip') {
      errors.push(`${at} is LOW confidence in REFERENCE_MODE and must use implementation "skip"`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function requiredStatesFor(recipe) {
  return PATTERN_REGISTRY[recipe]?.requiredStates || ['rest', 'active'];
}

export async function discoverInteractionPlan(page, { designMode = 'reference', sourceRoot = process.cwd(), motionLanguage = null } = {}) {
  const candidates = await page.evaluate(() => {
    const visible = (node) => {
      const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const selectorFor = (node, prefix) => {
      if (node.id) return `#${CSS.escape(node.id)}`;
      const explicit = node.getAttribute('data-interaction-id');
      if (explicit) return `[data-interaction-id="${CSS.escape(explicit)}"]`;
      const className = [...node.classList].find((name) => document.querySelectorAll(`.${CSS.escape(name)}`).length === 1);
      if (className) return `.${CSS.escape(className)}`;
      const peers = [...node.parentElement?.children || []].filter((item) => item.tagName === node.tagName);
      return `${prefix || node.tagName.toLowerCase()}:nth-of-type(${Math.max(1, peers.indexOf(node) + 1)})`;
    };
    const found = []; const seen = new Set();
    const add = (root, semanticType, recipe, evidence, confidence = 'high', verification = {}, provenance = 'dom-affordance') => {
      if (!root || !visible(root)) return;
      const selector = selectorFor(root, root.tagName.toLowerCase());
      const key = `${semanticType}:${selector}`;
      if (seen.has(key)) return; seen.add(key);
      found.push({ selector, semanticType, recipe, evidence, confidence, verification, provenance });
    };
    const annotatedMotionVerification = (root, recipe) => {
      const selectorOr = (selector, fallback = root) => { const node = root.querySelector(selector); return node ? selectorFor(node) : selectorFor(fallback); };
      const states = (fallback) => (root.getAttribute('data-expected-states') || fallback.join(',')).split(',').map((state) => state.trim()).filter(Boolean);
      const stateAttribute = root.getAttribute('data-state-attribute') || 'data-state';
      if (recipe === 'pin-scrub-track') return { sampleSelector: selectorOr('[data-motion-sample], [data-pin-sample], [data-state]'), pinSelector: selectorOr('[data-pin], [data-pin-sample], [data-state]'), stateAttribute, expectedStates: states(['start', 'intermediate', 'final', 'pin-released']) };
      if (recipe === 'scene-transition') return { sampleSelector: selectorOr('[data-motion-sample], [data-scene-sample], [data-state]'), sceneSelector: root.getAttribute('data-scene-selector') || '[data-scene]', activeSelector: root.getAttribute('data-active-selector') || '[data-scene].active', stateAttribute, expectedStates: states(['previous-scene', 'active-scene', 'next-scene', 'final-safe-state']) };
      if (recipe === 'split-text-reveal') return { sampleSelector: selectorOr('[data-motion-sample], [data-split-sample], [data-state]'), accessibleSelector: selectorOr('[data-accessible-text], .sr-only, [aria-label]'), splitSelector: root.getAttribute('data-split-selector') || '[data-split], [data-split-word], [data-split-line]', stateAttribute, expectedStates: states(['unsplit-accessible-text', 'split-ready', 'revealed', 'reduced-motion']) };
      if (recipe === 'horizontal-pin-scroll') return { sampleSelector: selectorOr('[data-motion-sample], [data-horizontal-track], [data-state]'), viewportSelector: root.getAttribute('data-viewport-selector') || '[data-horizontal-viewport], [data-viewport]', pinSelector: root.getAttribute('data-pin-selector') || '[data-horizontal-pin], [data-pin]', trackSelector: root.getAttribute('data-track-selector') || '[data-horizontal-track], [data-track]', stateAttribute, expectedStates: states(['start', 'track-progress', 'end', 'pin-released']), mobileFallbackSelector: root.getAttribute('data-mobile-fallback-selector') || '[data-mobile-fallback]' };
      return {};
    };
    document.querySelectorAll('[role="tablist"]').forEach((root) => {
      const tabs = [...root.querySelectorAll('[role="tab"]')];
      if (tabs.length > 1 && tabs.some((tab) => tab.hasAttribute('aria-controls'))) add(root, 'tabs', 'tabs', [`${tabs.length} role=tab controls with panel references`]);
    });
    document.querySelectorAll('details').forEach((root) => root.querySelector('summary') && add(root, 'accordion', 'accordion', ['native details/summary affordance']));
    for (const recipe of ['dropdown', 'menu-state']) document.querySelectorAll(`[data-interaction-recipe="${recipe}"]`).forEach((root) => {
      const control = root.matches('[aria-expanded]') ? root : root.querySelector('[aria-expanded], button, [role="button"]');
      const panelId = control?.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : root.querySelector('[data-menu-panel], [role="menu"], [role="listbox"], .menu-panel, .dropdown-panel');
      if (control && panel) add(root, recipe, recipe, [`explicit data-interaction-recipe=${recipe}`, 'control and panel selectors are explicit'], 'high', { controlSelector: selectorFor(control), panelSelector: selectorFor(panel), dismissBehavior: ['escape'] }, 'source-annotation');
    });
    document.querySelectorAll('[aria-expanded][aria-controls]').forEach((control) => {
      if (control.closest('[data-interaction-recipe="dropdown"], [data-interaction-recipe="menu-state"]')) return;
      const target = document.getElementById(control.getAttribute('aria-controls'));
      const drawerLike = target && (target.matches('[role="dialog"], [data-drawer], .drawer, nav') || /drawer/i.test(`${control.getAttribute('aria-label')} ${target.className}`));
      if (drawerLike) add(control.closest('[data-interaction-root]') || control.parentElement || control, 'drawer', 'drawer', ['aria-expanded control references a drawer/menu target'], 'high', { controlSelector: selectorFor(control), panelSelector: selectorFor(target), closeOnEscape: true });
      else if (target) add(control.closest('[data-interaction-root]') || control.parentElement || control, 'accordion', 'accordion', ['aria-expanded control references a panel'], 'high', { controlSelector: selectorFor(control), panelSelector: selectorFor(target) });
    });
    document.querySelectorAll('[data-carousel], [data-slider], [aria-roledescription="carousel"], .carousel').forEach((root) => {
      const controls = root.querySelectorAll('button, [data-next], [data-prev]').length;
      const slides = root.querySelectorAll('[data-slide], [role="group"], .slide').length;
      if (controls && slides > 1) add(root, 'carousel', 'carousel-state', [`${slides} repeated slides`, `${controls} navigation controls`]);
    });
    document.querySelectorAll('[data-qa-action="next"], [data-qa-action="prev"], [data-next], [data-prev]').forEach((control) => {
      const root = control.closest('[data-carousel], [data-slider], [aria-roledescription="carousel"], .carousel') || control;
      add(root, 'carousel', 'carousel-state', ['explicit previous/next control marker']);
    });
    document.querySelectorAll('[data-marquee], .marquee').forEach((root) => {
      const track = root.querySelector('[data-marquee-track], .marquee__track');
      const duplicate = root.querySelector('[data-marquee-copy], [aria-hidden="true"]');
      if (track && duplicate) add(root, 'marquee', 'marquee', ['clipped moving track with duplicate content']);
    });
    document.querySelectorAll('[data-hover-contract]').forEach((root) => add(root, 'hover', 'hover-reveal', ['explicit data-hover-contract annotation']));
    const motionAnnotations = [
      ['[data-scroll-story], [data-motion-sample]', 'scroll-story', 'scroll-story'],
      ['[data-scroll-reveal]', 'scroll-reveal', 'scroll-reveal'],
      ['[data-scroll-header]', 'scroll-header-state', 'scroll-header-state'],
      ['[data-pin-scrub]', 'pin-scrub', 'pin-scrub-track'],
      ['[data-scene-transition]', 'scene-transition', 'scene-transition'],
      ['[data-split-text-reveal]', 'split-text-reveal', 'split-text-reveal'],
      ['[data-horizontal-pin-scroll]', 'horizontal-pin-scroll', 'horizontal-pin-scroll'],
      ['[data-parallax]', 'parallax', 'parallax'],
      ['[data-pointer-reactive]', 'pointer-reactive', 'pointer-reactive']
    ];
    motionAnnotations.forEach(([selector, semanticType, recipe]) => document.querySelectorAll(selector).forEach((root) => add(root, semanticType, recipe, [`explicit ${recipe} source annotation`], 'high', annotatedMotionVerification(root, recipe), 'source-annotation')));
    document.querySelectorAll('[data-motion-recipe]').forEach((root) => {
      const recipe = root.getAttribute('data-motion-recipe');
      add(root, root.getAttribute('data-semantic-type') || recipe, recipe, [`explicit data-motion-recipe=${recipe}`], 'high', annotatedMotionVerification(root, recipe), 'source-annotation');
    });
    return found;
  });
  const normalized = candidates.map((candidate, index) => ({
    id: `${candidate.semanticType}-${index + 1}`,
    selector: candidate.selector,
    semanticType: candidate.semanticType,
    intent: candidate.semanticType === 'carousel' ? 'navigate-media' : candidate.semanticType === 'marquee' ? 'continuous-content' : 'change-semantic-state',
    evidence: candidate.evidence,
    provenance: candidate.provenance,
    confidence: candidate.confidence,
    implementation: candidate.confidence === 'high' ? 'required' : candidate.confidence === 'medium' ? 'conservative' : 'skip',
    recipe: candidate.recipe,
    requiredStates: requiredStatesFor(candidate.recipe),
    responsiveBehavior: candidate.semanticType === 'hover' ? 'Essential content remains visible or tap-accessible without hover.' : 'Preserve semantic state and reachable controls at mobile width.',
    reducedMotionBehavior: ['marquee', 'scroll-story'].includes(candidate.semanticType) ? 'Stop continuous/scrub motion and expose a safe readable state.' : 'Preserve state behavior without decorative transition.',
    verification: candidate.verification
  }));
  const actionable = await collectActionableInventory(page);
  const plan = {
    version: 1,
    generatedAt: new Date().toISOString(),
    designMode,
    motionLanguage: designMode === 'design' ? (motionLanguage || { character: 'restrained', pace: 'moderate', preferredFamilies: [], bannedFamilies: ['generic-card-lift', 'all-sections-fade-up'], sectionEntryVariation: 'section intent에 따라 2~4개 family 안에서 변주', pointerUsage: 'semantic affordance가 있는 요소에만 제한', continuousMotionUsage: '희소하게 사용하고 정보 전달을 방해하지 않음', scrollStory: '내용의 순차 이해에 필요한 경우만 사용' }) : null,
    sourceRoot: path.resolve(sourceRoot),
    sourceFingerprint: createSourceFingerprint(sourceRoot),
    candidates: normalized,
    coverage: {
      policy: {
        actionableHover: 'required',
        keyboardFocusVisible: 'required',
        perceptibleStateChange: 'required',
        nativeOrVerifiedClickBehavior: 'required'
      },
      actionable
    }
  };
  const result = validateInteractionPlan(plan);
  if (!result.valid) throw new Error(result.errors.join('; '));
  return plan;
}

export function readInteractionPlan(file) {
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = validateInteractionPlan(plan);
  if (!result.valid) throw new Error(result.errors.join('; '));
  return plan;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.validate) {
    const plan = JSON.parse(fs.readFileSync(path.resolve(args.validate), 'utf8'));
    const result = validateInteractionPlan(plan); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); process.exitCode = result.valid ? 0 : 1; return;
  }
  if (!args.url) throw new Error('Missing required argument --url');
  const output = path.resolve(args.output || 'work/interaction-plan.json');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: Number(args.width || 1440), height: Number(args.height || 900) } });
    const page = await context.newPage(); await page.goto(fileUrl(args.url), { waitUntil: 'load' });
    const plan = await discoverInteractionPlan(page, { designMode: args.mode || 'reference', sourceRoot: args['source-root'] || process.cwd() });
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(plan, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ output, candidateCount: plan.candidates.length, mode: plan.designMode }, null, 2)}\n`);
    await context.close();
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
