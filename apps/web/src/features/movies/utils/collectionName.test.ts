import { describe, expect, it } from 'vitest';
import { collectionDisplayName } from './collectionName';

describe('collectionDisplayName', () => {
  it('retire le suffixe « - Saga » des noms TMDB francais', () => {
    expect(collectionDisplayName('Harry Potter - Saga')).toBe('Harry Potter');
    expect(collectionDisplayName('Le Seigneur des anneaux - Saga')).toBe('Le Seigneur des anneaux');
  });

  it('retire le suffixe « Collection » des noms TMDB anglais', () => {
    expect(collectionDisplayName('Harry Potter Collection')).toBe('Harry Potter');
    expect(collectionDisplayName('Alien - Collection')).toBe('Alien');
  });

  it('accepte les tirets demi-cadratin et cadratin', () => {
    expect(collectionDisplayName('Matrix – Saga')).toBe('Matrix');
    expect(collectionDisplayName('Rocky — Saga')).toBe('Rocky');
  });

  it('ignore la casse du suffixe', () => {
    expect(collectionDisplayName('Thor - SAGA')).toBe('Thor');
    expect(collectionDisplayName('Shrek collection')).toBe('Shrek');
  });

  it('laisse intact un nom sans suffixe redondant', () => {
    expect(collectionDisplayName('James Bond 007')).toBe('James Bond 007');
    expect(collectionDisplayName('Mission : Impossible')).toBe('Mission : Impossible');
  });

  it('ne vide jamais un nom qui se reduit au suffixe', () => {
    expect(collectionDisplayName('Saga')).toBe('Saga');
    expect(collectionDisplayName('Collection')).toBe('Collection');
  });

  it('ne coupe pas un mot qui se termine par le suffixe', () => {
    expect(collectionDisplayName('Presunto Culpable')).toBe('Presunto Culpable');
    expect(collectionDisplayName('Recollection')).toBe('Recollection');
    expect(collectionDisplayName('La Recollection')).toBe('La Recollection');
  });

  it('supprime les espaces superflus', () => {
    expect(collectionDisplayName('  Cars - Saga  ')).toBe('Cars');
  });
});
