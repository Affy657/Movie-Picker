import { createRequire } from 'node:module';
import { join } from 'node:path';
import { FOUNDATION, LANDING_PALETTE, forEachRule } from './cssSyntax.mjs';

export const WEB_PACKAGE = 'apps/web/package.json';

const TOKEN_SHEETS = new Set([FOUNDATION, LANDING_PALETTE]);
const BACKDROP_TOKENS_SELECTOR = /(?:^|\n)\s*:root,\s*::backdrop\s*\{/;

export const NEWER_CSS_FEATURES = [
  { feature: '@container', safari: 16, pattern: /@container\b/ },
  { feature: 'container query units', safari: 16, pattern: /\d(?:cqw|cqh|cqi|cqb|cqmin|cqmax)\b/ },
  { feature: ':user-valid / :user-invalid', safari: 16.5, pattern: /:user-(?:in)?valid\b/ },
  { feature: '@property', safari: 16.4, pattern: /@property\b/ },
  { feature: 'lh / rlh units', safari: 16.4, pattern: /(?<![\w-])\d*\.?\d+r?lh\b/ },
  { feature: 'linear() easing', safari: 17.2, pattern: /(?<![\w-])linear\(/ },
  { feature: '@scope', safari: 17.4, pattern: /@scope\b/ },
  { feature: 'transition-behavior', safari: 17.4, pattern: /transition-behavior|allow-discrete/ },
  { feature: '@starting-style', safari: 17.5, pattern: /@starting-style\b/ },
  { feature: 'light-dark()', safari: 17.5, pattern: /light-dark\(/ },
  {
    feature: 'relative colour syntax',
    safari: 18,
    pattern: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*from\s/,
  },
  { feature: 'view transitions', safari: 18, pattern: /view-transition/ },
  { feature: 'text-box', safari: 18.2, pattern: /(?:^|[;{\s])text-box(?:-trim|-edge)?\s*:/ },
  {
    feature: 'anchor positioning',
    safari: 26,
    pattern: /anchor-name\s*:|position-anchor\s*:|position-area\s*:|(?<![\w-])anchor\(/,
  },
  {
    feature: 'scroll-driven animations',
    safari: 26,
    pattern: /animation-timeline|scroll-timeline|view-timeline/,
  },
  { feature: 'field-sizing', safari: Infinity, pattern: /field-sizing\s*:/ },
  { feature: 'interpolate-size', safari: Infinity, pattern: /interpolate-size|calc-size\(/ },
];

export const NEWER_JS_APIS = [
  {
    api: 'Popover API',
    safari: 17,
    use: /\.(?:show|hide|toggle)Popover\(/,
    detection: /typeof [\w.?]+\.showPopover\s*===\s*'function'|'showPopover'\s+in\b/,
  },
  {
    api: 'AbortSignal.timeout()',
    safari: 16,
    use: /AbortSignal\.timeout\(/,
    detection: /typeof AbortSignal\.timeout\s*===\s*'function'|'timeout'\s+in\s+AbortSignal/,
  },
  {
    api: 'AbortSignal.any()',
    safari: 17.4,
    use: /AbortSignal\.any\(/,
    detection: /typeof AbortSignal\.any\s*===\s*'function'|'any'\s+in\s+AbortSignal/,
  },
  {
    api: 'view transitions',
    safari: 18,
    use: /\.startViewTransition\(/,
    detection:
      /'startViewTransition'\s+in\b|typeof [\w.?]+\.startViewTransition\s*===\s*'function'/,
  },
  {
    api: 'CloseWatcher',
    safari: Infinity,
    use: /\bCloseWatcher\b/,
    detection: /'CloseWatcher'\s+in\b|typeof CloseWatcher\s*[!=]==\s*'undefined'/,
  },
  { api: 'Element.checkVisibility()', safari: 17.4, use: /\.checkVisibility\(/ },
  { api: 'navigator.userActivation', safari: 16.4, use: /navigator\.userActivation\b/ },
  { api: 'String isWellFormed() / toWellFormed()', safari: 16.4, use: /\.(?:is|to)WellFormed\(/ },
  { api: 'Intl.DurationFormat', safari: 16.4, use: /Intl\.DurationFormat\b/ },
  { api: 'CSS.registerProperty()', safari: 16.4, use: /CSS\.registerProperty\(/ },
  { api: 'setHTMLUnsafe()', safari: 17.4, use: /\.setHTMLUnsafe\(/ },
  { api: 'URL.canParse()', safari: 17, use: /URL\.canParse\(/ },
  { api: 'URL.parse()', safari: 18, use: /URL\.parse\(/ },
  {
    api: 'Set composition methods',
    safari: 17,
    use: /\.(?:symmetricDifference|isSubsetOf|isSupersetOf|isDisjointFrom)\(/,
  },
  {
    api: 'iterator helpers',
    safari: 18.4,
    use: /Iterator\.from\(|\.(?:values|keys|entries)\(\)\s*\.(?:map|filter|take|drop|flatMap|reduce|toArray|some|every|find|forEach)\(/,
  },
  { api: 'Array.fromAsync()', safari: 16.4, use: /Array\.fromAsync\(/ },
  { api: 'Object.groupBy() / Map.groupBy()', safari: 17.4, use: /(?:Object|Map)\.groupBy\(/ },
  { api: 'Promise.withResolvers()', safari: 17.4, use: /Promise\.withResolvers\(/ },
  {
    api: 'toSorted() / toReversed() / toSpliced()',
    safari: 16,
    use: /\.to(?:Sorted|Reversed|Spliced)\(/,
  },
  {
    api: 'scheduler.postTask() / yield()',
    safari: Infinity,
    use: /\bscheduler\.(?:postTask|yield)\(/,
    detection: /'scheduler'\s+in\b/,
  },
];

const COLOR_MIX_SAFARI = 16.2;
const SAFARI_ENGINES = new Set(['ios_saf', 'safari']);

export function safariFloorOf(browsers) {
  const versions = browsers
    .map((entry) => entry.split(' '))
    .filter(([name]) => SAFARI_ENGINES.has(name))
    .map(([, range]) => Number.parseFloat(range.split('-')[0]));
  if (versions.length === 0) throw new Error(`${WEB_PACKAGE}: browserslist names no Safari`);
  return Math.min(...versions);
}

export function readSafariFloor(root) {
  const browserslist = createRequire(join(root, WEB_PACKAGE))('browserslist');
  return safariFloorOf(browserslist(undefined, { path: join(root, 'apps/web') }));
}

function formatSafari(safari) {
  return safari === Infinity ? 'a Safari that does not exist yet' : `Safari ${safari}`;
}

function withoutComments(text) {
  return text.replaceAll(/\/\*[\s\S]*?\*\//g, '');
}

function declarationsOf(body) {
  return body
    .split(';')
    .map((declaration) => /^\s*([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(declaration))
    .filter(Boolean)
    .map(([, property, value]) => ({ property, value }));
}

function colorMixViolations(path, text, floor) {
  if (floor >= COLOR_MIX_SAFARI || TOKEN_SHEETS.has(path)) return [];
  const found = [];
  forEachRule(text, (selector, body) => {
    const declarations = declarationsOf(body);
    declarations.forEach(({ property, value }, index) => {
      if (!value.includes('color-mix(')) return;
      const hasFallback = declarations
        .slice(0, index)
        .some(
          (earlier) =>
            earlier.property === property &&
            earlier.value.includes('var(--') &&
            !earlier.value.includes('color-mix(')
        );
      if (property.startsWith('--') || value.includes('var(') || !hasFallback)
        found.push(
          `${path}: ${selector.trim()} { ${property} } color-mix() needs Safari ${COLOR_MIX_SAFARI}, the floor is iOS ${floor}: declare the token in the foundation (its fallback is generated), or set ${property} to a token just before (a literal fallback is dropped by the minifier) and keep var() out of the mix`
        );
    });
  });
  return found;
}

export function browserSupportViolations(path, raw, floor) {
  const text = withoutComments(raw);
  const found = NEWER_CSS_FEATURES.filter(
    ({ safari, pattern }) => safari > floor && pattern.test(text)
  ).map(
    ({ feature, safari }) =>
      `${path}: ${feature} needs ${formatSafari(safari)}, the floor is iOS ${floor}: leave it out or give it a fallback (AGENTS.md, iPhone et vieux Safari)`
  );
  return [...found, ...colorMixViolations(path, text, floor)];
}

export function jsApiViolations(path, text, floor) {
  return NEWER_JS_APIS.filter(
    ({ safari, use, detection }) =>
      safari > floor && use.test(text) && !(detection && detection.test(text))
  ).map(
    ({ api, safari, detection }) =>
      `${path}: ${api} needs ${formatSafari(safari)}, the floor is iOS ${floor}: ${detection ? 'detect it before the call' : 'leave it out or polyfill it'} (AGENTS.md, iPhone et vieux Safari)`
  );
}

function backdropTokens(foundation) {
  const text = withoutComments(foundation);
  const start = text.search(BACKDROP_TOKENS_SELECTOR);
  if (start === -1) return new Set();
  const open = text.indexOf('{', start);
  const close = text.indexOf('\n}', open);
  return new Set([...text.slice(open, close).matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name));
}

export function backdropTokenViolations(sheets, foundation) {
  const declared = backdropTokens(foundation);
  const found = [];
  for (const [path, raw] of sheets)
    forEachRule(withoutComments(raw), (selector, body) => {
      if (!selector.includes('::backdrop')) return;
      const painted = declarationsOf(body)
        .filter(({ property }) => !property.startsWith('--'))
        .map(({ value }) => value)
        .join(';');
      for (const [, name, fallback] of painted.matchAll(/var\((--[\w-]+)\s*(,)?/g))
        if (!fallback && !declared.has(name))
          found.push(
            `${path}: ${selector.trim()} reads var(${name}), Safari before 17.4 does not pass custom properties to ::backdrop: declare ${name} in the foundation block ":root, ::backdrop" or give var() a fallback`
          );
    });
  return found;
}
