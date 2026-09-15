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
          violations.push(`${rel(file)}:${index + 1} forbidden comment`);
          return;
        }
        if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('{/*')) {
          if (ALLOWED_COMMENT.test(line)) return;
          if (line.startsWith('/*') && !line.includes('*/')) inBlock = true;
          if (line.startsWith('{/*') && !line.includes('*/')) inBlock = true;
          violations.push(`${rel(file)}:${index + 1} forbidden comment`);
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
        violations.push(`${rel(file)} imports ${spec}: shared/ must not depend on any feature`);
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
        violations.push(`import cycle: ${cycle}`);
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
    message: 'the domain must depend on System and itself only',
  },
  {
    layer: 'Application',
    forbid: [
      /^MongoDB(\.|$)/,
      /^Microsoft\.AspNetCore(\.|$)/,
      /^MoviePicker\.Api\.Infrastructure(\.|$)/,
      /^MoviePicker\.Api\.Controllers(\.|$)/,
    ],
    message:
      'the application layer must know neither the web framework, nor the database, nor the infrastructure',
  },
  {
    layer: 'Controllers',
    forbid: [/^MongoDB(\.|$)/, /^MoviePicker\.Api\.Infrastructure\.Persistence(\.|$)/],
    message: 'a controller goes through a use case, never through persistence',
  },
];

function checkApiLayers() {
  for (const rule of LAYER_RULES) {
    for (const file of walk(join(apiSrc, rule.layer), ['.cs'])) {
      for (const ns of usingsOf(file)) {
        const broken = rule.allow
          ? !rule.allow.some((re) => re.test(ns))
          : rule.forbid.some((re) => re.test(ns));
        if (broken) violations.push(`${rel(file)}: using ${ns}, ${rule.message}`);
      }
    }
  }
}

