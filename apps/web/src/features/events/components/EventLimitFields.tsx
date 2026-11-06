import clsx from 'clsx';
import Field from '@/shared/components/Field';
import NumberInput from '@/shared/components/NumberInput';
import ToggleRow from '@/shared/components/ToggleRow';
import { MAX_EVENT_PARTICIPANTS, MAX_PROPOSALS_PER_PARTICIPANT } from '@/features/events/types';
import { useTranslation, type Translate } from '@/shared/i18n';
import styles from './EventLimitFields.module.css';

export type EventLimitKind = 'participants' | 'proposals' | 'votes';

export type EventLimitState = {
  enabled: boolean;
  value: string;
  error?: string;
  hint?: string;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: string) => void;
};

type EventLimitFieldsProps = {
  idPrefix: string;
  limits: Partial<Record<EventLimitKind, EventLimitState>>;
  disabled?: boolean;
  rowClassName?: string;
};

const LIMIT_KINDS: EventLimitKind[] = ['participants', 'proposals', 'votes'];

const COUNTER_ID_SUFFIX: Record<EventLimitKind, string> = {
  participants: 'max-participants',
  proposals: 'max-proposals',
  votes: 'max-votes',
};

export function eventLimitCounterId(idPrefix: string, kind: EventLimitKind): string {
  return `${idPrefix}-${COUNTER_ID_SUFFIX[kind]}`;
}

function limitCopy(kind: EventLimitKind, t: Translate) {
  if (kind === 'participants') {
    const max = MAX_EVENT_PARTICIPANTS;
    return {
      max,
      title: t('events.settings.participantLimitLabel'),
      description: t('events.settings.participantLimitDesc', { max }),
      label: t('events.settings.maxParticipantsLabel'),
      hint: t('events.settings.maxParticipantsCapHint', { max }),
    };
  }
  if (kind === 'proposals') {
    const max = MAX_PROPOSALS_PER_PARTICIPANT;
    return {
      max,
      title: t('events.settings.proposalLimitLabel'),
      description: t('events.settings.proposalLimitDesc', { max }),
      label: t('events.settings.maxProposalsLabel'),
      hint: t('events.settings.maxProposalsHint', { max }),
    };
  }
  return {
    max: undefined,
    title: t('events.settings.voteLimitLabel'),
    description: t('events.settings.voteLimitDesc'),
    label: t('events.settings.maxVotesLabel'),
    hint: undefined,
  };
}

function EventLimitField({
  kind,
  idPrefix,
  limit,
  disabled,
  className,
}: Readonly<{
  kind: EventLimitKind;
  idPrefix: string;
  limit: EventLimitState;
  disabled: boolean;
  className?: string;
}>) {
  const { t } = useTranslation();
  const copy = limitCopy(kind, t);
  return (
    <div className={className}>
      <ToggleRow
        title={copy.title}
        description={copy.description}
        checked={limit.enabled}
        disabled={disabled}
        onChange={limit.onEnabledChange}
      />
      {limit.enabled && (
        <Field
          label={copy.label}
          htmlFor={eventLimitCounterId(idPrefix, kind)}
          error={limit.error}
          hint={limit.error ? undefined : (limit.hint ?? copy.hint)}
          className={clsx(styles.subField, styles.counterField)}
        >
          {({ id, describedBy, invalid }) => (
            <NumberInput
              id={id}
              value={limit.value}
              onChange={limit.onValueChange}
              min={1}
              max={copy.max}
              disabled={disabled}
              invalid={invalid}
              ariaDescribedBy={describedBy}
            />
          )}
        </Field>
      )}
    </div>
  );
}

export default function EventLimitFields({
  idPrefix,
  limits,
  disabled = false,
  rowClassName,
}: Readonly<EventLimitFieldsProps>) {
  return LIMIT_KINDS.map((kind) => {
    const limit = limits[kind];
    if (!limit) return null;
    return (
      <EventLimitField
        key={kind}
        kind={kind}
        idPrefix={idPrefix}
        limit={limit}
        disabled={disabled}
        className={rowClassName}
      />
    );
  });
}
