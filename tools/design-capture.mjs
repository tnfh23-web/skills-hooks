import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

export const DESIGN_VIEWPORTS = Object.freeze({
  desktop: { width: 1440, height: 900 },
  tablet: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 }
});

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

function targetUrl(value) {
  if (/^[a-z]+:\/\//i.test(value)) return value;
  return pathToFileURL(path.resolve(value)).href;
}

export async function captureDesignReview({ url, outputDir = 'work/design/review', viewports = DESIGN_VIEWPORTS }) {
  if (!url) throw new Error('A prototype URL or local HTML path is required.');
  const resolvedOutput = path.resolve(outputDir);
  fs.mkdirSync(resolvedOutput, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const artifacts = {};
  try {
    for (const [name, viewport] of Object.entries(viewports)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(targetUrl(url), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts?.ready);
      const output = path.join(resolvedOutput, `${name}.png`);
      await page.screenshot({ path: output, fullPage: true, animations: 'disabled' });
      artifacts[name] = output;
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return artifacts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) throw new Error('Missing required argument --url');
  const result = await captureDesignReview({ url: args.url, outputDir: args.output });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
