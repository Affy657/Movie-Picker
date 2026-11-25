import { describe, it, expect } from 'vitest';
import { t } from '@/shared/i18n';
import { describeTemplateConfig } from './describeTemplateConfig';
import type { TemplateConfigDraft } from './eventTemplateDraft';

const defaults: TemplateConfigDraft = {
  theme: null,
  maxProposalsPerParticipant: null,
  maxParticipants: null,
  maxVotesPerParticipant: null,
  wheelMode: 'weightedByVotes',
  richSharePreview: true,
  allowSeries: false,
  anonymousProposals: false,
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
      anonymousProposals: false,
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

  it('names a limit written at the cap', () => {
    const draft: TemplateConfigDraft = {
      ...defaults,
      maxProposalsPerParticipant: 15,
      maxParticipants: 50,
    };

    expect(describeTemplateConfig(draft, t)).toBe('15 films par personne, 50 participants max');
  });
});
