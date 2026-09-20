import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';
import { createSourceFingerprint } from './source-fingerprint.mjs';
import { runInteractionQa } from './interaction-qa.mjs';
import { writeLatestRun } from './qa-run.mjs';

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
  // pixelmatch의 diffMask만 입력하므로 실제 판정에 포함된 픽셀만 alpha를 가진다.
  const isMismatch = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i + 3] !== 0;
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
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const style = getComputedStyle(element);
    if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none') return null;
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      className: typeof element.className === 'string' ? element.className.slice(0, 120) : null,
      role: element.getAttribute('role'),
      text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      x: Math.round(rect.x + scrollX), y: Math.round(rect.y + scrollY), width: Math.round(rect.width), height: Math.round(rect.height)
    };
  }).filter(Boolean));
}

async function collectDocumentDimensions(page) {
  return page.evaluate(() => ({
    width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0, document.documentElement.clientWidth),
    height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0, document.documentElement.clientHeight)
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(args.output || 'qa');
  const url = fileUrl(requireArg(args, 'url'));
  const captureMode = String(args['capture-mode'] || 'viewport');
  if (!['viewport', 'fullPage'].includes(captureMode)) throw new Error(`Unsupported --capture-mode "${captureMode}". Use viewport or fullPage.`);
  const fullPage = captureMode === 'fullPage';
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
    const documentDimensions = await collectDocumentDimensions(page);
    const actualPath = path.join(outputDir, 'actual.png');
    await page.screenshot({ path: actualPath, fullPage, animations: 'disabled' });
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
    const mismatchMask = new PNG({ width: actual.width, height: actual.height });
    let mismatchPixels = 0;
    const comparisonOptions = { threshold: Number(args.threshold || 0.1), includeAA: false };
    if (dimensionMatch) {
      mismatchPixels = pixelmatch(reference.data, actual.data, diff.data, actual.width, actual.height, comparisonOptions);
      // 사람이 보는 diff는 유지하되 판정에는 pixelmatch의 실제 mismatch mask를 사용한다.
      pixelmatch(reference.data, actual.data, mismatchMask.data, actual.width, actual.height, { ...comparisonOptions, diffMask: true });
    } else { diff.data.fill(255); mismatchMask.data.fill(255); }
    writePng(diffPath, diff);
    if (dimensionMatch) writePng(overlayPath, makeOverlay(reference, actual));
    const mask = new PNG({ width: actual.width, height: actual.height });
    for (let i = 0; i < mask.data.length; i += 4) {
      const active = mismatchMask.data[i + 3] !== 0;
      mask.data[i] = active ? 255 : 0; mask.data[i + 1] = active ? 255 : 0; mask.data[i + 2] = active ? 255 : 0; mask.data[i + 3] = 255;
    }
    writePng(maskPath, mask);
    const regions = dimensionMatch ? connectedRegions(mismatchMask).map((region) => {
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
    if (!dimensionMatch) {
      const captureLabel = fullPage ? 'Full-page capture/reference dimensions' : 'Viewport capture/reference dimensions';
      failureReasons.push(`${captureLabel} differ: reference ${reference.width}x${reference.height}, actual ${actual.width}x${actual.height}. Document reported ${documentDimensions.width}x${documentDimensions.height}.`);
    }
    if (dimensionMatch && mismatchPixels / totalPixels > maxMismatchRatio) failureReasons.push(`Mismatch ratio ${(mismatchPixels / totalPixels * 100).toFixed(3)}% exceeds the ${maxMismatchRatio * 100}% tolerance.`);
    if (dimensionMatch && largeRegions.length > 0) failureReasons.push(`${largeRegions.length} large mismatch region(s) exceed the per-region tolerance; inspect the largest region before completion.`);
    const visualStatus = dimensionMatch && failureReasons.length === 0 ? 'PASS' : 'FAIL';
    let interaction = { required: false, status: 'NOT_RUN' };
    if (!args['no-interaction-qa']) {
      // 클릭 검사가 안정화된 screenshot page를 바꾸지 않도록 새 page에서 실행한다.
      const interactionPage = await context.newPage();
      await interactionPage.goto(url, { waitUntil: 'load' });
      await waitForStablePage(interactionPage);
      interaction = await runInteractionQa({
        page: interactionPage,
        output: path.join(outputDir, 'interaction-report.json'),
        planPath: args['interaction-plan'] ? path.resolve(args['interaction-plan']) : null,
        sourceRoot: process.cwd()
      });
      await interactionPage.close();
    }
    const qualityGates = {
      geometryRequired: Boolean(args['require-geometry']),
      responsiveRequired: Boolean(args['require-responsive']),
      interactionPlanRequired: Boolean(args['interaction-plan']),
      motionRequired: Boolean(args['require-motion']) || interaction.motionRequired || false
    };
    const report = {
      generatedAt: new Date().toISOString(), captureMode, reference: { path: referencePath, width: reference.width, height: reference.height }, actual: { path: actualPath, width: actual.width, height: actual.height },
      viewport: { width, height, deviceScaleFactor: 1, browser: 'chromium' }, document: documentDimensions, mismatchPixelCount: mismatchPixels, mismatchRatio: dimensionMatch ? mismatchPixels / totalPixels : 1,
      sourceFingerprint: createSourceFingerprint(process.cwd()),
      sourceRoot: process.cwd(),
      qualityGates,
      majorMismatchRegions: regionStats, visualDecision: {
        status: visualStatus,
        rule: 'PASS requires matching dimensions, mismatch ratio within tolerance, and no large meaningful mismatch region.',
        thresholds: { maxMismatchRatio, maxRegionPixelRatio, maxRegionAreaRatio, meaningfulRegionMinPixels },
        observed: { mismatchRatio: dimensionMatch ? mismatchPixels / totalPixels : 1, meaningfulRegionCount: meaningfulRegions.length, largeRegionCount: largeRegions.length, largestRegionPixels: regions[0]?.pixels || 0 },
        ignoredLowValueMismatch: visualStatus === 'PASS' && mismatchPixels > 0
      },
      status: visualStatus, failureReasons, interactionPlan: args['interaction-plan'] ? path.resolve(args['interaction-plan']) : null, interactionQa: { required: interaction.required, status: interaction.status }
    };
    fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (args['set-latest']) writeLatestRun(process.cwd(), outputDir);
    if (visualStatus === 'FAIL' || interaction.status === 'FAIL') process.exitCode = 1;
    await context.close();
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
