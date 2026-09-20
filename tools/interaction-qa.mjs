import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createSourceFingerprint } from './source-fingerprint.mjs';
import { discoverInteractionPlan, readInteractionPlan } from './interaction-plan.mjs';
import { patternForCandidate } from './interaction-patterns.mjs';

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
const waitFrame = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function snapshot(page, candidate) {
  return page.evaluate(({ candidate }) => {
    const root = document.querySelector(candidate.selector);
    if (!root) return { missing: true };
    const visible = (node) => {
      if (!node || node.hidden) return false;
      const closedDetails = node.closest('details:not([open])');
      if (closedDetails && node !== closedDetails.querySelector('summary') && !node.closest('summary')) return false;
      const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    };
    const globalOrRoot = (selector) => selector ? (root.querySelector(selector) || document.querySelector(selector)) : null;
    const controlSelector = 'button, a, summary, [role="button"], [role="tab"], [aria-expanded]';
    const controls = [...(root.matches(controlSelector) ? [root] : []), ...root.querySelectorAll(controlSelector)];
    const state = {
      root: { className: root.className || '', visible: visible(root), text: (root.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) },
      controls: controls.map((node) => ({ text: (node.textContent || node.getAttribute('aria-label') || '').trim(), selected: node.getAttribute('aria-selected'), expanded: node.getAttribute('aria-expanded'), current: node.getAttribute('aria-current'), className: node.className || '' }))
    };
    if (candidate.semanticType === 'tabs') {
      const tabs = [...root.querySelectorAll('[role="tab"]')];
      state.tabs = tabs.map((tab, index) => {
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        return { index, selected: tab.getAttribute('aria-selected') === 'true', panelId: panel?.id || null, panelVisible: visible(panel) };
      });
    }
    if (candidate.semanticType === 'accordion') {
      const details = candidate.verification?.controlSelector ? null : (root.matches('details') ? root : root.querySelector('details'));
      const control = globalOrRoot(candidate.verification?.controlSelector) || root.querySelector('summary, [aria-expanded]') || (root.matches('[aria-expanded]') ? root : null);
      const panelId = candidate.verification?.panelSelector || control?.getAttribute('aria-controls');
      const panel = panelId ? (panelId.startsWith('#') ? document.querySelector(panelId) : document.getElementById(panelId)) : details?.querySelector(':scope > :not(summary)');
      state.accordion = { expanded: details ? details.open : control?.getAttribute('aria-expanded') === 'true', panelVisible: visible(panel), open: details?.open ?? null };
    }
    if (candidate.semanticType === 'drawer') {
      const control = globalOrRoot(candidate.verification?.controlSelector) || root.querySelector('[aria-expanded]') || (root.matches('[aria-expanded]') ? root : null);
      const selector = candidate.verification?.panelSelector || (control?.getAttribute('aria-controls') ? `#${CSS.escape(control.getAttribute('aria-controls'))}` : null);
      const panel = globalOrRoot(selector);
      state.drawer = { expanded: control?.getAttribute('aria-expanded') === 'true', panelVisible: visible(panel), activeElement: document.activeElement?.id || document.activeElement?.tagName?.toLowerCase() || null, focusInsidePanel: Boolean(panel?.contains(document.activeElement)) };
    }
    if (['dropdown', 'menu-state'].includes(candidate.semanticType)) {
      const control = globalOrRoot(candidate.verification?.controlSelector) || (root.matches('[aria-expanded]') ? root : root.querySelector('[aria-expanded]'));
      const panel = globalOrRoot(candidate.verification?.panelSelector || (control?.getAttribute('aria-controls') ? `#${CSS.escape(control.getAttribute('aria-controls'))}` : null));
      const expanded = control?.getAttribute('aria-expanded');
      const toggle = { controlExists: Boolean(control), panelExists: Boolean(panel), expanded: expanded === null ? null : expanded === 'true', panelVisible: visible(panel), className: root.className || '', active: root.matches('.active, [data-active="true"]') || Boolean(root.querySelector('.active, [data-active="true"]')) };
      state[candidate.semanticType === 'dropdown' ? 'dropdown' : 'menuState'] = toggle;
    }
    if (candidate.semanticType === 'carousel') {
      const slides = [...root.querySelectorAll('[data-slide], .slide, [role="group"]')];
      const active = slides.map((slide, index) => ({ index, active: slide.dataset.active === 'true' || slide.classList.contains('active') || slide.getAttribute('aria-hidden') === 'false' || slide.getAttribute('aria-current') === 'true', visible: visible(slide) }));
      const explicitActive = active.filter((item) => item.active).map((item) => item.index);
      const activeIndexes = explicitActive.length ? explicitActive : active.filter((item) => item.visible).map((item) => item.index);
      const currentNode = root.querySelector('[data-current]');
      const totalNode = root.querySelector('[data-total]');
      const pagination = [...root.querySelectorAll('[data-page], [data-pagination] button, [role="tab"]')];
      const paginationIndex = pagination.findIndex((node) => node.getAttribute('aria-current') === 'true' || node.getAttribute('aria-selected') === 'true' || node.classList.contains('active') || node.dataset.active === 'true');
      const progress = root.querySelector('[role="progressbar"], [data-progress]');
      const progressValue = progress?.hasAttribute('aria-valuenow') ? Number(progress.getAttribute('aria-valuenow')) : null;
      const progressMax = progress?.hasAttribute('aria-valuemax') ? Number(progress.getAttribute('aria-valuemax')) : null;
      const progressPercent = progress && progressValue === null ? Number.parseFloat(progress.style.width || getComputedStyle(progress).width) : null;
      const thumb = [...root.querySelectorAll('[data-thumbnail]')];
      state.carousel = {
        slideCount: slides.length,
        activeIndexes,
        current: currentNode ? Number.parseInt(currentNode.textContent, 10) : null,
        total: totalNode ? Number.parseInt(totalNode.textContent, 10) : null,
        paginationCount: pagination.length,
        paginationIndex,
        progressValue,
        progressMax,
        progressPercent,
        thumbnailIndex: thumb.findIndex((node) => node.getAttribute('aria-current') === 'true' || node.classList.contains('active') || node.dataset.active === 'true')
      };
    }
    if (candidate.semanticType === 'hover') {
      const target = globalOrRoot(candidate.verification?.stateSelector) || root;
      const essential = globalOrRoot(candidate.verification?.essentialSelector);
      const style = getComputedStyle(target);
      state.hover = { className: target.className || '', opacity: style.opacity, transform: style.transform, color: style.color, backgroundColor: style.backgroundColor, essentialVisible: essential ? visible(essential) : null };
    }
    return state;
  }, { candidate });
}

