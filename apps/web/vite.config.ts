import path from 'node:path';
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import {
  buildContentSecurityPolicy,
  toApiOrigin,
  toSentryIngestOrigin,
} from './src/shared/utils/contentSecurityPolicy';

const devQuickLoginStub = path.resolve(
  __dirname,
  'src/features/auth/devQuickLoginCredentials.stub.ts'
);

function cspMetaPlugin(apiOrigin: string, sentryOrigin: string): Plugin {
  const policy = buildContentSecurityPolicy(apiOrigin, sentryOrigin);
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

const LOCALE_MODULE = /[\\/]shared[\\/]i18n[\\/]locales[\\/](fr|en)\.ts$/;
const LOCALE_CODES = ['fr', 'en'] as const;
const LOCALE_STORAGE_KEY = 'moviepicker-locale';
const DEFAULT_LOCALE = 'fr';

function localeChunkByCode(files: ReadonlyArray<string>): Record<string, string> {
  const found: Record<string, string> = {};
  for (const code of LOCALE_CODES) {
    const chunk = files.find((file) => new RegExp(`(?:^|/)i18n-${code}-[\\w-]+\\.js$`).test(file));
    if (chunk) found[code] = chunk;
  }
  return found;
}

function activeLocalePreloadScript(chunkByCode: Record<string, string>): string {
  return [
    '(function(){try{',
    `var c=${JSON.stringify(chunkByCode)};`,
    `var s=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});`,
    "var l=c[s]?s:((navigator.language||'').toLowerCase().indexOf('en')===0?'en':",
    `${JSON.stringify(DEFAULT_LOCALE)});`,
    'var h=c[l];if(!h)return;',
    "var e=document.createElement('link');e.rel='modulepreload';e.crossOrigin='';",
    "e.href='/'+h;document.head.appendChild(e);",
    '}catch(_){}})()',
  ].join('');
}

const REACT_VENDOR = /[\\/](react|react-dom|react-router|scheduler)[\\/]/;
const ICON_VENDOR = /[\\/]lucide-react[\\/]/;
const VENDORS_LOADED_ON_DEMAND = /[\\/](@sentry|posthog-js|canvas-confetti|react-qr-code)[\\/]/;
const CHUNK_SIZE_NOT_WORTH_A_ROUND_TRIP = 12_000;

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

      const chunkByLocale = localeChunkByCode(files);
      if (Object.keys(chunkByLocale).length > 0) {
        tags.push({
          tag: 'script',
          children: activeLocalePreloadScript(chunkByLocale),
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
          experimentalMinChunkSize: CHUNK_SIZE_NOT_WORTH_A_ROUND_TRIP,
          manualChunks(id) {
            const localeModule = LOCALE_MODULE.exec(id);
            if (localeModule) return `i18n-${localeModule[1]}`;
            if (!id.includes('node_modules')) return undefined;
            if (VENDORS_LOADED_ON_DEMAND.test(id)) return undefined;
            if (REACT_VENDOR.test(id)) return 'react-vendor';
            if (id.includes('@tanstack')) return 'query-vendor';
            if (ICON_VENDOR.test(id)) return 'icons-vendor';
            return undefined;
          },
        },
      },
    },
  };
});
