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

  it('reprend la cle de stockage et la detection de langue de preferredLocale', () => {
    expect(indexHtml).toContain("localStorage.getItem('moviepicker-locale')");
    expect(indexHtml).toContain("browser.indexOf('en') === 0 ? 'en' : 'fr'");
  });
});
