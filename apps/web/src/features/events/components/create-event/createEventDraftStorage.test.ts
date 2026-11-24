import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultTemplateFields } from '@/features/events/lib/eventTemplateDraft';
import {
  CREATE_EVENT_DRAFT_KEY,
  forgetCreateEventDraft,
  readCreateEventDraft,
  saveCreateEventDraft,
  startingCreateEventDraft,
} from './createEventDraftStorage';

const draft = {
  typedTitle: 'Nuit Nolan',
  date: '2026-12-04',
  time: '21:00',
  fields: { ...defaultTemplateFields(), themeText: 'Nolan', maxProposals: '3' },
  groupId: 'group-1',
  openedFromGroupId: null,
};

const DECEMBER_FIRST = Date.parse('2026-12-01T10:00:00Z');

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('startingCreateEventDraft', () => {
  it('resumes a draft opened the same way, with its group and its date', () => {
    const start = startingCreateEventDraft(draft, false, null, DECEMBER_FIRST);

    expect(start).toEqual(draft);
  });

  it('starts a past draft on the default evening rather than on its old date', () => {
    const start = startingCreateEventDraft(
      { ...draft, date: '2026-11-27' },
      false,
      null,
      DECEMBER_FIRST
    );

    expect(start.date).not.toBe('2026-11-27');
    expect(start.date >= '2026-12-01').toBe(true);
    expect(start.typedTitle).toBe('Nuit Nolan');
  });

  it('does not carry the group of a draft opened from a group page into another opening', () => {
    const fromGroupPage = { ...draft, groupId: 'group-a', openedFromGroupId: 'group-a' };

    expect(startingCreateEventDraft(fromGroupPage, false, null, DECEMBER_FIRST).groupId).toBeNull();
    expect(startingCreateEventDraft(fromGroupPage, false, 'group-b', DECEMBER_FIRST).groupId).toBe(
      'group-b'
    );
  });
});

describe('createEventDraftStorage', () => {
  it('reads back the draft it saved', () => {
    saveCreateEventDraft(draft);

    expect(readCreateEventDraft()).toEqual(draft);
  });

  it('forgets the draft', () => {
    saveCreateEventDraft(draft);
    forgetCreateEventDraft();

    expect(readCreateEventDraft()).toBeNull();
  });

  it('ignores a stored value it cannot read', () => {
    sessionStorage.setItem(CREATE_EVENT_DRAFT_KEY, '{not json');
    expect(readCreateEventDraft()).toBeNull();

    sessionStorage.setItem(CREATE_EVENT_DRAFT_KEY, JSON.stringify({ date: 4 }));
    expect(readCreateEventDraft()).toBeNull();
  });

  it('keeps only the rule fields whose type it knows', () => {
    sessionStorage.setItem(
      CREATE_EVENT_DRAFT_KEY,
      JSON.stringify({
        date: '2026-12-04',
        time: '20:00',
        fields: { themeText: 42, maxVotes: '2', unknown: 'x' },
      })
    );

    const restored = readCreateEventDraft();

    expect(restored?.fields).toEqual({ ...defaultTemplateFields(), maxVotes: '2' });
    expect(restored?.typedTitle).toBeNull();
    expect(restored?.groupId).toBeNull();
  });

  it('falls back to the default wheel mode for an unknown one', () => {
    sessionStorage.setItem(
      CREATE_EVENT_DRAFT_KEY,
      JSON.stringify({ date: '2026-12-04', time: '20:00', fields: { wheelMode: 'chaos' } })
    );

    expect(readCreateEventDraft()?.fields.wheelMode).toBe(defaultTemplateFields().wheelMode);
  });

  it('survives a storage that throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => saveCreateEventDraft(draft)).not.toThrow();
    expect(readCreateEventDraft()).toBeNull();
  });
});
