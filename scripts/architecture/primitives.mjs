import { FOUNDATION } from './cssSyntax.mjs';
import {
  CLASS_IN_COMPOUND_RE,
  CSS_MODULE_IMPORT_RE,
  CSS_RULE_RE,
  lengthInPx,
  sizeTokensOf,
} from './cssSyntax.mjs';
import { isTestFile, rel, resolveImport as resolveOnDisk } from './sources.mjs';

const MODAL_CSS = 'apps/web/src/shared/components/Modal.module.css';
const SHEET_DRAG_CSS = 'apps/web/src/shared/components/SheetDrag.module.css';
const MODAL_TSX = 'apps/web/src/shared/components/Modal.tsx';
const SHARED_COMPONENTS_DIR = 'apps/web/src/shared/components/';
const BUTTON_TSX = 'apps/web/src/shared/components/Button.tsx';
const TAP_TARGET_CSS = 'apps/web/src/shared/components/tapTarget.module.css';

const POPOVER_BACKDROPS = new Set([
  'apps/web/src/features/events/components/WheelModal.module.css .confettiOverlay',
]);

const HAND_WRITTEN_ROLE_RE =
  /(?<=\s)role="(menu|menuitem|menubar|listbox|option|radiogroup|radio|tab|tablist|tabpanel|switch|dialog|alertdialog|tooltip)"/g;
const BUTTON_CLASS_RE = /className\s*=\s*(?:"[^"]*"|\{(?:[^{}]|\{[^{}]*\})*\})/g;
const RAW_BUTTON_CLASS =
  /(?<![\w.-])(?:icon-)?btn(?:-(?:primary|secondary|danger|ghost|sm|md|lg|link|outline))?(?![\w-])/;
const TAP_TARGET_MIN_PX = 44;
const SIZE_DECL = /(?:^|[;{\n])\s*(min-height|height|min-width|width)\s*:\s*([^;{}]+)/g;
const CLICKABLE_TAG_RE =
  /<(?:button|Button|IconButton|LinkButton|a|Link|NavLink)\b(?:[^>]|=>)*?className=\{([^}]*)\}/g;
const NATIVE_INPUT_TAG_RE = /<input\b(?:[^>]|=>)*?className=\{([^}]*)\}/g;

export function backdropViolations(path, text) {
  if (path === MODAL_CSS || path === SHEET_DRAG_CSS) return [];
  return [...text.matchAll(/([^\s{},]*)::backdrop/g)]
    .map((match) => match[1])
    .filter((selector) => !(path === FOUNDATION && selector === ''))
    .filter((selector) => !POPOVER_BACKDROPS.has(`${path} ${selector}`))
    .map(
      (selector) => `${path}: ${selector}::backdrop, the modal backdrop belongs to Modal.module.css`
    );
}

export function modalViolations(path, source) {
  if (path === MODAL_TSX || isTestFile(path) || !source.includes('<dialog')) return [];
  return [`${path}: hand-written <dialog>, use shared/components/Modal`];
}

export function ariaRoleViolations(path, source) {
  if (path.startsWith(SHARED_COMPONENTS_DIR) || isTestFile(path)) return [];
  return [...source.matchAll(HAND_WRITTEN_ROLE_RE)].map(
    ([, role]) =>
      `${path}: hand-written role="${role}", the primitives of shared/components/ already carry it (Menu, Dropdown, ChoiceGroup, SegmentedRadioGroup, Tabs, Toggle, Modal, Tooltip)`
  );
}

export function buttonClassViolations(path, source) {
  if (path === BUTTON_TSX || isTestFile(path)) return [];
  return [...source.matchAll(BUTTON_CLASS_RE)]
    .filter(([attr]) => RAW_BUTTON_CLASS.test(attr))
    .map(
      () =>
        `${path}: hand-written "btn" class, use shared/components/Button, IconButton or LinkButton`
    );
}

function classesOnTags(cssFile, sources, tagRe, resolveImport) {
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

export function tapTargetViolations(cssTexts, tsxTexts, foundation, resolveImport = resolveOnDisk) {
  const found = [];
  const tokens = sizeTokensOf(foundation);
  for (const [file, source] of cssTexts) {
    const path = rel(file);
    if (path === TAP_TARGET_CSS || hasExpandedHitArea(source)) continue;
    const clickable = classesOnTags(file, tsxTexts, CLICKABLE_TAG_RE, resolveImport);
    const nativeInputs = classesOnTags(file, tsxTexts, NATIVE_INPUT_TAG_RE, resolveImport);
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
        found.push(
          `${path}: ${shownSelector} is clickable and its ${prop} caps at ${px}px, use var(--tap-target-min) or compose expanded from shared/components/tapTarget.module.css`
        );
      }
    }
  }
  return found;
}
