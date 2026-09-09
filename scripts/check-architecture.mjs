#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const webSrc = join(root, 'apps/web/src');
const apiSrc = join(root, 'apps/api-dotnet/MoviePicker.Api');
const violations = [];

const IGNORED_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', 'coverage', 'generated']);

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
    if (!rel(file).startsWith('apps/web/src/shared/') || file.includes('.test.')) continue;
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

const FOUNDATION = 'apps/web/src/styles/01-foundation.css';
const MODAL_CSS = 'apps/web/src/shared/components/Modal.module.css';
const SHEET_DRAG_CSS = 'apps/web/src/shared/components/sheetDrag.module.css';
const MODAL_TSX = 'apps/web/src/shared/components/Modal.tsx';

const ALLOWED_MEDIA = new Set([
  '(max-width: 24.9375rem)',
  '(max-width: 29.9375rem)',
  '(max-width: 39.9375rem)',
  '(max-width: 47.9375rem)',
  '(max-width: 63.9375rem)',
  '(min-width: 30rem)',
  '(min-width: 40rem)',
  '(min-width: 48rem)',
  '(min-width: 64rem)',
  '(min-width: 80rem)',
  '(pointer: fine)',
  '(pointer: coarse)',
  '(hover: hover)',
  '(hover: none)',
  '(prefers-reduced-motion: reduce)',
  '(display-mode: standalone)',
  '(prefers-color-scheme: dark)',
  '(prefers-color-scheme: light)',
]);

const SPACING_PROP =
  /(?:^|[;{\n])\s*(padding|margin|gap|row-gap|column-gap)(?:-[a-z-]+)?\s*:\s*([^;{}]+)/g;
const RAW_LENGTH = /(?<![\w-])\d*\.?\d+rem/;
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

function checkDesignTokens(cssFiles) {
  for (const file of cssFiles) {
    const path = rel(file);
    const text = readFileSync(file, 'utf8');

    for (const [, query] of text.matchAll(/@media\s+([^{]+)\{/g)) {
      for (const condition of query.trim().split(/\s+and\s+/)) {
        const normalized = condition.trim();
        if (!normalized.startsWith('(')) continue;
        if (!ALLOWED_MEDIA.has(normalized))
          violations.push(
            `${path} : @media ${normalized} hors de l'échelle de points de rupture (AGENTS.md)`
          );
      }
    }

    if (path === FOUNDATION) continue;

    for (const [, prop, value] of text.matchAll(SPACING_PROP)) {
      if (/var\(--space|calc\(|clamp\(|env\(/.test(value)) continue;
      if (RAW_LENGTH.test(value))
        violations.push(`${path} : ${prop}: ${value.trim()} — utiliser var(--space-*)`);
    }

    for (const [, value] of text.matchAll(/font-size\s*:\s*([^;{}]+)/g)) {
      if (/var\(--font-size|clamp\(|inherit|100%/.test(value)) continue;
      violations.push(`${path} : font-size: ${value.trim()} — utiliser var(--font-size-*)`);
    }

    for (const [, value] of text.matchAll(/z-index\s*:\s*([^;{}]+)/g)) {
      if (/var\(--z-/.test(value)) continue;
      violations.push(`${path} : z-index: ${value.trim()} — utiliser var(--z-*)`);
    }

    if (path.endsWith('.module.css') && RAW_COLOR.test(text))
      violations.push(
        `${path} : couleur littérale — passer par un jeton --color-* / --on-poster-*`
      );

    if (path !== MODAL_CSS && path !== SHEET_DRAG_CSS)
      for (const [, selector] of text.matchAll(/([^\s{},]+)::backdrop/g))
        if (/dialog|modal|sheet/i.test(selector))
          violations.push(
            `${path} : ${selector}::backdrop — le fond de modale appartient à Modal.module.css`
          );
  }
}

function checkModalPrimitive(files) {
  for (const file of files) {
    const path = rel(file);
    if (path === MODAL_TSX || file.includes('.test.')) continue;
    if (readFileSync(file, 'utf8').includes('<dialog'))
      violations.push(`${path} : <dialog> écrit à la main — passer par shared/components/Modal`);
  }
}

const BUTTON_TSX = 'apps/web/src/shared/components/Button.tsx';
const BUTTON_CLASS_RE = /className\s*=\s*(?:"[^"]*"|\{(?:[^{}]|\{[^{}]*\})*\})/g;
const RAW_BUTTON_CLASS = /(?<![\w.-])btn(?:-(?:primary|secondary|danger|ghost|sm|md|lg))?(?![\w-])/;

function checkButtonPrimitive(files) {
  for (const file of files) {
    const path = rel(file);
    if (path === BUTTON_TSX || file.includes('.test.')) continue;
    const source = readFileSync(file, 'utf8');
    for (const [attr] of source.matchAll(BUTTON_CLASS_RE)) {
      if (RAW_BUTTON_CLASS.test(attr))
        violations.push(
          `${path} : classe « btn » écrite à la main — passer par shared/components/Button (composant Button ou buttonClass)`
        );
    }
  }
}

const TAP_TARGET_MIN_PX = 44;
const CSS_RULE_RE = /([^{}]+)\{([^{}]*)\}/g;
const MIN_HEIGHT_DECL = /min-height:\s*([0-9.]+)(px|rem)/;

function checkTapTargets(cssFiles) {
  for (const file of cssFiles) {
    const path = rel(file);
    const source = readFileSync(file, 'utf8');
    for (const [, selector, body] of source.matchAll(CSS_RULE_RE)) {
      if (!/cursor:\s*pointer/.test(body)) continue;
      const declared = MIN_HEIGHT_DECL.exec(body);
      if (!declared) continue;
      const value = Number.parseFloat(declared[1]);
      const px = declared[2] === 'rem' ? value * 16 : value;
      if (px >= TAP_TARGET_MIN_PX) continue;
      violations.push(
        `${path} : ${selector.trim()} est cliquable et plafonne à ${px}px — utiliser var(--tap-target-min)`
      );
    }
  }
}

const webFiles = walk(webSrc, ['.ts', '.tsx', '.css']);
const apiFiles = walk(join(root, 'apps/api-dotnet'), ['.cs']);
const e2eFiles = walk(join(root, 'e2e'), ['.ts']);

checkComments([...webFiles, ...apiFiles, ...e2eFiles]);
checkSharedIsALeaf(webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')));
checkNoImportCycles(webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')));
checkDesignTokens(webFiles.filter((f) => f.endsWith('.css')));
checkModalPrimitive(webFiles.filter((f) => f.endsWith('.tsx')));
checkButtonPrimitive(webFiles.filter((f) => f.endsWith('.tsx')));
checkTapTargets(webFiles.filter((f) => f.endsWith('.css')));
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
  "Architecture : aucune violation (commentaires, couches API, shared/ feuille, cycles d'imports, jetons du design system, primitives Modal et Button, cibles tactiles)."
);