const FOUNDATION = 'apps/web/src/styles/01-foundation.css';
const MODAL_CSS = 'apps/web/src/shared/components/Modal.module.css';
const SHEET_DRAG_CSS = 'apps/web/src/shared/components/SheetDrag.module.css';
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
const PRIMARY_AS_TEXT = /(?<![\w-])color\s*:\s*var\((--color-primary(?:-hover)?)\)/g;
const AD_HOC_ROLE_MIX =
  /color-mix\(in srgb, var\(--color-(primary|error|success|warning|text|text-muted|meta|bg|surface|border|border-subtle)\)/g;
const TOKENISED_PROPS = [
  ['line-height', /var\(--leading-|inherit|normal|^0$/, '--leading-*'],
  ['letter-spacing', /var\(--tracking-|inherit|normal|^0$/, '--tracking-*'],
  ['font-weight', /var\(--font-weight-|inherit/, '--font-weight-*'],
  ['font-family', /var\(--font-|inherit/, '--font-body / --font-mono'],
  ['border-radius', /var\(--radius-|inherit|^(?:(?:0|50%|100%)\s*)+$/, '--radius-*'],
];
const MOTION_PROP =
  /(?:^|[;{\n])\s*(transition|animation)(?:-duration|-timing-function)?\s*:\s*([^;{}]+)/g;
const LITERAL_DURATION = /(?<![\w-])\d*\.?\d+m?s\b/;
const LITERAL_EASING = /(?<![\w-])(?:ease(?:-in|-out|-in-out)?|linear|cubic-bezier\(|steps\()/;
const BORDER_WIDTH =
  /(?:^|[;{\n])\s*(border(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?(?:-width)?)\s*:\s*([^;{}]+)/g;
const OUTLINE_LITERAL = /(?:^|[;{\n])\s*outline\s*:\s*(\d+px\s+solid\s+var\(--color-primary\))/g;
const FOCUS_VISIBLE_RULE = /([^{}]*:focus-visible[^{]*)\{([^}]*)\}/g;
const PRIMITIVE_IN_MODULE =
  /var\((--(?:blue|green|violet|pink|orange|red|cyan|indigo|amber|emerald|yellow|sky)-\d+)\)/g;
const DECLARED_TOKEN = /(--[a-z][\w-]*)\s*:/g;
const USED_TOKEN = /var\((--[a-z][\w-]*)\)/g;
const TOKEN_IN_SOURCE = /['"`](--[a-z][\w-]*)['"`]/g;

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
            `${path}: @media ${normalized} is outside the breakpoint scale (AGENTS.md)`
          );
      }
    }

    if (path === FOUNDATION) continue;

    for (const [, prop, value] of text.matchAll(SPACING_PROP)) {
      if (/var\(--space|calc\(|clamp\(|env\(/.test(value)) continue;
      if (RAW_LENGTH.test(value))
        violations.push(`${path}: ${prop}: ${value.trim()}, use var(--space-*)`);
    }

    for (const [, value] of text.matchAll(/font-size\s*:\s*([^;{}]+)/g)) {
      if (/var\(--font-size|clamp\(|inherit|100%/.test(value)) continue;
      violations.push(`${path}: font-size: ${value.trim()}, use var(--font-size-*)`);
    }

    for (const [, value] of text.matchAll(/z-index\s*:\s*([^;{}]+)/g)) {
      if (/var\(--z-/.test(value)) continue;
      violations.push(`${path}: z-index: ${value.trim()}, use var(--z-*)`);
    }

    if (path.endsWith('.module.css') && RAW_COLOR.test(text))
      violations.push(`${path}: literal colour, use a --color-* / --on-poster-* token`);

    for (const [, token] of text.matchAll(PRIMARY_AS_TEXT))
      violations.push(
        `${path}: color: var(${token}), the primary colours surfaces, text uses --color-primary-text / --color-primary-text-hover`
      );

    if (path.endsWith('.module.css'))
      for (const [primitive] of text.matchAll(PRIMITIVE_IN_MODULE))
        violations.push(
          `${path}: ${primitive}, primitives stay in the foundation, a module consumes a --color-* role`
        );

    if (path.endsWith('.module.css'))
      for (const [, role] of text.matchAll(AD_HOC_ROLE_MIX))
        violations.push(
          `${path}: color-mix() on --color-${role} by hand, use its -bg / -border / -tint / -soft / -hover / -active / -sunken / -translucent token`
        );

    for (const [prop, allowed, tokens] of TOKENISED_PROPS)
      for (const [, value] of text.matchAll(
        new RegExp(`(?:^|[;{\\n])\\s*${prop}\\s*:\\s*([^;{}]+)`, 'g')
      ))
        if (!allowed.test(value.replace(/!important/, '').trim()))
          violations.push(`${path}: ${prop}: ${value.trim()}, use var(${tokens})`);

    for (const [, prop, value] of text.matchAll(MOTION_PROP)) {
      if (/^\s*none\s*$/.test(value)) continue;
      const shown = value.trim().replace(/\s+/g, ' ');
      if (LITERAL_DURATION.test(value))
        violations.push(`${path}: ${prop}: ${shown}, use var(--duration-*)`);
      if (LITERAL_EASING.test(value)) violations.push(`${path}: ${prop}: ${shown}, use var(--ease-*)`);
    }

    for (const [, prop, value] of text.matchAll(BORDER_WIDTH)) {
      const width = value.match(/(?<![\w.])\d*\.?\d+(?:px|rem)/);
      if (width && !['1px', '2px'].includes(width[0]))
        violations.push(
          `${path}: ${prop}: ${value.trim()}, a border is 1px, 2px or var(--border-width-field)`
        );
    }

    for (const [, value] of text.matchAll(OUTLINE_LITERAL))
      violations.push(`${path}: outline: ${value}, use var(--outline-focus)`);

    for (const [, selector, body] of text.matchAll(FOCUS_VISIBLE_RULE))
      if (/outline\s*:\s*none/.test(body) && !/box-shadow\s*:\s*var\(--ring-focus\)/.test(body))
        violations.push(
          `${path}: ${selector.trim().replace(/\s+/g, ' ')} removes the outline without var(--ring-focus), the focus must stay visible`
        );

    if (path !== MODAL_CSS && path !== SHEET_DRAG_CSS)
      for (const [, selector] of text.matchAll(/([^\s{},]+)::backdrop/g))
        if (/dialog|modal|sheet/i.test(selector))
          violations.push(
            `${path}: ${selector}::backdrop, the modal backdrop belongs to Modal.module.css`
          );
  }
}

function checkUndeclaredTokens(cssFiles, sourceFiles) {
  const declared = new Set();
  for (const file of cssFiles)
    for (const [, name] of readFileSync(file, 'utf8').matchAll(DECLARED_TOKEN)) declared.add(name);
  for (const file of sourceFiles)
    for (const [, name] of readFileSync(file, 'utf8').matchAll(TOKEN_IN_SOURCE)) declared.add(name);
  for (const file of cssFiles) {
    const path = rel(file);
    const missing = new Set();
    for (const [, name] of readFileSync(file, 'utf8').matchAll(USED_TOKEN))
      if (!declared.has(name)) missing.add(name);
    for (const name of missing)
      violations.push(`${path}: var(${name}) is declared nowhere, renamed or removed token?`);
  }
}

function checkModalPrimitive(files) {
  for (const file of files) {
    const path = rel(file);
    if (path === MODAL_TSX || file.includes('.test.')) continue;
    if (readFileSync(file, 'utf8').includes('<dialog'))
      violations.push(`${path}: hand-written <dialog>, use shared/components/Modal`);
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
          `${path}: hand-written "btn" class, use shared/components/Button (Button component or buttonClass)`
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
        `${path}: ${selector.trim()} is clickable and caps at ${px}px, use var(--tap-target-min)`
      );
    }
  }
}

/*
 * Dead classes in CSS modules. A class wrongly deleted went to production on 2026-09-09 because
 * a search for `styles.<class>` did not see its usage: the module was re-exported under another
 * name. The rule is therefore calibrated for zero false positives, even if it lets some truly dead
 * classes through, and the four known cases are handled.
 *
 * 1. Aliased import: the local binding name is resolved per file, never assumed to be `styles`.
 * 2. Re-exported styles object: `export { styles as xStyles }` adds `xStyles` to the searched names.
 * 3. Bracket access: `styles[variable]` makes the module unanalysable, so it is excluded and
 *    **listed** in the output, so that the exclusion is a visible choice, not a silent false negative.
 * 4. CSS-only usage: a class in descendant position (`.footer .btn`), the target of a `composes:`
 *    or inside a `:global(...)` is really used without appearing in TypeScript.
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
      const compounds = alternative
        .trim()
        .split(/[\s>+~]+/)
        .filter(Boolean);
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
      violations.push(`${path}: .${name} is declared and never used, delete the class`);
    }
  }
  return excluded;
}

const GLOBAL_CLASS_ADDED_BY_LIBRARIES = new Set(['lucide']);

function checkDeadGlobalClasses(cssFiles, sourceFiles) {
  const haystack = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  for (const file of cssFiles) {
    if (file.endsWith('.module.css')) continue;
    const path = rel(file);
    const declared = new Set();
    for (const selector of selectorsOf(readFileSync(file, 'utf8')))
      for (const [, name] of selector.matchAll(CLASS_IN_COMPOUND_RE)) declared.add(name);
    for (const name of declared) {
      if (GLOBAL_CLASS_ADDED_BY_LIBRARIES.has(name)) continue;
      if (new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(haystack)) continue;
      violations.push(`${path}: .${name} is declared and never used, delete the class`);
    }
  }
}

const webFiles = walk(webSrc, ['.ts', '.tsx', '.css']);
const indexHtml = join(root, 'apps/web/index.html');
const apiFiles = walk(join(root, 'apps/api-dotnet'), ['.cs']);
const e2eFiles = walk(join(root, 'e2e'), ['.ts']);

checkComments([...webFiles, ...apiFiles, ...e2eFiles]);
checkSharedIsALeaf(webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')));
checkNoImportCycles(webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')));
checkDesignTokens(webFiles.filter((f) => f.endsWith('.css')));
checkUndeclaredTokens(
  webFiles.filter((f) => f.endsWith('.css')),
  webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
);
checkModalPrimitive(webFiles.filter((f) => f.endsWith('.tsx')));
checkButtonPrimitive(webFiles.filter((f) => f.endsWith('.tsx')));
checkTapTargets(webFiles.filter((f) => f.endsWith('.css')));
const cssModulesExcluded = checkDeadCssClasses(
  webFiles.filter((f) => f.endsWith('.css')),
  webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
);
checkDeadGlobalClasses(
  webFiles.filter((f) => f.endsWith('.css')),
  [...webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')), indexHtml]
);
checkApiLayers();

if (violations.length > 0) {
  console.error(`\n${violations.length} architecture rule violation(s):\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    '\nRules: AGENTS.md (style) and hexagonal architecture (Domain < Application < Infrastructure).\n'
  );
  process.exit(1);
}
console.log(
  'Architecture: no violation (comments, API layers, shared/ as a leaf, import cycles, design system tokens, Modal and Button primitives, tap targets, dead CSS classes).'
);
if (cssModulesExcluded.length > 0)
  console.log(
    `Dead classes: ${cssModulesExcluded.length} module(s) excluded, bracket access makes them unanalysable: ${cssModulesExcluded.join(', ')}`
  );
