import { describe, it, expect } from 'vitest';
import { APP_DOCUMENT_TITLE, pageTitle } from '@/shared/hooks/useDocumentTitle';

describe('pageTitle', () => {
  it('pageTitle ajoute le suffixe produit', () => {
    expect(pageTitle('Accueil')).toBe(`Accueil | ${APP_DOCUMENT_TITLE}`);
  });
});
