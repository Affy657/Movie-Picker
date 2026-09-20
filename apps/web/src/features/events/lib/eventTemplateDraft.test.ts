import { describe, it, expect } from 'vitest';
import {
  buildTemplateDraft,
  configToFields,
  defaultTemplateFields,
  draftToConfigPatch,
  isDefaultTemplateDraft,
  isSameTemplateConfig,
  limitFieldOnEnable,
  suggestTemplateName,
  templateToDraft,
  type TemplateConfigDraft,
} from './eventTemplateDraft';
import {
  DEFAULT_PARTICIPANT_LIMIT,
  DEFAULT_PROPOSAL_LIMIT,
  DEFAULT_VOTE_LIMIT,
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
  type EventTemplateData,
} from '@/features/events/types';

const baseFields = {
  themeEmoji: '',
  themeText: '',
  proposalLimitEnabled: true,
  maxProposals: '3',
  participantLimitEnabled: true,
  maxParticipants: '8',
  voteLimitEnabled: false,
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

  it('reads a disabled limit as no limit, whatever the counter says', () => {
    const draft = buildTemplateDraft({
      ...baseFields,
      proposalLimitEnabled: false,
      participantLimitEnabled: false,
    });

    expect(draft.maxProposalsPerParticipant).toBeNull();
    expect(draft.maxParticipants).toBeNull();
  });

  it('falls back to the default limit when the counter is enabled but unusable', () => {
    const draft = buildTemplateDraft({ ...baseFields, maxProposals: '', maxParticipants: '0' });

    expect(draft.maxProposalsPerParticipant).toBe(DEFAULT_PROPOSAL_LIMIT);
    expect(draft.maxParticipants).toBe(DEFAULT_PARTICIPANT_LIMIT);
  });

  it('reads a limit at the cap as no limit', () => {
    const draft = buildTemplateDraft({
      ...baseFields,
      maxProposals: String(MAX_PROPOSALS_PER_PARTICIPANT),
      maxParticipants: String(MAX_EVENT_PARTICIPANTS),
    });

    expect(draft.maxProposalsPerParticipant).toBeNull();
    expect(draft.maxParticipants).toBeNull();
  });

  it('reads the vote budget only when the limit is enabled, falling back to the default', () => {
    const enabled = { ...baseFields, voteLimitEnabled: true };
    expect(buildTemplateDraft({ ...enabled, maxVotes: '4' }).maxVotesPerParticipant).toBe(4);
    expect(buildTemplateDraft({ ...enabled, maxVotes: '' }).maxVotesPerParticipant).toBe(
      DEFAULT_VOTE_LIMIT
    );
    expect(buildTemplateDraft({ ...enabled, maxVotes: '0' }).maxVotesPerParticipant).toBe(
      DEFAULT_VOTE_LIMIT
    );
    expect(buildTemplateDraft({ ...baseFields, maxVotes: '4' }).maxVotesPerParticipant).toBeNull();
  });

  it('turns a config back into form fields, caps standing for no limit', () => {
    const fields = configToFields({
      theme: '🎃 Halloween',
      maxProposalsPerParticipant: null,
      maxParticipants: 8,
      maxVotesPerParticipant: 2,
      wheelMode: 'strictRandom',
      richSharePreview: false,
      allowSeries: true,
      winnerCount: 3,
    });

    expect(fields).toEqual({
      themeEmoji: '🎃',
      themeText: 'Halloween',
      proposalLimitEnabled: false,
      maxProposals: String(MAX_PROPOSALS_PER_PARTICIPANT),
      participantLimitEnabled: true,
      maxParticipants: '8',
      voteLimitEnabled: true,
      maxVotes: '2',
      wheelMode: 'strictRandom',
      richSharePreview: false,
      allowSeries: true,
      winnerCount: '3',
    });
    expect(buildTemplateDraft(fields).maxProposalsPerParticipant).toBeNull();
    expect(buildTemplateDraft(fields).maxParticipants).toBe(8);
  });

  it('reads a limit stored at the cap as disabled', () => {
    const fields = configToFields({
      theme: null,
      maxProposalsPerParticipant: MAX_PROPOSALS_PER_PARTICIPANT,
      maxParticipants: MAX_EVENT_PARTICIPANTS,
      maxVotesPerParticipant: null,
      wheelMode: 'weightedByVotes',
      richSharePreview: true,
      allowSeries: false,
      winnerCount: 1,
    });

    expect(fields.proposalLimitEnabled).toBe(false);
    expect(fields.participantLimitEnabled).toBe(false);
  });

  it('projects a draft onto the config patch, null limits sent as zero', () => {
    expect(draftToConfigPatch({ ...baseDraft, theme: null, maxParticipants: null })).toEqual({
      theme: '',
      maxProposalsPerParticipant: 3,
      maxParticipants: 0,
      maxVotesPerParticipant: 0,
      wheelMode: 'weightedByVotes',
      richSharePreview: true,
      allowSeries: false,
      winnerCount: 1,
    });
  });

  it('rejects a non-numeric or fractional limit as the default limit', () => {
    expect(
      buildTemplateDraft({ ...baseFields, maxProposals: 'abc' }).maxProposalsPerParticipant
    ).toBe(DEFAULT_PROPOSAL_LIMIT);
    expect(
      buildTemplateDraft({ ...baseFields, maxProposals: '2.5' }).maxProposalsPerParticipant
    ).toBe(DEFAULT_PROPOSAL_LIMIT);
    expect(
      buildTemplateDraft({ ...baseFields, voteLimitEnabled: true, maxVotes: '1.5' })
        .maxVotesPerParticipant
    ).toBe(DEFAULT_VOTE_LIMIT);
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

describe('defaultTemplateFields', () => {
  it('starts with every limit disabled and the default counters ready', () => {
    const fields = defaultTemplateFields();

    expect(fields.proposalLimitEnabled).toBe(false);
    expect(fields.participantLimitEnabled).toBe(false);
    expect(fields.voteLimitEnabled).toBe(false);
    expect(fields.maxProposals).toBe(String(DEFAULT_PROPOSAL_LIMIT));
    expect(fields.maxParticipants).toBe(String(DEFAULT_PARTICIPANT_LIMIT));
    expect(fields.maxVotes).toBe(String(DEFAULT_VOTE_LIMIT));
    expect(isDefaultTemplateDraft(buildTemplateDraft(fields))).toBe(true);
  });
});

describe('isDefaultTemplateDraft', () => {
  it('is false as soon as one setting leaves the defaults', () => {
    const defaults = buildTemplateDraft(defaultTemplateFields());

    expect(isDefaultTemplateDraft({ ...defaults, theme: '🎃 Halloween' })).toBe(false);
    expect(isDefaultTemplateDraft({ ...defaults, maxParticipants: 8 })).toBe(false);
    expect(isDefaultTemplateDraft({ ...defaults, winnerCount: 2 })).toBe(false);
  });

  it('still counts a limit written at the cap as the default', () => {
    const defaults = buildTemplateDraft(defaultTemplateFields());

    expect(isDefaultTemplateDraft({ ...defaults, maxParticipants: MAX_EVENT_PARTICIPANTS })).toBe(
      true
    );
  });
});

describe('limitFieldOnEnable', () => {
  it('keeps a usable counter value', () => {
    expect(limitFieldOnEnable('8', MAX_EVENT_PARTICIPANTS, DEFAULT_PARTICIPANT_LIMIT)).toBe('8');
  });

  it.each(['', '0', 'abc', String(MAX_EVENT_PARTICIPANTS)])(
    'replaces %j by the default limit',
    (value) => {
      expect(limitFieldOnEnable(value, MAX_EVENT_PARTICIPANTS, DEFAULT_PARTICIPANT_LIMIT)).toBe(
        String(DEFAULT_PARTICIPANT_LIMIT)
      );
    }
  );
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
