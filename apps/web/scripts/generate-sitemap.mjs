import { writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distSitemap = resolve(__dirname, '../dist/sitemap.xml');
const FETCH_TIMEOUT_MS = 15_000;

function apiOrigin() {
  const raw = (process.env.SITEMAP_API_URL || process.env.VITE_API_URL || '').trim();
  if (!raw) return '';
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin;
  } catch {
    return '';
  }
}

function keepStaticFallback(reason) {
  const kept = existsSync(distSitemap) ? 'sitemap statique conservé' : 'AUCUN sitemap présent';
  console.warn(`[sitemap] ${reason} — ${kept}.`);
  process.exit(0);
}

const origin = apiOrigin();
if (!origin) keepStaticFallback('VITE_API_URL absent');

const url = `${origin}/sitemap.xml`;
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

try {
  const res = await fetch(url, {
    headers: { accept: 'application/xml' },
    signal: controller.signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  if (!xml.includes('<urlset')) throw new Error('réponse sans <urlset>');
  writeFileSync(distSitemap, xml, 'utf8');
  const count = (xml.match(/<loc>/g) ?? []).length;
  console.log(`[sitemap] ${url} → dist/sitemap.xml (${count} URLs)`);
} catch (err) {
  keepStaticFallback(`échec de génération (${err.message})`);
} finally {
  clearTimeout(timer);
}
