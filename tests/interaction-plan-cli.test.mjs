import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'interaction-plan-cli-'));
const tool = path.resolve('tools/interaction-plan.mjs');
const page = path.join(temporary, 'scene.html');
const languageFile = path.join(temporary, 'motion-language.json');
const output = path.join(temporary, 'plan.json');
const run = (args) => execFileSync(process.execPath, [tool, ...args], { encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
const rejects = (args, message) => {
  let failure;
  try { run(args); } catch (error) { failure = error; }
  assert.ok(failure, 'invalid input must exit unsuccessfully');
  assert.match(failure.stderr, message);
  assert.equal(fs.existsSync(output), false, 'invalid input must not create a misleading plan');
};

try {
  fs.writeFileSync(page, '<style>section,[data-motion-sample],[data-scene]{display:block;width:240px;height:80px}</style><section id="scene" data-motion-recipe="scene-transition"><div data-motion-sample data-state="previous-scene"></div><div data-scene class="active"></div></section>');
  const language = { character: 'editorial', pace: 'measured', preferredFamilies: ['scene-transition'], bannedFamilies: [], preferredPrimitives: ['text-image-shift'], bannedPrimitives: [], sectionEntryVariation: 'Follow the content of each scene', pointerUsage: 'content-reactive', continuousMotionUsage: 'visible content objects', scrollStory: 'content progression' };
  fs.writeFileSync(languageFile, JSON.stringify(language));
  const base = ['--url', page, '--output', output, '--source-root', temporary];

  // Authored choices must survive the real CLI path into candidate selection.
  run([...base, '--mode', 'design', '--motion-language', languageFile]);
  const plan = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.deepEqual(plan.motionLanguage, language);
  assert.equal(plan.designMode, 'design');
  assert.equal(plan.candidates.find((candidate) => candidate.recipe === 'scene-transition').authoring.primitive, 'text-image-shift');
  assert.equal(path.resolve(plan.sourceRoot), path.resolve(temporary));
  fs.unlinkSync(output);

  // Omitted/invalid input cannot silently fall back to an unrelated design.
  rejects([...base, '--mode', 'design'], /authored motionLanguage/);
  rejects([...base, '--mode', 'design', '--motion-language'], /requires a JSON file path/);
  fs.writeFileSync(languageFile, JSON.stringify({ ...language, preferredFamilies: 'scene-transition' }));
  rejects([...base, '--mode', 'design', '--motion-language', languageFile], /preferredFamilies must be an array/);
  fs.writeFileSync(languageFile, JSON.stringify(language));
  rejects([...base, '--mode', 'reference', '--motion-language', languageFile], /only accepted in --mode design/);

  // The publishing default remains reference mode with the same evidence contract.
  run(base);
  const reference = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(reference.designMode, 'reference');
  assert.equal(reference.motionLanguage, null);
  assert.ok(reference.candidates.some((candidate) => candidate.recipe === 'scene-transition' && candidate.provenance === 'source-annotation'));
  console.log('interaction-plan CLI authored design input and reference compatibility: PASS');
} finally {
  // The target is the exact directory returned by mkdtemp, outside the source tree.
  fs.rmSync(temporary, { recursive: true, force: true });
}
