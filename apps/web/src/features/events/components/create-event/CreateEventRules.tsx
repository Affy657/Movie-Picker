import { useId } from 'react';
import Field from '@/shared/components/Field';
import NumberInput from '@/shared/components/NumberInput';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import ToggleRow from '@/shared/components/ToggleRow';
import { useTranslation } from '@/shared/i18n';
import type { CreateEventFieldErrors } from '@/features/events/lib/createEventValidation';
import type { TemplateFormFields } from '@/features/events/lib/eventTemplateDraft';
import {
  EVENT_LIMIT_KINDS,
  EVENT_LIMITS,
  eventLimitCopy,
  eventLimitInputId,
  type EventLimitKind,
} from '@/features/events/lib/eventLimits';
import { MAX_WINNERS_PER_EVENT, type WheelMode } from '@/features/events/types';
import styles from './CreateEventDialog.module.css';

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

  const limitRow = (kind: EventLimitKind) => {
    const limit = EVENT_LIMITS[kind];
    const copy = eventLimitCopy(kind, t);
    const enabled = fields[limit.enabledField];
    return (
      <Field
        key={kind}
        label={copy.label}
        hint={copy.hint}
        error={errors[limit.valueField]}
        htmlFor={eventLimitInputId('create', kind)}
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
      {EVENT_LIMIT_KINDS.map(limitRow)}
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
