import path from 'node:path';

export const ACTIONABLE_SELECTOR = 'a[href], button, [role="button"], [role="tab"], summary, [aria-expanded], [data-next], [data-prev], [data-action], [data-interaction]';

const VISUAL_PROPERTIES = [
  'color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'outlineColor', 'outlineStyle', 'outlineWidth', 'boxShadow', 'opacity', 'transform', 'filter', 'textDecorationLine'
];

function parseSelectorList(items) {
  return Array.isArray(items) ? items.filter((item) => typeof item === 'string' && item) : [];
}

function valuesChanged(before, after) {
  if (!before || !after) return false;
  const beforeParts = [before.target, before.before, before.after, ...(before.children || [])];
  const afterParts = [after.target, after.before, after.after, ...(after.children || [])];
  return JSON.stringify(beforeParts) !== JSON.stringify(afterParts);
}

async function waitFrame(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export async function collectActionableInventory(page) {
  return page.evaluate((selector) => {
    const visible = (node) => {
      if (!node || node.hidden || node.disabled || node.getAttribute('aria-disabled') === 'true') return false;
      const closedDetails = node.closest('details:not([open])');
      if (closedDetails && node !== closedDetails.querySelector('summary')) return false;
      const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
    };
    const segment = (node) => {
      if (node.id) return `#${CSS.escape(node.id)}`;
      const explicit = node.getAttribute('data-interaction-id');
      if (explicit) return `[data-interaction-id="${CSS.escape(explicit)}"]`;
      const tag = node.tagName.toLowerCase();
      const classes = [...node.classList].filter(Boolean).slice(0, 2).map((name) => `.${CSS.escape(name)}`).join('');
      const peers = [...(node.parentElement?.children || [])].filter((item) => item.tagName === node.tagName);
      return `${tag}${classes}:nth-of-type(${Math.max(1, peers.indexOf(node) + 1)})`;
    };
    const uniqueSelector = (node) => {
      const parts = []; let current = node;
      while (current && current !== document.body && current.nodeType === Node.ELEMENT_NODE) {
        parts.unshift(segment(current));
        const candidate = parts.join(' > ');
        if (document.querySelectorAll(candidate).length === 1) return candidate;
        current = current.parentElement;
      }
      return parts.join(' > ');
    };
    const kindFor = (node) => {
      if (node.matches('[role="tab"]')) return 'tab';
      if (node.matches('[aria-expanded]')) return 'expandable';
      if (node.matches('[data-next], [data-prev]')) return 'carousel-control';
      if (node.matches('nav a, header a')) return 'nav';
      if (node.matches('a[href]')) return 'link';
      if (node.matches('[role="button"]')) return 'button';
      return node.matches('button') ? (node.matches('[aria-label]') ? 'icon-button' : 'button') : 'control';
    };
    const behaviorFor = (node) => {
      if (node.matches('a[href]') && node.getAttribute('href') && !/^javascript:/i.test(node.getAttribute('href'))) return 'native-navigation';
      if (node.matches('form button[type="submit"], form input[type="submit"]')) return 'native-submit';
      if (node.matches('[aria-expanded], [role="tab"], [data-next], [data-prev], [data-interaction]')) return 'state-or-handler';
      if (node.hasAttribute('onclick') || node.dataset.action) return 'explicit-handler';
      return 'missing-handler';
    };
    return [...document.querySelectorAll(selector)].filter(visible).map((node) => ({
      selector: uniqueSelector(node),
      kind: kindFor(node),
      text: (node.textContent || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      behaviorHint: behaviorFor(node),
      disabled: false,
      evidence: [node.matches('a[href]') ? 'a[href]' : node.tagName.toLowerCase(), ...(['role', 'aria-expanded', 'data-next', 'data-prev', 'data-action', 'data-interaction'].filter((attribute) => node.hasAttribute(attribute)))]
    }));
  }, ACTIONABLE_SELECTOR);
}

async function visualSnapshot(page, selector) {
  return page.evaluate(({ selector, properties }) => {
    const node = document.querySelector(selector);
    if (!node) return null;
    const read = (target, pseudo = null) => {
      if (!target) return null;
      const style = getComputedStyle(target, pseudo);
      return Object.fromEntries(properties.map((property) => [property, style[property]]));
    };
    const rect = node.getBoundingClientRect();
    return {
      selector,
      active: document.activeElement === node,
      focusVisible: node.matches(':focus-visible'),
      target: read(node),
      before: read(node, '::before'),
      after: read(node, '::after'),
      children: [...node.querySelectorAll('img, svg, span, strong, em')].slice(0, 4).map((child) => read(child)),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
    };
  }, { selector, properties: VISUAL_PROPERTIES });
}

async function coveredByCandidate(page, selector, candidates) {
  const candidateSelectors = parseSelectorList(candidates);
  if (!candidateSelectors.length) return false;
  return page.evaluate(({ selector, candidateSelectors }) => {
    const node = document.querySelector(selector);
    return Boolean(node && candidateSelectors.some((candidateSelector) => {
      const root = document.querySelector(candidateSelector);
      return root && (root === node || root.contains(node));
    }));
  }, { selector, candidateSelectors });
}

export async function runInteractionCoverage({ page, actionable = null, candidates = [] }) {
  const inventory = actionable || await collectActionableInventory(page);
  const candidateSelectors = candidates.map((candidate) => candidate.selector);
  const elements = [];
  await page.mouse.move(1, 1); await waitFrame(page);
  for (const item of inventory) {
    const locator = page.locator(item.selector).first();
    const before = await visualSnapshot(page, item.selector);
    if (!before) {
      elements.push({ ...item, status: 'FAIL', failureReason: 'Actionable selector was not found during coverage.' });
      continue;
    }
    let hover = { changed: false, restored: false, before, after: null };
    let focus = { changed: false, focusVisible: false, before, after: null };
    let active = { changed: false, before, after: null };
    try {
      await locator.hover({ timeout: 3000 }); await waitFrame(page); await page.waitForTimeout(50);
      hover.after = await visualSnapshot(page, item.selector); hover.changed = valuesChanged(before, hover.after);
      await page.mouse.move(1, 1); await waitFrame(page); await page.waitForTimeout(50);
      const restored = await visualSnapshot(page, item.selector); hover.restored = !valuesChanged(before, restored);

      const keyboardFocused = await page.evaluate((selector) => {
        const node = document.querySelector(selector);
        if (!node) return false;
        const sentinel = document.createElement('span');
        sentinel.tabIndex = 0; sentinel.dataset.qaFocusSentinel = 'true';
        Object.assign(sentinel.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
        node.before(sentinel); sentinel.focus();
        return true;
      }, item.selector);
      if (keyboardFocused) await page.keyboard.press('Tab');
      const reachedByKeyboard = await page.evaluate((selector) => document.activeElement === document.querySelector(selector), item.selector);
      if (!reachedByKeyboard) await page.evaluate((selector) => document.querySelector(selector)?.focus(), item.selector);
      await waitFrame(page); await page.waitForTimeout(50);
      focus.after = await visualSnapshot(page, item.selector);
      if (!focus.after) {
        await page.evaluate((selector) => document.querySelector(selector)?.focus(), item.selector);
        await waitFrame(page);
        focus.after = await visualSnapshot(page, item.selector);
      }
      if (!focus.after) {
        await page.evaluate((selector) => document.querySelector(selector)?.focus(), item.selector);
        await waitFrame(page);
        focus.after = await visualSnapshot(page, item.selector);
      }
      focus.changed = valuesChanged(before, focus.after); focus.focusVisible = Boolean(focus.after?.focusVisible || focus.after?.active);
      await page.evaluate(() => { document.activeElement?.blur(); document.querySelector('[data-qa-focus-sentinel]')?.remove(); });

      const covered = await coveredByCandidate(page, item.selector, candidateSelectors);
      const stateControl = item.behaviorHint === 'state-or-handler' || item.kind === 'expandable' || item.kind === 'tab' || item.kind === 'carousel-control';
      if (stateControl || covered) {
        active = { changed: false, skipped: true, reason: covered ? 'verified-by-interaction-plan' : 'state-control-click-verified-by-interaction-qa', before, after: null };
      } else {
        await locator.hover({ timeout: 3000 }); await page.mouse.down(); await waitFrame(page); await page.waitForTimeout(25);
        active.after = await visualSnapshot(page, item.selector); active.changed = valuesChanged(before, active.after); await page.mouse.up();
        await page.mouse.move(1, 1); await waitFrame(page);
      }
    } catch (error) {
      elements.push({ ...item, before, hover, focus, active, status: 'FAIL', failureReason: error.message });
      continue;
    }
    const covered = await coveredByCandidate(page, item.selector, candidateSelectors);
    const clickBehavior = item.behaviorHint === 'native-navigation' || item.behaviorHint === 'native-submit' || item.behaviorHint === 'explicit-handler' || covered
      ? { status: 'PASS', reason: covered ? 'verified-by-interaction-plan' : item.behaviorHint }
      : { status: 'FAIL', reason: 'No native action, explicit handler, or verified interaction candidate was found.' };
    const hoverStatus = hover.changed ? 'PASS' : 'FAIL';
    const focusStatus = focus.changed ? 'PASS' : 'FAIL';
    const perceptible = hover.changed || focus.changed || active.changed;
    const failures = [];
    if (!hover.changed) failures.push('missing-hover-feedback');
    if (!focus.changed) failures.push('missing-focus-visible-feedback');
    if (clickBehavior.status !== 'PASS') failures.push('missing-click-behavior');
    elements.push({ ...item, hover: { ...hover, status: hoverStatus }, focus: { ...focus, status: focusStatus }, active, clickBehavior, perceptible, status: failures.length ? 'FAIL' : 'PASS', failureReason: failures.length ? failures.join(', ') : null });
  }
  const failures = elements.filter((element) => element.status === 'FAIL');
  return {
    status: failures.length ? 'FAIL' : elements.length ? 'PASS' : 'NOT_REQUIRED',
    visibleActionableElements: elements.length,
    withHoverFeedback: elements.filter((element) => element.hover?.status === 'PASS').length,
    withFocusVisibleFeedback: elements.filter((element) => element.focus?.status === 'PASS').length,
    withClickBehavior: elements.filter((element) => element.clickBehavior?.status === 'PASS').length,
    intentionallySkipped: elements.filter((element) => element.behaviorHint === 'skipped').length,
    missingPerceptibleFeedback: elements.filter((element) => !element.perceptible).map((element) => element.selector),
    missingHoverFeedback: elements.filter((element) => element.hover?.status !== 'PASS').map((element) => element.selector),
    missingFocusFeedback: elements.filter((element) => element.focus?.status !== 'PASS').map((element) => element.selector),
    missingBehavior: elements.filter((element) => element.clickBehavior?.status !== 'PASS').map((element) => element.selector),
    elements
  };
}

export function resolveCoveragePath(sourceRoot, file) {
  return path.resolve(sourceRoot, file);
}
