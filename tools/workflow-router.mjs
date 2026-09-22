import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const WORKFLOW_ROUTES = Object.freeze({
  REFERENCE_PUBLISH: 'REFERENCE_PUBLISH',
  DESIGN_AND_PUBLISH: 'DESIGN_AND_PUBLISH',
  DESIGN_ONLY: 'DESIGN_ONLY'
});

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === undefined) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

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

export function decideWorkflowRoute(input = {}) {
  const referencePresent = toBoolean(input.referencePresent);
  const implementationRequested = toBoolean(input.implementationRequested);
  const designOnly = toBoolean(input.designOnly);
  const faithfulImplementation = toBoolean(input.faithfulImplementation);
  const evidence = Array.isArray(input.evidence) ? input.evidence.filter(Boolean) : [];

  let route;
  if (designOnly) route = WORKFLOW_ROUTES.DESIGN_ONLY;
  else if (referencePresent && faithfulImplementation) route = WORKFLOW_ROUTES.REFERENCE_PUBLISH;
  else if (!referencePresent && implementationRequested) route = WORKFLOW_ROUTES.DESIGN_AND_PUBLISH;
  else throw new Error('Workflow route is ambiguous. Supply explicit reference, implementation, and design-only evidence.');

  const inferredEvidence = evidence.length ? evidence : [
    `referencePresent=${referencePresent}`,
    `faithfulImplementation=${faithfulImplementation}`,
    `implementationRequested=${implementationRequested}`,
    `designOnly=${designOnly}`
  ];

  return { version: 1, route, referencePresent, implementationRequested, designOnly, evidence: inferredEvidence };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const route = decideWorkflowRoute({
    referencePresent: args['reference-present'],
    faithfulImplementation: args['faithful-implementation'],
    implementationRequested: args['implementation-requested'],
    designOnly: args['design-only'],
    evidence: args.evidence ? [args.evidence] : []
  });
  const output = path.resolve(args.output || 'work/workflow-route.json');
  writeJson(output, route);
  console.log(`${route.route}: ${output}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
