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
  wheelMode: 'weightedByVotes' as const,
  richSharePreview: true,
  allowSeries: false,
};

const baseDraft: TemplateConfigDraft = {
  theme: null,
  maxProposalsPerParticipant: 3,
  maxParticipants: 8,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
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
      wheelMode: 'strictRandom',
      richSharePreview: true,
      allowSeries: true,
    };

    expect(templateToDraft(template)).toEqual({
      theme: '🎃 Halloween',
      maxProposalsPerParticipant: 3,
      maxParticipants: 8,
      wheelMode: 'strictRandom',
      richSharePreview: true,
      allowSeries: true,
    });
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
