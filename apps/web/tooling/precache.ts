const VENDOR_CHUNKS_LEFT_OUT_OF_PRECACHE = [
  ['sentry', /[\\/]node_modules[\\/](?:.*[\\/])?@sentry[\\/]/],
  ['posthog', /[\\/]node_modules[\\/](?:.*[\\/])?posthog-js[\\/]/],
] as const;

export function chunkFileName(chunk: { facadeModuleId: string | null }): string {
  const vendor = VENDOR_CHUNKS_LEFT_OUT_OF_PRECACHE.find(([, pattern]) =>
    pattern.test(chunk.facadeModuleId ?? '')
  );
  return vendor ? `assets/${vendor[0]}-[hash].js` : 'assets/[name]-[hash].js';
}

export const PRECACHE_IGNORES = [
  '**/node_modules/**/*',
  'invitations/**',
  '404.html',
  'assets/sentry-*.js',
  'assets/posthog-*.js',
  'assets/ReleaseNotesPage-*',
  'og-image.png',
];
