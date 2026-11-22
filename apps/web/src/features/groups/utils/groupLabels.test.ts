import { describe, expect, it } from 'vitest';
import { t as translate, type Translate } from '@/shared/i18n/t';
import { sinceMonth, weekdayName } from './groupFigures';
import { peoplePhrase, viewerFirst } from './groupLabels';

const t: Translate = (key, vars) => translate(key, vars, 'fr');

describe('peoplePhrase', () => {
  it('names everyone while the group stays small', () => {
    expect(peoplePhrase(['Vous', 'Sam', 'Léa', 'Inès'], 4, 4, 'fr', t)).toBe(
      'Vous, Sam, Léa et Inès'
    );
  });

  it('names the first ones and counts the others in a bigger group', () => {
    expect(peoplePhrase(['Vous', 'Sam', 'Léa', 'Inès', 'Noé', 'Hugo'], 6, 4, 'fr', t)).toBe(
      'Vous, Sam, Léa et 3 autres'
    );
  });

  it('counts the people it cannot name', () => {
    expect(peoplePhrase(['Sam', 'Léa'], 3, 4, 'fr', t)).toBe('Sam, Léa et 1 autre');
  });
});

describe('viewerFirst', () => {
  it('puts the viewer ahead of the others, keeping their order', () => {
    const people = [
      { userId: 'a', displayName: 'Sam' },
      { userId: 'me', displayName: 'Alice' },
      { userId: 'b', displayName: 'Léa' },
    ];
    expect(viewerFirst(people, 'me').map((person) => person.userId)).toEqual(['me', 'a', 'b']);
  });
});

describe('group figures', () => {
  it('names the usual evening with a capital', () => {
    expect(weekdayName(4, 'fr')).toBe('Jeudi');
    expect(weekdayName(0, 'en')).toBe('Sunday');
  });

  it('gives the month of the first night, with its year when it was another year', () => {
    const now = new Date(2026, 10, 22);
    expect(sinceMonth('2026-09-03', 'fr', now)).toBe('septembre');
    expect(sinceMonth('2025-09-03', 'fr', now)).toBe('septembre 2025');
  });
});
