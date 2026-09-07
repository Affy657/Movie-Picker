import path from 'node:path';
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const devQuickLoginStub = path.resolve(
  __dirname,
  'src/features/auth/devQuickLoginCredentials.stub.ts'
);

function hostLooksLocal(host: string): boolean {
  const h = (host.split(':')[0] ?? host).toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
}

function toApiOrigin(raw: string): string {
  const base = (raw ?? '').trim();
  if (!base) return '';
  let withScheme = base;
  if (!/^https?:\/\//i.test(base)) {
    const withoutSlash = base.replace(/^\//, '');
    const hostPart = ((withoutSlash.split('/')[0] ?? '').split('@').pop() ?? withoutSlash).trim();
    withScheme = `${hostLooksLocal(hostPart) ? 'http' : 'https'}://${withoutSlash}`;
  }
  try {
    return new URL(withScheme).origin;
  } catch {
    return '';
  }
}

function toSentryIngestOrigin(dsn: string): string {
  const raw = (dsn ?? '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
}

function cspMetaPlugin(apiOrigin: string, sentryOrigin: string): Plugin {
  const connectSrc = [
    "'self'",
    apiOrigin,
    sentryOrigin,
    'https://eu.i.posthog.com',
    'https://eu-assets.i.posthog.com',
    'https://image.tmdb.org',
  ]
    .filter(Boolean)
    .join(' ');
  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https://image.tmdb.org',
    'https://api.dicebear.com',
    apiOrigin,
  ]
    .filter(Boolean)
    .join(' ');
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    'frame-src https://www.youtube.com',
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'moviepicker-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

const CRITICAL_FONT_BASES = [
  'overpass-latin-400-normal',
  'overpass-latin-700-normal',
  'overpass-latin-800-normal',
];

const APP_SHELL_CHUNK = /(?:^|\/)App-[\w-]+\.js$/;
const APP_SHELL_STYLES = /(?:^|\/)App-[\w-]+\.css$/;
const I18N_CHUNK = /(?:^|\/)i18n-[\w-]+\.js$/;

function preloadCriticalAssetsPlugin(): Plugin {
  return {
    name: 'moviepicker-preload-critical-assets',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html, ctx) {
      const files = Object.keys(ctx.bundle ?? {});
      const tags: Array<HtmlTagDescriptor> = CRITICAL_FONT_BASES.map((base) =>
        files.find((file) => file.includes(base) && file.endsWith('.woff2'))
      )
        .filter((file): file is string => Boolean(file))
        .map((file) => ({
          tag: 'link',
          attrs: {
            rel: 'preload',
            href: '/' + file,
            as: 'font',
            type: 'font/woff2',
            crossorigin: '',
          },
          injectTo: 'head-prepend',
        }));

      const appChunk = files.find((file) => APP_SHELL_CHUNK.test(file));
      if (appChunk) {
        tags.push({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: '/' + appChunk },
          injectTo: 'head-prepend',
        });
      }

      const appStyles = files.find((file) => APP_SHELL_STYLES.test(file));
      if (appStyles) {
        tags.push({
          tag: 'link',
          attrs: { rel: 'preload', as: 'style', href: '/' + appStyles },
          injectTo: 'head-prepend',
        });
      }

      const i18nChunk = files.find((file) => I18N_CHUNK.test(file));
      if (i18nChunk) {
        tags.push({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: '/' + i18nChunk },
          injectTo: 'head-prepend',
        });
      }

      return { html, tags };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname));
  const apiOrigin = toApiOrigin(process.env.VITE_API_URL || env.VITE_API_URL || '');
  const sentryDsn = process.env.VITE_SENTRY_DSN || env.VITE_SENTRY_DSN || '';
  const sentryOrigin = toSentryIngestOrigin(sentryDsn);
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Movie Picker',
          short_name: 'Movie Picker',
          description:
            'Organisez une soirée cinéma : créez un événement, partagez le lien, proposez des films, votez et tirez au sort.',
          theme_color: '#0a0f1c',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/my-events',
          scope: '/',
          lang: 'fr',
          prefer_related_applications: false,
          icons: [
            {
              src: '/icons/pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: '/icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/pwa-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        },
        devOptions: {
          enabled: env.VITE_DEV_SERVICE_WORKER === 'true',
          type: 'module',
        },
      }),
      cspMetaPlugin(apiOrigin, sentryOrigin),
      preloadCriticalAssetsPlugin(),
      ...(sentryAuthToken
        ? sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: sentryAuthToken,
            url: process.env.SENTRY_URL,
            release: { name: process.env.SENTRY_RELEASE },
            sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
            telemetry: false,
          })
        : []),
    ],
    resolve: {
      alias: [
        ...(mode === 'production'
          ? [
              {
                find: '@/features/auth/devQuickLoginCredentials',
                replacement: devQuickLoginStub,
              },
            ]
          : []),
        { find: '@', replacement: path.resolve(__dirname, 'src') },
      ],
    },
    server: {
      port: Number(process.env.PORT) || 5173,
    },
    build: {
      target: 'es2022',
      sourcemap: sentryAuthToken ? 'hidden' : false,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (/[\\/](react|react-dom|react-router|react-router|scheduler)[\\/]/.test(id)) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack')) return 'query-vendor';
            return undefined;
          },
        },
      },
    },
  };
});
