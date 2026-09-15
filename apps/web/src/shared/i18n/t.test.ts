import { describe, it, expect } from 'vitest';
import { t } from './t';

describe('t (i18n)', () => {
  it('resolves a simple key (FR by default)', () => {
    expect(t('common.loading')).toBe('Chargement\u2026');
  });

  it('resolves a deep key', () => {
    expect(t('auth.login.title')).toBe('Connexion');
  });

  it('interpole des variables avec la syntaxe {{var}}', () => {
    expect(t('movies.search.regionHint', { region: 'FR' })).toBe(
      'Disponibilit\u00e9s indicatives pour la r\u00e9gion FR'
    );
  });

  it('interpole plusieurs variables', () => {
    expect(t('common.pageTitle', { segment: 'Mes soir\u00e9es' })).toBe(
      'Mes soir\u00e9es | Movie Picker'
    );
  });

  it('returns the raw key when it is invalid (resilience)', () => {
    const badKey = 'nonexistent.key' as Parameters<typeof t>[0];
    expect(t(badKey)).toBe('nonexistent.key');
  });

  it('returns the string unchanged when no variable is provided', () => {
    expect(t('common.appName')).toBe('Movie Picker');
  });

  it('ignores the vars when the string contains no placeholder', () => {
    expect(t('common.appName', { unused: 'value' })).toBe('Movie Picker');
  });

  it('laisse le placeholder intact si la variable correspondante est absente', () => {
    expect(t('movies.search.regionHint')).toBe(
      'Disponibilit\u00e9s indicatives pour la r\u00e9gion {{region}}'
    );
  });

  it('covers the keys of every main domain (FR)', () => {
    expect(t('nav.home')).toBe('Accueil');
    expect(t('events.create.title')).toBe('Cr\u00e9er une soir\u00e9e');
    expect(t('movies.list.emptyTitle')).toContain('Aucun film');
    expect(t('errors.generic')).toBe('Une erreur est survenue.');
    expect(t('theme.light')).toBe('Clair');
  });

  describe('locale EN', () => {
    it('resolves a simple key in English', () => {
      expect(t('common.loading', undefined, 'en')).toBe('Loading\u2026');
    });

    it('resolves a deep key in English', () => {
      expect(t('auth.login.title', undefined, 'en')).toBe('Log in');
    });

    it('interpole des variables en anglais', () => {
      expect(t('movies.search.regionHint', { region: 'US' }, 'en')).toBe(
        'Indicative availability for region US'
      );
    });

    it('covers the keys of every main domain (EN)', () => {
      expect(t('nav.home', undefined, 'en')).toBe('Home');
      expect(t('events.create.title', undefined, 'en')).toBe('Create an event');
      expect(t('movies.list.emptyTitle', undefined, 'en')).toContain('No movies');
      expect(t('errors.generic', undefined, 'en')).toBe('An error occurred.');
      expect(t('theme.light', undefined, 'en')).toBe('Light');
    });

    it('returns the raw key when it is invalid in EN too', () => {
      const badKey = 'nonexistent.key' as Parameters<typeof t>[0];
      expect(t(badKey, undefined, 'en')).toBe('nonexistent.key');
    });
  });

  describe('registry resilience', () => {
    it('returns the raw key when it points to a group and not a string', () => {
      const groupKey = 'common' as Parameters<typeof t>[0];
      expect(t(groupKey)).toBe('common');
    });

    it('falls back to a loaded language when the requested language is missing', () => {
      const unknownLocale = 'de' as Parameters<typeof t>[2];
      expect(t('common.loading', undefined, unknownLocale)).toBe('Chargement\u2026');
    });
  });
});
