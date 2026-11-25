import { useId, type ReactNode } from 'react';
import clsx from 'clsx';
import Field from '@/shared/components/Field';
import NumberInput from '@/shared/components/NumberInput';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import Toggle from '@/shared/components/Toggle';
import { useTranslation } from '@/shared/i18n';
import type { TemplateFormFields } from '@/features/events/lib/eventTemplateDraft';
import {
  EVENT_LIMIT_KINDS,
  EVENT_LIMITS,
  eventLimitInputId,
  eventLimitLabel,
  winnerCountInputId,
  type EventLimitKind,
  type RuleErrors,
} from '@/features/events/lib/eventLimits';
import { MAX_WINNERS_PER_EVENT, type WheelMode } from '@/features/events/types';
import styles from './NightForm.module.css';

export type NightRuleErrors = RuleErrors;

type NightRulesProps = {
  idPrefix: string;
  fields: TemplateFormFields;
  errors: NightRuleErrors;
  onChange: (patch: Partial<TemplateFormFields>) => void;
  locked?: boolean;
  anonymousLocked?: boolean;
  winnerMin?: number;
  showTitle: boolean;
  titleAction?: ReactNode;
  notice?: ReactNode;
  start?: ReactNode;
  end?: ReactNode;
};

export default function NightRules({
  idPrefix,
  fields,
  errors,
  onChange,
  locked = false,
  anonymousLocked = false,
  winnerMin = 1,
  showTitle,
  titleAction,
  notice,
  start,
  end,
}: Readonly<NightRulesProps>) {
  const { t } = useTranslation();
  const headingId = useId();
  const drawLabelId = useId();
  const seriesLabelId = useId();
  const anonymousLabelId = useId();
  const anonymousHintId = useId();
  const unlimitedLabel = t('events.create.rules.unlimited');
  const lockedRow = locked && styles.lockedRow;

  const limitRow = (kind: EventLimitKind) => {
    const limit = EVENT_LIMITS[kind];
    const enabled = fields[limit.enabledField];
    return (
      <Field
        key={kind}
        label={eventLimitLabel(kind, t)}
        error={errors[limit.valueField]}
        htmlFor={eventLimitInputId(idPrefix, kind)}
        className={clsx(styles.ruleRow, lockedRow)}
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
            disabled={locked}
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
    <section
      className={styles.stack}
      aria-labelledby={showTitle ? headingId : undefined}
      aria-label={showTitle ? undefined : t('events.form.rules')}
    >
      {notice}
      {showTitle || titleAction ? (
        <div className={clsx(styles.block, styles.blockHead)}>
          {showTitle ? (
            <h3 id={headingId} className={styles.blockTitle}>
              {t('events.form.rules')}
            </h3>
          ) : (
            <span />
          )}
          {titleAction}
        </div>
      ) : null}
      {start}
      <div className={styles.rules}>
        {EVENT_LIMIT_KINDS.map(limitRow)}
        <Field
          label={t('events.create.rules.winners')}
          error={errors.winnerCount}
          htmlFor={winnerCountInputId(idPrefix)}
          className={styles.ruleRow}
        >
          {({ id, describedBy, invalid }) => (
            <NumberInput
              id={id}
              value={fields.winnerCount}
              onChange={(value) => onChange({ winnerCount: value })}
              min={winnerMin}
              max={MAX_WINNERS_PER_EVENT}
              invalid={invalid}
              ariaDescribedBy={describedBy}
              className={styles.ruleStepper}
            />
          )}
        </Field>
        <div className={clsx(styles.ruleRow, lockedRow)}>
          <span id={drawLabelId} className={styles.ruleLabel}>
            {t('events.create.rules.draw')}
          </span>
          <SegmentedRadioGroup
            options={drawOptions}
            value={fields.wheelMode}
            onChange={(wheelMode) => onChange({ wheelMode })}
            ariaLabelledBy={drawLabelId}
            disabled={locked}
            size="sm"
          />
        </div>
        <div className={clsx(styles.ruleRow, lockedRow)}>
          <span id={seriesLabelId} className={styles.ruleLabel}>
            {t('events.create.rules.series')}
          </span>
          <Toggle
            checked={fields.allowSeries}
            onChange={(allowSeries) => onChange({ allowSeries })}
            disabled={locked}
            ariaLabelledBy={seriesLabelId}
          />
        </div>
        <div className={clsx(styles.ruleRow, (locked || anonymousLocked) && styles.lockedRow)}>
          <span id={anonymousLabelId} className={styles.ruleLabel}>
            {t('events.create.rules.anonymous')}
          </span>
          <Toggle
            checked={fields.anonymousProposals}
            onChange={(anonymousProposals) => onChange({ anonymousProposals })}
            disabled={locked || anonymousLocked}
            ariaLabelledBy={anonymousLabelId}
            ariaDescribedBy={anonymousLocked ? anonymousHintId : undefined}
          />
          {anonymousLocked ? (
            <p id={anonymousHintId} className={clsx('hint', styles.ruleHint)}>
              {t('events.create.rules.anonymousLocked')}
            </p>
          ) : null}
        </div>
      </div>
      {end ? <div className={styles.rulesEnd}>{end}</div> : null}
    </section>
  );
}
