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

const REACT_VENDOR = /[\\/]node_modules[\\/].*[\\/](react|react-dom|react-router|scheduler)[\\/]/;
const QUERY_VENDOR = /[\\/]node_modules[\\/].*[\\/]@tanstack[\\/]/;
const ICON_VENDOR = /[\\/]node_modules[\\/].*[\\/]lucide-react[\\/]/;
const VENDORS_LOADED_ON_DEMAND = /[\\/](@sentry|posthog-js|canvas-confetti|react-qr-code)[\\/]/;

function isReactVendor(id: string): boolean {
  return REACT_VENDOR.test(id) && !VENDORS_LOADED_ON_DEMAND.test(id);
}

/**
 * Vite 8 bundle avec rolldown, qui ignore `experimentalMinChunkSize` sans un mot : mesure du
 * 2026-09-14, 71 chunks sur 92 sous 12 Ko et 28 requetes JS pour la page d'accueil. Les groupes
 * ci-dessous portent l'intention d'origine : un chunk par langue et par vendeur eager, et la
 * coquille `App` avec toute sa fermeture statique. Regrouper en plus les modules partages entre
 * pages (`entriesAware`) a ete mesure et ecarte, voir I10 de `docs/technical-debt.md`.
 */
function codeSplittingGroups(appShellModules: ReadonlySet<string>) {
  return [
    ...LOCALE_CODES.map((code) => ({
      name: `i18n-${code}`,
      test: new RegExp(`[\\\\/]shared[\\\\/]i18n[\\\\/]locales[\\\\/]${code}\\.ts$`),
      priority: 30,
    })),
    { name: 'react-vendor', test: isReactVendor, priority: 20 },
    { name: 'query-vendor', test: QUERY_VENDOR, priority: 20 },
    { name: 'icons-vendor', test: ICON_VENDOR, priority: 20 },
    { name: 'App', test: (id: string) => appShellModules.has(id), priority: 15 },
  ];
}

const APP_SHELL_MODULE = /[\\/]src[\\/]app[\\/]App\.tsx$/;

/**
 * Releve la fermeture des imports statiques de la coquille `App` pendant la phase de build, pour
 * que le groupe `App` du decoupage la contienne entierement. Ce que la coquille importe est de
 * toute facon charge avant la premiere page : le laisser en chunks separes ajoute des requetes a
 * la premiere vague (I9 de `docs/technical-debt.md`) ou des allers-retours apres l'evaluation de
 * la coquille, sans jamais epargner un octet.
 */
function appShellClosurePlugin(appShellModules: Set<string>): Plugin {
  const staticImports = new Map<string, ReadonlyArray<string>>();
  return {
    name: 'moviepicker-app-shell-closure',
    apply: 'build',
    buildStart() {
      appShellModules.clear();
      staticImports.clear();
    },
    moduleParsed(info) {
      staticImports.set(info.id, info.importedIds);
    },
    buildEnd() {
      const queue = [...staticImports.keys()].filter((id) => APP_SHELL_MODULE.test(id));
      while (queue.length > 0) {
        const id = queue.pop()!;
        if (appShellModules.has(id)) continue;
        appShellModules.add(id);
        queue.push(...(staticImports.get(id) ?? []));
      }
    },
  };
}

type BundleChunkInfo = {
  type?: string;
  name?: string;
  isEntry?: boolean;
  imports?: ReadonlyArray<string>;
  dynamicImports?: ReadonlyArray<string>;
  source?: string | Uint8Array;
  viteMetadata?: { importedCss?: ReadonlySet<string> };
};

type OutputBundleInfo = Record<string, BundleChunkInfo | undefined>;

/**
 * Ferme le graphe des imports statiques des chunks passes en racine.
 * Sans ces indices, le navigateur ne decouvre les dependances statiques de la
 * coquille qu'apres avoir evalue son chunk : un aller-retour reseau complet de
 * plus avant le premier rendu de React, donc avant le LCP de chaque page.
 */
