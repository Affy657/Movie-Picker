import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRECACHE_IGNORES, chunkFileName } from './precache';

const precached = (file: string) =>
  !PRECACHE_IGNORES.some((pattern) => path.matchesGlob(file, pattern));

describe('chunkFileName', () => {
  it('names the telemetry chunks after their vendor, so the precache can leave them out', () => {
    expect(
      chunkFileName({ facadeModuleId: '/repo/node_modules/@sentry/react/build/esm/index.js' })
    ).toBe('assets/sentry-[hash].js');
    expect(
      chunkFileName({
        facadeModuleId:
          'C:\\repo\\node_modules\\.pnpm\\posthog-js@1.0.0\\node_modules\\posthog-js\\dist\\module.js',
      })
    ).toBe('assets/posthog-[hash].js');
  });

  it('keeps the usual name for every other chunk', () => {
    expect(chunkFileName({ facadeModuleId: '/repo/apps/web/src/app/pages/HomePage.tsx' })).toBe(
      'assets/[name]-[hash].js'
    );
    expect(chunkFileName({ facadeModuleId: null })).toBe('assets/[name]-[hash].js');
  });
});

describe('PRECACHE_IGNORES', () => {
  it('leaves out telemetry, the share image, English and the release notes', () => {
    for (const file of [
      'assets/sentry-AbC12345.js',
      'assets/posthog-AbC12345.js',
      'assets/i18n-en-fZeYRtel.js',
      'assets/ReleaseNotesPage-ClSfBtTp.js',
      'assets/ReleaseNotesPage-B1c2D3e4.css',
      'og-image.png',
    ]) {
      expect(precached(file), file).toBe(false);
    }
  });

  it('keeps what the application needs offline', () => {
    for (const file of [
      'index.html',
      'assets/i18n-fr-Dcw1Pgee.js',
      'assets/App-Yv7It8Ow.js',
      'assets/HomePage-CJF7KFts.js',
      'icons/clap-192x192.png',
      'favicon.svg',
    ]) {
      expect(precached(file), file).toBe(true);
    }
  });
});
