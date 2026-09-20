import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createSourceFingerprint } from './source-fingerprint.mjs';

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
const round = (value) => Math.round(value * 100) / 100;

export async function measureGeometry({ url, spec, output, width, height, sourceRoot = process.cwd() }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(fileUrl(url), { waitUntil: 'load' });
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); }))); });
    const entries = await page.evaluate((elements) => elements.map((expected) => {
      const node = document.querySelector(expected.selector);
      if (!node) return { selector: expected.selector, confidence: expected.confidence || 'medium', status: 'FAIL', reason: 'Selector not found.' };
      const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
      const actual = { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, fontFamily: style.fontFamily, fontSize: style.fontSize, lineHeight: style.lineHeight, fontWeight: style.fontWeight };
      const expectedBox = expected.box || expected;
      const deltas = Object.fromEntries(['x', 'y', 'width', 'height'].filter((key) => typeof expectedBox[key] === 'number').map((key) => [`d${key === 'width' ? 'w' : key === 'height' ? 'h' : key}`, Math.round((actual[key] - expectedBox[key]) * 100) / 100]));
      const typography = {};
      for (const key of ['fontFamily', 'fontSize', 'lineHeight', 'fontWeight']) if (expected.typography?.[key] !== undefined && expected.typography?.[key] !== null) typography[key] = { expected: String(expected.typography[key]), actual: String(actual[key]), match: String(expected.typography[key]).toLowerCase() === String(actual[key]).toLowerCase() };
      return { selector: expected.selector, section: expected.section || null, confidence: expected.confidence || 'medium', expected: { x: expectedBox.x, y: expectedBox.y, width: expectedBox.width, height: expectedBox.height, typography: expected.typography || null }, actual, deltas, typography, status: 'PASS' };
    }), spec.majorElements || []);
    const tolerance = Number(spec.geometryTolerance ?? 4);
    const results = entries.map((entry) => {
      if (entry.status === 'FAIL') return entry;
      const boxMismatch = Object.values(entry.deltas).some((value) => Math.abs(value) > tolerance);
      const typographyMismatch = Object.values(entry.typography).some((value) => !value.match);
      const critical = entry.confidence === 'high' && (boxMismatch || typographyMismatch);
      return { ...entry, status: critical ? 'FAIL' : boxMismatch || typographyMismatch ? 'WARN' : 'PASS', boxMismatch, typographyMismatch, critical };
    });
    const criticalMismatches = results.filter((entry) => entry.critical || entry.status === 'FAIL');
    const report = { generatedAt: new Date().toISOString(), sourceRoot: path.resolve(sourceRoot), sourceFingerprint: createSourceFingerprint(sourceRoot), status: criticalMismatches.length ? 'FAIL' : 'PASS', tolerance, expectedCount: results.length, criticalMismatchCount: criticalMismatches.length, elements: results, failureReasons: criticalMismatches.map((entry) => `${entry.selector}: ${entry.reason || 'geometry or typography differs beyond the configured tolerance.'}`) };
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
    await context.close();
    return report;
  } finally { await browser.close(); }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const spec = JSON.parse(fs.readFileSync(path.resolve(args.spec), 'utf8'));
  const report = await measureGeometry({ url: args.url, spec, output: path.resolve(args.output || 'qa/geometry-report.json'), width: Number(args.width || spec.viewport.width), height: Number(args.height || spec.viewport.height), sourceRoot: args['source-root'] || process.cwd() });
  process.exitCode = report.status === 'PASS' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
