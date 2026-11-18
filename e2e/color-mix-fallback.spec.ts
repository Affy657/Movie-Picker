import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  buildColorMixFallback,
  readColorMixTokenSheets,
} from '../apps/web/tooling/colorMixFallback';

const fallback = buildColorMixFallback(readColorMixTokenSheets(path.resolve('apps/web')));

const blocks = [...fallback.matchAll(/(:root[^{]*)\{([^}]*)\}/g)].map(
  ([, selector = '', body = '']) => ({
    selector: selector.trim(),
    tokens: [...body.matchAll(/(--[\w-]+):\s*rgba?\([^)]*\);/g)].map(([, name = '']) => name),
  })
);

test('the colours computed for Safari before 16.2 match what color-mix() paints', async ({
  page,
}) => {
  await page.goto('/decouvrir');
  await expect(page.locator('.landingPalette').first()).toBeAttached();

  const mismatches = await page.evaluate(
    ({ blocks, forced }) => {
      const parse = (value: string) => {
        const srgb = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/.exec(
          value
        );
        if (srgb)
          return [
            Number(srgb[1]) * 255,
            Number(srgb[2]) * 255,
            Number(srgb[3]) * 255,
            Number(srgb[4] ?? 1),
          ];
        const rgb = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(value);
        return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), Number(rgb[4] ?? 1)] : null;
      };
      const html = document.documentElement;
      const host = document.querySelector('.landingPalette')!.parentElement!;
      const found: string[] = [];
      for (const { selector, tokens } of blocks) {
        html.dataset.theme = /data-theme='(\w+)'/.exec(selector)![1];
        const accent = /data-accent='(\w+)'/.exec(selector)?.[1];
        if (accent) html.dataset.accent = accent;
        else delete html.dataset.accent;
        const probeRoot = document.createElement('div');
        let parent = probeRoot;
        for (const [, className] of selector.matchAll(/ \.([\w-]+)/g)) {
          const element = document.createElement('div');
          element.className = className!;
          parent.append(element);
          parent = element;
        }
        const probe = document.createElement('div');
        parent.append(probe);
        host.append(probeRoot);
        const paint = () =>
          tokens.map((token) => {
            probe.style.backgroundColor = `var(${token})`;
            return getComputedStyle(probe).backgroundColor;
          });
        const native = paint();
        const style = document.createElement('style');
        style.textContent = forced;
        document.head.append(style);
        const computed = paint();
        style.remove();
        probeRoot.remove();
        tokens.forEach((token, index) => {
          const a = parse(native[index]!);
          const b = parse(computed[index]!);
          const off =
            !a ||
            !b ||
            a.slice(0, 3).some((channel, k) => Math.abs(channel - b[k]!) > 1.5) ||
            Math.abs(a[3]! - b[3]!) > 0.004;
          if (off) found.push(`${selector} ${token}: ${native[index]} vs ${computed[index]}`);
        });
      }
      return found;
    },
    { blocks, forced: fallback.replace(/^@supports not \([^{]*\{/, '@supports (color: red) {') }
  );

  expect(blocks.length).toBeGreaterThan(10);
  expect(mismatches).toEqual([]);
});
