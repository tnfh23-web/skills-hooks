import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

function requireArg(args, name) {
  if (!args[name]) throw new Error(`Missing required argument --${name}`);
  return args[name];
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function writePng(file, image) {
  fs.writeFileSync(file, PNG.sync.write(image));
}

function fileUrl(value) {
  if (/^[a-z]+:\/\//i.test(value)) return value;
  return new URL(`file://${path.resolve(value).replaceAll('\\', '/')}`).href;
}

function regionOverlap(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function connectedRegions(diff, maxRegions = 12) {
  const { width, height, data } = diff;
  const visited = new Uint8Array(width * height);
  const regions = [];
  // pixelmatch writes neutral grayscale pixels for matches and colored pixels for diffs.
  const isMismatch = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i] !== data[i + 1] || data[i] !== data[i + 2];
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (visited[index] || !isMismatch(x, y)) continue;
      visited[index] = 1;
      const queue = [[x, y]];
      let head = 0;
      let minX = x; let maxX = x; let minY = y; let maxY = y; let pixels = 0;
      while (head < queue.length) {
        const [cx, cy] = queue[head++];
        pixels += 1;
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (!visited[n] && isMismatch(nx, ny)) { visited[n] = 1; queue.push([nx, ny]); }
        }
      }
      regions.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixels });
    }
  }
  return regions.sort((a, b) => b.pixels - a.pixels).slice(0, maxRegions);
}

function makeOverlay(reference, actual) {
  const overlay = new PNG({ width: actual.width, height: actual.height });
  for (let i = 0; i < overlay.data.length; i += 4) {
    overlay.data[i] = Math.round((reference.data[i] + actual.data[i]) / 2);
    overlay.data[i + 1] = Math.round((reference.data[i + 1] + actual.data[i + 1]) / 2);
    overlay.data[i + 2] = Math.round((reference.data[i + 2] + actual.data[i + 2]) / 2);
    overlay.data[i + 3] = 255;
  }
  return overlay;
}

