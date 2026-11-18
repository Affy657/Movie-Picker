import { readFileSync } from 'node:fs';
import path from 'node:path';

type Rgba = readonly [number, number, number, number];

type Rule = {
  selectors: ReadonlyArray<Selector>;
  declarations: ReadonlyMap<string, string>;
  order: number;
};

type Compound = { root: boolean; theme?: string; accent?: string; className?: string };
type Selector = { compounds: ReadonlyArray<Compound>; specificity: number };

type RootElement = { theme: string; accent: string | null };
type Context = { root: RootElement; chain: ReadonlyArray<string> };

const NAMED: Readonly<Record<string, Rgba>> = {
  white: [1, 1, 1, 1],
  black: [0, 0, 0, 1],
  transparent: [0, 0, 0, 0],
};

const COMPOUND_PART = /:root|html|\[data-theme='([\w-]+)'\]|\[data-accent='([\w-]+)'\]|\.([\w-]+)/g;

export const COLOR_MIX_SUPPORT_QUERY = 'color-mix(in srgb, currentColor 50%, transparent)';

export const COLOR_MIX_TOKEN_SHEETS = [
  'src/styles/01-foundation.css',
  'src/app/pages/landing/landingPalette.css',
] as const;

export function readColorMixTokenSheets(webRoot: string) {
  return COLOR_MIX_TOKEN_SHEETS.map((sheet) => readFileSync(path.join(webRoot, sheet), 'utf8'));
}

function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//g, '');
}

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of value) {
    if (character === '(' || character === '[') depth += 1;
    if (character === ')' || character === ']') depth -= 1;
    if (character === separator && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseCompound(text: string): Compound | null {
  const compound: Compound = { root: false };
  let consumed = '';
  for (const match of text.matchAll(COMPOUND_PART)) {
    consumed += match[0];
    const [token, theme, accent, className] = match;
    if (token === ':root' || token === 'html') compound.root = true;
    else if (theme) compound.theme = theme;
    else if (accent) compound.accent = accent;
    else if (className) {
      if (compound.className) return null;
      compound.className = className;
    }
  }
  if (consumed !== text) return null;
  if (compound.className && (compound.root || compound.theme || compound.accent)) return null;
  return compound;
}

function parseSelector(text: string): Selector | null {
  const compounds = text.split(/\s+/).map(parseCompound);
  if (compounds.some((compound) => compound === null)) return null;
  const parts = text.match(COMPOUND_PART) ?? [];
  const specificity = parts.filter((part) => part !== 'html').length;
  return { compounds: compounds as Compound[], specificity };
}

function readBlock(css: string, start: number): { body: string; end: number } {
  let depth = 1;
  let index = start;
  while (index < css.length && depth > 0) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}') depth -= 1;
    index += 1;
  }
  return { body: css.slice(start, index - 1), end: index };
}

type Ignored = { name: string; where: string };

function customProperties(body: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const declaration of splitTopLevel(body, ';')) {
    const match = /^(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(declaration);
    if (match) declarations.set(match[1]!, match[2]!.replaceAll(/\s+/g, ' ').trim());
  }
  return declarations;
}

function parseRules(css: string, firstOrder: number, ignored: Ignored[]): Rule[] {
  const source = stripComments(css);
  const rules: Rule[] = [];
  let index = 0;
  while (index < source.length) {
    const open = source.indexOf('{', index);
    if (open === -1) break;
    const prelude = source.slice(index, open).trim();
    const { body, end } = readBlock(source, open + 1);
    index = end;
    if (prelude.startsWith('@')) {
      for (const [name] of body.matchAll(/--[\w-]+(?=\s*:)/g))
        ignored.push({ name, where: prelude });
      continue;
    }
    const declarations = customProperties(body);
    if (declarations.size === 0) continue;
    const selectors = splitTopLevel(prelude, ',')
      .filter((selector) => selector !== '::backdrop')
      .map(parseSelector);
    const supported = selectors.filter((selector): selector is Selector => selector !== null);
    if (supported.length !== selectors.length)
      for (const name of declarations.keys()) ignored.push({ name, where: prelude });
    if (supported.length > 0)
      rules.push({ selectors: supported, declarations, order: firstOrder + rules.length });
  }
  return rules;
}

