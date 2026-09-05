#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const webSrc = join(root, 'apps/web/src');
const apiSrc = join(root, 'apps/api-dotnet/MoviePicker.Api');
const violations = [];

const IGNORED_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', 'coverage']);

function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

const rel = (file) => relative(root, file).split(sep).join('/');

const ALLOWED_COMMENT =
  /^(?:\{?\/\*+|\/\/+)\s*(eslint|stylelint|@ts-|ts-expect|prettier-ignore|<reference|!|#!|Copyright|SPDX)/i;

function checkComments(files) {
  for (const file of files) {
    let inBlock = false;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((raw, index) => {
        const line = raw.trim();
        if (inBlock) {
          if (line.includes('*/')) inBlock = false;
          violations.push(`${rel(file)}:${index + 1} commentaire interdit`);
          return;
        }
        if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('{/*')) {
          if (ALLOWED_COMMENT.test(line)) return;
          if (line.startsWith('/*') && !line.includes('*/')) inBlock = true;
          if (line.startsWith('{/*') && !line.includes('*/')) inBlock = true;
          violations.push(`${rel(file)}:${index + 1} commentaire interdit`);
        }
      });
  }
}

const IMPORT_RE = /^\s*(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/gm;

function importsOf(file) {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(IMPORT_RE)].map((m) => m[1]);
}

function resolveImport(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = join(webSrc, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

function checkSharedIsALeaf(files) {
  for (const file of files) {
    if (!rel(file).startsWith('apps/web/src/shared/')) continue;
    for (const spec of importsOf(file)) {
      if (spec.startsWith('@/features/'))
        violations.push(`${rel(file)} importe ${spec} — shared/ ne doit dépendre d'aucune feature`);
    }
  }
}

function checkNoImportCycles(files) {
  const graph = new Map();
  for (const file of files) {
    if (file.includes('.test.')) continue;
    graph.set(
      file,
      importsOf(file)
        .map((spec) => resolveImport(spec, file))
        .filter((target) => target && !target.includes('.test.'))
    );
  }
  const state = new Map();
  const walkNode = (node, stack) => {
    state.set(node, 1);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (state.get(next) === 1) {
        const cycle = stack.slice(stack.indexOf(next)).concat(next).map(rel).join(' -> ');
        violations.push(`cycle d'imports : ${cycle}`);
      } else if (!state.has(next) && graph.has(next)) walkNode(next, stack);
    }
    stack.pop();
    state.set(node, 2);
  };
  for (const node of graph.keys()) if (!state.has(node)) walkNode(node, []);
}

const USING_RE = /^using\s+(?:static\s+)?([A-Za-z0-9_.]+)\s*;/gm;

function usingsOf(file) {
  return [...readFileSync(file, 'utf8').matchAll(USING_RE)].map((m) => m[1]);
}

const LAYER_RULES = [
  {
    layer: 'Domain',
    allow: [/^System(\.|$)/, /^MoviePicker\.Api\.Domain(\.|$)/],
    message: 'le domaine ne doit dépendre que de System et de lui-même',
  },
  {
    layer: 'Application',
    forbid: [
      /^MongoDB(\.|$)/,
      /^Microsoft\.AspNetCore(\.|$)/,
      /^MoviePicker\.Api\.Infrastructure(\.|$)/,
      /^MoviePicker\.Api\.Controllers(\.|$)/,
    ],
    message: "l'application ne doit connaître ni le framework web, ni la base, ni l'infrastructure",
  },
  {
    layer: 'Controllers',
    forbid: [/^MongoDB(\.|$)/, /^MoviePicker\.Api\.Infrastructure\.Persistence(\.|$)/],
    message: 'un contrôleur passe par un cas d’usage, jamais par la persistance',
  },
];

function checkApiLayers() {
  for (const rule of LAYER_RULES) {
    for (const file of walk(join(apiSrc, rule.layer), ['.cs'])) {
      for (const ns of usingsOf(file)) {
        const broken = rule.allow
          ? !rule.allow.some((re) => re.test(ns))
          : rule.forbid.some((re) => re.test(ns));
        if (broken) violations.push(`${rel(file)} : using ${ns} — ${rule.message}`);
      }
    }
  }
}

const webFiles = walk(webSrc, ['.ts', '.tsx', '.css']);
const apiFiles = walk(join(root, 'apps/api-dotnet'), ['.cs']);
const e2eFiles = walk(join(root, 'e2e'), ['.ts']);

checkComments([...webFiles, ...apiFiles, ...e2eFiles]);
checkSharedIsALeaf(webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')));
checkNoImportCycles(webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')));
checkApiLayers();

if (violations.length > 0) {
  console.error(`\n${violations.length} violation(s) des règles d'architecture :\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    '\nRègles : AGENTS.md (style) et architecture hexagonale (Domain < Application < Infrastructure).\n'
  );
  process.exit(1);
}
console.log(
  "Architecture : aucune violation (commentaires, couches API, shared/ feuille, cycles d'imports)."
);
