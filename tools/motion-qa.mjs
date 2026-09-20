import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createSourceFingerprint } from './source-fingerprint.mjs';
import { readInteractionPlan } from './interaction-plan.mjs';
import { INTERACTION_CATEGORIES, patternForCandidate } from './interaction-patterns.mjs';

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
const settle = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function inspectMarquee(page, candidate) {
  return page.evaluate((candidate) => {
    const root = document.querySelector(candidate.selector);
    if (!root) return { status: 'FAIL', failureReason: `Selector not found: ${candidate.selector}` };
    const track = root.querySelector(candidate.verification?.trackSelector || '[data-marquee-track], .marquee__track');
    const original = root.querySelector(candidate.verification?.originalSelector || '[data-marquee-original], .marquee__original') || track?.firstElementChild;
    const duplicate = root.querySelector(candidate.verification?.duplicateSelector || '[data-marquee-copy], .marquee__copy, [aria-hidden="true"]');
    const style = track ? getComputedStyle(track) : null;
    const rootStyle = getComputedStyle(root);
    const duplicateHidden = duplicate?.getAttribute('aria-hidden') === 'true';
    const duplicateControls = duplicate?.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').length || 0;
    const moving = Boolean(track && style.animationName !== 'none' && Number.parseFloat(style.animationDuration) > 0);
    const enoughContent = Boolean(track && original && duplicate && track.scrollWidth >= root.clientWidth * 2);
    const clipped = ['hidden', 'clip'].includes(rootStyle.overflowX) || ['hidden', 'clip'].includes(rootStyle.overflow);
    const pageOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const pass = Boolean(track && original && duplicate && duplicateHidden && duplicateControls === 0 && moving && enoughContent && clipped && !pageOverflow);
    return {
      status: pass ? 'PASS' : 'FAIL',
      evidence: { track: Boolean(track), original: Boolean(original), duplicate: Boolean(duplicate), duplicateHidden, duplicateControls, moving, enoughContent, clipped, pageOverflow, trackWidth: track?.scrollWidth || 0, viewportWidth: root.clientWidth },
      failureReason: pass ? null : 'Marquee requires a moving track, complete duplicated content hidden from accessibility, clipping, seamless width, and no page overflow.'
    };
  }, candidate);
}

async function inspectReducedMotion(page, candidate) {
  return page.evaluate((candidate) => {
    const root = document.querySelector(candidate.selector);
    if (!root) return { safe: false, reason: 'Candidate root not found.' };
    const track = root.querySelector(candidate.verification?.trackSelector || '[data-marquee-track], .marquee__track') || root;
    const style = getComputedStyle(track);
    const essential = candidate.verification?.essentialSelector ? document.querySelector(candidate.verification.essentialSelector) : root;
    const essentialStyle = getComputedStyle(essential);
    const rect = essential.getBoundingClientRect();
    const visible = !essential.hidden && rect.width > 0 && rect.height > 0 && essentialStyle.display !== 'none' && essentialStyle.visibility !== 'hidden' && Number(essentialStyle.opacity) !== 0;
    const stopped = style.animationName === 'none' || style.animationPlayState === 'paused' || Number.parseFloat(style.animationDuration) === 0;
    return { safe: stopped && visible, stopped, essentialVisible: visible, animationName: style.animationName, animationPlayState: style.animationPlayState };
  }, candidate);
}

async function inspectReducedScroll(page, candidate) {
  const range = await page.evaluate((candidate) => {
    const root = document.querySelector(candidate.selector); if (!root) return null;
    return { start: root.getBoundingClientRect().top + scrollY, distance: Math.max(1, Number(candidate.verification?.scrollRange || 0) || root.scrollHeight - innerHeight || root.getBoundingClientRect().height - innerHeight) };
  }, candidate);
  if (!range) return { safe: false, reason: 'Candidate root not found.' };
  const states = [];
  for (const y of [range.start, range.start + range.distance]) {
    await page.evaluate((nextY) => scrollTo(0, nextY), y); await settle(page);
    states.push(await page.evaluate((candidate) => {
      const sample = document.querySelector(candidate.verification?.sampleSelector || candidate.selector);
      const essential = candidate.verification?.essentialSelector ? document.querySelector(candidate.verification.essentialSelector) : sample;
      const style = getComputedStyle(sample); const essentialStyle = getComputedStyle(essential); const rect = essential.getBoundingClientRect();
      return { transform: style.transform, opacity: style.opacity, essentialVisible: !essential.hidden && rect.width > 0 && rect.height > 0 && essentialStyle.display !== 'none' && essentialStyle.visibility !== 'hidden' && Number(essentialStyle.opacity) !== 0 };
    }, candidate));
  }
  return { safe: states.every((state) => state.essentialVisible) && JSON.stringify(states[0]) === JSON.stringify(states[1]), states };
}