function namesReadByMixes(rules: ReadonlyArray<Rule>): Set<string> {
  const valuesOfName = new Map<string, string[]>();
  for (const rule of rules)
    for (const [name, value] of rule.declarations)
      valuesOfName.set(name, [...(valuesOfName.get(name) ?? []), value]);
  const pending = [...valuesOfName]
    .filter(([, values]) => values.some((value) => value.includes('color-mix(')))
    .map(([name]) => name);
  const read = new Set<string>(pending);
  while (pending.length > 0)
    for (const value of valuesOfName.get(pending.pop()!) ?? [])
      for (const [, name] of value.matchAll(/var\((--[\w-]+)/g))
        if (name && !read.has(name)) {
          read.add(name);
          pending.push(name);
        }
  return read;
}

function compoundMatches(compound: Compound, context: Context, depth: number): boolean {
  if (depth === 0) {
    if (compound.className) return false;
    if (compound.theme && compound.theme !== context.root.theme) return false;
    if (compound.accent && compound.accent !== context.root.accent) return false;
    return true;
  }
  return compound.className === context.chain[depth - 1];
}

function selectorMatches(selector: Selector, context: Context, depth: number): boolean {
  const compounds = selector.compounds;
  const last = compounds.at(-1);
  if (!last || !compoundMatches(last, context, depth)) return false;
  let ancestor = depth - 1;
  for (let index = compounds.length - 2; index >= 0; index -= 1) {
    while (ancestor >= 0 && !compoundMatches(compounds[index]!, context, ancestor)) ancestor -= 1;
    if (ancestor < 0) return false;
    ancestor -= 1;
  }
  return true;
}

function declarationsAt(rules: ReadonlyArray<Rule>, context: Context, depth: number) {
  const matched = rules
    .map((rule) => {
      const specificities = rule.selectors
        .filter((selector) => selectorMatches(selector, context, depth))
        .map((selector) => selector.specificity);
      return specificities.length > 0 ? { rule, specificity: Math.max(...specificities) } : null;
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.specificity - b.specificity || a.rule.order - b.rule.order);
  const declared = new Map<string, string>();
  for (const { rule } of matched)
    for (const [name, value] of rule.declarations) declared.set(name, value);
  return declared;
}

class Scope {
  private readonly cache = new Map<string, string>();

  constructor(
    readonly declared: ReadonlyMap<string, string>,
    private readonly parent: Scope | null
  ) {}

  computed(name: string): string | null {
    const own = this.declared.get(name);
    if (own === undefined) return this.parent?.computed(name) ?? null;
    const cached = this.cache.get(name);
    if (cached !== undefined) return cached;
    const value = substitute(own, this);
    this.cache.set(name, value);
    return value;
  }
}

function substitute(value: string, scope: Scope): string {
  let result = '';
  let index = 0;
  while (index < value.length) {
    const start = value.indexOf('var(', index);
    if (start === -1) return result + value.slice(index);
    result += value.slice(index, start);
    const { body, end } = readParens(value, start + 4);
    const [name = '', fallback] = splitTopLevel(body, ',');
    const resolved = scope.computed(name.trim());
    if (resolved === null && fallback === undefined) throw new Error(`${name} is declared nowhere`);
    result += resolved ?? substitute(fallback!, scope);
    index = end;
  }
  return result;
}

function readParens(value: string, start: number): { body: string; end: number } {
  let depth = 1;
  let index = start;
  while (index < value.length && depth > 0) {
    if (value[index] === '(') depth += 1;
    if (value[index] === ')') depth -= 1;
    index += 1;
  }
  return { body: value.slice(start, index - 1), end: index };
}

function literal(value: string): Rgba {
  const named = NAMED[value.toLowerCase()];
  if (named) return named;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join('') : hex;
    const channel = (index: number) => Number.parseInt(full.slice(index, index + 2), 16) / 255;
    return [channel(0), channel(2), channel(4), full.length === 8 ? channel(6) : 1];
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(value)?.[1];
  if (rgb) {
    const parts = rgb.split(/[\s,/]+/).filter(Boolean);
    const unit = (part: string | undefined, scale: number) =>
      part?.endsWith('%') ? Number.parseFloat(part) / 100 : Number(part) / scale;
    const color: Rgba = [
      unit(parts[0], 255),
      unit(parts[1], 255),
      unit(parts[2], 255),
      parts[3] === undefined ? 1 : unit(parts[3], 1),
    ];
    if (parts.length < 3 || !color.every(Number.isFinite))
      throw new Error(`cannot read the colour "${value}"`);
    return color;
  }
  if (value.startsWith('color-mix(')) return mix(readParens(value, 'color-mix('.length).body);
  throw new Error(`cannot read the colour "${value}"`);
}

function mixPart(part: string): { color: string; weight: number | null } {
  const weight = /\s(\d+(?:\.\d+)?)%$/.exec(part);
  return weight
    ? { color: part.slice(0, weight.index).trim(), weight: Number(weight[1]) / 100 }
    : { color: part.trim(), weight: null };
}

function mix(body: string): Rgba {
  const [space, first, second] = splitTopLevel(body, ',');
  if (space !== 'in srgb' || !first || !second)
    throw new Error(`only two-colour color-mix(in srgb, ...) is supported: ${body}`);
  const a = mixPart(first);
  const b = mixPart(second);
  const weightA = a.weight ?? 1 - (b.weight ?? 0.5);
  const weightB = b.weight ?? 1 - weightA;
  const total = weightA + weightB;
  const colorA = literal(a.color);
  const colorB = literal(b.color);
  const alpha = ((weightA * colorA[3] + weightB * colorB[3]) / total) * Math.min(total, 1);
  if (alpha === 0) return [0, 0, 0, 0];
  const premultiplied = (weightA * colorA[3] + weightB * colorB[3]) / total;
  const channel = (index: number) =>
    (weightA * colorA[3] * colorA[index]! + weightB * colorB[3] * colorB[index]!) /
    total /
    premultiplied;
  return [channel(0), channel(1), channel(2), alpha];
}

export function formatColor([r, g, b, a]: Rgba): string {
  const channel = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255);
  const alpha = Math.round(a * 1000) / 1000;
  return alpha === 1
    ? `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`
    : `rgba(${channel(r)}, ${channel(g)}, ${channel(b)}, ${alpha})`;
}

export function resolveMixes(value: string): string {
  let result = value;
  let start = result.lastIndexOf('color-mix(');
  while (start !== -1) {
    const { end } = readParens(result, start + 'color-mix('.length);
    result =
      result.slice(0, start) + formatColor(literal(result.slice(start, end))) + result.slice(end);
    start = result.lastIndexOf('color-mix(');
  }
  return result;
}

function chainsOf(rules: ReadonlyArray<Rule>): string[][] {
  const chains = new Map<string, string[]>([['', []]]);
  for (const rule of rules)
    for (const selector of rule.selectors) {
      const classes = selector.compounds.flatMap((compound) =>
        compound.className ? [compound.className] : []
      );
      for (let length = 1; length <= classes.length; length += 1)
        chains.set(classes.slice(0, length).join(' '), classes.slice(0, length));
    }
  return [...chains.values()];
}

function valuesOf(rules: ReadonlyArray<Rule>, context: Context) {
  let scope: Scope | null = null;
  for (let depth = 0; depth <= context.chain.length; depth += 1)
    scope = new Scope(declarationsAt(rules, context, depth), scope);
  const values = new Map<string, string>();
  for (const [name, declared] of scope!.declared)
    if (declared.includes('color-mix(')) values.set(name, resolveMixes(scope!.computed(name)!));
  return values;
}

function ruleText(selector: string, values: ReadonlyMap<string, string>): string {
  const lines = [...values].map(([name, value]) => `  ${name}: ${value};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}

export const COLOR_MIX_FALLBACK_MODULE = 'virtual:color-mix-fallback.css';

export function buildColorMixFallback(files: ReadonlyArray<string>): string {
  let order = 0;
  const ignored: Ignored[] = [];
  const rules = files.flatMap((css) => {
    const parsed = parseRules(css, order, ignored);
    order += parsed.length;
    return parsed;
  });
  const readByMixes = namesReadByMixes(rules);
  for (const { name, where } of ignored)
    if (readByMixes.has(name))
      throw new Error(
        `${name} is declared under "${where}", which the colour-mix fallback cannot follow, and a color-mix() token reads it`
      );
  const themes = new Set<string>();
  const accents = new Set<string>();
  for (const rule of rules)
    for (const selector of rule.selectors)
      for (const compound of selector.compounds) {
        if (compound.theme) themes.add(compound.theme);
        if (compound.accent) accents.add(compound.accent);
      }

  const blocks: string[] = [];
  for (const chain of chainsOf(rules)) {
    const descendants = chain.map((className) => ` .${className}`).join('');
    for (const theme of themes) {
      const base = valuesOf(rules, { root: { theme, accent: null }, chain });
      if (base.size > 0) blocks.push(ruleText(`:root[data-theme='${theme}']${descendants}`, base));
      for (const accent of accents) {
        const values = valuesOf(rules, { root: { theme, accent }, chain });
        const differing = new Map([...values].filter(([name, value]) => base.get(name) !== value));
        if (differing.size > 0)
          blocks.push(
            ruleText(
              `:root[data-theme='${theme}'][data-accent='${accent}']${descendants}`,
              differing
            )
          );
      }
    }
  }
  if (blocks.length === 0) return '';
  return `@supports not (color: ${COLOR_MIX_SUPPORT_QUERY}) {\n${blocks.join('\n')}\n}\n`;
}
