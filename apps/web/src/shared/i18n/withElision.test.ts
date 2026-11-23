import { describe, expect, it } from 'vitest';
import { t, type Translate } from './t';
import { withElision } from './withElision';

const fr: Translate = (key, vars) => t(key, vars, 'fr');
const en: Translate = (key, vars) => t(key, vars, 'en');

describe('withElision', () => {
  it('elides « de » before a pseudo that starts with a vowel', () => {
    expect(
      withElision(
        'Alice',
        'movies.details.viewProposerProfileAria',
        'movies.details.viewProposerProfileAriaElided',
        fr
      )
    ).toBe('Voir le profil d’Alice');
    expect(
      withElision(
        'Bob',
        'movies.details.viewProposerProfileAria',
        'movies.details.viewProposerProfileAriaElided',
        fr
      )
    ).toBe('Voir le profil de Bob');
  });

  it('keeps the other variables of the sentence', () => {
    expect(
      withElision(
        'Émile',
        'events.participants.viewProfilePresenceAriaLabel',
        'events.participants.viewProfilePresenceAriaLabelElided',
        fr,
        { presence: 'en ligne' }
      )
    ).toBe('Voir le profil d’Émile, en ligne');
  });

  it('leaves the English sentence as it is', () => {
    expect(
      withElision(
        'Alice',
        'events.participants.viewProfileAriaLabel',
        'events.participants.viewProfileAriaLabelElided',
        en
      )
    ).toBe('View Alice’s profile');
  });
});
