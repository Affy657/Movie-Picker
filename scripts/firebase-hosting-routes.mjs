import { readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const HOSTING_CONFIG = 'infra/firebase-hosting.json';
export const FRONT_ROUTES = 'apps/web/src/app/routes.ts';
export const FRONT_ROUTER = 'apps/web/src/app/App.tsx';
export const PRERENDERED_ROUTES = 'apps/web/src/app/prerenderRoutes.ts';
export const API_FRONT_ROUTES = 'apps/api-dotnet/MoviePicker.Api/Application/FrontRoutes.cs';
export const NOT_FOUND_PAGE = '/404.html';

export function readRepositoryFile(file) {
  return readFileSync(join(root, file), 'utf8');
}

function matchesRewrite(path, rewrite) {
  if (rewrite.glob !== undefined) return posix.matchesGlob(path, rewrite.glob);
  if (rewrite.regex !== undefined) return new RegExp(rewrite.regex).test(path);
  throw new Error(`${HOSTING_CONFIG}: a rewrite without glob nor regex`);
}

export function resolveHostingPath(config, files, path) {
  if (config.trailingSlashBehavior === 'REMOVE' && path.length > 1 && path.endsWith('/')) {
    return { status: 301, served: path.slice(0, -1) };
  }
  if (files.has(path)) return { status: 200, served: path };
  const directoryIndex = posix.join(path, 'index.html');
  if (files.has(directoryIndex)) return { status: 200, served: directoryIndex };
  const rewrite = (config.rewrites ?? []).find((candidate) => matchesRewrite(path, candidate));
  if (rewrite?.run) return { status: 'api', served: rewrite.run.serviceId, rewrite };
  if (rewrite?.path && files.has(rewrite.path)) {
    return { status: 200, served: rewrite.path, rewrite };
  }
  return { status: 404, served: files.has(NOT_FOUND_PAGE) ? NOT_FOUND_PAGE : null };
}

function routeConstants(source) {
  const constants = {};
  for (const [, name, value] of source.matchAll(/^(?:export )?const (\w+) = '([^']*)';$/gm)) {
    constants[name] = value;
  }
  for (const [, object, body] of source.matchAll(/^const (\w+)[^=\n]*= \{([^}]*)\};$/gm)) {
    for (const [, key, value] of body.matchAll(/(\w+): '([^']*)'/g)) {
      constants[`${object}.${key}`] = value;
    }
  }
  return constants;
}

export function frontRouteTable(source) {
  const constants = routeConstants(source);
  const body = /export const ROUTES = \{([\s\S]*?)\n\} as const;/.exec(source)?.[1];
  if (!body)
    throw new Error(`${FRONT_ROUTES}: no \`export const ROUTES = { ... } as const\` found`);
  const routes = {};
  for (const [, key, raw] of body.matchAll(/^ {2}(\w+): ['`]([^'`]*)['`],$/gm)) {
    routes[key] = raw.replaceAll(/\$\{([\w.]+)\}/g, (placeholder, name) => {
      if (!(name in constants))
        throw new Error(`${FRONT_ROUTES}: ${key} uses ${placeholder}, unknown`);
      return constants[name];
    });
  }
  return routes;
}

export const NOT_FOUND_ROUTE = '*';

export function routerPatterns(appSource, routes) {
  const patterns = [];
  const references = appSource.matchAll(
    /\bpath=\{(?:ROUTES\.(\w+)|`\$\{ROUTES\.(\w+)\}([^`]*)`)\}/g
  );
  for (const [, plainKey, templateKey, suffix = ''] of references) {
    const key = plainKey ?? templateKey;
    if (typeof routes[key] !== 'string') {
      throw new Error(`${FRONT_ROUTER}: ROUTES.${key} is not a path of ${FRONT_ROUTES}`);
    }
    patterns.push(`${routes[key]}${suffix}`);
  }
  const literals = [...appSource.matchAll(/\bpath="([^"]*)"/g)].map(([, path]) => path);
  const unknownLiteral = literals.find((path) => path !== NOT_FOUND_ROUTE);
  if (unknownLiteral !== undefined) {
    throw new Error(`${FRONT_ROUTER}: route path "${unknownLiteral}" written outside ROUTES`);
  }
  const declared = [...appSource.matchAll(/\bpath=/g)].length;
  if (declared !== patterns.length + literals.length) {
    throw new Error(
      `${FRONT_ROUTER}: ${declared - patterns.length - literals.length} route path(s) this check cannot read`
    );
  }
  if (patterns.length === 0) throw new Error(`${FRONT_ROUTER}: no <Route path={ROUTES.x}> found`);
  return patterns;
}

export function prerenderedRoutes(prerenderSource, routes) {
  const list = /export const PRERENDERED_ROUTES = \[([\s\S]*?)\] as const;/.exec(
    prerenderSource
  )?.[1];
  if (!list) throw new Error(`${PRERENDERED_ROUTES}: no PRERENDERED_ROUTES found`);
  return [...list.matchAll(/ROUTES\.(\w+)/g)].map(([, key]) => routes[key]);
}

export function apiFrontPaths(source) {
  return [...source.matchAll(/public const string \w+ = "(\/[^"]*)";/g)].map(([, path]) => path);
}

export function samplePaths(pattern) {
  const concrete = pattern.replaceAll(/:(\w+)/g, 'probe-$1').split(/[?#]/)[0];
  if (!concrete.endsWith('/*')) return [concrete];
  const base = concrete.slice(0, -2);
  return [base, `${base}/probe`, `${base}/probe/deeper`];
}

export function publishedFiles({ prerendered }) {
  return new Set([
    '/index.html',
    NOT_FOUND_PAGE,
    '/sw.js',
    '/manifest.webmanifest',
    '/robots.txt',
    '/sitemap.xml',
    '/assets/index-AbC12345.js',
    '/invitations/list.html',
    '/invitations/group.html',
    ...prerendered.map((route) => posix.join(route, 'index.html')),
  ]);
}
