import type { Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { positiveLimit, type TemplateConfigDraft } from './eventTemplateDraft';

const PART_SEPARATOR = ', ';

export function describeTemplateConfig(draft: TemplateConfigDraft, t: Translate): string {
  const parts: string[] = [];
  if (draft.theme) parts.push(draft.theme);

  const proposals = positiveLimit(draft.maxProposalsPerParticipant);
  if (proposals !== null) {
    parts.push(
      pluralizeCount(
        proposals,
        'events.settings.summary.proposalsOne',
        'events.settings.summary.proposalsMany',
        t
      )
    );
  }

  const participants = positiveLimit(draft.maxParticipants);
  if (participants !== null) {
    parts.push(
      pluralizeCount(
        participants,
        'events.settings.summary.participantsOne',
        'events.settings.summary.participantsMany',
        t
      )
    );
  }

  const votes = draft.maxVotesPerParticipant;
  if (votes !== null && votes > 0) {
    parts.push(
      pluralizeCount(
        votes,
        'events.settings.summary.votesOne',
        'events.settings.summary.votesMany',
        t
      )
    );
  }

  if (draft.winnerCount > 1) {
    parts.push(t('events.settings.summary.winners', { count: draft.winnerCount }));
  }
  if (draft.wheelMode === 'strictRandom') parts.push(t('events.settings.summary.strictRandom'));
  if (draft.allowSeries) parts.push(t('events.settings.summary.series'));

  return parts.length > 0 ? parts.join(PART_SEPARATOR) : t('events.settings.summary.defaults');
}
