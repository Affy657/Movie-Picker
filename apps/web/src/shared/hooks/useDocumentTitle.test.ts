import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { APP_DOCUMENT_TITLE, pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';

describe('useDocumentTitle', () => {
  it('pageTitle ajoute le suffixe produit', () => {
    expect(pageTitle('Accueil')).toBe(`Accueil — ${APP_DOCUMENT_TITLE}`);
  });

  it('met à jour document.title', () => {
    document.title = 'initial';
    renderHook(() => useDocumentTitle('Page test'));
    expect(document.title).toBe('Page test');
  });
});