async function inspectScrollStory(page, candidate) {
  const errors = [];
  const onPageError = (error) => errors.push(error.message);
  const onConsole = (message) => { if (message.type() === 'error') errors.push(message.text()); };
  page.on('pageerror', onPageError); page.on('console', onConsole);
  try {
    const range = await page.evaluate((candidate) => {
      const root = document.querySelector(candidate.selector);
      if (!root) return null;
      const rect = root.getBoundingClientRect();
      const start = rect.top + scrollY;
      const configured = Number(candidate.verification?.scrollRange || 0);
      const distance = configured > 0 ? configured : Math.max(innerHeight, root.scrollHeight - innerHeight, rect.height - innerHeight);
      return { start, distance: Math.max(1, distance), documentHeight: document.documentElement.scrollHeight };
    }, candidate);
    if (!range) return { status: 'FAIL', failureReason: `Selector not found: ${candidate.selector}`, samples: [], runtimeErrors: errors };
    const samples = [];
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate(({ y }) => window.scrollTo(0, y), { y: range.start + range.distance * progress }); await settle(page);
      samples.push(await page.evaluate(({ candidate, progress }) => {
        const root = document.querySelector(candidate.selector);
        const sample = document.querySelector(candidate.verification?.sampleSelector || candidate.selector);
        const essential = candidate.verification?.essentialSelector ? document.querySelector(candidate.verification.essentialSelector) : sample;
        if (!sample || !essential) return { progress, missing: true, essentialVisible: false, pageOverflow: false, pinPosition: null };
        const style = getComputedStyle(sample); const rect = sample.getBoundingClientRect(); const essentialStyle = getComputedStyle(essential); const essentialRect = essential.getBoundingClientRect();
        return {
          progress,
          state: sample.getAttribute(candidate.verification?.progressAttribute || 'data-progress') || sample.getAttribute('data-state') || null,
          className: sample.className || '', opacity: style.opacity, transform: style.transform,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          essentialVisible: !essential.hidden && essentialRect.width > 0 && essentialRect.height > 0 && essentialStyle.display !== 'none' && essentialStyle.visibility !== 'hidden' && Number(essentialStyle.opacity) !== 0,
          pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          pinPosition: candidate.verification?.pinSelector ? getComputedStyle(document.querySelector(candidate.verification.pinSelector)).position : null
        };
      }, { candidate, progress }));
    }
    const signatures = samples.map((sample) => JSON.stringify({ state: sample.state, className: sample.className, opacity: sample.opacity, transform: sample.transform, rect: sample.rect }));
    const changed = new Set(signatures).size >= 3;
    const finalSafe = samples.at(-1).essentialVisible && !samples.at(-1).pageOverflow;
    const pinReleased = !candidate.verification?.pinSelector || !['fixed', 'sticky'].includes(samples.at(-1).pinPosition);
    const expectedStates = candidate.verification?.expectedStates || [];
    const observedStates = samples.map((sample) => sample.state).filter((state) => state !== null && state !== undefined).map(String);
    const expectedStatesCovered = expectedStates.length === 0 || expectedStates.every((expected) => observedStates.includes(String(expected)));
    const pass = errors.length === 0 && changed && finalSafe && pinReleased && expectedStatesCovered;
    return { status: pass ? 'PASS' : 'FAIL', samples, runtimeErrors: errors, evidence: { triggerReachable: range.start <= range.documentHeight, changed, finalSafe, pinReleased, expectedStates, observedStates, expectedStatesCovered }, failureReason: pass ? null : errors.length ? `Runtime error: ${errors.join('; ')}` : !changed ? 'Start, intermediate, and final samples did not produce distinct states.' : !finalSafe ? 'Final state hides essential content or leaves horizontal overflow.' : !pinReleased ? 'Pinned state did not release at the final sample.' : 'Configured expected states were not all observed.' };
  } finally {
    page.off('pageerror', onPageError); page.off('console', onConsole);
  }
}