function staticGraphClosure(
  bundle: OutputBundleInfo,
  roots: ReadonlyArray<string | undefined>
): { js: Array<string>; css: Array<string> } {
  const js = new Set<string>();
  const css = new Set<string>();
  const queue = roots.filter((file): file is string => Boolean(file));
  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || js.has(file)) continue;
    const chunk = bundle[file];
    if (!chunk || chunk.type !== 'chunk') continue;
    js.add(file);
    for (const imported of chunk.imports ?? []) queue.push(imported);
    for (const style of chunk.viteMetadata?.importedCss ?? []) css.add(style);
  }
  return { js: [...js], css: [...css] };
}

const ROUTE_ASSETS_MANIFEST = 'route-assets.json';

/**
 * Remplace la feuille de style globale par son contenu en ligne.
 * Elle bloque le rendu et n'est decouverte qu'apres le document : c'est un aller-retour reseau
 * complet avant le premier pixel, sur toutes les pages. En ligne, le premier rendu ne depend plus
 * que du document lui-meme, et une page prerendue peint alors sa mise en page finale du premier
 * coup au lieu de peindre sans styles puis de se remettre en page.
 */
function inlineBlockingStyles(html: string, bundle: OutputBundleInfo, entry?: string): string {
  if (!entry) return html;
  let output = html;
  for (const file of bundle[entry]?.viteMetadata?.importedCss ?? []) {
    const source = bundle[file]?.source;
    if (typeof source !== 'string') continue;
    const hrefAt = output.indexOf('/' + file);
    if (hrefAt < 0) continue;
    const tagStart = output.lastIndexOf('<link', hrefAt);
    const tagEnd = output.indexOf('>', hrefAt);
    if (tagStart < 0 || tagEnd < 0) continue;
    output = `${output.slice(0, tagStart)}<style>${source}</style>${output.slice(tagEnd + 1)}`;
  }
  return output;
}

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
            fetchpriority: 'low',
          },
          injectTo: 'head-prepend',
        }));

      const bundle = (ctx.bundle ?? {}) as unknown as OutputBundleInfo;
      const appChunk = files.find((file) => APP_SHELL_CHUNK.test(file));
      const entryChunk = files.find(
        (file) => bundle[file]?.type === 'chunk' && bundle[file]?.isEntry
      );

      if (appChunk && !html.includes('/' + appChunk)) {
        tags.push({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: '/' + appChunk },
          injectTo: 'head-prepend',
        });
      }

      const appStyles = files.find((file) => APP_SHELL_STYLES.test(file));
      if (appStyles && !html.includes('/' + appStyles)) {
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

      return { html: inlineBlockingStyles(html, bundle, entryChunk), tags };
    },
    /**
     * Publie, pour chaque page chargee a la demande, la fermeture de ses imports statiques.
     * `scripts/prerender.mjs` s'en sert pour poser dans le document prerendu les feuilles de style
     * de la route : sans elles le contenu prerendu peint sans styles, se remet en page quand le
     * JavaScript arrive, et le LCP se decale sur ce second rendu au lieu du premier. `inlinedCss`
     * dit quelles feuilles sont deja dans le document en ligne, pour ne pas les redemander.
     */
    generateBundle(_options, outputBundle) {
      const bundle = outputBundle as unknown as OutputBundleInfo;
      const files = Object.keys(bundle);
      const appFile = files.find((file) => APP_SHELL_CHUNK.test(file));
      if (!appFile) return;
      const entryFile = files.find(
        (file) => bundle[file]?.type === 'chunk' && bundle[file]?.isEntry
      );
      const chunks: Record<string, { js: Array<string>; css: Array<string> }> = {};
      for (const file of bundle[appFile]?.dynamicImports ?? []) {
        const name = bundle[file]?.name;
        if (!name) continue;
        chunks[name] = staticGraphClosure(bundle, [file]);
      }
      const inlinedCss = [...(bundle[entryFile ?? '']?.viteMetadata?.importedCss ?? [])];
      this.emitFile({
        type: 'asset',
        fileName: ROUTE_ASSETS_MANIFEST,
        source: JSON.stringify({ inlinedCss, chunks }, null, 2),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname));
  const appShellModules = new Set<string>();
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
      appShellClosurePlugin(appShellModules),
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
          codeSplitting: { groups: codeSplittingGroups(appShellModules) },
        },
      },
    },
  };
});
