import { describe, expect, it } from 'vitest';
import { t, type Translate } from '@/shared/i18n/t';
import type { MovieListAudience, MovieListPerson } from '@/features/lists/api/listsApi';
import {
  capitalizeFirst,
  firstName,
  isMemberList,
  isSharedList,
  listCompanionLabel,
  listOfLabel,
  membersPhrase,
  withElision,
} from './listMembers';

const fr: Translate = (key, vars) => t(key, vars, 'fr');
const en: Translate = (key, vars) => t(key, vars, 'en');

function person(userId: string, displayName: string): MovieListPerson {
  return { userId, handle: userId, displayName, avatarId: null };
}

const ALICE = person('u1', 'Alice Martin');
const LEA = person('u2', 'Léa Moreau');
const TOM = person('u3', 'Tom');
const SAM = person('u4', 'Sam Roux');

function ownedBy(owner: MovieListPerson, others: MovieListPerson[], memberCount?: number) {
  return {
    role: 'owner',
    owner,
    memberCount: memberCount ?? others.length + 1,
    memberPreview: [owner, ...others],
  } satisfies MovieListAudience;
}

describe('isSharedList and isMemberList', () => {
  it('calls a list shared once someone besides its creator is in it', () => {
    expect(isSharedList(ownedBy(ALICE, []))).toBe(false);
    expect(isSharedList(ownedBy(ALICE, [LEA]))).toBe(true);
    expect(isSharedList({})).toBe(false);
  });

  it('tells a list I joined from a list I created', () => {
    expect(isMemberList({ ...ownedBy(LEA, [ALICE]), role: 'member' })).toBe(true);
    expect(isMemberList(ownedBy(ALICE, [LEA]))).toBe(false);
    expect(isMemberList({})).toBe(false);
  });
});

describe('firstName', () => {
  it('keeps the first word of a display name', () => {
    expect(firstName('Léa Moreau')).toBe('Léa');
    expect(firstName('  Tom  ')).toBe('Tom');
    expect(firstName('ad0')).toBe('ad0');
  });
});

describe('membersPhrase', () => {
  it('names the others, never the viewer', () => {
    expect(membersPhrase(ownedBy(ALICE, [LEA]), ALICE.userId, fr)).toBe('avec Léa');
    expect(membersPhrase(ownedBy(ALICE, [LEA, TOM]), ALICE.userId, fr)).toBe('avec Léa et Tom');
    expect(membersPhrase(ownedBy(LEA, [ALICE, TOM]), ALICE.userId, fr)).toBe('avec Léa et Tom');
  });

  it('counts those the preview does not name', () => {
    expect(membersPhrase(ownedBy(ALICE, [LEA, TOM], 4), ALICE.userId, fr)).toBe(
      'avec Léa, Tom et 1 autre'
    );
    expect(membersPhrase(ownedBy(ALICE, [LEA, TOM], 7), ALICE.userId, fr)).toBe(
      'avec Léa, Tom et 4 autres'
    );
    expect(membersPhrase(ownedBy(LEA, [ALICE], 3), ALICE.userId, fr)).toBe('avec Léa et 1 autre');
    expect(membersPhrase(ownedBy(LEA, [ALICE], 5), ALICE.userId, fr)).toBe('avec Léa et 3 autres');
    expect(membersPhrase(ownedBy(ALICE, [LEA, TOM, SAM], 4), ALICE.userId, fr)).toBe(
      'avec Léa, Tom et 1 autre'
    );
  });

  it('says nothing about a list nobody else is in', () => {
    expect(membersPhrase(ownedBy(ALICE, []), ALICE.userId, fr)).toBeNull();
  });

  it('speaks English too', () => {
    expect(membersPhrase(ownedBy(ALICE, [LEA, TOM]), ALICE.userId, en)).toBe('with Léa and Tom');
    expect(membersPhrase(ownedBy(ALICE, [LEA, TOM], 5), ALICE.userId, en)).toBe(
      'with Léa, Tom and 2 others'
    );
  });
});

describe('listCompanionLabel', () => {
  it('names the creator of a list I joined', () => {
    const joined = { ...ownedBy(LEA, [ALICE, TOM]), role: 'member' as const };

    expect(listCompanionLabel(joined, ALICE.userId, fr)).toBe('liste de Léa');
    expect(listCompanionLabel(joined, ALICE.userId, en)).toBe('Léa’s list');
  });

  it('elides « de » before a creator whose name starts with a vowel', () => {
    const joined = { ...ownedBy(ALICE, [LEA]), role: 'member' as const };
    const joinedEmile = { ...ownedBy(person('u5', 'Émile'), [LEA]), role: 'member' as const };

    expect(listCompanionLabel(joined, LEA.userId, fr)).toBe('liste d’Alice');
    expect(listCompanionLabel(joinedEmile, LEA.userId, fr)).toBe('liste d’Émile');
    expect(listCompanionLabel(joined, LEA.userId, en)).toBe('Alice’s list');
  });

  it('names the members of my own shared list', () => {
    expect(listCompanionLabel(ownedBy(ALICE, [LEA, TOM]), ALICE.userId, fr)).toBe(
      'avec Léa et Tom'
    );
  });

  it('says nothing about a list I keep to myself', () => {
    expect(listCompanionLabel(ownedBy(ALICE, []), ALICE.userId, fr)).toBeNull();
  });
});

describe('capitalizeFirst', () => {
  it('raises the first letter for a label that opens a line', () => {
    expect(capitalizeFirst('avec Léa et Tom', 'fr')).toBe('Avec Léa et Tom');
    expect(capitalizeFirst('Léa’s list', 'en')).toBe('Léa’s list');
    expect(capitalizeFirst('', 'fr')).toBe('');
  });
});

describe('withElision', () => {
  it('elides « de » before a name that starts with a vowel', () => {
    expect(withElision('Alice', 'lists.public.pageTitle', 'lists.public.pageTitleElided', fr)).toBe(
      'Les listes d’Alice'
    );
    expect(withElision('Léa', 'lists.public.pageTitle', 'lists.public.pageTitleElided', fr)).toBe(
      'Les listes de Léa'
    );
  });
});

describe('listOfLabel', () => {
  it('names the list of a member, elision included', () => {
    expect(listOfLabel('Alice Martin', fr)).toBe('liste d’Alice');
    expect(listOfLabel('Léa Moreau', fr)).toBe('liste de Léa');
    expect(listOfLabel('Léa Moreau', en)).toBe('Léa’s list');
  });
});
