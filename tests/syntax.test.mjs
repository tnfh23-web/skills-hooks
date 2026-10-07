import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = ['tools/visual-qa.mjs', 'tools/source-fingerprint.mjs', 'tools/reference-measure.mjs', 'tools/reference-spec.mjs', 'tools/geometry-qa.mjs', 'tools/responsive-qa.mjs', 'tools/interaction-patterns.mjs', 'tools/interaction-coverage.mjs', 'tools/interaction-authoring.mjs', 'tools/interaction-plan.mjs', 'tools/interaction-qa.mjs', 'tools/motion-qa.mjs', 'tools/qa-run.mjs', '.codex/hooks/stop-reference-publish.mjs'];
for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  assert.ok(fs.existsSync(file), `${file} should exist`);
}
JSON.parse(fs.readFileSync('.codex/hooks.json', 'utf8'));
const config = fs.readFileSync('.codex/config.toml', 'utf8');
assert.match(config, /^model = "gpt-6\.1-sol"$/m);
assert.match(config, /^model_reasoning_effort = "high"$/m);
assert.match(config, /\[agents\]/);
assert.match(config, /^default_subagent_model = "gpt-6\.1-sol"$/m);
assert.match(config, /^default_subagent_reasoning_effort = "medium"$/m);
const agentExpectations = new Map([
  ['reference-planner.toml', ['gpt-6.1-sol', 'high']],
  ['verifier-visual-critic.toml', ['gpt-6.1-sol', 'high']],
  ['general-ui-coder.toml', ['gpt-6-luna', 'medium']],
  ['motion-coder.toml', ['gpt-6.1-sol', 'high']],
  ['debugger.toml', ['gpt-6.1-sol', 'high']],
  ['explorer.toml', ['gpt-6-luna', 'medium']]
]);
for (const [file, [model, effort]] of agentExpectations) {
  const toml = fs.readFileSync(`.codex/agents/${file}`, 'utf8');
  for (const field of ['name', 'description', 'developer_instructions']) assert.match(toml, new RegExp(`^${field}\\s*=`, 'm'), `${file} requires ${field}`);
  assert.match(toml, new RegExp(`model = "${model.replaceAll('.', '\\.')}`));
  assert.match(toml, new RegExp(`model_reasoning_effort = "${effort}"`));
}
console.log('syntax, hook JSON, and official project agent configuration: PASS');
