import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { measureReferencePng } from './reference-measure.mjs';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

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

function dimensions(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.png') {
    const image = PNG.sync.read(fs.readFileSync(file));
    return { width: image.width, height: image.height };
  }
  if (extension === '.svg') {
    const source = fs.readFileSync(file, 'utf8');
    const viewBox = source.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
    const width = source.match(/\bwidth\s*=\s*["']\s*([\d.]+)/i)?.[1];
    const height = source.match(/\bheight\s*=\s*["']\s*([\d.]+)/i)?.[1];
    return viewBox ? { width: Number(viewBox[1]), height: Number(viewBox[2]) } : width && height ? { width: Number(width), height: Number(height) } : null;
  }
  const data = fs.readFileSync(file);
  if (extension === '.jpg' || extension === '.jpeg') {
    for (let i = 2; i < data.length; i += 1) {
      if (data[i] !== 0xff || data[i + 1] < 0xc0 || data[i + 1] > 0xc3) continue;
      return { height: data.readUInt16BE(i + 5), width: data.readUInt16BE(i + 7) };
    }
  }
  return null;
}

export function inventoryAssets(assetRoot) {
  const root = path.resolve(assetRoot);
  const assets = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        const size = dimensions(absolute);
        assets.push({ file: path.relative(root, absolute).replaceAll('\\', '/'), ...size, aspectRatio: size ? Number((size.width / size.height).toFixed(4)) : null });
      }
    }
  }
  visit(root);
  return assets.sort((a, b) => a.file.localeCompare(b.file));
}

export function validateReferenceSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object') errors.push('spec must be an object');
  if (!spec.reference?.width || !spec.reference?.height) errors.push('reference width and height are required');
  if (!['viewport', 'fullPage'].includes(spec.captureMode)) errors.push('captureMode must be viewport or fullPage');
  if (!spec.viewport?.width || !spec.viewport?.height) errors.push('viewport width and height are required');
  if (!Array.isArray(spec.sections)) errors.push('sections must be an array');
  if (!Array.isArray(spec.majorElements)) errors.push('majorElements must be an array');
  for (const [index, element] of (spec.majorElements || []).entries()) {
    if (!element.selector) errors.push(`majorElements[${index}].selector is required`);
    for (const key of ['x', 'y', 'width', 'height']) if (element[key] !== undefined && typeof element[key] !== 'number') errors.push(`majorElements[${index}].${key} must be numeric`);
    if (element.confidence && !['high', 'medium', 'low'].includes(element.confidence)) errors.push(`majorElements[${index}].confidence must be high, medium, or low`);
  }
  return { valid: errors.length === 0, errors };
}

export function createReferenceSpec({ referencePath, viewportWidth, viewportHeight, captureMode = 'viewport', assetRoot, sourceRoot, sections = [], majorElements = [], interactions = [] }) {
  const image = PNG.sync.read(fs.readFileSync(referencePath));
  return {
    generatedAt: new Date().toISOString(),
    reference: { path: path.resolve(referencePath), width: image.width, height: image.height },
    measurement: measureReferencePng(referencePath),
    captureMode,
    viewport: { width: Number(viewportWidth), height: Number(viewportHeight), deviceScaleFactor: 1 },
    sections,
    majorElements,
    interactions,
    assets: assetRoot ? inventoryAssets(assetRoot) : [],
    typography: { source: 'local-first; record fallback when the exact face is unavailable', fallback: null },
    sourceRoot: sourceRoot ? path.resolve(sourceRoot) : null
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const referencePath = path.resolve(args.reference);
  const output = path.resolve(args.output || 'work/reference-spec.json');
  const manifest = args.manifest ? JSON.parse(fs.readFileSync(path.resolve(args.manifest), 'utf8')) : {};
  const spec = createReferenceSpec({
    referencePath,
    viewportWidth: args['viewport-width'] || args.width || 1440,
    viewportHeight: args['viewport-height'] || args.height || 900,
    captureMode: args['capture-mode'] || 'viewport',
    assetRoot: args['asset-root'],
    sourceRoot: args['source-root'],
    sections: manifest.sections || [],
    majorElements: manifest.majorElements || [],
    interactions: manifest.interactions || []
  });
  const result = validateReferenceSpec(spec);
  if (!result.valid) throw new Error(result.errors.join('; '));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(spec, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ output, reference: spec.reference, captureMode: spec.captureMode, assetCount: spec.assets.length }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
