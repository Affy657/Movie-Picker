export const FOUNDATION = 'apps/web/src/styles/01-foundation.css';
export const LANDING_PALETTE = 'apps/web/src/app/pages/landing/landingPalette.css';
export const PRIMITIVE_HUES =
  'blue|green|violet|purple|pink|orange|red|cyan|indigo|amber|emerald|yellow|sky|teal|fuchsia|slate|night';

export const CSS_RULE_RE = /([^{}]+)\{([^{}]*)\}/g;
export const KEYFRAME_STEP = /^(?:from|to|\d+%)(?:\s*,\s*(?:from|to|\d+%))*$/;
export const CLASS_IN_COMPOUND_RE = /\.(-?[A-Za-z_][\w-]*)/g;
export const CSS_MODULE_IMPORT_RE =
  /import\s+(?:(\w+)|\*\s+as\s+(\w+))\s+from\s*['"]([^'"]+\.module\.css)['"]/g;

const TOKEN_CALL = /(?:var|env)\([^()]*\)/g;

export function stripTokenCalls(value) {
  let previous;
  let stripped = value;
  do {
    previous = stripped;
    stripped = stripped.replace(TOKEN_CALL, ' ');
  } while (stripped !== previous);
  return stripped;
}

export function colorMixRoles(text) {
  const roles = [];
  let start = text.indexOf('color-mix(');
  while (start !== -1) {
    let depth = 0;
    let end = start + 'color-mix'.length;
    for (; end < text.length; end += 1) {
      if (text[end] === '(') depth += 1;
      else if (text[end] === ')' && --depth === 0) break;
    }
    for (const [, role] of text.slice(start, end).matchAll(/var\((--color-[\w-]+)\)/g))
      roles.push(role);
    start = text.indexOf('color-mix(', end);
  }
  return roles;
}

export function forEachRule(text, visit) {
  const stack = [];
  let buffer = '';
  for (const character of text.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (character === '{') {
      stack.push(
        buffer
          .slice(buffer.lastIndexOf(';') + 1)
          .trim()
          .replace(/\s+/g, ' ')
      );
      buffer = '';
    } else if (character === '}') {
      const header = stack.pop();
      if (header !== undefined) visit(header, buffer, [...stack]);
      buffer = '';
    } else {
      buffer += character;
    }
  }
}

export function selectorsOf(text) {
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

export function withoutAttributeSelectors(selector) {
  return selector.replace(/\[[^\]]*\]/g, '');
}

export function subjectClassListsOf(selector) {
  return withoutAttributeSelectors(selector)
    .split(',')
    .map((alternative) => {
      const compounds = alternative
        .trim()
        .split(/[\s>+~]+/)
        .filter(Boolean);
      return [...(compounds.at(-1) ?? '').matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map(
        ([, name]) => name
      );
    });
}

export function lengthInPx(value, tokens) {
  const shown = value.trim();
  const literal = /^(-?\d*\.?\d+)(px|rem)$/.exec(shown);
  if (literal) return literal[2] === 'rem' ? Number(literal[1]) * 16 : Number(literal[1]);
  const token = /^var\((--[\w-]+)\)$/.exec(shown);
  if (token && tokens.has(token[1])) return tokens.get(token[1]);
  return null;
}

export function sizeTokensOf(foundation) {
  const tokens = new Map();
  for (const [, name, value] of foundation.matchAll(
    /(--(?:space-[\w-]+|tap-target-min))\s*:\s*([^;]+)/g
  )) {
    const px = lengthInPx(value, tokens);
    if (px !== null) tokens.set(name, px);
  }
  return tokens;
}
