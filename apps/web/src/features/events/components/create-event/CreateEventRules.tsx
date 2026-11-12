import { useId } from 'react';
import Field from '@/shared/components/Field';
import NumberInput from '@/shared/components/NumberInput';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import ToggleRow from '@/shared/components/ToggleRow';
import { useTranslation } from '@/shared/i18n';
import type { CreateEventFieldErrors } from '@/features/events/lib/createEventValidation';
import type { TemplateFormFields } from '@/features/events/lib/eventTemplateDraft';
import {
  DEFAULT_PARTICIPANT_LIMIT,
  DEFAULT_PROPOSAL_LIMIT,
  DEFAULT_VOTE_LIMIT,
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
  MAX_WINNERS_PER_EVENT,
  type WheelMode,
} from '@/features/events/types';
import styles from './CreateEventDialog.module.css';

export const RULE_INPUT_IDS = {
  participants: 'create-max-participants',
  proposals: 'create-max-proposals',
  votes: 'create-max-votes',
} as const;

type LimitKey = 'participant' | 'proposal' | 'vote';

const LIMITS: Record<
  LimitKey,
  {
    enabledField: 'participantLimitEnabled' | 'proposalLimitEnabled' | 'voteLimitEnabled';
    valueField: 'maxParticipants' | 'maxProposals' | 'maxVotes';
    errorField: 'maxParticipants' | 'maxProposals' | 'maxVotes';
    inputId: string;
    fallback: number;
    max?: number;
    labelKey:
      | 'events.create.rules.participants'
      | 'events.create.rules.proposals'
      | 'events.create.rules.votes';
    hintKey:
      | 'events.create.rules.participantsHint'
      | 'events.create.rules.proposalsHint'
      | 'events.create.rules.votesHint';
  }
> = {
  participant: {
    enabledField: 'participantLimitEnabled',
    valueField: 'maxParticipants',
    errorField: 'maxParticipants',
    inputId: RULE_INPUT_IDS.participants,
    fallback: DEFAULT_PARTICIPANT_LIMIT,
    max: MAX_EVENT_PARTICIPANTS,
    labelKey: 'events.create.rules.participants',
    hintKey: 'events.create.rules.participantsHint',
  },
  proposal: {
    enabledField: 'proposalLimitEnabled',
    valueField: 'maxProposals',
    errorField: 'maxProposals',
    inputId: RULE_INPUT_IDS.proposals,
    fallback: DEFAULT_PROPOSAL_LIMIT,
    max: MAX_PROPOSALS_PER_PARTICIPANT,
    labelKey: 'events.create.rules.proposals',
    hintKey: 'events.create.rules.proposalsHint',
  },
  vote: {
    enabledField: 'voteLimitEnabled',
    valueField: 'maxVotes',
    errorField: 'maxVotes',
    inputId: RULE_INPUT_IDS.votes,
    fallback: DEFAULT_VOTE_LIMIT,
    labelKey: 'events.create.rules.votes',
    hintKey: 'events.create.rules.votesHint',
  },
};

type CreateEventRulesProps = {
  fields: TemplateFormFields;
  errors: CreateEventFieldErrors;
  onChange: (patch: Partial<TemplateFormFields>) => void;
};

export default function CreateEventRules({
  fields,
  errors,
  onChange,
}: Readonly<CreateEventRulesProps>) {
  const { t } = useTranslation();
  const drawLabelId = useId();
  const unlimitedLabel = t('events.create.rules.unlimited');

  const limitRow = (key: LimitKey) => {
    const limit = LIMITS[key];
    const enabled = fields[limit.enabledField];
    return (
      <Field
        key={key}
        label={t(limit.labelKey)}
        hint={t(limit.hintKey)}
        error={errors[limit.errorField]}
        htmlFor={limit.inputId}
        className={styles.ruleRow}
      >
        {({ id, describedBy, invalid }) => (
          <NumberInput
            id={id}
            value={enabled ? fields[limit.valueField] : ''}
            onChange={(value) =>
              onChange(
                value === ''
                  ? { [limit.enabledField]: false }
                  : { [limit.enabledField]: true, [limit.valueField]: value }
              )
            }
            min={1}
            max={limit.max}
            unlimited={{ label: unlimitedLabel, fallback: limit.fallback }}
            invalid={invalid}
            ariaDescribedBy={describedBy}
            className={styles.ruleStepper}
          />
        )}
      </Field>
    );
  };

  const drawOptions: { value: WheelMode; label: string }[] = [
    { value: 'weightedByVotes', label: t('events.create.rules.drawWeighted') },
    { value: 'strictRandom', label: t('events.create.rules.drawRandom') },
  ];

  return (
    <div className={styles.rules}>
      {limitRow('participant')}
      {limitRow('proposal')}
      {limitRow('vote')}
      <Field
        label={t('events.create.rules.winners')}
        hint={t('events.create.rules.winnersHint')}
        htmlFor="create-winner-count"
        className={styles.ruleRow}
      >
        {({ id, describedBy }) => (
          <NumberInput
            id={id}
            value={fields.winnerCount}
            onChange={(value) => onChange({ winnerCount: value })}
            min={1}
            max={MAX_WINNERS_PER_EVENT}
            ariaDescribedBy={describedBy}
            className={styles.ruleStepper}
          />
        )}
      </Field>
      <div className={styles.drawRow}>
        <span className={styles.drawText}>
          <span id={drawLabelId} className={styles.drawLabel}>
            {t('events.create.rules.draw')}
          </span>
          <span className={styles.drawHint}>
            {fields.wheelMode === 'strictRandom'
              ? t('events.create.rules.drawRandomHint')
              : t('events.create.rules.drawWeightedHint')}
          </span>
        </span>
        <SegmentedRadioGroup
          options={drawOptions}
          value={fields.wheelMode}
          onChange={(wheelMode) => onChange({ wheelMode })}
          ariaLabelledBy={drawLabelId}
          size="sm"
        />
      </div>
      <ToggleRow
        title={t('events.create.rules.series')}
        description={t('events.create.rules.seriesHint')}
        checked={fields.allowSeries}
        onChange={(allowSeries) => onChange({ allowSeries })}
        className={styles.seriesRow}
      />
    </div>
  );
}
