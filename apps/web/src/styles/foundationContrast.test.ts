import { describe, expect, it } from 'vitest';
import foundation from './01-foundation.css?raw';

type Rgba = readonly [number, number, number, number];
type Declarations = ReadonlyMap<string, string>;

const ACCENTS = ['blue', 'green', 'purple', 'pink', 'orange', 'red', 'cyan', 'indigo'] as const;
type Accent = (typeof ACCENTS)[number];
type Theme = 'light' | 'dark';

const NAMED: Record<string, Rgba> = {
  white: [1, 1, 1, 1],
  black: [0, 0, 0, 1],
  transparent: [0, 0, 0, 0],
};

const BLOCKS: ReadonlyArray<{ selectors: string[]; declarations: Declarations }> = [
  ...foundation.matchAll(/([^{}]+)\{([^{}]*)\}/g),
].map(([, header = '', body = '']) => ({
  selectors: header.split(',').map((selector) => selector.replace(/\s+/g, '').trim()),
  declarations: new Map(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name = '', value = '']) => [
      name,
      value.replace(/\s+/g, ' ').trim(),
    ])
  ),
}));

function matchesRoot(selector: string, theme: Theme, accent: Accent): number | null {
  const parts = selector.match(/:root|\[data-theme='\w+'\]|\[data-accent='\w+'\]|\.[\w-]+/g) ?? [];
  if (parts.join('') !== selector) return null;
  for (const part of parts) {
    if (part === ':root') continue;
    if (part === `[data-theme='${theme}']` || part === `[data-accent='${accent}']`) continue;
    return null;
  }
  return parts.length;
}

function rootDeclarations(theme: Theme, accent: Accent): Declarations {
  const matched = BLOCKS.flatMap((block, order) => {
    const specificity = Math.max(
      ...block.selectors.map((selector) => matchesRoot(selector, theme, accent) ?? -1)
    );
    return specificity < 0 ? [] : [{ block, order, specificity }];
  }).sort((a, b) => a.specificity - b.specificity || a.order - b.order);
  const declarations = new Map<string, string>();
  for (const { block } of matched)
    for (const [name, value] of block.declarations) declarations.set(name, value);
  return declarations;
}

function onDarkDeclarations(): Declarations {
  const declarations = new Map<string, string>();
  for (const block of BLOCKS)
    if (block.selectors.includes('.on-dark'))
      for (const [name, value] of block.declarations) declarations.set(name, value);
  return declarations;
}

function splitArguments(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of value) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += character;
  }
  parts.push(current.trim());
  return parts;
}

function literal(value: string): Rgba | null {
  if (value in NAMED) return NAMED[value]!;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((digit) => digit + digit).join('') : hex;
    const channel = (index: number) => Number.parseInt(full.slice(index, index + 2), 16) / 255;
    return [channel(0), channel(2), channel(4), full.length === 8 ? channel(6) : 1];
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(value)?.[1];
  if (rgb) {
    const [r = 0, g = 0, b = 0, a = 1] = rgb.split(',').map(Number);
    return [r / 255, g / 255, b / 255, a];
  }
  return null;
}

type MixPart = { color: string; weight: number | null };

function mixPart(part: string): MixPart {
  const weight = /\s(\d+(?:\.\d+)?)%$/.exec(part);
  return weight
    ? { color: part.slice(0, weight.index).trim(), weight: Number(weight[1]) / 100 }
    : { color: part.trim(), weight: null };
}

class Scope {
  constructor(
    private readonly declarations: Declarations,
    private readonly parent: Scope | null = null
  ) {}

  color(name: string): Rgba {
    const own = this.declarations.get(name);
    if (own !== undefined) return this.evaluate(own);
    if (this.parent) return this.parent.color(name);
    throw new Error(`${name} is declared nowhere`);
  }

  private evaluate(value: string): Rgba {
    const direct = literal(value);
    if (direct) return direct;
    const reference = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
    if (reference) return this.color(reference);
    const mix = /^color-mix\(\s*in srgb\s*,(.*)\)$/.exec(value)?.[1];
    if (!mix) throw new Error(`cannot evaluate ${value}`);
    const [first, second] = splitArguments(mix).map(mixPart);
    if (!first || !second) throw new Error(`cannot evaluate ${value}`);
    const weightA = first.weight ?? 1 - (second.weight ?? 0.5);
    const weightB = second.weight ?? 1 - weightA;
    const a = this.evaluate(first.color);
    const b = this.evaluate(second.color);
    const alpha = weightA * a[3] + weightB * b[3];
    if (alpha === 0) return [0, 0, 0, 0];
    const channel = (index: number) =>
      (weightA * a[3] * a[index]! + weightB * b[3] * b[index]!) / alpha;
    return [channel(0), channel(1), channel(2), alpha];
  }
}

function over(top: Rgba, bottom: Rgba): Rgba {
  const alpha = top[3];
  const channel = (index: number) => alpha * top[index]! + (1 - alpha) * bottom[index]!;
  return [channel(0), channel(1), channel(2), 1];
}

function luminance(color: Rgba): number {
  const linear = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(color[0]) + 0.7152 * linear(color[1]) + 0.0722 * linear(color[2]);
}

