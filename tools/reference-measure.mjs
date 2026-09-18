import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] || 0;
}

function rowStats(image) {
  const rows = [];
  for (let y = 0; y < image.height; y += 1) {
    let r = 0; let g = 0; let b = 0; let variance = 0;
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4;
      r += image.data[i]; g += image.data[i + 1]; b += image.data[i + 2];
    }
    r /= image.width; g /= image.width; b /= image.width;
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4;
      variance += Math.abs(image.data[i] - r) + Math.abs(image.data[i + 1] - g) + Math.abs(image.data[i + 2] - b);
    }
    rows.push({ y, r, g, b, variance: variance / image.width });
  }
  return rows;
}

export function measureReferencePng(referencePath, { minBandHeight = 32 } = {}) {
  const image = PNG.sync.read(fs.readFileSync(referencePath));
  const rows = rowStats(image);
  const changes = rows.map((row, index) => index === 0 ? 0 : Math.abs(row.r - rows[index - 1].r) + Math.abs(row.g - rows[index - 1].g) + Math.abs(row.b - rows[index - 1].b));
  const threshold = Math.max(8, percentile(changes, 0.95));
  const candidates = [];
  let last = -minBandHeight;
  for (let y = 1; y < changes.length - 1; y += 1) {
    if (changes[y] < threshold || y - last < minBandHeight) continue;
    const window = changes.slice(Math.max(1, y - 3), Math.min(changes.length, y + 4));
    const peak = Math.max(...window);
    if (changes[y] !== peak) continue;
    candidates.push({ y, score: Number(changes[y].toFixed(3)), confidence: changes[y] >= threshold * 1.5 ? 'high' : 'medium' });
    last = y;
  }
  return {
    source: 'png-pixel-scan',
    coordinateSpace: 'reference-pixels',
    reference: { path: path.resolve(referencePath), width: image.width, height: image.height },
    method: 'row-average RGB discontinuity with separated local peaks; candidates require DOM/source confirmation before becoming major element bounds',
    threshold: Number(threshold.toFixed(3)),
    horizontalBoundaryCandidates: candidates,
    rowStats: rows.map((row) => ({ y: row.y, mean: [Number(row.r.toFixed(2)), Number(row.g.toFixed(2)), Number(row.b.toFixed(2))], variance: Number(row.variance.toFixed(2)) }))
  };
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, token, index, values) => token.startsWith('--') ? [...pairs, [token.slice(2), values[index + 1]]] : pairs, []));
  if (!args.reference) throw new Error('Missing --reference');
  const result = measureReferencePng(args.reference, { minBandHeight: Number(args['min-band-height'] || 32) });
  if (args.output) { fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true }); fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(result, null, 2)}\n`); }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
