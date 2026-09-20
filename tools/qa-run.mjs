import fs from 'node:fs';
import path from 'node:path';

export function writeLatestRun(projectRoot, outputDir) {
  const root = path.resolve(projectRoot);
  const resolvedOutput = path.resolve(outputDir);
  const relative = path.relative(root, resolvedOutput).replaceAll('\\', '/');
  if (!relative || relative === '.') {
    throw new Error('QA output directory must be inside the project and may not be the project root.');
  }
  if (relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error('Canonical QA output must be inside the project root.');
  }
  const canonicalDir = path.join(root, 'qa');
  fs.mkdirSync(canonicalDir, { recursive: true });
  const pointer = { version: 1, generatedAt: new Date().toISOString(), outputDir: relative };
  fs.writeFileSync(path.join(canonicalDir, 'latest-run.json'), `${JSON.stringify(pointer, null, 2)}\n`);
  return pointer;
}

export function resolveLatestRun(projectRoot) {
  const root = path.resolve(projectRoot);
  const pointerPath = path.join(root, 'qa', 'latest-run.json');
  if (!fs.existsSync(pointerPath)) return { outputDir: path.join(root, 'qa'), pointerPath: null };
  const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
  if (pointer.version !== 1 || typeof pointer.outputDir !== 'string') throw new Error('qa/latest-run.json is invalid.');
  const outputDir = path.resolve(root, pointer.outputDir);
  const relative = path.relative(root, outputDir).replaceAll('\\', '/');
  if (!relative || relative === '.' || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error('qa/latest-run.json points outside the project.');
  }
  return { outputDir, pointerPath, pointer };
}
