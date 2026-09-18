import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const fileUrl = (value) => /^[a-z]+:\/\//i.test(value) ? value : new URL(`file://${path.resolve(value).replaceAll('\\', '/')}`).href;
const viewports = [{ name: 'desktop', width: 1024, height: 768 }, { name: 'mobile', width: 390, height: 844 }];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2); const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true; else { args[key] = next; i += 1; }
  }
  return args;
}

export async function runResponsiveQa({ url, output }) {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await context.newPage(); await page.goto(fileUrl(url), { waitUntil: 'load' });
      await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; await Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); }))); });
      const result = await page.evaluate(() => {
        const issues = [];
        const body = document.body; const root = document.documentElement;
        if (root.scrollWidth > root.clientWidth + 1) issues.push({ type: 'horizontal-overflow', severity: 'critical', detail: `document scrollWidth ${root.scrollWidth} exceeds viewport ${root.clientWidth}` });
        const controls = [...document.querySelectorAll('button, a, [role="tab"], summary')].filter((node) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; });
        for (const node of controls) { const rect = node.getBoundingClientRect(); if (rect.right < -1 || rect.left > innerWidth + 1) issues.push({ type: 'offscreen-control', severity: 'critical', detail: (node.innerText || node.getAttribute('aria-label') || node.tagName).trim() }); if (rect.width < 8 || rect.height < 8) issues.push({ type: 'zero-size-control', severity: 'critical', detail: (node.innerText || node.getAttribute('aria-label') || node.tagName).trim() }); }
        for (const node of [...document.querySelectorAll('body *')]) { const style = getComputedStyle(node); const rect = node.getBoundingClientRect(); if (!rect.width || !rect.height || style.overflow === 'visible') continue; const flowOverflow = [...node.querySelectorAll('*')].some((child) => { const childStyle = getComputedStyle(child); const childRect = child.getBoundingClientRect(); return childStyle.position !== 'absolute' && childStyle.position !== 'fixed' && (childRect.right > rect.right + 2 || childRect.left < rect.left - 2); }); if (node.scrollWidth > node.clientWidth + 2 && flowOverflow && !node.matches('[data-carousel], [data-slider], .carousel, .event-viewport, .event-track')) issues.push({ type: 'clipped-content', severity: 'critical', detail: node.className || node.id || node.tagName }); }
        const fixed = [...document.querySelectorAll('*')].filter((node) => getComputedStyle(node).position === 'fixed').map((node) => node.getBoundingClientRect()).filter((rect) => rect.width > innerWidth * 1.25 || rect.height > innerHeight * 1.25); if (fixed.length) issues.push({ type: 'oversized-fixed-container', severity: 'critical', detail: `${fixed.length} fixed container(s)` });
        return { issues };
      });
      results.push({ ...viewport, ...result, status: result.issues.some((issue) => issue.severity === 'critical') ? 'FAIL' : 'PASS' });
      await context.close();
    }
  } finally { await browser.close(); }
  const report = { generatedAt: new Date().toISOString(), viewports: results, status: results.some((result) => result.status === 'FAIL') ? 'FAIL' : 'PASS', failureReasons: results.flatMap((result) => result.issues.map((issue) => `${result.name}: ${issue.type} — ${issue.detail}`)) };
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function main() { const args = parseArgs(process.argv.slice(2)); const report = await runResponsiveQa({ url: args.url, output: path.resolve(args.output || 'qa/responsive-report.json') }); process.exitCode = report.status === 'PASS' ? 0 : 1; }
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
