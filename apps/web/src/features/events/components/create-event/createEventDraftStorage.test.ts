import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultTemplateFields } from '@/features/events/lib/eventTemplateDraft';
import {
  CREATE_EVENT_DRAFT_KEY,
  forgetCreateEventDraft,
  readCreateEventDraft,
  saveCreateEventDraft,
} from './createEventDraftStorage';

const draft = {
  typedTitle: 'Nuit Nolan',
  date: '2026-12-04',
  time: '21:00',
  fields: { ...defaultTemplateFields(), themeText: 'Nolan', maxProposals: '3' },
  groupId: 'group-1',
};

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
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
