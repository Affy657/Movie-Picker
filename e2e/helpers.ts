import { type Page } from '@playwright/test';

export const TEST_PASSWORD = 'MoviePicker1';

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@e2e.test`;
}

export function asciiSlug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase() || 'user'
  );
}

export async function registerAccount(page: Page, displayName: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Pseudo').fill(displayName);
  await page.getByLabel('E-mail', { exact: true }).fill(uniqueEmail(asciiSlug(displayName)));
  await page.getByLabel('Mot de passe').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/register'));
  await dismissWhatsNewModal(page);
}

/**
 * La modale "Quoi de neuf ?" s'ouvre automatiquement à la première connexion
 * d'un compte (voir useWhatsNew) et intercepte les clics tant qu'elle est ouverte.
 * Chaque nouveau compte e2e étant un utilisateur inédit, elle apparaît à chaque fois.
 */
export async function dismissWhatsNewModal(page: Page): Promise<void> {
  // La modale se déclenche une fois l'utilisateur résolu par AuthContext, pas
  // au moment du changement d'URL : attendre un repère fiable de session active
  // avant de conclure trop vite qu'elle ne va pas s'afficher.
  await page
    .getByRole('button', { name: 'Menu du compte' })
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});
  const modal = page.getByRole('dialog', { name: /quoi de neuf/i });
  try {
    await modal.waitFor({ state: 'visible', timeout: 3000 });
    await modal.getByRole('button', { name: 'Fermer' }).click();
  } catch {
    // Pas de modale affichée : rien à fermer.
  }
}
