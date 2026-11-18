import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname, sep } from 'node:path';

export const root = resolve(import.meta.dirname, '../..');
export const webSrc = join(root, 'apps/web/src');

const IGNORED_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', 'coverage', 'generated']);

export function walk(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

export function readTexts(files) {
  return new Map(files.map((file) => [file, readFileSync(file, 'utf8')]));
}

export const rel = (file) => relative(root, file).split(sep).join('/');

export const isTestFile = (file) => file.includes('.test.');

const IMPORT_RE = /^\s*(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]/gm;
const DYNAMIC_IMPORT_RE = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

export function staticImportsIn(text) {
  return [...text.matchAll(IMPORT_RE)].map((m) => m[1]);
}

function dynamicImportsIn(text) {
  return [...text.matchAll(DYNAMIC_IMPORT_RE)].map((m) => m[1]);
}

export function allImportsIn(text) {
  return [...staticImportsIn(text), ...dynamicImportsIn(text)];
}

function isFileOnDisk(candidate) {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

export function createImportResolver(isFile = isFileOnDisk) {
  return (spec, from) => {
    let base;
    if (spec.startsWith('@/')) base = join(webSrc, spec.slice(2));
    else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
    else return null;
    return (
      [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(
        isFile
      ) ?? null
    );
  };
}

export const resolveImport = createImportResolver();
