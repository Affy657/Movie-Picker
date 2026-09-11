import { describe, it, expect } from 'vitest';
import {
  buildTemplateDraft,
  isSameTemplateConfig,
  suggestTemplateName,
  templateToDraft,
  type TemplateConfigDraft,
} from './eventTemplateDraft';
import {
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
  type EventTemplateData,
} from '@/features/events/types';

const baseFields = {
  themeEmoji: '',
  themeText: '',
  maxProposals: '3',
  maxParticipants: '8',
  maxVotes: '',
  wheelMode: 'weightedByVotes' as const,
  richSharePreview: true,
  allowSeries: false,
  winnerCount: '1',
};

const baseDraft: TemplateConfigDraft = {
  theme: null,
  maxProposalsPerParticipant: 3,
  maxParticipants: 8,
  maxVotesPerParticipant: null,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
  winnerCount: 1,
};

describe('buildTemplateDraft', () => {
  it('joins emoji and text into a single theme', () => {
    const draft = buildTemplateDraft({ ...baseFields, themeEmoji: '🎃', themeText: 'Halloween' });

    expect(draft.theme).toBe('🎃 Halloween');
  });

  it('keeps the emoji alone when there is no text', () => {
    expect(buildTemplateDraft({ ...baseFields, themeEmoji: '🎃' }).theme).toBe('🎃');
  });

  it('trims the text and drops an empty theme', () => {
    expect(buildTemplateDraft({ ...baseFields, themeText: '   ' }).theme).toBeNull();
  });

  it('reads an empty limit as no limit', () => {
    const draft = buildTemplateDraft({ ...baseFields, maxProposals: '', maxParticipants: '0' });

    expect(draft.maxProposalsPerParticipant).toBeNull();
    expect(draft.maxParticipants).toBeNull();
  });

  it('reads the vote budget, empty meaning no limit', () => {
    expect(buildTemplateDraft({ ...baseFields, maxVotes: '4' }).maxVotesPerParticipant).toBe(4);
    expect(buildTemplateDraft({ ...baseFields, maxVotes: '' }).maxVotesPerParticipant).toBeNull();
    expect(buildTemplateDraft({ ...baseFields, maxVotes: '0' }).maxVotesPerParticipant).toBeNull();
  });

  it('rejects a non-numeric limit as no limit', () => {
    expect(
      buildTemplateDraft({ ...baseFields, maxProposals: 'abc' }).maxProposalsPerParticipant
    ).toBeNull();
  });

  it('carries the wheel mode and the series flag', () => {
    const draft = buildTemplateDraft({
      ...baseFields,
      wheelMode: 'strictRandom',
      richSharePreview: true,
      allowSeries: true,
    });

    expect(draft.wheelMode).toBe('strictRandom');
    expect(draft.allowSeries).toBe(true);
  });
});

describe('templateToDraft', () => {
  it('drops the identity and keeps the configuration', () => {
    const template: EventTemplateData = {
      id: 't1',
      name: 'Soirée horreur',
      theme: '🎃 Halloween',
      maxProposalsPerParticipant: 3,
      maxParticipants: 8,
      maxVotesPerParticipant: 2,
      wheelMode: 'strictRandom',
      richSharePreview: true,
      allowSeries: true,
      winnerCount: 2,
    };

    expect(templateToDraft(template)).toEqual({
      theme: '🎃 Halloween',
      maxProposalsPerParticipant: 3,
      maxParticipants: 8,
      maxVotesPerParticipant: 2,
      wheelMode: 'strictRandom',
      richSharePreview: true,
      allowSeries: true,
      winnerCount: 2,
    });
  });
});

describe('buildTemplateDraft winner count', () => {
  it('keeps the chosen winner count', () => {
    expect(buildTemplateDraft({ ...baseFields, winnerCount: '4' }).winnerCount).toBe(4);
  });

  it('falls back to a single winner when the field is unusable', () => {
    expect(buildTemplateDraft({ ...baseFields, winnerCount: '' }).winnerCount).toBe(1);
    expect(buildTemplateDraft({ ...baseFields, winnerCount: '99' }).winnerCount).toBe(1);
  });
});

describe('isSameTemplateConfig', () => {
  it('is true for identical drafts', () => {
    expect(isSameTemplateConfig(baseDraft, { ...baseDraft })).toBe(true);
  });

  it.each([
    ['theme', { theme: '🎃 Halloween' }],
    ['maxProposalsPerParticipant', { maxProposalsPerParticipant: 5 }],
    ['maxParticipants', { maxParticipants: null }],
    ['maxVotesPerParticipant', { maxVotesPerParticipant: 3 }],
    ['wheelMode', { wheelMode: 'strictRandom' as const }],
    ['richSharePreview', { richSharePreview: false }],
    ['allowSeries', { allowSeries: true }],
  ])('is false when %s differs', (_field, patch) => {
    expect(isSameTemplateConfig(baseDraft, { ...baseDraft, ...patch })).toBe(false);
  });

  it('treats an absent limit as the cap', () => {
    const noLimit: TemplateConfigDraft = {
      ...baseDraft,
      maxProposalsPerParticipant: null,
      maxParticipants: null,
    };
    const atCap: TemplateConfigDraft = {
      ...baseDraft,
      maxProposalsPerParticipant: MAX_PROPOSALS_PER_PARTICIPANT,
      maxParticipants: MAX_EVENT_PARTICIPANTS,
    };

    expect(isSameTemplateConfig(noLimit, atCap)).toBe(true);
  });
});

describe('suggestTemplateName', () => {
  it('proposes the theme when there is one', () => {
    expect(suggestTemplateName('🎃 Halloween', [])).toBe('🎃 Halloween');
  });

  it('falls back to a numbered name without a theme', () => {
    expect(suggestTemplateName(null, [])).toBe('Template 1');
  });

  it('skips numbers already taken', () => {
    expect(suggestTemplateName(null, ['Template 1', 'Template 2'])).toBe('Template 3');
  });

  it('falls back to a numbered name when the theme is already taken', () => {
    expect(suggestTemplateName('🎃 Halloween', ['🎃 Halloween'])).toBe('Template 1');
  });

  it('ignores case when checking what is taken', () => {
    expect(suggestTemplateName('Halloween', ['HALLOWEEN'])).toBe('Template 1');
  });

  it('truncates a theme longer than the allowed name', () => {
    const name = suggestTemplateName('a'.repeat(80), []);

    expect(name).toHaveLength(60);
  });
});
