import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = ['tools/visual-qa.mjs', 'tools/source-fingerprint.mjs', 'tools/reference-measure.mjs', 'tools/reference-spec.mjs', 'tools/geometry-qa.mjs', 'tools/responsive-qa.mjs', 'tools/interaction-patterns.mjs', 'tools/interaction-coverage.mjs', 'tools/interaction-authoring.mjs', 'tools/interaction-plan.mjs', 'tools/interaction-qa.mjs', 'tools/motion-qa.mjs', 'tools/qa-run.mjs', 'tools/workflow-router.mjs', 'tools/design-capture.mjs', 'tools/design-visual-reference.mjs', 'tools/design-gate.mjs', 'tools/design-handoff.mjs', '.codex/hooks/stop-reference-publish.mjs'];
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  assert.ok(fs.existsSync(file), `${file} should exist`);
}
JSON.parse(fs.readFileSync('.codex/hooks.json', 'utf8'));
const config = fs.readFileSync('.codex/config.toml', 'utf8');
assert.match(config, /model = "gpt-6-sol"/);
assert.match(config, /\[agents\]/);
const agentExpectations = new Map([
  ['planner-design-director.toml', ['gpt-6-sol', 'high']],
  ['verifier-visual-critic.toml', ['gpt-6-sol', 'high']],
  ['general-ui-coder.toml', ['gpt-6-luna', 'high']],
  ['motion-coder.toml', ['gpt-6-sol', 'high']],
  ['debugger.toml', ['gpt-6-sol', 'high']],
  ['explorer.toml', ['gpt-6-luna', 'medium']],
  ['design-director.toml', ['gpt-6-sol', 'high']],
  ['design-art-director.toml', ['gpt-6-sol', 'high']],
  ['design-ui-planner.toml', ['gpt-6-sol', 'high']],
  ['design-composer.toml', ['gpt-6-luna', 'high']],
  ['design-visual-critic.toml', ['gpt-6-sol', 'high']]
]);
for (const [file, [model, effort]] of agentExpectations) {
  const toml = fs.readFileSync(`.codex/agents/${file}`, 'utf8');
  for (const field of ['name', 'description', 'developer_instructions']) assert.match(toml, new RegExp(`^${field}\\s*=`, 'm'), `${file} requires ${field}`);
  assert.match(toml, new RegExp(`model = "${model.replaceAll('.', '\\.')}`));
  assert.match(toml, new RegExp(`model_reasoning_effort = "${effort}"`));
}
const skillExpectations = new Map([
  ['.agents/skills/workflow-router/SKILL.md', 'workflow-router'],
  ['.agents/skills/design-workflow/SKILL.md', 'design-workflow'],
  ['.agents/skills/design-handoff/SKILL.md', 'design-handoff'],
  ['.agents/skills/design-art-direction/SKILL.md', 'design-art-direction'],
  ['.agents/skills/visual-reference-design/SKILL.md', 'visual-reference-design']
]);
for (const [file, name] of skillExpectations) {
  const markdown = fs.readFileSync(file, 'utf8');
  assert.match(markdown, /^---\r?\n/, `${file} requires YAML frontmatter`);
  assert.match(markdown, new RegExp(`^name: ${name}$`, 'm'), `${file} requires canonical name`);
  assert.match(markdown, /^description: .+$/m, `${file} requires description`);
}
console.log('syntax, hook JSON, and official project agent configuration: PASS');
