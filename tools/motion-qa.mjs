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

async function sampleScrollStates(page, candidate) {
  const range = await page.evaluate((candidate) => {
    const root = document.querySelector(candidate.selector);
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    const start = rect.top + scrollY;
    const configured = Number(candidate.verification?.scrollRange || 0);
    const distance = configured > 0 ? configured : Math.max(innerHeight, root.scrollHeight - innerHeight, rect.height - innerHeight);
    return { start, distance: Math.max(1, distance), documentHeight: document.documentElement.scrollHeight, maxScroll: Math.max(0, document.documentElement.scrollHeight - innerHeight) };
  }, candidate);
  if (!range) return null;
  const samples = [];
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate(({ y }) => window.scrollTo(0, y), { y: range.start + range.distance * progress }); await settle(page);
    samples.push(await page.evaluate(({ candidate, progress }) => {
      const root = document.querySelector(candidate.selector);
      const verification = candidate.verification || {};
      const sample = document.querySelector(verification.sampleSelector || candidate.selector);
      const stateNode = document.querySelector(verification.stateSelector || verification.sampleSelector || candidate.selector);
      const state = stateNode?.getAttribute(verification.stateAttribute || 'data-state') || stateNode?.getAttribute('data-progress') || null;
      const essential = verification.essentialSelector ? document.querySelector(verification.essentialSelector) : sample;
      const track = verification.trackSelector ? document.querySelector(verification.trackSelector) : null;
      const viewport = verification.viewportSelector ? document.querySelector(verification.viewportSelector) : null;
      const pin = verification.pinSelector ? document.querySelector(verification.pinSelector) : null;
      const sceneNodes = verification.sceneSelector ? [...document.querySelectorAll(verification.sceneSelector)] : [];
      const activeNodes = verification.activeSelector ? [...document.querySelectorAll(verification.activeSelector)] : [];
      const rect = sample?.getBoundingClientRect(); const essentialRect = essential?.getBoundingClientRect();
      const style = sample ? getComputedStyle(sample) : null; const essentialStyle = essential ? getComputedStyle(essential) : null;
      return {
        progress, state, className: sample?.className || '', text: sample?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200) || null,
        rect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) } : null,
        transform: style?.transform || null, opacity: style?.opacity || null,
        essentialVisible: Boolean(essential && !essential.hidden && essentialRect.width > 0 && essentialRect.height > 0 && essentialStyle.display !== 'none' && essentialStyle.visibility !== 'hidden' && Number(essentialStyle.opacity) !== 0),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        pinPosition: pin ? getComputedStyle(pin).position : null,
        trackX: track?.getBoundingClientRect().x ?? null,
        trackScrollWidth: track?.scrollWidth ?? null,
        viewportWidth: viewport?.clientWidth ?? null,
        sceneCount: sceneNodes.length,
        activeSceneCount: activeNodes.length,
        activeSceneIds: activeNodes.map((node) => node.id || node.getAttribute('data-scene') || node.textContent?.trim().slice(0, 40) || null)
      };
    }, { candidate, progress }));
  }
  return { range, samples };
}

function coverage(samples, expectedStates) {
  const observedStates = samples.map((sample) => sample.state).filter(Boolean).map(String);
  return { expectedStates, observedStates, missingStates: expectedStates.filter((state) => !observedStates.includes(String(state))), complete: expectedStates.every((state) => observedStates.includes(String(state))) };
}

function scrollFailure(evidence, fallback) {
  if (!evidence.triggerReachable) return 'Scroll trigger is not reachable within the document.';
  if (!evidence.stateCoverage.complete) return `Required states were not observed: ${evidence.stateCoverage.missingStates.join(', ')}.`;
  if (!evidence.meaningfulProgression) return 'Samples changed visually without the required semantic state progression.';
  if (!evidence.pinReleased) return 'Pinned state did not release at the final sample.';
  if (!evidence.finalSafe) return 'Final state hides essential content or leaves horizontal overflow.';
  return fallback;
}

async function withRuntimeErrors(page, verifier) {
  const errors = []; const onPageError = (error) => errors.push(error.message); const onConsole = (message) => { if (message.type() === 'error') errors.push(message.text()); };
  page.on('pageerror', onPageError); page.on('console', onConsole);
  try {
    const result = await verifier();
    return errors.length ? { ...result, status: 'FAIL', runtimeErrors: errors, failureReason: `Runtime error: ${errors.join('; ')}` } : { ...result, runtimeErrors: errors };
  } finally { page.off('pageerror', onPageError); page.off('console', onConsole); }
}

