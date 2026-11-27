import { devices, expect, test, type Page } from '@playwright/test';
import { createEvent, registerAccount } from './helpers';

const IPHONES = ['iPhone SE', 'iPhone 12 Mini', 'iPhone 11', 'iPhone X landscape'] as const;
const PUBLIC_PAGES = ['/', '/decouvrir', '/login', '/register', '/statut'] as const;
const IOS_ZOOM_FREE_FONT_SIZE_PX = 16;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() =>
    localStorage.setItem('moviepicker-consent', JSON.stringify({ decided: true, analytics: false }))
  );
});

async function horizontalOverflow(page: Page): Promise<number> {
  await page.addStyleTag({ content: 'html, body, .page { overflow-x: visible !important; }' });
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function smallestFieldFontSize(page: Page): Promise<number> {
  return page.evaluate(() => {
    const fields = [...document.querySelectorAll<HTMLElement>('input, textarea, select')].filter(
      (field) => field.getClientRects().length > 0 && (field as HTMLInputElement).type !== 'hidden'
    );
    return Math.min(...fields.map((field) => Number.parseFloat(getComputedStyle(field).fontSize)));
  });
}

async function boxOutsideViewport(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return Math.max(
      0,
      -box.top,
      -box.left,
      box.bottom - window.innerHeight,
      box.right - window.innerWidth
    );
  });
}

for (const iphone of IPHONES) {
  test.describe(iphone, () => {
    const { defaultBrowserType: _browser, ...device } = devices[iphone];
    test.use(device);

    for (const path of PUBLIC_PAGES)
      test(`${path} never scrolls sideways`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('main')).toBeVisible();
        if (path === '/')
          await expect(page.getByTestId('movie-preview-rail').first()).toBeVisible({
            timeout: 20_000,
          });
        if (path === '/statut') await expect(page.getByText('Tout fonctionne')).toBeVisible();
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      });

    test('the sign-up fields are large enough for iOS not to zoom in', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByLabel('Nom affiché')).toBeVisible();
      expect(await smallestFieldFontSize(page)).toBeGreaterThanOrEqual(IOS_ZOOM_FREE_FONT_SIZE_PX);
    });

    test('a dialog opened from the footer fits the screen', async ({ page }) => {
      await page.goto('/login');
      const trigger = page.getByRole('button', { name: 'Signaler un problème' });
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: /signaler un problème/i });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('link', { name: /ouvrir ma messagerie/i })).toBeInViewport();
      await expect.poll(() => boxOutsideViewport(page, 'dialog[open]')).toBeLessThanOrEqual(1);
    });
  });
}

test.describe('iPhone SE, signed in', () => {
  const { defaultBrowserType: _browser, ...device } = devices['iPhone SE'];
  test.use(device);

  test('a night never scrolls sideways and its sheet fits', async ({ page }) => {
    await registerAccount(page, 'iPhone SE');
    await createEvent(page, 'Soirée petit écran');
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await page.getByRole('button', { name: /proposer un film/i }).click();
    const sheet = page.getByRole('dialog', { name: /proposer un film/i });
    await expect(sheet).toBeVisible();
    await expect.poll(() => boxOutsideViewport(page, 'dialog[open]')).toBeLessThanOrEqual(1);
  });
});
