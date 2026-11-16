import { describe, expect, it } from 'vitest';
import { en } from '@/shared/i18n/locales/en';
import { fr } from '@/shared/i18n/locales/fr';
import { isListNameTaken, normalizeListName } from './listName';

describe('normalizeListName', () => {
  it('ignores case, accents and the spaces around and between words', () => {
    expect(normalizeListName('  Films   Cultes ')).toBe(normalizeListName('films cultes'));
    expect(normalizeListName('À VOIR')).toBe(normalizeListName('a voir'));
  });

  it('keeps names with different words apart', () => {
    expect(normalizeListName('Halloween')).not.toBe(normalizeListName('Halloween 2'));
  });
});

describe('isListNameTaken', () => {
  const existing = ['Halloween', 'Films cultes'];

  it('finds a name already used by another list', () => {
    expect(isListNameTaken(' halloween', existing)).toBe(true);
  });

  it('counts the reserved À voir name as taken', () => {
    expect(isListNameTaken('a Voir', existing)).toBe(true);
  });

  it('counts the names of the two system lists as taken, in French and in English, as the API does', () => {
    const systemNames = [
      fr.watchlist.title,
      en.watchlist.title,
      fr.watched.title,
      en.watched.title,
    ];

    expect(systemNames).toEqual(['À voir', 'Watchlist', 'Films vus', 'Watched']);
    for (const name of systemNames) {
      expect(isListNameTaken(` ${name.toUpperCase()} `, [])).toBe(true);
    }
  });

  it('accepts a new name and an empty one', () => {
    expect(isListNameTaken('Ghibli', existing)).toBe(false);
    expect(isListNameTaken('   ', existing)).toBe(false);
  });

  it('lets a list keep its own name when it is edited', () => {
    expect(isListNameTaken('HALLOWEEN', existing, 'Halloween')).toBe(false);
  });
});