async function waitForStablePage(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    })));
    const style = document.createElement('style');
    style.dataset.referencePublishQa = 'motion-disabled';
    style.textContent = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`;
    document.head.appendChild(style);
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await sleep(50);
}

async function collectDomBoxes(page) {
  return page.evaluate(() => [...document.querySelectorAll('body *')].map((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none') return null;
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: typeof element.className === 'string' ? element.className.slice(0, 120) : null,
      role: element.getAttribute('role'),
      text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)
    };
  }).filter(Boolean));
}

async function readInteractionState(locator) {
  return locator.evaluate((element) => {
    const visible = (node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const describe = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        id: node.id || null,
        tag: node.tagName.toLowerCase(),
        text: (node.innerText || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 100),
        ariaSelected: node.getAttribute('aria-selected'),
        ariaExpanded: node.getAttribute('aria-expanded'),
        ariaCurrent: node.getAttribute('aria-current'),
        className: typeof node.className === 'string' ? node.className.slice(0, 160) : null,
        hidden: Boolean(node.hidden),
        open: 'open' in node ? Boolean(node.open) : null,
        visible: visible(node),
        x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height)
      };
    };
    const related = new Set();
    const addRelated = (node) => { if (node) related.add(node); };
    const tablist = element.closest('[role="tablist"]');
    tablist?.querySelectorAll('[role="tab"]').forEach(addRelated);
    const details = element.closest('details');
    addRelated(details);
    const ids = `${element.getAttribute('aria-controls') || ''} ${element.dataset.target || ''}`.split(/\s+/).filter(Boolean);
    ids.forEach((id) => addRelated(document.getElementById(id) || (id.startsWith('#') ? document.querySelector(id) : null)));
    const group = element.closest('[data-qa-group], [data-pagination], [data-slider]');
    group?.querySelectorAll('[aria-selected], [aria-current], [data-page], [data-slide], [data-active]').forEach(addRelated);
    return { control: describe(element), related: [...related].map(describe).filter(Boolean) };
  });
}

async function interactionQa(page, outputDir) {
  const selector = 'button, summary, [role="tab"], [aria-expanded], [data-qa-action], [data-page], [aria-current]';
  const locators = page.locator(selector);
  const candidates = await page.evaluate((selectorText) => [...document.querySelectorAll(selectorText)].map((element, index) => {
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const label = (element.innerText || element.getAttribute('aria-label') || element.getAttribute('title') || tag).replace(/\s+/g, ' ').trim().slice(0, 100);
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const visible = rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    const disabled = element.disabled === true || element.getAttribute('aria-disabled') === 'true';
    const hasStateMarker = tag === 'summary' || role === 'tab' || element.hasAttribute('aria-expanded') || element.hasAttribute('data-qa-action') || element.hasAttribute('data-page') || element.hasAttribute('aria-current');
    const buttonTextLooksStateful = tag === 'button' && (/\b(prev|next|menu|toggle|accordion|slide|page|tab|open|close)\b/i.test(label) || element.closest('[role="tablist"], [data-qa-group], [data-pagination], [data-slider]'));
    const kind = role === 'tab' ? 'tab' : tag === 'summary' ? 'accordion' : element.hasAttribute('aria-expanded') ? 'aria-expanded-toggle' : /\b(prev|next|slide|carousel)\b/i.test(label) ? 'slider' : (element.hasAttribute('data-page') || element.hasAttribute('aria-current') || /\b(page|bullet|pagination)\b/i.test(label)) ? 'pagination' : /\b(menu|hamburger)\b/i.test(label) ? 'menu' : 'button';
    return { index, kind, label, visible, disabled, ariaSelected: element.getAttribute('aria-selected'), candidate: hasStateMarker || buttonTextLooksStateful };
  }).filter((candidate) => candidate.visible && !candidate.disabled && candidate.candidate), selector);
  const checks = [];
  for (const candidate of candidates.slice(0, 24)) {
    const locator = locators.nth(candidate.index);
    const urlBefore = page.url();
    try {
      await locator.focus();
      const focused = await locator.evaluate((element) => document.activeElement === element);
      await locator.hover();
      if (candidate.kind === 'tab' && candidate.ariaSelected === 'true' && await page.locator('[role="tab"][aria-selected="false"]').count() > 0) {
        checks.push({ control: candidate.label, type: candidate.kind, status: 'SKIP', focus: focused ? 'PASS' : 'FAIL', hover: 'PASS', failureReason: 'Already-active tab skipped; another tab is available.' });
        continue;
      }
      const before = await readInteractionState(locator);
      await locator.click({ timeout: 3000, noWaitAfter: true });
      await page.waitForTimeout(75);
      const urlAfter = page.url();
      if (urlAfter !== urlBefore) {
        checks.push({ control: candidate.label, type: candidate.kind, status: 'PASS', focus: focused ? 'PASS' : 'FAIL', hover: 'PASS', urlBefore, urlAfter, before, after: null, stateChanged: true, reason: 'Navigation changed the URL; state comparison skipped.' });
        break;
      }
      const after = await readInteractionState(locator);
      const stateChanged = JSON.stringify(before) !== JSON.stringify(after);
      checks.push({ control: candidate.label, type: candidate.kind, status: stateChanged && focused ? 'PASS' : 'FAIL', focus: focused ? 'PASS' : 'FAIL', hover: 'PASS', urlBefore, urlAfter, before, after, stateChanged, failureReason: stateChanged ? (focused ? null : 'Click state changed, but focus could not be confirmed.') : 'Click completed but no observable state change was detected.' });
    } catch (error) {
      const urlAfter = page.url();
      checks.push({ control: candidate.label, type: candidate.kind, status: urlAfter !== urlBefore ? 'PASS' : 'FAIL', focus: 'FAIL', hover: 'FAIL', urlBefore, urlAfter, stateChanged: urlAfter !== urlBefore, failureReason: urlAfter !== urlBefore ? 'Navigation changed the URL; interaction failure skipped.' : error.message });
    }
  }
  const failures = checks.filter((check) => check.status === 'FAIL');
  const report = {
    generatedAt: new Date().toISOString(), required: candidates.length > 0, controlCount: candidates.length,
    status: candidates.length === 0 ? 'NOT_REQUIRED' : failures.length ? 'FAIL' : 'PASS', checks,
    failureReasons: failures.map((failure) => `${failure.control} (${failure.type}): ${failure.failureReason}`)
  };
  fs.writeFileSync(path.join(outputDir, 'interaction-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(args.output || 'qa');
  const url = fileUrl(requireArg(args, 'url'));
  ensureDir(outputDir);
  const browser = await chromium.launch({ headless: true });
  try {
    const width = Number(args.width || 1440);
    const height = Number(args.height || 900);
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await waitForStablePage(page);
    const domBoxes = await collectDomBoxes(page);
    const actualPath = path.join(outputDir, 'actual.png');
    await page.screenshot({ path: actualPath, fullPage: false, animations: 'disabled' });
    if (args['capture-only']) {
      await context.close();
      return;
    }
    const referencePath = path.resolve(requireArg(args, 'reference'));
    const reference = readPng(referencePath);
    const actual = readPng(actualPath);
    const diffPath = path.join(outputDir, 'diff.png');
    const maskPath = path.join(outputDir, 'mask.png');
    const overlayPath = path.join(outputDir, 'overlay.png');
    const dimensionMatch = reference.width === actual.width && reference.height === actual.height;
    const diff = new PNG({ width: actual.width, height: actual.height });
    let mismatchPixels = 0;
    if (dimensionMatch) mismatchPixels = pixelmatch(reference.data, actual.data, diff.data, actual.width, actual.height, { threshold: Number(args.threshold || 0.1), includeAA: false });
    else { diff.data.fill(255); }
    writePng(diffPath, diff);
    if (dimensionMatch) writePng(overlayPath, makeOverlay(reference, actual));
    const mask = new PNG({ width: actual.width, height: actual.height });
    for (let i = 0; i < mask.data.length; i += 4) {
      const active = diff.data[i] !== diff.data[i + 1] || diff.data[i] !== diff.data[i + 2];
      mask.data[i] = active ? 255 : 0; mask.data[i + 1] = active ? 255 : 0; mask.data[i + 2] = active ? 255 : 0; mask.data[i + 3] = 255;
    }
    writePng(maskPath, mask);
    const regions = dimensionMatch ? connectedRegions(diff).map((region) => {
      const overlaps = domBoxes.map((box) => {
        const area = regionOverlap(region, box);
        return { box, area, coverage: area / Math.max(1, box.width * box.height) };
      }).filter((item) => item.area > 0).sort((a, b) => b.coverage - a.coverage || b.area - a.area);
      const element = overlaps[0]?.box || null;
      return { ...region, kind: element ? 'content-or-position-mismatch' : 'orphan-mismatch', element };
    }) : [];
    const totalPixels = actual.width * actual.height;
    const maxMismatchRatio = Number(args['max-mismatch-ratio'] || 0.005);
    const maxRegionPixelRatio = Number(args['max-region-pixel-ratio'] || 0.002);
    const maxRegionAreaRatio = Number(args['max-region-area-ratio'] || 0.005);
    const meaningfulRegionMinPixels = Math.max(64, Math.ceil(totalPixels * Number(args['meaningful-region-min-ratio'] || 0.0001)));
    const regionStats = regions.map((region) => ({
      ...region,
      pixelRatio: region.pixels / totalPixels,
      areaRatio: (region.width * region.height) / totalPixels,
      meaningful: region.pixels >= meaningfulRegionMinPixels
    }));
    const meaningfulRegions = regionStats.filter((region) => region.meaningful);
    const largeRegions = meaningfulRegions.filter((region) => region.pixelRatio > maxRegionPixelRatio || region.areaRatio > maxRegionAreaRatio);
    const failureReasons = [];
    if (!dimensionMatch) failureReasons.push(`Viewport/capture dimensions differ: reference ${reference.width}x${reference.height}, actual ${actual.width}x${actual.height}.`);
    if (dimensionMatch && mismatchPixels / totalPixels > maxMismatchRatio) failureReasons.push(`Mismatch ratio ${(mismatchPixels / totalPixels * 100).toFixed(3)}% exceeds the ${maxMismatchRatio * 100}% tolerance.`);
    if (dimensionMatch && largeRegions.length > 0) failureReasons.push(`${largeRegions.length} large mismatch region(s) exceed the per-region tolerance; inspect the largest region before completion.`);
    const visualStatus = dimensionMatch && failureReasons.length === 0 ? 'PASS' : 'FAIL';
    let interaction = { required: false, status: 'NOT_RUN' };
    if (!args['no-interaction-qa']) {
      // Use a fresh page so click checks cannot alter the stable screenshot page.
      const interactionPage = await context.newPage();
      await interactionPage.goto(url, { waitUntil: 'load' });
      await waitForStablePage(interactionPage);
      interaction = await interactionQa(interactionPage, outputDir);
      await interactionPage.close();
    }
    const report = {
      generatedAt: new Date().toISOString(), reference: { path: referencePath, width: reference.width, height: reference.height }, actual: { path: actualPath, width: actual.width, height: actual.height },
      viewport: { width, height, deviceScaleFactor: 1, browser: 'chromium' }, mismatchPixelCount: mismatchPixels, mismatchRatio: dimensionMatch ? mismatchPixels / totalPixels : 1,
      majorMismatchRegions: regionStats, visualDecision: {
        status: visualStatus,
        rule: 'PASS requires matching dimensions, mismatch ratio within tolerance, and no large meaningful mismatch region.',
        thresholds: { maxMismatchRatio, maxRegionPixelRatio, maxRegionAreaRatio, meaningfulRegionMinPixels },
        observed: { mismatchRatio: dimensionMatch ? mismatchPixels / totalPixels : 1, meaningfulRegionCount: meaningfulRegions.length, largeRegionCount: largeRegions.length, largestRegionPixels: regions[0]?.pixels || 0 },
        ignoredLowValueMismatch: visualStatus === 'PASS' && mismatchPixels > 0
      },
      status: visualStatus, failureReasons, interactionQa: { required: interaction.required, status: interaction.status }
    };
    fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (visualStatus === 'FAIL' || interaction.status === 'FAIL') process.exitCode = 1;
    await context.close();
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
