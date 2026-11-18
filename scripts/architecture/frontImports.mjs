import { FEATURE_EDGES } from './featureEdges.mjs';
import {
  allImportsIn,
  isTestFile,
  rel,
  resolveImport as resolveOnDisk,
  staticImportsIn,
} from './sources.mjs';

const FEATURE_OF = /^apps\/web\/src\/features\/([a-z]+)\//;
const FEATURE_SPEC = /^@\/features\/([a-z]+)\//;

function featureOfImport(spec, from, resolveImport) {
  const target = resolveImport(spec, from);
  return target ? FEATURE_OF.exec(rel(target))?.[1] : FEATURE_SPEC.exec(spec)?.[1];
}

export function sharedLeafViolations(file, text, resolveImport = resolveOnDisk) {
  if (!rel(file).startsWith('apps/web/src/shared/') || isTestFile(file)) return [];
  return allImportsIn(text)
    .filter((spec) => featureOfImport(spec, file, resolveImport))
    .map((spec) => `${rel(file)} imports ${spec}: shared/ must not depend on any feature`);
}

export function featureLayerViolations(file, text, resolveImport = resolveOnDisk) {
  const from = FEATURE_OF.exec(rel(file))?.[1];
  if (!from) return [];
  const allowed = FEATURE_EDGES[from];
  if (!allowed) {
    return [
      `${rel(file)}: feature "${from}" is not in FEATURE_EDGES of scripts/architecture/featureEdges.mjs, declare what it may import`,
    ];
  }
  const found = [];
  for (const spec of allImportsIn(text)) {
    const to = featureOfImport(spec, file, resolveImport);
    if (!to || to === from || allowed.includes(to)) continue;
    found.push(
      `${rel(file)} imports ${spec}: feature "${from}" may only import ${allowed.length ? allowed.join(', ') : 'no other feature'}`
    );
  }
  return found;
}

export function importCycleViolations(texts, resolveImport = resolveOnDisk) {
  const found = [];
  const graph = new Map();
  for (const [file, text] of texts) {
    if (isTestFile(file)) continue;
    graph.set(
      file,
      staticImportsIn(text)
        .map((spec) => resolveImport(spec, file))
        .filter((target) => target && !isTestFile(target))
    );
  }
  const state = new Map();
  const walkNode = (node, stack) => {
    state.set(node, 1);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (state.get(next) === 1) {
        const cycle = stack.slice(stack.indexOf(next)).concat(next).map(rel).join(' -> ');
        found.push(`import cycle: ${cycle}`);
      } else if (!state.has(next) && graph.has(next)) walkNode(next, stack);
    }
    stack.pop();
    state.set(node, 2);
  };
  for (const node of graph.keys()) if (!state.has(node)) walkNode(node, []);
  return found;
}
