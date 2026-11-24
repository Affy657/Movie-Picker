import type { FocusEvent, ReactNode } from 'react';
import { Info } from 'lucide-react';
import DateTimePicker, { type DateTimeValue } from '@/shared/components/DateTimePicker';
import Field from '@/shared/components/Field';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { eventTimeNeedsZone } from '@/shared/utils/eventScheduled';
import styles from './NightForm.module.css';

type NightDateFieldProps = {
  id: string;
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  onLeave?: () => void;
  min?: string;
  max?: string;
  today: string;
  error?: string;
  notice?: string;
  disabled?: boolean;
  children?: ReactNode;
};

export default function NightDateField({
  id,
  value,
  onChange,
  onLeave,
  min,
  max,
  today,
  error,
  notice,
  disabled = false,
  children,
}: Readonly<NightDateFieldProps>) {
  const { t } = useTranslation();
  const label = t('events.form.dateTime');
  const shownLabel = eventTimeNeedsZone(value)
    ? t('events.detail.parisTime', { value: label })
    : label;

  const leaveBlock = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    if (next instanceof Element && next.closest('dialog') !== event.currentTarget.closest('dialog'))
      return;
    onLeave?.();
  };

  return (
    <div className={styles.block} onBlur={onLeave ? leaveBlock : undefined}>
      <Field
        label={<span className={styles.blockTitle}>{shownLabel}</span>}
        htmlFor={id}
        error={error}
        hint={
          notice ? (
            <span className={styles.message}>
              <Info size={ICON_SIZE.sm} aria-hidden />
              <span className={styles.messageText}>{notice}</span>
            </span>
          ) : undefined
        }
        className={styles.fieldBare}
      >
        {({ id: fieldId, labelId, describedBy, invalid }) => (
          <DateTimePicker
            id={fieldId}
            label={label}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            today={today}
            invalid={invalid}
            disabled={disabled}
            ariaLabelledBy={labelId}
            ariaDescribedBy={describedBy}
          />
        )}
      </Field>
      {children}
    </div>
  );
}