function tabValid(state) {
  if (!state?.tabs?.length) return false;
  const selected = state.tabs.filter((item) => item.selected).map((item) => item.index);
  const visible = state.tabs.filter((item) => item.panelVisible).map((item) => item.index);
  return selected.length === 1 && visible.length === 1 && selected[0] === visible[0];
}

function accordionValid(state) {
  return Boolean(state?.accordion) && state.accordion.expanded === state.accordion.panelVisible;
}

function toggleValid(state) {
  const value = state?.dropdown || state?.menuState;
  return Boolean(value?.controlExists && value.panelExists && value.expanded !== null && value.expanded === value.panelVisible);
}

function carouselValid(state) {
  const value = state?.carousel;
  if (!value || value.activeIndexes.length !== 1) return false;
  const oneBased = value.activeIndexes[0] + 1;
  if (value.current !== null && value.current !== oneBased) return false;
  if (value.total !== null && value.total !== value.slideCount) return false;
  if (value.paginationCount > 0 && value.paginationIndex !== value.activeIndexes[0]) return false;
  if (value.thumbnailIndex >= 0 && value.thumbnailIndex !== value.activeIndexes[0]) return false;
  if (value.progressValue !== null && Number.isFinite(value.progressValue)) {
    if (value.progressMax === value.slideCount && Math.round(value.progressValue) !== oneBased) return false;
    if (value.progressMax === 100 && Math.abs(value.progressValue - oneBased / value.slideCount * 100) > 1) return false;
    if (!Number.isFinite(value.progressMax) && value.progressValue <= value.slideCount && Math.round(value.progressValue) !== oneBased) return false;
  }
  if (value.progressPercent !== null && Number.isFinite(value.progressPercent) && Math.abs(value.progressPercent - oneBased / value.slideCount * 100) > 1) return false;
  return true;
}

