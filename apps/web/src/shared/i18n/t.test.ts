import { describe, it, expect } from 'vitest';
import { t } from './t';

describe('t (i18n)', () => {
  it('résout une clé simple (FR par défaut)', () => {
    expect(t('common.loading')).toBe('Chargement\u2026');
  });

  it('résout une clé profonde', () => {
    expect(t('auth.login.title')).toBe('Connexion');
  });

  it('interpole des variables avec la syntaxe {{var}}', () => {
    expect(t('movies.search.regionHint', { region: 'FR' })).toBe(
      'Disponibilit\u00e9s indicatives \u00b7 r\u00e9gion FR'
    );
  });

  it('interpole plusieurs variables', () => {
    expect(t('common.pageTitle', { segment: 'Mes soir\u00e9es' })).toBe(
      'Mes soir\u00e9es \u2014 Movie Picker'
    );
  });

  it('retourne la clé brute si elle est invalide (résilience)', () => {
    const badKey = 'nonexistent.key' as Parameters<typeof t>[0];
    expect(t(badKey)).toBe('nonexistent.key');
  });

  it('retourne la chaîne sans modification si aucune variable fournie', () => {
    expect(t('common.appName')).toBe('Movie Picker');
  });

  it('ignore les vars quand la chaîne ne contient aucun placeholder', () => {
    expect(t('common.appName', { unused: 'value' })).toBe('Movie Picker');
  });

  it('laisse le placeholder intact si la variable correspondante est absente', () => {
    expect(t('movies.search.regionHint')).toBe(
      'Disponibilit\u00e9s indicatives \u00b7 r\u00e9gion {{region}}'
    );
  });

  it('couvre les clés de chaque domaine principal (FR)', () => {
    expect(t('nav.home')).toBe('Accueil');
    expect(t('events.create.title')).toBe('Cr\u00e9er une soir\u00e9e');
    expect(t('movies.list.emptyTitle')).toContain('Aucun film');
    expect(t('errors.generic')).toBe('Une erreur est survenue.');
    expect(t('theme.light')).toBe('Clair');
  });

  describe('locale EN', () => {
    it('résout une clé simple en anglais', () => {
      expect(t('common.loading', undefined, 'en')).toBe('Loading\u2026');
    });

    it('résout une clé profonde en anglais', () => {
      expect(t('auth.login.title', undefined, 'en')).toBe('Log in');
    });

    it('interpole des variables en anglais', () => {
      expect(t('movies.search.regionHint', { region: 'US' }, 'en')).toBe(
        'Indicative availability \u00b7 region US'
      );
    });

    it('couvre les clés de chaque domaine principal (EN)', () => {
      expect(t('nav.home', undefined, 'en')).toBe('Home');
      expect(t('events.create.title', undefined, 'en')).toBe('Create an event');
      expect(t('movies.list.emptyTitle', undefined, 'en')).toContain('No movies');
      expect(t('errors.generic', undefined, 'en')).toBe('An error occurred.');
      expect(t('theme.light', undefined, 'en')).toBe('Light');
    });

    it('retourne la clé brute si elle est invalide en EN aussi', () => {
      const badKey = 'nonexistent.key' as Parameters<typeof t>[0];
      expect(t(badKey, undefined, 'en')).toBe('nonexistent.key');
    });
  });
});
