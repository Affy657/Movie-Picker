import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import Field from '@/shared/components/Field';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useLocale, useTranslation } from '@/shared/i18n';
import {
  EVENT_TIME_SHORTCUTS,
  eventDateShortcuts,
  type EventDateShortcut,
} from '@/features/events/lib/eventStartShortcuts';
import styles from './CreateEventDialog.module.css';

const OTHER = 'other';

type CreateEventWhenProps = {
  today: string;
  date: string;
  time: string;
  dateError?: string;
  timeError?: string;
  pastDateHint?: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
};

function dayOf(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function useFocusWhenOpened(open: boolean) {
  const ref = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) ref.current?.focus();
    wasOpen.current = open;
  }, [open]);
  return ref;
}

export default function CreateEventWhen({
  today,
  date,
  time,
  dateError,
  timeError,
  pastDateHint,
  onDateChange,
  onTimeChange,
}: Readonly<CreateEventWhenProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const headingId = useId();
  const timeLabelId = useId();
  const shortcuts = eventDateShortcuts(today);
  const timeShortcuts: readonly string[] = EVENT_TIME_SHORTCUTS;
  const [otherDateChosen, setOtherDateChosen] = useState(false);
  const [otherTimeChosen, setOtherTimeChosen] = useState(false);

  const dateIsShortcut = shortcuts.some((shortcut) => shortcut.date === date);
  const showDateField = otherDateChosen || !dateIsShortcut;
  const showTimeField = otherTimeChosen || !timeShortcuts.includes(time);
  const dateInputRef = useFocusWhenOpened(otherDateChosen);
  const timeInputRef = useFocusWhenOpened(otherTimeChosen);

  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  const shortDay = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const dayMonth = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

  const shortcutTitle = (shortcut: EventDateShortcut) => {
    if (shortcut.kind === 'tonight') return t('events.create.tonight');
    if (shortcut.kind === 'tomorrow') return t('events.create.tomorrow');
    return capitalize(weekday.format(dayOf(shortcut.date)));
  };
  const shortcutDetail = (shortcut: EventDateShortcut) =>
    shortcut.kind === 'day'
      ? dayMonth.format(dayOf(shortcut.date))
      : shortDay.format(dayOf(shortcut.date));
  const otherDateDetail = showDateField && date ? shortDay.format(dayOf(date)) : undefined;

  const timeOptions = [
    ...timeShortcuts.map((value) => ({ value, label: value })),
    { value: OTHER, label: t('events.create.otherTime') },
  ];

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.sectionTitle}>
        {t('events.create.whenLabel')}
      </h3>
      <ChoiceGroup
        value={showDateField ? OTHER : date}
        onChange={(value) => {
          if (value === OTHER) {
            setOtherDateChosen(true);
            return;
          }
          setOtherDateChosen(false);
          onDateChange(value);
        }}
        ariaLabelledBy={headingId}
        className={styles.dates}
      >
        {shortcuts.map((shortcut) => (
          <ChoiceCard
            key={shortcut.date}
            value={shortcut.date}
            title={shortcutTitle(shortcut)}
            description={shortcutDetail(shortcut)}
          />
        ))}
        <ChoiceCard
          value={OTHER}
          title={t('events.create.otherDate')}
          description={otherDateDetail}
        >
          <CalendarDays size={ICON_SIZE.sm} aria-hidden />
        </ChoiceCard>
      </ChoiceGroup>
      {showDateField ? (
        <Field
          label={t('events.create.dateLabel')}
          htmlFor="create-date"
          error={dateError}
          className={styles.inlineField}
        >
          {({ id, describedBy, invalid }) => (
            <input
              ref={dateInputRef}
              id={id}
              type="date"
              className="input"
              value={date}
              min={today}
              onChange={(event) => onDateChange(event.target.value)}
              required
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      ) : null}
      <span id={timeLabelId} className="visually-hidden">
        {t('events.create.timeShortcutsLabel')}
      </span>
      <SegmentedRadioGroup
        options={timeOptions}
        value={showTimeField ? OTHER : time}
        onChange={(value) => {
          if (value === OTHER) {
            setOtherTimeChosen(true);
            return;
          }
          setOtherTimeChosen(false);
          onTimeChange(value);
        }}
        ariaLabelledBy={timeLabelId}
        className={styles.times}
      />
      {showTimeField ? (
        <Field
          label={t('events.create.timeLabel')}
          htmlFor="create-time"
          error={timeError}
          className={styles.inlineField}
        >
          {({ id, describedBy, invalid }) => (
            <input
              ref={timeInputRef}
              id={id}
              type="time"
              className="input"
              value={time}
              onChange={(event) => onTimeChange(event.target.value)}
              required
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      ) : null}
      {pastDateHint ? <p className={styles.pastHint}>{pastDateHint}</p> : null}
    </section>
  );
}
