import { describe, it, expect } from 'vitest';
import { t } from '@/shared/i18n';
import { describeTemplateConfig } from './describeTemplateConfig';
import type { TemplateConfigDraft } from './eventTemplateDraft';
import { MAX_EVENT_PARTICIPANTS, MAX_PROPOSALS_PER_PARTICIPANT } from '@/features/events/types';

const defaults: TemplateConfigDraft = {
  theme: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  maxVotesPerParticipant: null,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
  winnerCount: 1,
};

describe('describeTemplateConfig', () => {
  it('names the defaults when nothing was changed', () => {
    expect(describeTemplateConfig(defaults, t)).toBe('Réglages par défaut');
  });

  it('lists every setting that leaves the defaults, theme first', () => {
    const draft: TemplateConfigDraft = {
      theme: '🍿 Marathon',
      maxProposalsPerParticipant: 6,
      maxParticipants: 20,
      maxVotesPerParticipant: 2,
      wheelMode: 'strictRandom',
      richSharePreview: true,
      allowSeries: true,
      winnerCount: 3,
    };

    expect(describeTemplateConfig(draft, t)).toBe(
      '🍿 Marathon, 6 films par personne, 20 participants max, 2 votes par personne, 3 films gagnants, aléatoire strict, séries autorisées'
    );
  });

  it('uses the singular for a single film, participant or vote', () => {
    const draft: TemplateConfigDraft = {
      ...defaults,
      maxProposalsPerParticipant: 1,
      maxParticipants: 1,
      maxVotesPerParticipant: 1,
    };

    expect(describeTemplateConfig(draft, t)).toBe(
      '1 film par personne, 1 participant max, 1 vote par personne'
    );
  });

  it('ignores a limit written at the cap', () => {
    const draft: TemplateConfigDraft = {
      ...defaults,
      maxProposalsPerParticipant: MAX_PROPOSALS_PER_PARTICIPANT,
      maxParticipants: MAX_EVENT_PARTICIPANTS,
    };

    expect(describeTemplateConfig(draft, t)).toBe('Réglages par défaut');
  });
});
