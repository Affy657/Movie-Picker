import { FEATURE_EDGES } from './featureEdges.mjs';
import { allImportsIn, isTestFile, rel, resolveImport as resolveOnDisk } from './sources.mjs';

const FEATURE_OF = /^apps\/web\/src\/features\/([a-z]+)\//;
const FEATURE_SPEC = /^@\/features\/([a-z]+)\//;
const APP_DIR = 'apps/web/src/app/';
const APP_SPEC = /^@\/app\//;
const LAYERS_BELOW_APP = ['apps/web/src/features/', 'apps/web/src/shared/'];

export const APP_MODULES_BELOW_APP = new Map([
  [
    'apps/web/src/app/routes.ts',
    'the route table, a leaf that imports no feature: every link of the application reads its paths from it',
  ],
  [
    'apps/web/src/app/moviePageChunk.ts',
    'the loader of the movie page, which composes several features from app/pages/movie/: a feature list prefetches it, and only reaches it through import()',
  ],
]);

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

function appModuleOfImport(spec, from, resolveImport) {
  const target = resolveImport(spec, from);
  if (!target) return APP_SPEC.test(spec) ? spec : null;
  const path = rel(target);
  return path.startsWith(APP_DIR) ? path : null;
}

export function appLayerViolations(file, text, resolveImport = resolveOnDisk) {
  const path = rel(file);
  if (isTestFile(file) || !LAYERS_BELOW_APP.some((layer) => path.startsWith(layer))) return [];
  return allImportsIn(text)
    .filter((spec) => {
      const target = appModuleOfImport(spec, file, resolveImport);
      return target && !APP_MODULES_BELOW_APP.has(target);
    })
    .map(
      (spec) =>
        `${path} imports ${spec}: app/ composes features/ and shared/, which never import it back (exceptions: APP_MODULES_BELOW_APP of scripts/architecture/frontImports.mjs)`
    );
}

export function importCycleViolations(texts, resolveImport = resolveOnDisk) {
  const found = [];
  const graph = new Map();
  for (const [file, text] of texts) {
    if (isTestFile(file)) continue;
    graph.set(
      file,
      allImportsIn(text)
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
