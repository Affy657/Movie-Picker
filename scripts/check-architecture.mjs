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
const RAW_LENGTH = /(?<![\w.-])-?\d*\.?\d+(?:rem|px)\b/g;
const CLIP_PATTERN_LENGTHS = new Set(['-1px', '0px']);
const HAIRLINE_LENGTHS = new Set(['1px', '2px', '-2px']);
const TOKEN_CALL = /(?:var|env)\([^()]*\)/g;
const SIZE_PROP =
  /(?:^|[;{\n])\s*(width|height|min-width|max-width|min-height|max-height|top|right|bottom|left|inset(?:-[a-z-]+)?|flex-basis)\s*:\s*([^;{}]+)/g;
const SIZE_LITERAL = /(?<![\w.-])(-?)(\d*\.?\d+)(rem|px)\b/g;
const SIZE_SCALE_MAX_PX = 96;
const TRANSFORM_PROP = /(?:^|[;{\n])\s*transform\s*:\s*([^;{}]+)/g;
const TRANSLATE_LITERAL = /(translate[XY]?)\((-?)(\d*\.?\d+)(rem|px)\)/g;

function stripTokenCalls(value) {
  let previous;
  let stripped = value;
  do {
    previous = stripped;
    stripped = stripped.replace(TOKEN_CALL, ' ');
  } while (stripped !== previous);
  return stripped;
}
const OPACITY_DECL = /(?:^|[;{\n])\s*opacity\s*:\s*([^;{}]+)/g;
const KEYFRAME_STEP = /^(?:from|to|\d+%)(?:\s*,\s*(?:from|to|\d+%))*$/;
const CSS_RULE_RE = /([^{}]+)\{([^{}]*)\}/g;
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
  /(?:^|[;{\n])\s*(transition|animation)(-duration|-timing-function)?\s*:\s*([^;{}]+)/g;
const LITERAL_DURATION = /(?<![\w-])\d*\.?\d+m?s\b/;
const LITERAL_EASING = /(?<![\w-])(?:ease(?:-in|-out|-in-out)?|linear|cubic-bezier\(|steps\()/;
const DURATION_WITHOUT_EASING = /var\(--duration-[\w-]+\)\s*(?:,|$)/;
const BORDER_WIDTH =
  /(?:^|[;{\n])\s*(border(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?(?:-width)?)\s*:\s*([^;{}]+)/g;
const OUTLINE_LITERAL = /(?:^|[;{\n])\s*outline\s*:\s*(\d+px\s+solid\s+var\(--color-primary\))/g;
const FOCUS_VISIBLE_RULE = /([^{}]*:focus-visible[^{]*)\{([^}]*)\}/g;
const PRIMITIVE_IN_MODULE =
  /var\((--(?:blue|green|violet|pink|orange|red|cyan|indigo|amber|emerald|yellow|sky)-\d+)\)/g;
const DECLARED_TOKEN = /(?:^|[;{\n])\s*(--[a-z][\w-]*)\s*:/g;
const TOKENS_CONSUMED_INDIRECTLY =
  /^--(?:(?:blue|green|violet|purple|pink|orange|red|cyan|indigo|amber|emerald|yellow|sky)-\d+|icon-[\w]+)$/;
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
      const literals = [...stripTokenCalls(value).matchAll(RAW_LENGTH)]
        .map(([length]) => length)
        .filter((length) => !CLIP_PATTERN_LENGTHS.has(length));
      if (literals.length > 0)
        violations.push(`${path}: ${prop}: ${value.trim()}, use var(--space-*)`);
    }

    if (path.endsWith('.module.css')) {
      for (const [, prop, value] of text.matchAll(SIZE_PROP)) {
        const shown = value.trim().replace(/\s+/g, ' ');
        for (const [length, sign, number, unit] of stripTokenCalls(value).matchAll(SIZE_LITERAL)) {
          if (CLIP_PATTERN_LENGTHS.has(length) || HAIRLINE_LENGTHS.has(length)) continue;
          const px = unit === 'rem' ? Number(number) * 16 : Number(number);
          if (px === 0 || px > SIZE_SCALE_MAX_PX) continue;
          violations.push(
            `${path}: ${prop}: ${shown}, a size under ${SIZE_SCALE_MAX_PX}px is var(--space-*), var(--icon-*), var(--avatar-*) or var(--tap-target-min)`
          );
          break;
        }
      }
      for (const [, value] of text.matchAll(TRANSFORM_PROP))
        for (const [, fn, sign, number, unit] of stripTokenCalls(value).matchAll(
          TRANSLATE_LITERAL
        )) {
          if (HAIRLINE_LENGTHS.has(`${sign}${number}${unit}`)) continue;
          violations.push(
            `${path}: transform: ${fn}(${sign}${number}${unit}), a hover lift is var(--lift-*), an offset var(--space-*)`
          );
        }
    }

    if (path.endsWith('.module.css'))
      for (const [, selector, body] of text.matchAll(CSS_RULE_RE)) {
        if (KEYFRAME_STEP.test(selector.trim())) continue;
        for (const [, value] of body.matchAll(OPACITY_DECL)) {
          const shown = value.trim();
          if (/^(?:0|1|inherit)$/.test(shown) || /^(?:var\(--opacity-|calc\()/.test(shown))
            continue;
          violations.push(
            `${path}: ${selector.trim().replace(/\s+/g, ' ')} opacity: ${shown}, use var(--opacity-*)`
          );
        }
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

    for (const [, prop, suffix, value] of text.matchAll(MOTION_PROP)) {
      if (/^\s*none\s*$/.test(value)) continue;
      const shown = value.trim().replace(/\s+/g, ' ');
      if (LITERAL_DURATION.test(value))
        violations.push(`${path}: ${prop}: ${shown}, use var(--duration-*)`);
      if (LITERAL_EASING.test(value))
        violations.push(`${path}: ${prop}: ${shown}, use var(--ease-*)`);
      if (prop === 'transition' && !suffix && DURATION_WITHOUT_EASING.test(value.trim()))
        violations.push(`${path}: ${prop}: ${shown}, a duration token takes its var(--ease-*)`);
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

const TOKEN_WITH_FALLBACK = /var\((--[a-z][\w-]*)\s*,/g;

function checkUndeclaredTokens(cssFiles, sourceFiles) {
  const declared = new Set();
  const foundationTokens = new Set();
  for (const [, name] of readFileSync(join(root, FOUNDATION), 'utf8').matchAll(DECLARED_TOKEN))
    foundationTokens.add(name);
  for (const file of cssFiles)
    for (const [, name] of readFileSync(file, 'utf8').matchAll(DECLARED_TOKEN)) declared.add(name);
  for (const file of sourceFiles)
    for (const [, name] of readFileSync(file, 'utf8').matchAll(TOKEN_IN_SOURCE)) declared.add(name);
  const used = new Set();
  for (const file of [...cssFiles, ...sourceFiles, join(root, 'apps/web/index.html')]) {
    const text = readFileSync(file, 'utf8');
    for (const [, name] of text.matchAll(USED_TOKEN)) used.add(name);
    for (const [, name] of text.matchAll(TOKEN_IN_SOURCE)) used.add(name);
  }
  for (const file of cssFiles) {
    const path = rel(file);
    const text = readFileSync(file, 'utf8');
    const missing = new Set();
    for (const [, name] of text.matchAll(USED_TOKEN)) if (!declared.has(name)) missing.add(name);
    for (const name of missing)
      violations.push(`${path}: var(${name}) is declared nowhere, renamed or removed token?`);
    if (path === FOUNDATION) continue;
    for (const [, name] of text.matchAll(TOKEN_WITH_FALLBACK))
      if (foundationTokens.has(name))
        violations.push(
          `${path}: var(${name}, ...) carries a fallback on a foundation token, the fallback is dead or contradicts the token`
        );
  }
  for (const name of foundationTokens)
    if (!used.has(name) && !TOKENS_CONSUMED_INDIRECTLY.test(name))
      violations.push(`${FOUNDATION}: ${name} is declared and consumed nowhere, delete the token`);
}

function checkModalPrimitive(files) {
  for (const file of files) {
    const path = rel(file);
    if (path === MODAL_TSX || file.includes('.test.')) continue;
    if (readFileSync(file, 'utf8').includes('<dialog'))
      violations.push(`${path}: hand-written <dialog>, use shared/components/Modal`);
  }
}

const SHARED_COMPONENTS_DIR = 'apps/web/src/shared/components/';
const HAND_WRITTEN_ROLE_RE =
  /(?<=\s)role="(menu|menuitem|menubar|listbox|option|radiogroup|radio|tab|tablist|tabpanel|switch|dialog|alertdialog|tooltip)"/g;

function checkAriaPrimitives(files) {
  for (const file of files) {
    const path = rel(file);
    if (path.startsWith(SHARED_COMPONENTS_DIR) || file.includes('.test.')) continue;
    for (const [, role] of readFileSync(file, 'utf8').matchAll(HAND_WRITTEN_ROLE_RE))
      violations.push(
        `${path}: hand-written role="${role}", the primitives of shared/components/ already carry it (Menu, Dropdown, ChoiceGroup, SegmentedRadioGroup, Tabs, Toggle, Modal, Tooltip)`
      );
  }
}

const BUTTON_TSX = 'apps/web/src/shared/components/Button.tsx';
const BUTTON_CLASS_RE = /className\s*=\s*(?:"[^"]*"|\{(?:[^{}]|\{[^{}]*\})*\})/g;
const RAW_BUTTON_CLASS =
  /(?<![\w.-])(?:icon-)?btn(?:-(?:primary|secondary|danger|ghost|sm|md|lg|link|outline))?(?![\w-])/;

function checkButtonPrimitive(files) {
  for (const file of files) {
    const path = rel(file);
    if (path === BUTTON_TSX || file.includes('.test.')) continue;
    const source = readFileSync(file, 'utf8');
    for (const [attr] of source.matchAll(BUTTON_CLASS_RE)) {
      if (RAW_BUTTON_CLASS.test(attr))
        violations.push(
          `${path}: hand-written "btn" class, use shared/components/Button, IconButton or LinkButton`
        );
    }
  }
}

const INLINE_Z_INDEX = /zIndex\s*:\s*[^,}\n]*?-?\d+/g;
const ICON_SIZE_TS = 'apps/web/src/shared/components/iconSize.ts';
const NUMERIC_ICON_SIZE =
  /<[A-Z][\w.]*\b(?:[^>]|=>)*?\b(?:size|iconSize)=\{([^{}]*?\b\d+\b[^{}]*)\}/g;
const NUMERIC_ICON_DIMENSIONS = /<[A-Z][\w.]*\b(?:[^>]|=>)*?\bwidth=\{(\d+)\}\s+height=\{(\d+)\}/g;
const NUMERIC_ICON_SIZE_DEFAULT = /\b(?:size|iconSize)\s*=\s*(\d+)\b(?=\s*[,)}])/g;
const INLINE_ROLE_MIX =
  /color-mix\(in srgb, var\(--color-(primary|error|success|warning|text|text-muted|meta|bg|surface|border|border-subtle)\)/g;

function checkInlineStyleTokens(files) {
  for (const file of files) {
    if (file.includes('.test.')) continue;
    const path = rel(file);
    const source = readFileSync(file, 'utf8');
    for (const [shown] of source.matchAll(INLINE_Z_INDEX))
      violations.push(`${path}: ${shown} in a style object, use var(--z-*) from the CSS module`);
    if (path !== ICON_SIZE_TS && path.endsWith('.tsx')) {
      for (const [, value] of source.matchAll(NUMERIC_ICON_SIZE))
        violations.push(`${path}: size={${value.trim()}}, an icon size is ICON_SIZE.<step>`);
      for (const [, w, h] of source.matchAll(NUMERIC_ICON_DIMENSIONS))
        if (w === h)
          violations.push(
            `${path}: width={${w}} height={${h}} on a component, an icon size is ICON_SIZE.<step>`
          );
      for (const [, value] of source.matchAll(NUMERIC_ICON_SIZE_DEFAULT))
        violations.push(`${path}: size = ${value} as a default, an icon size is ICON_SIZE.<step>`);
    }
    for (const [, role] of source.matchAll(INLINE_ROLE_MIX))
      violations.push(
        `${path}: color-mix() on --color-${role} in TypeScript, declare the role in the foundation and consume it from the CSS module`
      );
  }
}

const TAP_TARGET_MIN_PX = 44;
const TAP_TARGET_CSS = 'apps/web/src/shared/components/tapTarget.module.css';
const SIZE_DECL = /(?:^|[;{\n])\s*(min-height|height|min-width|width)\s*:\s*([^;{}]+)/g;
const CLICKABLE_TAG_RE =
  /<(?:button|Button|IconButton|LinkButton|a|Link|NavLink)\b(?:[^>]|=>)*?className=\{([^}]*)\}/g;
const NATIVE_INPUT_TAG_RE = /<input\b(?:[^>]|=>)*?className=\{([^}]*)\}/g;

function lengthInPx(value, tokens) {
  const shown = value.trim();
  const literal = /^(-?\d*\.?\d+)(px|rem)$/.exec(shown);
  if (literal) return literal[2] === 'rem' ? Number(literal[1]) * 16 : Number(literal[1]);
  const token = /^var\((--[\w-]+)\)$/.exec(shown);
  if (token && tokens.has(token[1])) return tokens.get(token[1]);
  return null;
}

function sizeTokensOfFoundation() {
  const tokens = new Map();
  const text = readFileSync(join(root, FOUNDATION), 'utf8');
  for (const [, name, value] of text.matchAll(
    /(--(?:space-[\w-]+|tap-target-min))\s*:\s*([^;]+)/g
  )) {
    const px = lengthInPx(value, tokens);
    if (px !== null) tokens.set(name, px);
  }
  return tokens;
}

function classesOnTags(cssFile, sources, tagRe) {
  const classes = new Set();
  for (const [source, text] of sources) {
    for (const [, defaultName, namespaceName, spec] of text.matchAll(CSS_MODULE_IMPORT_RE)) {
      if (resolveImport(spec, source) !== cssFile) continue;
      const binding = defaultName || namespaceName;
      for (const [, expression] of text.matchAll(tagRe))
        for (const [, name] of expression.matchAll(new RegExp(`\\b${binding}\\.(\\w+)`, 'g')))
          classes.add(name);
    }
  }
  return classes;
}

function subjectClassesOf(selector) {
  const subject =
    selector
      .split(/[\s>+~]+/)
      .filter(Boolean)
      .pop() ?? '';
  return [...subject.matchAll(CLASS_IN_COMPOUND_RE)].map(([, name]) => name);
}

function hasExpandedHitArea(source) {
  if (/composes\s*:[^;]*\bfrom\s*['"][^'"]*tapTarget\.module\.css['"]/.test(source)) return true;
  for (const [, selector, body] of source.matchAll(CSS_RULE_RE))
    if (/::(?:after|before)/.test(selector) && /var\(--tap-target-min\)/.test(body)) return true;
  return false;
}

function checkTapTargets(cssFiles, tsFiles) {
  const tokens = sizeTokensOfFoundation();
  const sources = new Map(tsFiles.map((file) => [file, readFileSync(file, 'utf8')]));
  for (const file of cssFiles) {
    const path = rel(file);
    if (path === TAP_TARGET_CSS) continue;
    const source = readFileSync(file, 'utf8');
    if (hasExpandedHitArea(source)) continue;
    const clickable = classesOnTags(file, sources, CLICKABLE_TAG_RE);
    const nativeInputs = classesOnTags(file, sources, NATIVE_INPUT_TAG_RE);
    for (const [, selector, body] of source.matchAll(CSS_RULE_RE)) {
      const shownSelector = selector.trim().replace(/\s+/g, ' ');
      if (shownSelector.includes('::')) continue;
      const subject = subjectClassesOf(shownSelector);
      if (subject.some((name) => nativeInputs.has(name))) continue;
      const isClickable =
        /cursor:\s*pointer/.test(body) || subject.some((name) => clickable.has(name));
      if (!isClickable) continue;
      for (const [, prop, value] of body.matchAll(SIZE_DECL)) {
        const px = lengthInPx(value, tokens);
        if (px === null || px >= TAP_TARGET_MIN_PX) continue;
        violations.push(
          `${path}: ${shownSelector} is clickable and its ${prop} caps at ${px}px, use var(--tap-target-min) or compose expanded from shared/components/tapTarget.module.css`
        );
      }
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

function checkIconScale() {
  const foundation = readFileSync(join(root, FOUNDATION), 'utf8');
  const tokens = new Map();
  for (const [, step, value] of foundation.matchAll(/--icon-([\w]+)\s*:\s*([^;]+);/g))
    tokens.set(step, lengthInPx(value, new Map()));
  const source = readFileSync(join(root, ICON_SIZE_TS), 'utf8');
  const constants = new Map();
  for (const [, step, value] of source.matchAll(/^\s*'?([\w]+)'?\s*:\s*(\d+),/gm))
    constants.set(step, Number(value));
  for (const [step, px] of tokens)
    if (constants.get(step) !== px)
      violations.push(
        `${ICON_SIZE_TS}: ICON_SIZE.${step} is ${constants.get(step)}, --icon-${step} is ${px}px in the foundation`
      );
  for (const step of constants.keys())
    if (!tokens.has(step))
      violations.push(
        `${ICON_SIZE_TS}: ICON_SIZE.${step} has no --icon-${step} token in the foundation`
      );
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
checkAriaPrimitives(webFiles.filter((f) => f.endsWith('.tsx')));
checkButtonPrimitive(webFiles.filter((f) => f.endsWith('.tsx')));
checkTapTargets(
  webFiles.filter((f) => f.endsWith('.css')),
  webFiles.filter((f) => f.endsWith('.tsx'))
);
checkInlineStyleTokens(webFiles.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx')));
checkIconScale();
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
  'Architecture: no violation (comments, API layers, shared/ as a leaf, import cycles, design system tokens, icon and size scales, Modal, Button and ARIA primitives, tap targets, dead CSS classes and tokens).'
);
if (cssModulesExcluded.length > 0)
  console.log(
    `Dead classes: ${cssModulesExcluded.length} module(s) excluded, bracket access makes them unanalysable: ${cssModulesExcluded.join(', ')}`
  );