function contrast(
  scope: Scope,
  foreground: string,
  background: string,
  surface = '--color-surface'
): number {
  const page = over(scope.color(surface), NAMED.white!);
  const ground = over(scope.color(background), page);
  const ink = over(scope.color(foreground), ground);
  const [light, dark] = [luminance(ink), luminance(ground)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-text-muted', '--color-surface-raised'],
  ['--color-text-muted', '--color-surface-sunken'],
  ['--color-text-subtle', '--color-bg'],
  ['--color-text-subtle', '--color-surface'],
  ['--color-text-subtle', '--color-surface-raised'],
  ['--color-section-heading', '--color-surface'],
  ['--color-placeholder', '--color-input-bg'],
  ['--color-error', '--color-surface'],
  ['--color-error', '--color-error-bg'],
  ['--color-success', '--color-surface'],
  ['--color-success', '--color-success-bg'],
  ['--color-warning', '--color-surface'],
  ['--color-warning', '--color-warning-bg'],
  ['--color-badge-finished-text', '--color-badge-finished-bg'],
  ['--color-badge-upcoming-text', '--color-badge-upcoming-bg'],
  ['--color-badge-live-text', '--color-badge-live-bg'],
  ['--color-badge-pending-text', '--color-badge-pending-bg'],
  ['--color-badge-host-text', '--color-badge-host-bg'],
  ['--color-search-highlight-text', '--color-search-highlight-bg'],
];

const ACCENT_TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['--color-primary-contrast', '--color-primary'],
  ['--color-primary-contrast', '--color-primary-hover'],
  ['--color-primary-text', '--color-surface'],
  ['--color-primary-text', '--color-bg'],
  ['--color-primary-text', '--color-primary-soft'],
  ['--color-primary-text-hover', '--color-primary-soft-hover'],
  ['--color-primary-text', '--color-primary-tint'],
];

const RAISED_ACCENT_TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['--color-primary-text', '--color-primary-soft'],
  ['--color-primary-text-hover', '--color-primary-soft-hover'],
];

const BOUNDARY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['--color-border-field', '--color-surface'],
  ['--color-border-field', '--color-surface-raised'],
  ['--color-border-field', '--color-bg'],
  ['--color-border-field', '--color-input-bg'],
];

const THEMES: readonly Theme[] = ['light', 'dark'];

function failures(
  scope: Scope,
  pairs: ReadonlyArray<readonly [string, string]>,
  minimum: number,
  label: string,
  surface = '--color-surface'
): string[] {
  return pairs.flatMap(([foreground, background]) => {
    const ratio = contrast(scope, foreground, background, surface);
    return ratio < minimum
      ? [`${label}: ${foreground} on ${background} over ${surface} = ${ratio.toFixed(2)}`]
      : [];
  });
}

describe('foundation colour roles', () => {
  it.each(THEMES)('keep text at 4.5:1 and field boundaries at 3:1 in the %s theme', (theme) => {
    const scope = new Scope(rootDeclarations(theme, 'blue'));
    expect([
      ...failures(scope, TEXT_PAIRS, 4.5, theme),
      ...failures(scope, BOUNDARY_PAIRS, 3, theme),
    ]).toEqual([]);
  });

  it.each(THEMES)('keep every accent readable in the %s theme', (theme) => {
    expect(
      ACCENTS.flatMap((accent) => {
        const scope = new Scope(rootDeclarations(theme, accent));
        return [
          ...failures(scope, ACCENT_TEXT_PAIRS, 4.5, `${theme}/${accent}`),
          ...failures(
            scope,
            RAISED_ACCENT_TEXT_PAIRS,
            4.5,
            `${theme}/${accent}`,
            '--color-surface-raised'
          ),
          ...failures(scope, [['--color-primary', '--color-surface']], 3, `${theme}/${accent}`),
        ];
      })
    ).toEqual([]);
  });

  it('keep the wheel labels readable on every segment', () => {
    const scope = new Scope(rootDeclarations('light', 'blue'));
    const segments = [...BLOCKS.flatMap((block) => [...block.declarations.keys()])].filter((name) =>
      /^--color-wheel-\d+$/.test(name)
    );
    expect(segments).toHaveLength(12);
    expect(
      failures(
        scope,
        segments.map((segment) => ['--color-wheel-label', segment] as const),
        4.5,
        'wheel'
      )
    ).toEqual([]);
  });

  it('keep a dark section readable inside a light page, whatever the accent', () => {
    expect(
      ACCENTS.flatMap((accent) => {
        const scope = new Scope(onDarkDeclarations(), new Scope(rootDeclarations('light', accent)));
        return [
          ...failures(
            scope,
            [['--color-primary-text', '--color-surface']],
            4.5,
            `on-dark/${accent}`
          ),
          ...(accent === 'blue'
            ? [
                ...failures(scope, TEXT_PAIRS, 4.5, 'on-dark'),
                ...failures(scope, BOUNDARY_PAIRS, 3, 'on-dark'),
              ]
            : []),
        ];
      })
    ).toEqual([]);
  });
});
