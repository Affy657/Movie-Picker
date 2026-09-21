import { test, expect, type Page } from '@playwright/test';

const LARGE_SYSTEM_TEXT_ROOT_FONT_SIZE = '130%';

async function railVerticalOverflows(page: Page): Promise<number[]> {
  const rails = page.getByTestId('movie-preview-rail');
  await expect(rails.first().getByRole('heading', { level: 3 }).first()).toBeVisible({
    timeout: 20_000,
  });
  return rails.evaluateAll((elements) =>
    elements.map((rail) => rail.scrollHeight - rail.clientHeight)
  );
}

async function mobileNavLabelOverflows(page: Page): Promise<Record<string, number>> {
  const links = page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link');
  await expect(links).toHaveCount(5);
  const entries = await links.evaluateAll((elements) =>
    elements.map((link) => {
      const label = link.querySelector('span');
      if (!label) throw new Error('nav link without a label');
      return [label.textContent ?? '', label.scrollWidth - label.clientWidth] as const;
    })
  );
  return Object.fromEntries(entries);
}

function expectNoLabelOverflow(overflows: Record<string, number>) {
  for (const [label, overflow] of Object.entries(overflows)) {
    expect(overflow, `"${label}" is truncated`).toBeLessThanOrEqual(0);
  }
}

test.describe('Home on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('the poster rails scroll sideways only', async ({ page }) => {
    await page.goto('/');
    const overflows = await railVerticalOverflows(page);
    expect(overflows.length).toBeGreaterThan(0);
    expect(Math.max(...overflows)).toBeLessThanOrEqual(0);
  });

  test('the bottom nav labels fit with large system text', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((fontSize) => {
      document.documentElement.style.fontSize = fontSize;
    }, LARGE_SYSTEM_TEXT_ROOT_FONT_SIZE);
    expectNoLabelOverflow(await mobileNavLabelOverflows(page));
  });
});

test.describe('Home on a small phone', () => {
  test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });

  test('the bottom nav labels fit', async ({ page }) => {
    await page.goto('/');
    expectNoLabelOverflow(await mobileNavLabelOverflows(page));
  });
});