export async function runMotionQa({ url, output, planPath, sourceRoot = process.cwd(), width = 1440, height = 900 }) {
  const plan = readInteractionPlan(planPath);
  const candidates = plan.candidates.filter((candidate) => candidate.implementation !== 'skip' && patternForCandidate(candidate)?.verifier === 'motion-qa');
  const browser = await chromium.launch({ headless: true }); const checks = [];
  try {
    const context = await browser.newContext({ viewport: { width, height } }); const page = await context.newPage(); await page.goto(fileUrl(url), { waitUntil: 'load' });
    for (const candidate of candidates) {
      const route = patternForCandidate(candidate);
      const routing = { category: route.category, verifier: route.verifier, automation: route.automation, layer: route.layer };
      if (candidate.recipe === 'marquee') {
        const result = await inspectMarquee(page, candidate);
        const reducedContext = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); const reducedPage = await reducedContext.newPage(); await reducedPage.goto(fileUrl(url), { waitUntil: 'load' });
        const reducedMotion = await inspectReducedMotion(reducedPage, candidate); await reducedContext.close();
        const status = result.status === 'PASS' && reducedMotion.safe ? 'PASS' : 'FAIL';
        checks.push({ candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, ...result, status, reducedMotion, failureReason: status === 'PASS' ? null : result.failureReason || 'Reduced-motion mode does not stop motion while preserving essential content.' });
      } else if (route.category === INTERACTION_CATEGORIES.SCROLL_MOTION && route.automation === 'contract' && candidate.verification?.sampleSelector) {
        const result = await inspectScrollStory(page, candidate);
        const reducedContext = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); const reducedPage = await reducedContext.newPage(); await reducedPage.goto(fileUrl(url), { waitUntil: 'load' });
        const reducedMotion = await inspectReducedScroll(reducedPage, candidate); await reducedContext.close();
        const status = result.status === 'PASS' && reducedMotion.safe ? 'PASS' : 'FAIL';
        checks.push({ candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, ...result, status, reducedMotion, failureReason: status === 'PASS' ? null : result.failureReason || 'Reduced-motion mode does not expose a stable safe state.' });
      } else {
        checks.push({ candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, status: 'DEFERRED', samples: [], evidence: { clicked: false, verifier: 'motion-qa' }, failureReason: route.automation === 'contract' ? 'A deterministic motion sample contract is required before this recipe can be verified.' : `Automated verification for ${candidate.recipe} is deferred.` });
      }
    }
    await context.close();
  } finally { await browser.close(); }
  const failures = checks.filter((check) => check.status === 'FAIL');
  const deferred = checks.filter((check) => check.status === 'DEFERRED');
  const report = {
    generatedAt: new Date().toISOString(), sourceRoot: path.resolve(sourceRoot), sourceFingerprint: createSourceFingerprint(sourceRoot), plan: path.resolve(planPath),
    required: candidates.length > 0, status: failures.length ? 'FAIL' : deferred.length ? 'DEFERRED' : candidates.length ? 'PASS' : 'NOT_REQUIRED', checks,
    deferredReasons: deferred.map((check) => `${check.candidateId}: ${check.failureReason}`),
    failureReasons: failures.map((failure) => `${failure.candidateId}: ${failure.failureReason}`)
  };
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`); return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || !args.plan) throw new Error('Both --url and --plan are required.');
  const report = await runMotionQa({ url: args.url, planPath: path.resolve(args.plan), output: path.resolve(args.output || 'qa/motion-report.json'), sourceRoot: args['source-root'] || process.cwd(), width: Number(args.width || 1440), height: Number(args.height || 900) });
  process.exitCode = ['PASS', 'NOT_REQUIRED'].includes(report.status) ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
