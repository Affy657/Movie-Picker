import { describe, it, expect } from 'vitest';
import { REACTION_CATALOG_IDS } from '@/shared/constants/reactionCatalog';
import { effectiveAllowedReactionIds, othersAlreadySeenHint } from '@/shared/utils/movieReactions';

describe('effectiveAllowedReactionIds', () => {
  it('null ou undefined = catalogue complet', () => {
    expect(effectiveAllowedReactionIds(null)).toEqual(REACTION_CATALOG_IDS);
    expect(effectiveAllowedReactionIds(undefined)).toEqual(REACTION_CATALOG_IDS);
  });

  it('liste vide = aucune réaction affichée côté config', () => {
    expect(effectiveAllowedReactionIds([])).toEqual([]);
  });

  it('préserve le sous-ensemble hôte', () => {
    expect(effectiveAllowedReactionIds(['already_seen', 'meh'])).toEqual(['already_seen', 'meh']);
  });
});

describe('othersAlreadySeenHint', () => {
  it('retourne null sans agrégat already_seen', () => {
    expect(othersAlreadySeenHint(undefined, 'Bob')).toBeNull();
    expect(othersAlreadySeenHint([], 'Bob')).toBeNull();
    expect(
      othersAlreadySeenHint([{ reactionId: 'meh', count: 2, pseudos: ['a'] }], 'Bob')
    ).toBeNull();
  });

  it('exclut le participant courant du compteur « autres »', () => {
    const hint = othersAlreadySeenHint(
      [
        {
          reactionId: 'already_seen',
          count: 1,
          pseudos: ['Moi'],
        },
      ],
      'Moi'
    );
    expect(hint).toBeNull();
  });

  it('liste les pseudos des autres quand plusieurs', () => {
    const hint = othersAlreadySeenHint(
      [
        {
          reactionId: 'already_seen',
          count: 2,
          pseudos: ['Alice', 'Bob'],
        },
      ],
      'Bob'
    );
    expect(hint).toContain('Alice');
    expect(hint).not.toContain('Bob');
  });

  it('sans pseudo courant, compte tout le monde comme « autres »', () => {
    const hint = othersAlreadySeenHint(
      [
        {
          reactionId: 'already_seen',
          count: 2,
          pseudos: ['x', 'y'],
        },
      ],
      null
    );
    expect(hint).toBeTruthy();
  });

  it('sans pseudos affichables mais count > 0, message numérique', () => {
    const hint = othersAlreadySeenHint(
      [
        {
          reactionId: 'already_seen',
          count: 3,
          pseudos: [],
        },
      ],
      'Zoé'
    );
    expect(hint).toMatch(/3 autres/);
  });
});