async function inspectPinScrub(page, candidate) {
  const sampled = await sampleScrollStates(page, candidate);
  if (!sampled) return { status: 'FAIL', samples: [], runtimeErrors: [], failureReason: `Selector not found: ${candidate.selector}` };
  const normalStates = candidate.verification.expectedStates;
  const stateCoverage = coverage(sampled.samples, normalStates);
  const distinctStates = new Set(sampled.samples.map((sample) => sample.state).filter(Boolean)).size;
  const final = sampled.samples.at(-1);
  const evidence = { triggerReachable: sampled.range.start <= sampled.range.maxScroll, stateCoverage, meaningfulProgression: distinctStates >= 3, finalSafe: final.essentialVisible && !final.pageOverflow, pinReleased: !['fixed', 'sticky'].includes(final.pinPosition), sampleProgress: sampled.samples.map((sample) => sample.progress) };
  const pass = evidence.triggerReachable && stateCoverage.complete && evidence.meaningfulProgression && evidence.finalSafe && evidence.pinReleased;
  return { status: pass ? 'PASS' : 'FAIL', samples: sampled.samples, evidence, failureReason: pass ? null : scrollFailure(evidence, 'Pin/scrub contract failed.') };
}

async function inspectSceneTransition(page, candidate) {
  const sampled = await sampleScrollStates(page, candidate);
  if (!sampled) return { status: 'FAIL', samples: [], runtimeErrors: [], failureReason: `Selector not found: ${candidate.selector}` };
  const normalStates = candidate.verification.expectedStates;
  const stateCoverage = coverage(sampled.samples, normalStates);
  const activeIds = sampled.samples.flatMap((sample) => sample.activeSceneIds);
  const distinctActiveScenes = new Set(activeIds.filter(Boolean)).size;
  const oneActiveAtATime = sampled.samples.every((sample) => sample.activeSceneCount === 1);
  const final = sampled.samples.at(-1);
  const evidence = { triggerReachable: sampled.range.start <= sampled.range.maxScroll, stateCoverage, distinctActiveScenes, oneActiveAtATime, meaningfulProgression: distinctActiveScenes >= 3 && oneActiveAtATime, finalSafe: final.essentialVisible && !final.pageOverflow && final.state === normalStates.at(-1), pinReleased: !['fixed', 'sticky'].includes(final.pinPosition) };
  const pass = evidence.triggerReachable && stateCoverage.complete && evidence.meaningfulProgression && evidence.finalSafe;
  return { status: pass ? 'PASS' : 'FAIL', samples: sampled.samples, evidence, failureReason: pass ? null : scrollFailure(evidence, 'Scene transition did not prove previous/active/next/final-safe progression.') };
}