async function clickTarget(page, candidate, purpose) {
  const root = page.locator(candidate.selector).first();
  if (candidate.semanticType === 'tabs') return root.locator('[role="tab"][aria-selected="false"]').first().click();
  if (candidate.semanticType === 'accordion') {
    const selector = candidate.verification?.controlSelector;
    return (selector ? page.locator(selector).first() : root.locator('summary, [aria-expanded]').first()).click();
  }
  if (candidate.semanticType === 'drawer') {
    const selector = candidate.verification?.controlSelector;
    return (selector ? page.locator(selector).first() : root.locator('[aria-expanded]').first()).click();
  }
  if (candidate.semanticType === 'carousel') {
    const selector = candidate.verification?.nextSelector;
    let target = selector ? page.locator(selector).first() : root.locator('[data-next], [data-qa-action="next"], button[aria-label*="Next" i], button').first();
    if (!selector && await target.count() === 0) target = root;
    return target.click({ timeout: 3000 });
  }
  if (purpose === 'close') return page.keyboard.press('Escape');
  const selector = candidate.verification?.controlSelector;
  if (selector) return page.locator(selector).first().click({ timeout: 3000 });
  if (await root.evaluate((node) => node.matches('button, a, summary, [role="button"], [aria-expanded]'))) return root.click({ timeout: 3000 });
  return root.locator('button, a, summary, [role="button"], [aria-expanded]').first().click({ timeout: 3000 });
}

