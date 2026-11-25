import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import browserslist from 'browserslist';
import { describe, expect, it } from 'vitest';

type LightningCss = {
  browserslistToTargets(browsers: string[]): unknown;
  transform(options: {
    filename: string;
    code: Uint8Array;
    minify: boolean;
    targets: unknown;
    cssModules: boolean;
  }): { code: Uint8Array };
};

const WEB_ROOT = path.resolve(import.meta.dirname, '..');
const lightningCss = createRequire(createRequire(import.meta.url).resolve('vite'))(
  'lightningcss'
) as LightningCss;
const targets = lightningCss.browserslistToTargets(browserslist(undefined, { path: WEB_ROOT }));

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.name.endsWith('.css') ? [full] : [];
  });
}

function blurringBlocks(css: string): string[] {
  return (css.match(/\{[^{}]*\}/g) ?? []).filter((block) => block.includes('backdrop-filter'));
}

const BLURRING_SOURCES = cssFiles(path.join(WEB_ROOT, 'src'))
  .map((file) => ({ file: path.relative(WEB_ROOT, file), code: readFileSync(file, 'utf8') }))
  .filter(({ code }) => code.includes('backdrop-filter'));

function built({ file, code }: { file: string; code: string }): string {
  return Buffer.from(
    lightningCss.transform({
      filename: file,
      code: Buffer.from(code),
      minify: true,
      targets,
      cssModules: file.endsWith('.module.css'),
    }).code
  ).toString();
}

describe('backdrop blur in the built CSS', () => {
  it('covers the header, the sticky bars and the backdrop of the windows', () => {
    expect(BLURRING_SOURCES.map(({ file }) => path.basename(file))).toEqual(
      expect.arrayContaining([
        'AppShell.module.css',
        'MovieNightBar.module.css',
        'EventDetailHeader.module.css',
        'Modal.module.css',
      ])
    );
  });

  it.each(BLURRING_SOURCES)(
    'keeps backdrop-filter for Chromium and Firefox next to -webkit- for Safari in $file',
    (source) => {
      const blocks = blurringBlocks(built(source));
      expect(blocks).toHaveLength(blurringBlocks(source.code).length);
      for (const block of blocks) {
        expect(block).toMatch(/[{;]backdrop-filter:/);
        expect(block).toMatch(/-webkit-backdrop-filter:/);
      }
    }
  );
});