async function inspectSplitText(page, candidate) {
  await page.evaluate(() => document.fonts?.ready || Promise.resolve());
  const sampled = await sampleScrollStates(page, candidate);
  if (!sampled) return { status: 'FAIL', samples: [], runtimeErrors: [], failureReason: `Selector not found: ${candidate.selector}` };
  const normalStates = candidate.verification.expectedStates.filter((state) => state !== patternForCandidate(candidate).verification.reducedState);
  const stateCoverage = coverage(sampled.samples, normalStates);
  const readTextContract = () => page.evaluate((candidate) => {
    const verification = candidate.verification || {}; const accessible = document.querySelector(verification.accessibleSelector); const split = [...document.querySelectorAll(verification.splitSelector)];
    const text = accessible?.getAttribute('aria-label') || accessible?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const splitText = split.map((node) => node.textContent || '').join('').replace(/\s+/g, ' ').trim();
    const duplicateAnnouncements = split.some((node) => node !== accessible && node.getAttribute('aria-hidden') !== 'true' && node.getAttribute('role') !== 'presentation');
    const normalize = (value) => value.replace(/\s+/g, '').toLocaleLowerCase();
    return { accessibleExists: Boolean(accessible), text, splitCount: split.length, splitText, textMatches: Boolean(text && splitText && normalize(text) === normalize(splitText)), duplicateAnnouncements, fontStatus: document.fonts?.status || 'unknown', finalVisible: split.some((node) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; }) };
  }, candidate);
  await page.evaluate((y) => window.scrollTo(0, y), sampled.range.start); await settle(page);
  const beforeTextContract = await readTextContract();
  await page.evaluate((y) => window.scrollTo(0, y), sampled.range.start + sampled.range.distance); await settle(page);
  const afterTextContract = await readTextContract();
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: Math.max(320, Math.round(originalViewport.width * 0.8)), height: originalViewport.height }); await settle(page);
  const responsiveContract = await page.evaluate((candidate) => {
    const accessible = document.querySelector(candidate.verification.accessibleSelector); const split = [...document.querySelectorAll(candidate.verification.splitSelector)];
    return { accessibleVisibleOrPresent: Boolean(accessible && (accessible.textContent || accessible.getAttribute('aria-label'))), splitVisible: split.some((node) => { const rect = node.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; }), pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  }, candidate);
  await page.setViewportSize(originalViewport); await settle(page);
  const final = sampled.samples.at(-1);
  const evidence = { triggerReachable: sampled.range.start <= sampled.range.maxScroll, stateCoverage, meaningfulProgression: stateCoverage.complete, finalSafe: final.essentialVisible && afterTextContract.finalVisible && Boolean(afterTextContract.text), pinReleased: true, accessibleText: { before: beforeTextContract, after: afterTextContract }, fontStable: afterTextContract.fontStatus === 'loaded', responsiveContract };
  const pass = evidence.triggerReachable && stateCoverage.complete && evidence.finalSafe && beforeTextContract.accessibleExists && beforeTextContract.textMatches && afterTextContract.accessibleExists && afterTextContract.textMatches && !afterTextContract.duplicateAnnouncements && evidence.fontStable && responsiveContract.accessibleVisibleOrPresent && responsiveContract.splitVisible && !responsiveContract.pageOverflow;
  return { status: pass ? 'PASS' : 'FAIL', samples: sampled.samples, evidence, failureReason: pass ? null : !afterTextContract.accessibleExists || !afterTextContract.text ? 'Accessible original text is missing.' : !beforeTextContract.textMatches || !afterTextContract.textMatches ? 'Split text does not match the accessible original text.' : afterTextContract.duplicateAnnouncements ? 'Split text duplicates accessible announcements.' : !evidence.fontStable ? 'Font loading was not stable before measurement.' : scrollFailure(evidence, 'Split-text reveal contract failed.') };
}