async function verifyCandidate(page, candidate) {
  const route = patternForCandidate(candidate);
  const routing = route ? { category: route.category, verifier: route.verifier, automation: route.automation, layer: route.layer } : null;
  const before = await snapshot(page, candidate);
  if (before.missing) return { candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, status: 'FAIL', before, after: null, failureReason: `Selector not found: ${candidate.selector}` };
  if (!route) return { candidateId: candidate.id, type: candidate.semanticType, recipe: candidate.recipe, routing, status: 'FAIL', before, after: null, failureReason: `No verifier route is registered for recipe: ${candidate.recipe}` };
  if (route.verifier === 'motion-qa') {
    return { candidateId: candidate.id, control: candidate.selector, type: candidate.semanticType, recipe: candidate.recipe, routing, status: 'DEFERRED', before, after: null, evidence: { verifier: 'motion-qa', clicked: false }, failureReason: null };
  }
  if (route.verifier === 'manual') {
    return { candidateId: candidate.id, control: candidate.selector, type: candidate.semanticType, recipe: candidate.recipe, routing, status: 'UNSUPPORTED', before, after: null, evidence: { verifier: 'manual', clicked: false }, failureReason: `Automated verification is unsupported for ${candidate.recipe}; provide manual evidence or skip the candidate explicitly.` };
  }
  try {
    if (candidate.semanticType === 'hover') {
      const root = page.locator(candidate.selector).first(); await root.hover(); await waitFrame(page); await page.waitForTimeout(75); const active = await snapshot(page, candidate);
      await page.mouse.move(0, 0); await waitFrame(page); await page.waitForTimeout(75); const restored = await snapshot(page, candidate);
      const changed = JSON.stringify(before.hover) !== JSON.stringify(active.hover);
      const reversible = candidate.verification?.reversible !== false;
      const returns = !reversible || JSON.stringify(before.hover) === JSON.stringify(restored.hover);
      const pass = changed && returns;
      return { candidateId: candidate.id, control: candidate.selector, type: candidate.semanticType, recipe: candidate.recipe, routing, status: pass ? 'PASS' : 'FAIL', before, after: active, restored, evidence: { changedOnEnter: changed, restoredOnLeave: returns }, failureReason: pass ? null : !changed ? 'Pointer enter produced no allowed observable state.' : 'Pointer leave did not restore the reversible state.' };
    }
    await clickTarget(page, candidate, 'activate'); await waitFrame(page); const after = await snapshot(page, candidate);
    let pass = false; let reason = 'State did not satisfy its semantic contract after activation.';
    if (candidate.semanticType === 'tabs') pass = tabValid(before) && tabValid(after) && JSON.stringify(before.tabs) !== JSON.stringify(after.tabs);
    else if (candidate.semanticType === 'accordion') pass = accordionValid(after) && before.accordion.expanded !== after.accordion.expanded;
    else if (['dropdown', 'menu-state'].includes(candidate.semanticType)) {
      const key = candidate.semanticType === 'dropdown' ? 'dropdown' : 'menuState';
      const initial = before[key]; const opened = after[key];
      const initialExpected = candidate.verification?.initialOpen;
      const initialValid = toggleValid(before) && (initialExpected === undefined || initial.expanded === Boolean(initialExpected));
      const openedValid = toggleValid(after) && opened.expanded === true && opened.panelVisible === true;
      let dismissed = false; let dismissState = null; const behavior = candidate.verification?.dismissBehavior || [];
      for (const action of behavior) {
        if (action === 'escape') await page.keyboard.press('Escape');
        else if (action === 'outside') await page.mouse.click(2, 2);
        else if (action === 'selector' && candidate.verification.dismissSelector) await page.locator(candidate.verification.dismissSelector).first().click({ timeout: 3000 });
        await waitFrame(page); dismissState = await snapshot(page, candidate); const value = dismissState[key];
        dismissed = toggleValid(dismissState) && value.expanded === false && value.panelVisible === false;
        if (dismissed) break;
      }
      pass = initialValid && openedValid && dismissed;
      reason = !initialValid ? 'Dropdown/menu initial control and panel state are not synchronized.' : !openedValid ? 'Dropdown/menu control opened without a visible synchronized panel.' : !dismissed ? 'Dropdown/menu dismiss behavior did not close the panel.' : reason;
      return { candidateId: candidate.id, control: candidate.selector, type: candidate.semanticType, recipe: candidate.recipe, routing, status: pass ? 'PASS' : 'FAIL', before, after, dismissState, evidence: { initialValid, openedValid, dismissed, dismissBehavior: behavior }, failureReason: pass ? null : reason };
    }
    else if (candidate.semanticType === 'drawer') {
      const opened = after.drawer?.expanded === true && after.drawer?.panelVisible === true;
      const focusValid = !candidate.verification?.focusInside || after.drawer?.focusInsidePanel === true;
      let closed = true; let closeState = null; let outsideCloseState = null;
      if (candidate.verification?.closeOnEscape) { await page.keyboard.press('Escape'); await waitFrame(page); closeState = await snapshot(page, candidate); closed = closeState.drawer?.expanded === false && closeState.drawer?.panelVisible === false; }
      let outsideClosed = true;
      if (candidate.verification?.closeOnOutside) {
        if (!closeState || closeState.drawer?.expanded === false) { await clickTarget(page, candidate, 'activate'); await waitFrame(page); }
        await page.mouse.click(2, 2); await waitFrame(page); outsideCloseState = await snapshot(page, candidate);
        outsideClosed = outsideCloseState.drawer?.expanded === false && outsideCloseState.drawer?.panelVisible === false;
      }
      pass = opened && closed && outsideClosed && focusValid;
      reason = !opened ? 'Drawer control and panel open state are not synchronized.' : !focusValid ? 'Drawer did not move focus into the panel as required.' : 'Drawer opened but its required close behavior failed.';
      return { candidateId: candidate.id, control: candidate.selector, type: candidate.semanticType, recipe: candidate.recipe, routing, status: pass ? 'PASS' : 'FAIL', before, after, closeState, outsideCloseState, evidence: { opened, closed, outsideClosed, focusValid, closeOnEscape: Boolean(candidate.verification?.closeOnEscape), closeOnOutside: Boolean(candidate.verification?.closeOnOutside) }, failureReason: pass ? null : reason };
    } else if (candidate.semanticType === 'carousel') {
      const changed = before.carousel?.activeIndexes?.[0] !== after.carousel?.activeIndexes?.[0];
      pass = carouselValid(before) && carouselValid(after) && changed;
      reason = !changed ? 'Active slide did not change.' : 'Carousel changed partially; slide, counter, pagination, progress, or thumbnail state is out of sync.';
    } else pass = JSON.stringify(before) !== JSON.stringify(after);
    return { candidateId: candidate.id, control: candidate.selector, type: candidate.semanticType, recipe: candidate.recipe, routing, status: pass ? 'PASS' : 'FAIL', before, after, evidence: { semanticContract: pass }, failureReason: pass ? null : reason };
  } catch (error) {
    return { candidateId: candidate.id, control: candidate.selector, type: candidate.semanticType, recipe: candidate.recipe, routing, status: 'FAIL', before, after: null, failureReason: error.message };
  }
}

