import { colorMixRoles, lengthInPx, sizeTokensOf } from './cssSyntax.mjs';
import { isTestFile } from './sources.mjs';

export const ICON_SIZE_TS = 'apps/web/src/shared/components/iconSize.ts';
export const AVATAR_TSX = 'apps/web/src/shared/components/Avatar.tsx';

const INLINE_Z_INDEX = /zIndex\s*:\s*[^,}\n]*?-?\d+/g;
const NUMERIC_ICON_SIZE =
  /<[A-Z][\w.]*\b(?:[^>]|=>)*?\b(?:size|iconSize)=\{([^{}]*?\b\d+\b[^{}]*)\}/g;
const NUMERIC_ICON_DIMENSIONS = /<[A-Z][\w.]*\b(?:[^>]|=>)*?\bwidth=\{(\d+)\}\s+height=\{(\d+)\}/g;
const NUMERIC_ICON_SIZE_DEFAULT = /\b(?:size|iconSize)\s*=\s*(\d+)\b(?=\s*[,)}])/g;
const TS_COLOR_ALLOWED = new Set([
  'apps/web/src/app/pages/tech/TechLogos.tsx',
  'apps/web/src/features/auth/components/OAuthProviderButtons.tsx',
  'apps/web/src/shared/brand/brandArt.ts',
  'apps/web/src/shared/components/QrCode.tsx',
  'apps/web/src/shared/utils/downloadQrPng.ts',
]);
const TS_COLOR_LITERAL =
  /['"`]#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})['"`]|['"`][^'"`\n]*\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^'"`\n]*['"`]/g;

function iconSizeViolations(path, source) {
  const found = [];
  for (const [, value] of source.matchAll(NUMERIC_ICON_SIZE))
    found.push(`${path}: size={${value.trim()}}, an icon size is ICON_SIZE.<step>`);
  for (const [, w, h] of source.matchAll(NUMERIC_ICON_DIMENSIONS))
    if (w === h)
      found.push(
        `${path}: width={${w}} height={${h}} on a component, an icon size is ICON_SIZE.<step>`
      );
  for (const [, value] of source.matchAll(NUMERIC_ICON_SIZE_DEFAULT))
    found.push(`${path}: size = ${value} as a default, an icon size is ICON_SIZE.<step>`);
  return found;
}

export function inlineStyleViolations(path, source) {
  if (isTestFile(path)) return [];
  const found = [];
  for (const [shown] of source.matchAll(INLINE_Z_INDEX))
    found.push(`${path}: ${shown} in a style object, use var(--z-*) from the CSS module`);
  if (path !== ICON_SIZE_TS && path.endsWith('.tsx'))
    found.push(...iconSizeViolations(path, source));
  for (const role of colorMixRoles(source))
    found.push(
      `${path}: color-mix() on ${role} in TypeScript, declare the role in the foundation and consume it from the CSS module`
    );
  if (!TS_COLOR_ALLOWED.has(path))
    for (const [shown] of source.matchAll(TS_COLOR_LITERAL))
      found.push(
        `${path}: ${shown} in TypeScript, a colour is a --color-* token (a canvas reads it with readCssToken)`
      );
  return found;
}

function scaleViolations({ file, constant, token, steps, constants }) {
  const found = [];
  for (const [step, px] of steps)
    if (constants.get(step) !== px)
      found.push(
        `${file}: ${constant}.${step} is ${constants.get(step)}, --${token}-${step} is ${px}px in the foundation`
      );
  for (const step of constants.keys())
    if (!steps.has(step))
      found.push(`${file}: ${constant}.${step} has no --${token}-${step} token in the foundation`);
  return found;
}

export function avatarScaleViolations(foundation, avatarSource) {
  const tokens = sizeTokensOf(foundation);
  const steps = new Map();
  for (const [, step, value] of foundation.matchAll(/--avatar-([\w]+)\s*:\s*([^;]+);/g))
    steps.set(step, lengthInPx(value, tokens));
  const block = /const SIZE_PX[^=]*=\s*\{([^}]*)\}/.exec(avatarSource)?.[1] ?? '';
  const constants = new Map(
    [...block.matchAll(/(\w+)\s*:\s*(\d+)/g)].map(([, step, value]) => [step, Number(value)])
  );
  return scaleViolations({
    file: AVATAR_TSX,
    constant: 'SIZE_PX',
    token: 'avatar',
    steps,
    constants,
  });
}

export function iconScaleViolations(foundation, iconSizeSource) {
  const steps = new Map();
  for (const [, step, value] of foundation.matchAll(/--icon-([\w]+)\s*:\s*([^;]+);/g))
    steps.set(step, lengthInPx(value, new Map()));
  const constants = new Map();
  for (const [, step, value] of iconSizeSource.matchAll(/^\s*'?([\w]+)'?\s*:\s*(\d+),/gm))
    constants.set(step, Number(value));
  return scaleViolations({
    file: ICON_SIZE_TS,
    constant: 'ICON_SIZE',
    token: 'icon',
    steps,
    constants,
  });
}
