import { hoverAndMotionViolations } from './cssMotion.mjs';
import {
  CSS_RULE_RE,
  FOUNDATION,
  KEYFRAME_STEP,
  LANDING_PALETTE,
  PRIMITIVE_HUES,
  colorMixRoles,
  stripTokenCalls,
} from './cssSyntax.mjs';

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

const TOKEN_SHEETS = new Set([FOUNDATION, LANDING_PALETTE]);

const SPACING_PROP =
  /(?:^|[;{\n])\s*(padding|margin|gap|row-gap|column-gap)(?:-[a-z-]+)?\s*:\s*([^;{}]+)/g;
const RAW_LENGTH = /(?<![\w.-])-?\d*\.?\d+(?:rem|px)\b/g;
const CLIP_PATTERN_LENGTHS = new Set(['-1px', '0px']);
const HAIRLINE_LENGTHS = new Set(['1px', '2px', '-2px']);
const SIZE_PROP =
  /(?:^|[;{\n])\s*(width|height|min-width|max-width|min-height|max-height|top|right|bottom|left|inset(?:-[a-z-]+)?|flex-basis)\s*:\s*([^;{}]+)/g;
const SIZE_LITERAL = /(?<![\w.-])(-?)(\d*\.?\d+)(rem|px)\b/g;
const SIZE_SCALE_MAX_PX = 96;
const TRANSFORM_PROP = /(?:^|[;{\n])\s*transform\s*:\s*([^;{}]+)/g;
const TRANSLATE_LITERAL = /(translate[XY]?)\((-?)(\d*\.?\d+)(rem|px)\)/g;
const OPACITY_DECL = /(?:^|[;{\n])\s*opacity\s*:\s*([^;{}]+)/g;
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/;
const NAMED_COLOR =
  /(?<![\w-])(?:white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|navy|teal|maroon|olive|lime|aqua|fuchsia)(?![\w-])/i;
const URL_CALL = /url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g;
const COLOR_PROP =
  /(?:^|[;{\n])\s*(color|background(?:-color|-image)?|border(?:-[a-z-]+)?|outline(?:-color)?|box-shadow|text-shadow|fill|stroke|stop-color|caret-color|accent-color|text-decoration-color)\s*:\s*([^;{}]+)/g;
const PRIMARY_AS_TEXT = /(?<![\w-])color\s*:\s*var\((--color-primary(?:-hover)?)\)/g;
const TOKENISED_PROPS = [
  ['line-height', /var\(--leading-|inherit|normal|^0$/, '--leading-*'],
  ['letter-spacing', /var\(--tracking-|inherit|normal|^0$/, '--tracking-*'],
  ['font-weight', /var\(--font-weight-|inherit/, '--font-weight-*'],
  ['font-family', /var\(--font-|inherit/, '--font-body / --font-mono'],
  ['border-radius', /var\(--radius-|inherit|^(?:(?:0|50%|100%)\s*)+$/, '--radius-*'],
];
const MOTION_PROP =
  /(?:^|[;{\n])\s*(transition|animation)(-duration|-timing-function|-delay)?\s*:\s*([^;{}]+)/g;
const LITERAL_DURATION = /(?<![\w-])\d*\.?\d+m?s\b/;
const LITERAL_EASING = /(?<![\w-])(?:ease(?:-in|-out|-in-out)?|linear|cubic-bezier\(|steps\()/;
const DURATION_WITHOUT_EASING = /var\(--duration-[\w-]+\)\s*(?:,|$)/;
const BORDER_WIDTH =
  /(?:^|[;{\n])\s*(border(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?(?:-width)?)\s*:\s*([^;{}]+)/g;
const OUTLINE_LITERAL = /(?:^|[;{\n])\s*outline\s*:\s*(\d+px\s+solid\s+var\(--color-primary\))/g;
const OUTLINE_OFFSET = /(?:^|[;{\n])\s*outline-offset\s*:\s*([^;{}]+)/g;
const FILTER_PROP = /(?:^|[;{\n])\s*((?:-webkit-)?(?:backdrop-)?filter)\s*:\s*([^;{}]+)/g;
const GRID_TRACK_PROP =
  /(?:^|[;{\n])\s*(grid-template-columns|grid-template-rows|grid-auto-columns|grid-auto-rows)\s*:\s*([^;{}]+)/g;
const FOCUS_VISIBLE_RULE = /([^{}]*:focus-visible[^{]*)\{([^}]*)\}/g;
const PRIMITIVE_IN_MODULE = new RegExp(
  `var\\((--(?:(?:${PRIMITIVE_HUES})-\\d+|white|black))\\)`,
  'g'
);
const CUSTOM_PROPERTY = /(?:^|[;{\n])\s*(--[a-z][\w-]*)\s*:\s*([^;{}]+)/g;
const CUSTOM_PROPERTY_DECLARATION =
  /(^|[;{\n])\s*--[a-z][\w-]*\s*:(?:[^;{}"'()]|"[^"]*"|'[^']*'|\((?:[^()"']|"[^"]*"|'[^']*'|\([^()]*\))*\))*;/g;
const HAS_RAW_LENGTH = /(?<![\w.-])-?\d*\.?\d+(?:rem|px)\b/;

function smallLiteral(value) {
  for (const [length, , number, unit] of stripTokenCalls(value).matchAll(SIZE_LITERAL)) {
    if (CLIP_PATTERN_LENGTHS.has(length) || HAIRLINE_LENGTHS.has(length)) continue;
    const px = unit === 'rem' ? Number(number) * 16 : Number(number);
    if (px === 0 || px > SIZE_SCALE_MAX_PX) continue;
    return length;
  }
  return null;
}

const oneLine = (value) => value.trim().replace(/\s+/g, ' ');
const namesAColour = (value) => NAMED_COLOR.test(stripTokenCalls(value).replace(URL_CALL, ' '));

function mediaViolations({ path, raw }) {
  const found = [];
  for (const [, query] of raw.matchAll(/@media\s+([^{]+)\{/g)) {
    for (const condition of query.trim().split(/\s+and\s+/)) {
      const normalized = condition.trim();
      if (!normalized.startsWith('(')) continue;
      if (!ALLOWED_MEDIA.has(normalized))
        found.push(`${path}: @media ${normalized} is outside the breakpoint scale (AGENTS.md)`);
    }
  }
  return found;
}

function lengthViolations({ path, text, isTokenSheet }) {
  const found = [];
  for (const [, prop, value] of text.matchAll(SPACING_PROP)) {
    const literals = [...stripTokenCalls(value).matchAll(RAW_LENGTH)]
      .map(([length]) => length)
      .filter((length) => !CLIP_PATTERN_LENGTHS.has(length));
    if (literals.length > 0) found.push(`${path}: ${prop}: ${value.trim()}, use var(--space-*)`);
  }

  for (const [, prop, value] of text.matchAll(SIZE_PROP))
    if (smallLiteral(value))
      found.push(
        `${path}: ${prop}: ${oneLine(value)}, a size under ${SIZE_SCALE_MAX_PX}px is var(--space-*), var(--icon-*), var(--avatar-*) or var(--tap-target-min)`
      );

  for (const [, prop, value] of text.matchAll(GRID_TRACK_PROP))
    if (smallLiteral(value))
      found.push(
        `${path}: ${prop}: ${oneLine(value)}, a track under ${SIZE_SCALE_MAX_PX}px is a size token`
      );

  if (!isTokenSheet)
    for (const [, name, value] of text.matchAll(CUSTOM_PROPERTY)) {
      if (smallLiteral(value))
        found.push(
          `${path}: ${name}: ${value.trim()}, a local custom property under ${SIZE_SCALE_MAX_PX}px launders a literal, use a size token`
        );
      if (namesAColour(value))
        found.push(
          `${path}: ${name}: ${value.trim()}, a named colour is a literal, use a --color-* token`
        );
    }

  for (const [, value] of text.matchAll(TRANSFORM_PROP))
    for (const [, fn, sign, number, unit] of stripTokenCalls(value).matchAll(TRANSLATE_LITERAL)) {
      if (HAIRLINE_LENGTHS.has(`${sign}${number}${unit}`)) continue;
      found.push(
        `${path}: transform: ${fn}(${sign}${number}${unit}), a hover lift is var(--lift-*), an offset var(--space-*)`
      );
    }
  return found;
}

function typographyAndLayerViolations({ path, text }) {
  const found = [];
  for (const [, selector, body] of text.matchAll(CSS_RULE_RE)) {
    if (KEYFRAME_STEP.test(selector.trim())) continue;
    for (const [, value] of body.matchAll(OPACITY_DECL)) {
      const shown = value.trim();
      if (/^(?:0|1|inherit)$/.test(shown) || /^(?:var\(--opacity-|calc\()/.test(shown)) continue;
      found.push(`${path}: ${oneLine(selector)} opacity: ${shown}, use var(--opacity-*)`);
    }
  }

  for (const [, value] of text.matchAll(/font-size\s*:\s*([^;{}]+)/g)) {
    const shown = value.replace(/!important/, '').trim();
    if (/^(?:inherit|100%)$/.test(shown)) continue;
    if (
      /var\(--font-size/.test(shown) &&
      /^(?:clamp\(|[\s,()]|(?:\d+(?:\.\d+)?|\.\d+)vw)*$/.test(stripTokenCalls(shown))
    )
      continue;
    found.push(
      `${path}: font-size: ${value.trim()}, use var(--font-size-*), a fluid size clamps between tokens`
    );
  }

  for (const [, value] of text.matchAll(/(?:^|[;{\n])\s*font\s*:\s*([^;{}]+)/g))
    if (value.replace(/!important/, '').trim() !== 'inherit')
      found.push(`${path}: font: ${value.trim()}, write the longhands with their tokens`);

  for (const [, value] of text.matchAll(/z-index\s*:\s*([^;{}]+)/g)) {
    if (/var\(--z-/.test(value)) continue;
    found.push(`${path}: z-index: ${value.trim()}, use var(--z-*)`);
  }
  return found;
}

function colourViolations({ path, text, isModule }) {
  const found = [];
  if (RAW_COLOR.test(text)) found.push(`${path}: literal colour, use a --color-* token`);

  for (const [, prop, value] of text.matchAll(COLOR_PROP))
    if (namesAColour(value))
      found.push(
        `${path}: ${prop}: ${value.trim()}, a named colour is a literal, use a --color-* token`
      );

  for (const [, token] of text.matchAll(PRIMARY_AS_TEXT))
    found.push(
      `${path}: color: var(${token}), the primary colours surfaces, text uses --color-primary-text / --color-primary-text-hover`
    );

  if (isModule)
    for (const [primitive] of text.matchAll(PRIMITIVE_IN_MODULE))
      found.push(
        `${path}: ${primitive}, primitives stay in the foundation, a module consumes a --color-* role`
      );

  if (isModule)
    for (const role of colorMixRoles(text))
      found.push(
        `${path}: color-mix() on ${role} by hand, declare the declination in the foundation (-bg, -border, -soft, -tint...)`
      );
  return found;
}

function tokenisedPropertyViolations({ path, text }) {
  const found = [];
  for (const [prop, allowed, tokens] of TOKENISED_PROPS)
    for (const [, value] of text.matchAll(
      new RegExp(`(?:^|[;{\\n])\\s*${prop}\\s*:\\s*([^;{}]+)`, 'g')
    ))
      if (!allowed.test(value.replace(/!important/, '').trim()))
        found.push(`${path}: ${prop}: ${value.trim()}, use var(${tokens})`);

  for (const [, prop, suffix, value] of text.matchAll(MOTION_PROP)) {
    if (/^\s*none\s*$/.test(value)) continue;
    const shown = oneLine(value);
    if (LITERAL_DURATION.test(value))
      found.push(`${path}: ${prop}${suffix ?? ''}: ${shown}, use var(--duration-*)`);
    if (LITERAL_EASING.test(value))
      found.push(`${path}: ${prop}${suffix ?? ''}: ${shown}, use var(--ease-*)`);
    if (prop === 'transition' && !suffix && DURATION_WITHOUT_EASING.test(value.trim()))
      found.push(`${path}: ${prop}: ${shown}, a duration token takes its var(--ease-*)`);
  }
  return found;
}

function outlineAndFilterViolations({ path, text }) {
  const found = [];
  for (const [, prop, value] of text.matchAll(BORDER_WIDTH)) {
    const width = value.match(/(?<![\w.])\d*\.?\d+(?:px|rem)/);
    if (width && !['1px', '2px'].includes(width[0]))
      found.push(
        `${path}: ${prop}: ${value.trim()}, a border is 1px, 2px or var(--border-width-field)`
      );
  }

  for (const [, value] of text.matchAll(OUTLINE_LITERAL))
    found.push(`${path}: outline: ${value}, use var(--outline-focus)`);

  for (const [, value] of text.matchAll(OUTLINE_OFFSET))
    if (!/^(?:var\(--outline-offset(?:-inset)?\)|0)$/.test(value.replace(/!important/, '').trim()))
      found.push(
        `${path}: outline-offset: ${value.trim()}, use var(--outline-offset) or var(--outline-offset-inset)`
      );

  for (const [, prop, value] of text.matchAll(FILTER_PROP))
    if (HAS_RAW_LENGTH.test(stripTokenCalls(value)))
      found.push(
        `${path}: ${prop}: ${value.trim()}, a blur or a drop shadow is a --backdrop-blur-* / --filter-* token`
      );

  for (const [, selector, body] of text.matchAll(FOCUS_VISIBLE_RULE))
    if (/outline\s*:\s*none/.test(body) && !/box-shadow\s*:\s*var\(--ring-focus\)/.test(body))
      found.push(
        `${path}: ${oneLine(selector)} removes the outline without var(--ring-focus), the focus must stay visible`
      );
  return found;
}

export function designTokenViolations(path, raw) {
  const isTokenSheet = TOKEN_SHEETS.has(path);
  const sheet = {
    path,
    raw,
    text: isTokenSheet ? raw.replace(CUSTOM_PROPERTY_DECLARATION, '$1') : raw,
    isModule: path.endsWith('.module.css'),
    isTokenSheet,
  };
  return [
    ...mediaViolations(sheet),
    ...hoverAndMotionViolations(path, sheet.text),
    ...lengthViolations(sheet),
    ...typographyAndLayerViolations(sheet),
    ...colourViolations(sheet),
    ...tokenisedPropertyViolations(sheet),
    ...outlineAndFilterViolations(sheet),
  ];
}