async function verifyMobileEssentialContent(page, candidates) {
  const hover = candidates.filter((candidate) => candidate.semanticType === 'hover' && candidate.verification?.essentialSelector);
  if (!hover.length) return [];
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload({ waitUntil: 'load' });
  return page.evaluate((items) => items.map((candidate) => {
    const node = document.querySelector(candidate.verification.essentialSelector);
    if (!node) return { candidateId: candidate.id, status: 'FAIL', reason: 'Essential hover content selector was not found on mobile.' };
    const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
    const visible = !node.hidden && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    const reachable = visible || Boolean(document.querySelector(`${candidate.selector} button, ${candidate.selector} a, ${candidate.selector}[tabindex]`));
    return { candidateId: candidate.id, status: reachable ? 'PASS' : 'FAIL', visible, reason: reachable ? null : 'Essential information is hover-only and not visible or tap-accessible on mobile.' };
  }), hover);
}

export async function runInteractionQa({ page, output, plan = null, planPath = null, sourceRoot = process.cwd(), checkMobile = true }) {
  const selectedPlan = plan || (planPath ? readInteractionPlan(planPath) : await discoverInteractionPlan(page, { designMode: 'reference', sourceRoot }));
  const candidates = selectedPlan.candidates.filter((candidate) => candidate.implementation !== 'skip');
  const checks = [];
  for (const candidate of candidates) checks.push(await verifyCandidate(page, candidate));
  const mobileChecks = checkMobile ? await verifyMobileEssentialContent(page, candidates) : [];
  const failures = [...checks.filter((check) => check.status === 'FAIL'), ...mobileChecks.filter((check) => check.status === 'FAIL')];
  const activeChecks = checks.filter((check) => !['DEFERRED', 'UNSUPPORTED'].includes(check.status));
  const motionChecks = checks.filter((check) => check.routing?.verifier === 'motion-qa');
  const unsupportedChecks = checks.filter((check) => check.status === 'UNSUPPORTED');
  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: path.resolve(sourceRoot),
    sourceFingerprint: createSourceFingerprint(sourceRoot),
    plan: planPath ? path.resolve(planPath) : null,
    required: candidates.some((candidate) => patternForCandidate(candidate)?.verifier === 'interaction-qa'),
    motionRequired: motionChecks.length > 0,
    candidateCount: candidates.length,
    deferredCount: motionChecks.length,
    unsupportedCount: unsupportedChecks.length,
    status: failures.length ? 'FAIL' : activeChecks.length ? 'PASS' : 'NOT_REQUIRED',
    checks, mobileChecks,
    failureReasons: failures.map((failure) => `${failure.candidateId}: ${failure.failureReason || failure.reason}`)
  };
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2)); if (!args.url) throw new Error('Missing required argument --url');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: Number(args.width || 1440), height: Number(args.height || 900) } });
    const page = await context.newPage(); await page.goto(fileUrl(args.url), { waitUntil: 'load' });
    const report = await runInteractionQa({ page, output: path.resolve(args.output || 'qa/interaction-report.json'), planPath: args.plan ? path.resolve(args.plan) : null, sourceRoot: args['source-root'] || process.cwd() });
    process.exitCode = report.status === 'FAIL' ? 1 : 0; await context.close();
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
