import { describe, expect, it } from 'vitest';
import { t, type Translate } from '@/shared/i18n/t';
import type { SavedListSummary } from '@/features/lists/api/savedListsApi';
import {
  canCopySavedList,
  savedListName,
  savedListOverline,
  savedListSourceLink,
  savedListUnavailableTitle,
} from './savedListSource';

const fr: Translate = (key, vars) => t(key, vars, 'fr');

const ALICE = { handle: 'alice', displayName: 'Alice Martin', avatarId: null };

function saved(overrides: Partial<SavedListSummary>): SavedListSummary {
  return {
    id: 's1',
    sourceType: 'memberList',
    sourceId: 'l1',
    name: 'Ciné coréen',
    creator: ALICE,
    itemCount: 3,
    posterPaths: [],
    watchedCount: 0,
    createdAt: '2026-11-01T00:00:00Z',
    unavailable: false,
    unavailableReason: null,
    copyAvailable: true,
    ...overrides,
  };
}

describe('savedListName', () => {
  it('names a saga as Explorer does, without its redundant suffix', () => {
    expect(
      savedListName(
        { sourceType: 'tmdbCollection', sourceId: '1241', name: 'Harry Potter - Saga' },
        fr
      )
    ).toBe('Harry Potter');
  });

  it('translates the key of a selection into its label', () => {
    expect(
      savedListName({ sourceType: 'explorerTheme', sourceId: 'annees-80', name: 'annees-80' }, fr)
    ).toBe('Années 80');
  });

  it('keeps the stored name of a selection Explorer no longer knows', () => {
    expect(
      savedListName({ sourceType: 'explorerTheme', sourceId: 'retiree', name: 'retiree' }, fr)
    ).toBe('retiree');
  });

  it('keeps the name a member gave to the list', () => {
    expect(savedListName(saved({}), fr)).toBe('Ciné coréen');
  });

  it('names a list whose creator deleted the account, the list gone with it', () => {
    expect(savedListName(saved({ name: null, creator: null }), fr)).toBe('Liste supprimée');
  });
});

describe('savedListOverline', () => {
  it('says what kind of source the saved list follows', () => {
    expect(savedListOverline(saved({ sourceType: 'tmdbCollection' }), fr)).toBe('Saga enregistrée');
    expect(savedListOverline(saved({ sourceType: 'explorerTheme' }), fr)).toBe(
      'Sélection enregistrée'
    );
    expect(savedListOverline(saved({}), fr)).toBe('Liste de @alice enregistrée');
    expect(savedListOverline(saved({ creator: null }), fr)).toBe('Liste enregistrée');
  });
});

describe('savedListSourceLink', () => {
  it('leads to the saga or the selection in Explorer', () => {
    expect(
      savedListSourceLink(saved({ sourceType: 'tmdbCollection', sourceId: '1241' }), fr)
    ).toEqual({ to: '/films/collection/1241', label: 'Voir la saga dans Explorer' });
    expect(
      savedListSourceLink(saved({ sourceType: 'explorerTheme', sourceId: 'frissons' }), fr)
    ).toEqual({ to: '/films/theme/frissons', label: 'Voir la sélection dans Explorer' });
  });

  it('leads to the list on the profile of its creator, elision included', () => {
    expect(savedListSourceLink(saved({}), fr)).toEqual({
      to: '/u/alice/listes/l1',
      label: 'Voir la liste sur le profil d’Alice',
    });
    expect(
      savedListSourceLink(
        saved({ creator: { handle: 'lea', displayName: 'Léa Moreau', avatarId: null } }),
        fr
      )
    ).toEqual({ to: '/u/lea/listes/l1', label: 'Voir la liste sur le profil de Léa' });
  });

  it('offers no link to a list that can no longer be seen', () => {
    expect(
      savedListSourceLink(saved({ unavailable: true, unavailableReason: 'private' }), fr)
    ).toBeNull();
    expect(savedListSourceLink(saved({ creator: null }), fr)).toBeNull();
  });
});

describe('savedListUnavailableTitle', () => {
  it('says the creator made the list private, or that it was deleted', () => {
    expect(savedListUnavailableTitle(saved({ unavailableReason: 'private' }), fr)).toBe(
      'Alice a rendu cette liste privée'
    );
    expect(
      savedListUnavailableTitle(saved({ unavailableReason: 'private', creator: null }), fr)
    ).toBe('Cette liste est devenue privée');
    expect(savedListUnavailableTitle(saved({ unavailableReason: 'deleted' }), fr)).toBe(
      'Cette liste a été supprimée'
    );
  });

  it('says a saga or a selection cannot be read for now', () => {
    expect(savedListUnavailableTitle(saved({ sourceType: 'tmdbCollection' }), fr)).toBe(
      'Cette saga n’est pas disponible pour le moment'
    );
  });
});

describe('canCopySavedList', () => {
  it('follows the API, and copies an available list when the API says nothing', () => {
    expect(canCopySavedList(saved({ copyAvailable: false }))).toBe(false);
    expect(canCopySavedList(saved({ unavailable: true, copyAvailable: true }))).toBe(true);
    expect(canCopySavedList(saved({ copyAvailable: undefined }))).toBe(true);
    expect(canCopySavedList(saved({ unavailable: true, copyAvailable: undefined }))).toBe(false);
  });
});
