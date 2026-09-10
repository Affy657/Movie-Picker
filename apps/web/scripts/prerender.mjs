/**
 * Prérendu des routes publiques statiques, à lancer **après** `vite build`.
 *
 * Ce que ça produit : un fichier HTML complet par route, identique à `dist/index.html` mais avec
 * le contenu de la page déjà dans `#root` et l'écran de démarrage retiré. Le client fait
 * `createRoot().render()` et non `hydrateRoot()`, donc React remplace ce contenu au boot : il n'y
 * a pas d'hydratation, donc aucun risque d'écart de balisage. Ce qui est gagné, c'est ce que voit
 * un client sans JavaScript — moteurs d'indexation, aperçus de liens, agents de crawl.
 *
 * Pourquoi l'écran de démarrage est retiré sur ces routes, et seulement sur elles : il est en
 * `position: fixed; inset: 0` et masquerait le contenu prérendu jusqu'au boot. La page d'accueil
 * n'est **pas** prérendue précisément pour ne pas y toucher, son titre peint dans la coquille
 * étant son élément LCP (voir C2 de docs/technical-debt.md).
 *
 * Rendu en français, la langue par défaut de `<html lang>` et de l'URL canonique. Un visiteur
 * anglophone voit donc brièvement du français avant que React ne reprenne la main : c'est le prix
 * d'un prérendu sans route par langue, assumé.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(webRoot, 'dist');
const ssrOut = join(webRoot, 'dist-prerender');
const outDir = join(dist, 'prerendered');

const indexHtmlPath = join(dist, 'index.html');
let indexHtml;
try {
  indexHtml = readFileSync(indexHtmlPath, 'utf8');
} catch {
  console.error(`[prerender] ${indexHtmlPath} absent — lancer \`vite build\` avant.`);
  process.exit(1);
}

console.log('[prerender] build SSR de src/prerender.tsx');
rmSync(ssrOut, { recursive: true, force: true });
execFileSync(
  'pnpm',
  ['exec', 'vite', 'build', '--ssr', 'src/prerender.tsx', '--outDir', 'dist-prerender'],
  { cwd: webRoot, stdio: 'inherit', shell: true }
);

// Le nom du chunk d'entrée est haché par la configuration de build partagée avec le client : on le
// retrouve par motif plutôt que de dupliquer une convention de nommage qui n'est pas la nôtre.
const ssrEntries = readdirSync(join(ssrOut, 'assets')).filter(
  (name) => name.startsWith('prerender-') && name.endsWith('.js')
);
if (ssrEntries.length !== 1) {
  console.error(
    `[prerender] ${ssrEntries.length} chunk(s) d'entrée trouvés dans dist-prerender/assets, un seul attendu : ${ssrEntries.join(', ')}`
  );
  process.exit(1);
}
const ssrEntry = pathToFileURL(join(ssrOut, 'assets', ssrEntries[0])).href;

const dom = new JSDOM('<!doctype html><html lang="fr"><head></head><body></body></html>', {
  url: 'https://web.movie-picker.fr/',
  pretendToBeVisual: true,
});
// jsdom n'implémente pas `matchMedia` et plusieurs composants l'appellent sans garde, dont
// `usePwaInstall` par le pied de page. Même forme que le polyfill de `src/test-setup.ts` : toutes
// les requêtes répondent `false`, ce qui donne le rendu par défaut (thème clair, hors standalone).
Object.defineProperty(dom.window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }),
});

const browserGlobals = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'HTMLElement',
  'Element',
  'Node',
  'CustomEvent',
  'Event',
  'MutationObserver',
  'IntersectionObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'matchMedia',
];
// `defineProperty` et pas une affectation : Node 22 expose `navigator` en accesseur sans setter,
// donc `globalThis.navigator = …` lève au lieu de remplacer la valeur.
for (const name of browserGlobals) {
  const value = dom.window[name];
  if (value === undefined) continue;
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}
if (!globalThis.matchMedia)
  globalThis.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });
// La détection de langue lit d'abord le stockage : le semer rend le prérendu déterministe, là où
// `navigator.language` de jsdom vaut en-US et donnerait des pages anglaises.
globalThis.localStorage.setItem('moviepicker-locale', 'fr');

// La liste des routes sort du bundle SSR, pas d'une copie ici : elle est dérivée de `ROUTES` dans
// `src/app/prerenderRoutes.ts`, donc un renommage de route casse le build au lieu de produire
// silencieusement un fichier que personne ne sert.
const {
  renderRoute,
  PRERENDERED_ROUTES: routes,
  PRERENDERED_ROUTE_CHUNKS: chunkByRoute,
  PRERENDERED_FOR_FIRST_PAINT_ONLY: firstPaintOnly,
} = await import(ssrEntry);

if (!Array.isArray(routes) || routes.length === 0) {
  console.error('[prerender] le bundle SSR ne rend aucune route à prérendre.');
  process.exit(1);
}

// L'écran de démarrage est reconnu par son identifiant, pas par un motif de texte : la balise
// change de forme au build (minification des scripts en ligne) et un motif se périmerait en
// silence, ce qui rendrait des pages où le contenu prérendu est masqué par la coquille.
function stripSplash(doc) {
  const splash = doc.getElementById('splash');
  if (!splash) return false;
  // Le script juste après la coquille ne sert qu'à y peindre le titre de l'accueil.
  const next = splash.nextElementSibling;
  if (next?.tagName === 'SCRIPT' && next.textContent.includes('startRoute')) next.remove();
  splash.remove();
  return true;
}

// Les feuilles de style d'une page chargée à la demande sont posées par son JavaScript. Un
// document prérendu qui ne les porte pas peint donc son contenu sans styles, se remet en page
// quand le chunk arrive, et Chrome retient ce second rendu comme LCP : le prérendu ne rapporte
// alors rien. Le manifeste `route-assets.json`, écrit par le plugin de build, donne la fermeture
// des imports statiques de chaque page ; on en pose les styles dans le document et on précharge
// son JavaScript, qui sans cela n'est découvert qu'après l'évaluation de la coquille.
const routeAssetsPath = join(dist, 'route-assets.json');
let routeAssets = {};
try {
  routeAssets = JSON.parse(readFileSync(routeAssetsPath, 'utf8'));
} catch {
  console.error(
    `[prerender] ${routeAssetsPath} absent : le plugin de build ne publie plus le manifeste des routes.`
  );
  process.exit(1);
}

function assetsForRoute(route, chunkByRoute) {
  const chunk = chunkByRoute[route];
  if (!chunk) {
    console.error(
      `[prerender] ${route} n'a pas d'entrée dans PRERENDERED_ROUTE_CHUNKS : impossible de savoir quelles feuilles de style poser dans son document.`
    );
    process.exit(1);
  }
  const assets = routeAssets.chunks?.[chunk];
  if (!assets) {
    console.error(
      `[prerender] le chunk « ${chunk} » de ${route} est absent de route-assets.json : nom périmé après un renommage de page ?`
    );
    process.exit(1);
  }
  return assets;
}

// Les styles de la route sont mis en ligne et pas liés : une feuille liée bloque le rendu et
// n'est découverte qu'après le document, donc le contenu prérendu attendrait un aller-retour
// réseau complet avant son premier pixel, ce qui annule une bonne part du prérendu. En ligne, le
// premier rendu ne dépend plus que du document. Elles sont concaténées de la plus profonde à la
// plus superficielle — la coquille d'abord, la page ensuite — comme le fait le chargement par
// JavaScript : l'ordre inverse donnerait une cascade où la page perd contre la coquille sur les
// règles de même spécificité.
function appendRouteAssets(doc, assets) {
  const inlined = new Set(routeAssets.inlinedCss ?? []);
  for (const file of assets.js) {
    if (doc.head.innerHTML.includes(`/${file}`)) continue;
    const link = doc.createElement('link');
    link.rel = 'modulepreload';
    link.setAttribute('crossorigin', '');
    link.href = `/${file}`;
    doc.head.appendChild(link);
  }
  const css = [...assets.css]
    .reverse()
    .filter((file) => !inlined.has(file))
    .map((file) => readFileSync(join(dist, file), 'utf8'))
    .join('\n');
  if (css.length === 0) return;
  const style = doc.createElement('style');
  style.textContent = css;
  doc.head.appendChild(style);
}

// Clé d'unicité d'une balise de tête, alignée sur `upsertMeta` de `usePageSeo` : c'est ce qui
// permet de remplacer la description ou l'`og:title` du gabarit au lieu d'en ajouter un second,
// un doublon laissant le moteur choisir lequel il retient.
function headKey(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'title') return 'title';
  if (tag === 'meta') {
    const name = el.getAttribute('name');
    if (name) return `meta[name=${name}]`;
    const property = el.getAttribute('property');
    if (property) return `meta[property=${property}]`;
    return null;
  }
  if (tag === 'link' && el.getAttribute('rel') === 'canonical') return 'link[canonical]';
  if (tag === 'script' && el.hasAttribute('data-page-seo')) return 'script[page-seo]';
  return null;
}

function documentFor(route, page, assets) {
  const out = new JSDOM(indexHtml);
  const doc = out.window.document;

  if (!stripSplash(doc)) {
    console.error(
      "[prerender] aucun #splash dans dist/index.html — le gabarit a changé, vérifier que le contenu prérendu ne serait pas masqué avant de retirer ce garde-fou."
    );
    process.exit(1);
  }

  const rendered = new JSDOM(`<head>${page.head}</head>`).window.document.head;
  const existing = new Map();
  for (const el of [...doc.head.children]) {
    const key = headKey(el);
    if (key) existing.set(key, el);
  }
  for (const el of [...rendered.children]) {
    const key = headKey(el);
    const imported = doc.importNode(el, true);
    const previous = key && existing.get(key);
    if (previous) previous.replaceWith(imported);
    else doc.head.appendChild(imported);
  }

  // Le prérendu sert deux choses distinctes, et une page en `noindex` n'en tire que la seconde :
  // l'indexation, et le premier rendu. Une page qu'on demande aux moteurs d'ignorer doit donc le
  // déclarer dans `PRERENDERED_FOR_FIRST_PAINT_ONLY`, sinon le build échoue — un `noindex` posé
  // plus tard sur une page prérendue pour son référencement reste une erreur, et elle est
  // attrapée ici plutôt que découverte dans les journaux d'un moteur. Le prérendu **renforce**
  // d'ailleurs le `noindex` : sans lui, un robot qui ne rend pas le JavaScript reçoit la coquille
  // SPA, qui ne porte aucune balise `robots`.
  const robots = doc.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
  if (robots.includes('noindex') && !firstPaintOnly.includes(route)) {
    console.error(
      `[prerender] ${route} rend « robots: ${robots} » sans figurer dans PRERENDERED_FOR_FIRST_PAINT_ONLY : soit la prérendre pour son premier rendu et l'y déclarer, soit la retirer de PRERENDERED_ROUTES, soit retirer son noindex.`
    );
    process.exit(1);
  }

  appendRouteAssets(doc, assets);

  const root = doc.getElementById('root');
  if (!root) {
    console.error('[prerender] aucun #root dans dist/index.html.');
    process.exit(1);
  }
  root.innerHTML = page.body;

  return `<!doctype html>
${doc.documentElement.outerHTML}
`;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const manifest = [];
for (const route of routes) {
  const page = await renderRoute(route);
  if (page.body.trim().length === 0) {
    console.error(`[prerender] ${route} a rendu un corps vide.`);
    process.exit(1);
  }
  const html = documentFor(route, page, assetsForRoute(route, chunkByRoute));
  const file = `${route.replace(/^\//, '').replaceAll('/', '__')}.html`;
  writeFileSync(join(outDir, file), html, 'utf8');
  manifest.push({ route, file });
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '(sans titre)';
  console.log(`[prerender] ${route} → prerendered/${file} — « ${title} », ${html.length} octets`);
}

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
rmSync(ssrOut, { recursive: true, force: true });
console.log(`[prerender] ${manifest.length} routes prérendues.`);

// `pretendToBeVisual` fait tourner une boucle de requestAnimationFrame qui garde la boucle
// d'évènements ouverte : sans ces deux lignes le script finit son travail puis ne rend jamais la
// main, et le build reste bloqué sur un script qui a pourtant tout écrit.
dom.window.close();
process.exit(0);
