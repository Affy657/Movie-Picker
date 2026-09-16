import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.CAPTURE_BASE_URL ?? 'http://localhost:5173';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'captures');
mkdirSync(OUT, { recursive: true });

const ACCOUNT = { email: 'alice@test.local', password: 'AliceTest123!' };
const VIEWPORT = { width: 1280, height: 800 };
const CONTEXT = { viewport: VIEWPORT, colorScheme: 'dark', locale: 'fr-FR' };

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(900);
}

async function dismissConsent(page) {
  const refuse = page.getByRole('button', { name: 'Tout refuser' });
  if (await refuse.isVisible().catch(() => false)) {
    await refuse.click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function shot(page, name, prep) {
  await settle(page);
  await dismissConsent(page);
  if (prep) await prep(page);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('saved', name);
}

async function scrollToWheel(page) {
  const heading = page.getByText('Résultat du tirage', { exact: false }).first();
  if (await heading.count().catch(() => 0)) {
    await heading
      .evaluate((el) => el.scrollIntoView({ block: 'start' }))
      .catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -24)).catch(() => {});
  } else {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  }
  await page.waitForTimeout(1000);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('E-mail').fill(ACCOUNT.email);
  await page.getByLabel('Mot de passe').fill(ACCOUNT.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
}

const browser = await chromium.launch();

const anon = await browser.newContext(CONTEXT);
const anonPage = await anon.newPage();
await anonPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await shot(anonPage, '01-accueil.png');
await anon.close();

const ctx = await browser.newContext(CONTEXT);
await ctx.route('**/auth/me', async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  const response = await route.fetch();
  let body;
  try {
    body = await response.json();
  } catch {
    return route.fulfill({ response });
  }
  if (body && typeof body === 'object' && !Array.isArray(body)) body.uiTheme = 'dark';
  return route.fulfill({ response, json: body });
});
const page = await ctx.newPage();
await login(page);

const targets = [
  { route: '/new', name: '02-creation-soiree.png' },
  { route: '/e/SOxvlmJXIJ', name: '03-detail-soiree.png' },
  { route: '/e/QWr5yWhTY6', name: '04-roue.png', prep: scrollToWheel },
  { route: '/settings', name: '05-compte.png' },
  { route: '/u/bob_test', name: '06-profil-public.png' },
];

for (const { route, name, prep } of targets) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await shot(page, name, prep);
  } catch (err) {
    console.error('FAILED', name, err.message);
  }
}

await ctx.close();
await browser.close();
console.log('done');
