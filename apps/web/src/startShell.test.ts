import { describe, expect, it } from 'vitest';

import { en } from '@/shared/i18n/locales/en';
import { fr } from '@/shared/i18n/locales/fr';

import indexHtml from '../index.html?raw';

describe('coquille de demarrage', () => {
  it('reprend mot pour mot le titre de la page d accueil dans les deux langues', () => {
    expect(indexHtml).toContain(fr.home.title);
    expect(indexHtml).toContain(en.home.title);
  });

  it('ne pose la coquille que sur la route racine', () => {
    expect(indexHtml).toContain("location.pathname === '/'");
  });

  it('reprend la cle de stockage et la langue par defaut de preferredLocale', () => {
    expect(indexHtml).toContain("localStorage.getItem('moviepicker-locale')");
    expect(indexHtml).toContain("stored === 'en' ? 'en' : 'fr'");
    expect(indexHtml).not.toContain('navigator.language');
  });

  it('titre la coquille comme la page d accueil, en francais', () => {
    expect(indexHtml).toContain(`<title>${fr.home.seoTitle}</title>`);
    expect(indexHtml).toContain(`<meta property="og:title" content="${fr.home.seoTitle}" />`);
  });
});
