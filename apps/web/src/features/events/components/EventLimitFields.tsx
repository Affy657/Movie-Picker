import clsx from 'clsx';
import Field from '@/shared/components/Field';
import NumberInput from '@/shared/components/NumberInput';
import ToggleRow from '@/shared/components/ToggleRow';
import {
  EVENT_LIMIT_KINDS,
  EVENT_LIMITS,
  eventLimitCopy,
  eventLimitInputId,
  type EventLimitKind,
} from '@/features/events/lib/eventLimits';
import { useTranslation } from '@/shared/i18n';
import styles from './EventLimitFields.module.css';

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
  const copy = eventLimitCopy(kind, t);
  return (
    <div className={className}>
      <ToggleRow
        title={copy.toggle}
        description={copy.toggleHint}
        checked={limit.enabled}
        disabled={disabled}
        onChange={limit.onEnabledChange}
      />
      {limit.enabled && (
        <Field
          label={copy.field}
          htmlFor={eventLimitInputId(idPrefix, kind)}
          error={limit.error}
          hint={limit.error ? undefined : (limit.hint ?? copy.fieldHint)}
          className={clsx(styles.subField, styles.counterField)}
        >
          {({ id, describedBy, invalid }) => (
            <NumberInput
              id={id}
              value={limit.value}
              onChange={limit.onValueChange}
              min={1}
              max={EVENT_LIMITS[kind].max}
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
  return EVENT_LIMIT_KINDS.map((kind) => {
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
