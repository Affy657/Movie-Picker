import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COLOR_MIX_SUPPORT_QUERY,
  buildColorMixFallback,
  readColorMixTokenSheets,
  resolveMixes,
} from './colorMixFallback';

const [foundation = '', landing = ''] = readColorMixTokenSheets(
  path.resolve(import.meta.dirname, '..')
);
const fallback = buildColorMixFallback([foundation, landing]);

function block(selector: string): string {
  const start = fallback.indexOf(`${selector} {\n`);
  if (start === -1) throw new Error(`no fallback block for ${selector}`);
  return fallback.slice(start, fallback.indexOf('}', start));
}

describe('resolveMixes', () => {
  it('turns a mix with transparent into the same colour at that opacity', () => {
    expect(resolveMixes('color-mix(in srgb, #2563eb 12%, transparent)')).toBe(
      'rgba(37, 99, 235, 0.12)'
    );
  });

  it('mixes two opaque colours channel by channel', () => {
    expect(resolveMixes('color-mix(in srgb, #ffffff 50%, #000000)')).toBe('rgb(128, 128, 128)');
  });

  it('keeps what surrounds a mix inside a shadow', () => {
    expect(resolveMixes('0 0 0 3px color-mix(in srgb, rgba(0, 0, 0, 0.5) 50%, transparent)')).toBe(
      '0 0 0 3px rgba(0, 0, 0, 0.25)'
    );
  });
});

describe('colour-mix fallback for Safari before 16.2', () => {
  it('only applies where color-mix() is not understood', () => {
    const guard = `@supports not (color: ${COLOR_MIX_SUPPORT_QUERY}) {`;
    expect(fallback.startsWith(guard)).toBe(true);
    expect(fallback.slice(guard.length)).not.toContain('color-mix(');
  });

  it('computes the soft primary of the light theme', () => {
    expect(block(":root[data-theme='light']")).toContain(
      '--color-primary-soft: rgba(37, 99, 235, 0.12);'
    );
  });

  it('follows the accent colour the user picked', () => {
    expect(block(":root[data-theme='dark'][data-accent='green']")).toContain(
      '--color-primary-soft:'
    );
  });

  it('recomputes the tokens of a member colour zone inside a page of another accent', () => {
    expect(block(":root[data-theme='dark'] .accent-pink")).toContain(
      '--color-primary-soft: rgba(244, 114, 182, 0.14);'
    );
    expect(block(":root[data-theme='light'] .accent-default")).toContain(
      '--color-primary-soft: rgba(37, 99, 235, 0.12);'
    );
  });

  it('recomputes the tokens of a dark section inside a light page', () => {
    expect(block(":root[data-theme='light'] .on-dark")).toContain('--color-primary-text:');
  });

  it('covers the landing page palette', () => {
    expect(block(":root[data-theme='dark'] .landingPalette")).toContain('--color-letterboxd-fg:');
  });

  it('gives every color-mix() token a fallback', () => {
    const declared = new Set(
      [...`${foundation}\n${landing}`.matchAll(/(--[\w-]+)\s*:[^;]*color-mix\(/g)].map(
        ([, name]) => name
      )
    );
    for (const name of declared) expect(fallback).toContain(`${name}:`);
  });
});

describe('what the fallback refuses to guess', () => {
  it('stops on a token a mix reads that a media query redefines', () => {
    const css = `
      :root { --a: #000000; --b: color-mix(in srgb, var(--a) 50%, transparent); }
      [data-theme='light'] { --c: #ffffff; }
      @media (min-width: 48rem) { :root { --a: #ff0000; } }
    `;
    expect(() => buildColorMixFallback([css])).toThrow(/--a is declared under "@media/);
  });

  it('stops on a colour it cannot read instead of printing NaN', () => {
    expect(() => resolveMixes('color-mix(in srgb, rgb(a b c) 50%, transparent)')).toThrow(
      /cannot read the colour/
    );
  });

  it('reads channels written as percentages', () => {
    expect(resolveMixes('color-mix(in srgb, rgb(100% 0% 0%) 50%, transparent)')).toBe(
      'rgba(255, 0, 0, 0.5)'
    );
  });
});
