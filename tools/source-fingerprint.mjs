import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const IGNORED_TOP_LEVEL = new Set(['.git', '.agents', '.codex', 'node_modules', 'tools', 'tests', 'work']);

function shouldIgnore(relativePath) {
  const parts = relativePath.split(/[\\/]/);
  const topLevel = parts[0];
  const qaArtifactRoot = topLevel === 'qa' || /^qa[-_.].+$/i.test(topLevel);
  return IGNORED_TOP_LEVEL.has(topLevel) || qaArtifactRoot;
}

export function sourceFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replaceAll('\\', '/');
      if (shouldIgnore(relative)) continue;
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(relative);
    }
  }
  visit(root);
  return files.sort();
}

export function createSourceFingerprint(root = process.cwd()) {
  const resolvedRoot = path.resolve(root);
  const hash = crypto.createHash('sha256');
  const files = sourceFiles(resolvedRoot);
  for (const relative of files) {
    hash.update(relative);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(resolvedRoot, relative)));
    hash.update('\0');
  }
  return { algorithm: 'sha256', files, value: hash.digest('hex') };
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\', '/')}`) {
  process.stdout.write(`${JSON.stringify(createSourceFingerprint(process.argv[2] || process.cwd()), null, 2)}\n`);
}