async function inspectHorizontalMobile(page, candidate) {
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload({ waitUntil: 'load' }); await settle(page);
  const result = await page.evaluate((candidate) => {
    const fallback = document.querySelector(candidate.verification.mobileFallbackSelector); const rect = fallback?.getBoundingClientRect(); const style = fallback ? getComputedStyle(fallback) : null;
    return { fallbackExists: Boolean(fallback), fallbackVisible: Boolean(fallback && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'), pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  }, candidate);
  await page.setViewportSize(originalViewport); await page.reload({ waitUntil: 'load' }); await settle(page);
  return { ...result, safe: result.fallbackExists && result.fallbackVisible && !result.pageOverflow };
}

async function inspectHorizontalResize(page, candidate) {
  const originalViewport = page.viewportSize();
  await page.setViewportSize({ width: Math.max(600, Math.round(originalViewport.width * 0.8)), height: originalViewport.height }); await page.reload({ waitUntil: 'load' }); await settle(page);
  const sampled = await sampleScrollStates(page, candidate);
  const first = sampled?.samples?.[0]; const final = sampled?.samples?.at(-1); const availableDistance = Math.max(0, (first?.trackScrollWidth || 0) - (first?.viewportWidth || 0));
  const movement = first && final && first.trackX !== null && final.trackX !== null ? Math.abs(final.trackX - first.trackX) : 0;
  const safe = Boolean(sampled && availableDistance > 0 && movement >= Math.min(availableDistance, Math.max(8, (first.viewportWidth || 0) * 0.25)) && movement <= availableDistance * 1.15 + 8 && sampled.samples.every((sample) => !sample.pageOverflow));
  await page.setViewportSize(originalViewport); await page.reload({ waitUntil: 'load' }); await settle(page);
  return { safe, availableDistance, movement, pageOverflow: sampled?.samples?.some((sample) => sample.pageOverflow) || false };
}

async function inspectHorizontalPin(page, candidate) {
  const sampled = await sampleScrollStates(page, candidate);
  if (!sampled) return { status: 'FAIL', samples: [], runtimeErrors: [], failureReason: `Selector not found: ${candidate.selector}` };
  const normalStates = candidate.verification.expectedStates;
  const stateCoverage = coverage(sampled.samples, normalStates);
  const first = sampled.samples[0]; const final = sampled.samples.at(-1); const availableDistance = Math.max(0, (first.trackScrollWidth || 0) - (first.viewportWidth || 0));
  const movement = first.trackX !== null && final.trackX !== null ? Math.abs(final.trackX - first.trackX) : 0;
  const movementWithinContract = availableDistance > 0 && movement >= Math.min(availableDistance, Math.max(8, (first.viewportWidth || 0) * 0.25)) && movement <= availableDistance * 1.15 + 8;
  const evidence = { triggerReachable: sampled.range.start <= sampled.range.maxScroll, stateCoverage, meaningfulProgression: stateCoverage.complete && movementWithinContract, trackExists: availableDistance > 0, availableDistance, movement, movementWithinContract, finalSafe: final.essentialVisible && !final.pageOverflow, pinReleased: !['fixed', 'sticky'].includes(final.pinPosition), documentOverflowFree: sampled.samples.every((sample) => !sample.pageOverflow) };
  const pass = evidence.triggerReachable && stateCoverage.complete && evidence.meaningfulProgression && evidence.finalSafe && evidence.pinReleased && evidence.documentOverflowFree;
  return { status: pass ? 'PASS' : 'FAIL', samples: sampled.samples, evidence, failureReason: pass ? null : !evidence.trackExists ? 'Horizontal track/viewport distance is not measurable.' : !evidence.movementWithinContract ? 'Track movement does not match the available horizontal distance.' : scrollFailure(evidence, 'Horizontal pin-scroll contract failed.') };
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
      } else if (candidate.recipe === 'pin-scrub-track') {
        const result = await withRuntimeErrors(page, () => inspectPinScrub(page, candidate));
        const reducedContext = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); const reducedPage = await reducedContext.newPage(); await reducedPage.goto(fileUrl(url), { waitUntil: 'load' });
        const reducedMotion = await inspectReducedScroll(reducedPage, candidate); await reducedContext.close();
        const status = result.status === 'PASS' && reducedMotion.safe ? 'PASS' : 'FAIL';
        checks.push({ candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, ...result, status, reducedMotion, failureReason: status === 'PASS' ? null : result.failureReason || 'Reduced-motion mode does not expose a safe pin state.' });
      } else if (candidate.recipe === 'scene-transition') {
        const result = await withRuntimeErrors(page, () => inspectSceneTransition(page, candidate));
        const reducedContext = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); const reducedPage = await reducedContext.newPage(); await reducedPage.goto(fileUrl(url), { waitUntil: 'load' });
        const reducedMotion = await inspectReducedScroll(reducedPage, candidate); await reducedContext.close();
        const status = result.status === 'PASS' && reducedMotion.safe ? 'PASS' : 'FAIL';
        checks.push({ candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, ...result, status, reducedMotion, failureReason: status === 'PASS' ? null : result.failureReason || 'Reduced-motion mode does not expose a safe scene state.' });
      } else if (candidate.recipe === 'split-text-reveal') {
        const result = await withRuntimeErrors(page, () => inspectSplitText(page, candidate));
        const reducedContext = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); const reducedPage = await reducedContext.newPage(); await reducedPage.goto(fileUrl(url), { waitUntil: 'load' });
        const reducedMotion = await inspectReducedScroll(reducedPage, candidate); await reducedContext.close();
        const status = result.status === 'PASS' && reducedMotion.safe ? 'PASS' : 'FAIL';
        checks.push({ candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, ...result, status, reducedMotion, failureReason: status === 'PASS' ? null : result.failureReason || 'Reduced-motion mode does not expose a safe split-text state.' });
      } else if (candidate.recipe === 'horizontal-pin-scroll') {
        const result = await withRuntimeErrors(page, async () => { const inspected = await inspectHorizontalPin(page, candidate); const resize = await inspectHorizontalResize(page, candidate); const mobile = await inspectHorizontalMobile(page, candidate); return { ...inspected, resize, mobile }; }); const mobile = result.mobile; const resize = result.resize;
        const reducedContext = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' }); const reducedPage = await reducedContext.newPage(); await reducedPage.goto(fileUrl(url), { waitUntil: 'load' });
        const reducedMotion = await inspectReducedScroll(reducedPage, candidate); await reducedContext.close();
        if (result.evidence) { result.evidence.mobile = mobile; result.evidence.resize = resize; } const status = result.status === 'PASS' && resize.safe && mobile.safe && reducedMotion.safe ? 'PASS' : 'FAIL';
        const failureReason = result.failureReason || (!resize.safe ? 'Resize changed the horizontal distance contract or left overflow.' : !mobile.safe ? 'Mobile fallback is missing or unsafe.' : 'Reduced-motion mode does not expose a safe horizontal state.');
        checks.push({ candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, ...result, status, resize, mobile, reducedMotion, failureReason: status === 'PASS' ? null : failureReason });
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
