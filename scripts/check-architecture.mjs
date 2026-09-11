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

/*
 * Classes mortes dans les modules CSS. Une classe supprimée à tort est partie en production le
 * 2026-09-09 parce qu'une recherche de `styles.<classe>` ne voyait pas son usage : le module
 * était ré-exporté sous un autre nom. La règle est donc calibrée pour n'avoir aucun faux positif,
 * quitte à laisser passer des classes réellement mortes, et les quatre cas connus sont traités.
 *
 * 1. Import sous alias — le nom local du binding est résolu par fichier, jamais supposé `styles`.
 * 2. Objet de styles ré-exporté — `export { styles as xStyles }` ajoute `xStyles` aux noms cherchés.
 * 3. Accès par crochets — `styles[variable]` rend le module inanalysable : il est exclu et **listé**
 *    dans la sortie, pour que l'exclusion soit un choix visible et non un faux négatif silencieux.
 * 4. Usage en CSS seul — une classe en position descendante (`.footer .btn`), cible d'un
 *    `composes:` ou dans un `:global(...)` sert réellement sans apparaître en TypeScript.
 */
const CSS_MODULE_IMPORT_RE =
  /import\s+(?:(\w+)|\*\s+as\s+(\w+))\s+from\s*['"]([^'"]+\.module\.css)['"]/g;
const CLASS_IN_COMPOUND_RE = /\.(-?[A-Za-z_][\w-]*)/g;
const GLOBAL_SELECTOR_RE = /:global\s*\(([^)]*)\)/g;
const COMPOSES_RE = /composes\s*:\s*([^;}]+)/g;

function selectorsOf(text) {
  const selectors = [];
  let buffer = '';
  for (const character of text) {
    if (character === '{') {
      const selector = buffer.trim();
      if (selector && !selector.startsWith('@')) selectors.push(selector);
      buffer = '';
    } else if (character === '}') buffer = '';
    else buffer += character;
  }
  return selectors;
}

function classesOfCssModule(text) {
  const leading = new Set();
  const usedInCss = new Set();

  for (const [, inside] of text.matchAll(GLOBAL_SELECTOR_RE))
    for (const [, name] of inside.matchAll(CLASS_IN_COMPOUND_RE)) usedInCss.add(name);

  for (const [, value] of text.matchAll(COMPOSES_RE))
    for (const name of value.trim().split(/\s+/)) if (name !== 'from') usedInCss.add(name);

  const withoutGlobals = text.replace(GLOBAL_SELECTOR_RE, ' ');
  for (const selector of selectorsOf(withoutGlobals)) {
    for (const alternative of selector.split(',')) {
      const compounds = alternative.trim().split(/[\s>+~]+/).filter(Boolean);
      compounds.forEach((compound, index) => {
        for (const [, name] of compound.matchAll(CLASS_IN_COMPOUND_RE))
          (index === 0 ? leading : usedInCss).add(name);
      });
    }
  }
  return { leading, usedInCss };
}

function checkDeadCssClasses(cssFiles, tsFiles) {
  const modules = new Map();
  for (const file of cssFiles) {
    if (!file.endsWith('.module.css')) continue;
    modules.set(file, { bindingsByFile: new Map(), aliases: new Set() });
  }

  const sources = new Map(tsFiles.map((file) => [file, readFileSync(file, 'utf8')]));

  for (const [file, source] of sources) {
    for (const [, defaultName, namespaceName, spec] of source.matchAll(CSS_MODULE_IMPORT_RE)) {
      const binding = defaultName || namespaceName;
      const target = resolveImport(spec, file);
      const entry = target && modules.get(target);
      if (!entry) continue;
      entry.bindingsByFile.set(file, binding);
      for (const [, clause] of source.matchAll(/export\s*\{([^}]*)\}/g))
        for (const specifier of clause.split(',')) {
          const [local, exported] = specifier.split(/\s+as\s+/).map((part) => part.trim());
          if (local === binding && exported) entry.aliases.add(exported);
        }
    }
  }

  const excluded = [];
  for (const [file, entry] of modules) {
    const path = rel(file);
    if (entry.bindingsByFile.size === 0) continue;

    const names = new Set();
    let bracketAccess = false;
    for (const [source, text] of sources) {
      const bindings = new Set();
      const own = entry.bindingsByFile.get(source);
      if (own) bindings.add(own);
      for (const alias of entry.aliases) if (text.includes(alias)) bindings.add(alias);
      for (const binding of bindings) {
        if (new RegExp(`\\b${binding}\\s*\\[`).test(text)) bracketAccess = true;
        for (const [, name] of text.matchAll(new RegExp(`\\b${binding}\\.(\\w+)`, 'g')))
          names.add(name);
      }
    }
    if (bracketAccess) {
      excluded.push(path);
      continue;
    }

    const { leading, usedInCss } = classesOfCssModule(readFileSync(file, 'utf8'));
    for (const name of leading) {
      if (usedInCss.has(name) || names.has(name)) continue;
      const camel = name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (names.has(camel)) continue;
      violations.push(`${path} : .${name} déclarée et jamais utilisée — supprimer la classe`);
    }
  }
  return excluded;
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
const cssModulesExcluded = checkDeadCssClasses(
  webFiles.filter((f) => f.endsWith('.css')),
  webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
);
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
  "Architecture : aucune violation (commentaires, couches API, shared/ feuille, cycles d'imports, jetons du design system, primitives Modal et Button, cibles tactiles, classes CSS mortes)."
);
if (cssModulesExcluded.length > 0)
  console.log(
    `Classes mortes — ${cssModulesExcluded.length} module(s) exclus, accès par crochets donc inanalysables : ${cssModulesExcluded.join(', ')}`
  );
