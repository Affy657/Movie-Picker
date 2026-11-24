import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { fixedPopoverStyle, useFixedPopover } from '@/shared/hooks/useFixedPopover';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useLocale, useTranslation } from '@/shared/i18n';
import Button from './Button';
import IconButton from './IconButton';
import Sheet from './Sheet';
import { ICON_SIZE } from './iconSize';
import {
  centeredScrollOffset,
  clampDay,
  compareMonths,
  dayLabel,
  dayNumber,
  focusableDayIn,
  formatDateTimeLabel,
  isDayOutside,
  jumpedDay,
  monthOf,
  monthTitle,
  monthWeeks,
  parseTypedTime,
  shiftDay,
  shiftMonth,
  timeSlots,
  weekdayInitials,
  type DateTimeValue,
  type MonthView,
} from './dateTimePickerModel';
import styles from './DateTimePicker.module.css';

export type { DateTimeValue } from './dateTimePickerModel';

type DateTimePickerProps = {
  id: string;
  label: string;
  value: DateTimeValue;
  onChange: (value: DateTimeValue) => void;
  min?: string;
  max?: string;
  today: string;
  invalid?: boolean;
  disabled?: boolean;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
};

const ARROW_DAY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

type CalendarProps = {
  selected: string;
  today: string;
  min?: string;
  max?: string;
  onPick: (iso: string) => void;
};

function Calendar({ selected, today, min, max, onPick }: Readonly<CalendarProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const [view, setView] = useState<MonthView>(() => monthOf(clampDay(selected || today, min, max)));
  const [focused, setFocused] = useState(() => clampDay(selected || today, min, max));
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocusRef = useRef(false);

  useEffect(() => {
    if (!moveFocusRef.current) return;
    moveFocusRef.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus();
  }, [focused, view]);

  const minMonth = min === undefined ? null : monthOf(min);
  const maxMonth = max === undefined ? null : monthOf(max);
  const canGoBack = minMonth === null || compareMonths(view, minMonth) > 0;
  const canGoForward = maxMonth === null || compareMonths(view, maxMonth) < 0;
  const weekdays = weekdayInitials(locale);

  const moveTo = (next: string) => {
    moveFocusRef.current = true;
    setFocused(next);
    setView(monthOf(next));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_DAY_STEPS[event.key];
    if (step !== undefined) {
      event.preventDefault();
      const next = shiftDay(focused, step);
      if (!isDayOutside(next, min, max)) moveTo(next);
      return;
    }
    const jumped = jumpedDay(event.key, focused, min, max);
    if (jumped === null) return;
    event.preventDefault();
    moveTo(jumped);
  };

  const turnMonth = (delta: number) => {
    const next = shiftMonth(view, delta);
    setView(next);
    setFocused(focusableDayIn(next, dayNumber(focused), min, max));
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.monthBar}>
        <IconButton
          ariaLabel={t('common.dateTimePicker.previousMonth')}
          disabled={!canGoBack}
          shape="round"
          onClick={() => turnMonth(-1)}
        >
          <ChevronLeft size={ICON_SIZE.md} aria-hidden />
        </IconButton>
        <p className={styles.monthTitle} aria-live="polite">
          {monthTitle(view, locale)}
        </p>
        <IconButton
          ariaLabel={t('common.dateTimePicker.nextMonth')}
          disabled={!canGoForward}
          shape="round"
          onClick={() => turnMonth(1)}
        >
          <ChevronRight size={ICON_SIZE.md} aria-hidden />
        </IconButton>
      </div>
      <div className={styles.weekdays} aria-hidden="true">
        {weekdays.map((weekday) => (
          <span key={weekday.long} className={styles.weekday}>
            {weekday.short}
          </span>
        ))}
      </div>
      <div ref={gridRef} className={styles.days} onKeyDown={onKeyDown}>
        {monthWeeks(view).map((week) =>
          week.map((day, index) =>
            day === null ? (
              <span key={`${week[0]?.iso ?? 'start'}-${index}`} className={styles.blank} />
            ) : (
              <button
                key={day.iso}
                type="button"
                data-day={day.iso}
                className={clsx(
                  styles.day,
                  day.iso === today && styles.dayToday,
                  day.iso === selected && styles.daySelected
                )}
                aria-label={dayLabel(day.iso, locale)}
                aria-pressed={day.iso === selected}
                aria-current={day.iso === today ? 'date' : undefined}
                tabIndex={day.iso === focused ? 0 : -1}
                disabled={isDayOutside(day.iso, min, max)}
                onFocus={() => setFocused(day.iso)}
                onClick={() => onPick(day.iso)}
              >
                {day.day}
              </button>
            )
          )
        )}
      </div>
    </div>
  );
}

function useCenterSelected(
  containerRef: RefObject<HTMLElement | null>,
  axis: 'vertical' | 'horizontal',
  selected: string
) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    const option = container?.querySelector<HTMLElement>(`[data-time="${selected}"]`);
    if (!container || !option) return;
    const box = container.getBoundingClientRect();
    const optionBox = option.getBoundingClientRect();
    if (axis === 'vertical') {
      container.scrollTop = centeredScrollOffset({
        containerStart: box.top,
        containerSize: container.clientHeight,
        optionStart: optionBox.top,
        optionSize: optionBox.height,
        scroll: container.scrollTop,
      });
      return;
    }
    container.scrollLeft = centeredScrollOffset({
      containerStart: box.left,
      containerSize: container.clientWidth,
      optionStart: optionBox.left,
      optionSize: optionBox.width,
      scroll: container.scrollLeft,
    });
  }, [containerRef, axis, selected]);
}

type TimeOptionsProps = {
  selected: string;
  layout: 'column' | 'row';
  onPick: (time: string) => void;
};

const TIME_STEPS: Record<string, number> = {
  ArrowUp: -1,
  ArrowLeft: -1,
  ArrowDown: 1,
  ArrowRight: 1,
};

function nextTimeSlot(key: string, slots: readonly string[], current: string): string | undefined {
  if (key === 'Home') return slots[0];
  if (key === 'End') return slots[slots.length - 1];
  const step = TIME_STEPS[key];
  return step === undefined ? undefined : slots[slots.indexOf(current) + step];
}

function TimeOptions({ selected, layout, onPick }: Readonly<TimeOptionsProps>) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const [roving, setRoving] = useState<{ from: string; to: string } | null>(null);
  useCenterSelected(listRef, layout === 'column' ? 'vertical' : 'horizontal', selected);
  const slots = timeSlots(selected);
  const tabbable = roving?.from === selected ? roving.to : selected || slots[0];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextTimeSlot(event.key, slots, tabbable ?? '');
    if (next === undefined) return;
    event.preventDefault();
    setRoving({ from: selected, to: next });
    listRef.current?.querySelector<HTMLButtonElement>(`[data-time="${next}"]`)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="group"
      aria-label={t('common.dateTimePicker.timeList')}
      className={layout === 'column' ? styles.timeColumnList : styles.timeRow}
      onKeyDown={onKeyDown}
    >
      {slots.map((slot) => (
        <button
          key={slot}
          type="button"
          data-time={slot}
          className={clsx(
            layout === 'column' ? styles.timeOption : styles.timeChip,
            slot === selected && styles.timeSelected
          )}
          aria-pressed={slot === selected}
          tabIndex={slot === tabbable ? 0 : -1}
          onFocus={() => setRoving({ from: selected, to: slot })}
          onClick={() => onPick(slot)}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}

function TypedTime({
  time,
  onTime,
}: Readonly<{ time: string; onTime: (time: string, done: boolean) => void }>) {
  const { t } = useTranslation();
  const [text, setText] = useState(time);

  const apply = (done: boolean) => {
    const parsed = parseTypedTime(text);
    if (parsed === null) {
      setText(time);
      return;
    }
    onTime(parsed, done);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={clsx('input', styles.timeInput)}
      aria-label={t('common.dateTimePicker.time')}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => apply(false)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        apply(true);
      }}
    />
  );
}

export default function DateTimePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  today,
  invalid = false,
  disabled = false,
  ariaLabelledBy,
  ariaDescribedBy,
}: Readonly<DateTimePickerProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const isMobile = useIsMobile();
  const valueId = useId();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateTimeValue>(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const popoverOpen = open && !isMobile;
  const position = useFixedPopover(popoverOpen, triggerRef, panelRef);
  const currentYear = monthOf(today).year;

  const close = () => setOpen(false);

  useClickOutside([triggerRef, panelRef], close, popoverOpen, {
    returnFocusTo: triggerRef,
    closeOnFocusLeave: true,
  });

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    setDraft(value);
    setOpen(true);
  };

  const pickTime = (time: string, done: boolean) => {
    onChange({ date: value.date, time });
    if (!done) return;
    close();
    triggerRef.current?.focus();
  };

  const confirmSheet = () => {
    onChange(draft);
    close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={clsx(styles.trigger, invalid && styles.triggerInvalid)}
        aria-haspopup={isMobile ? 'dialog' : undefined}
        aria-expanded={open}
        aria-controls={popoverOpen ? panelId : undefined}
        aria-labelledby={ariaLabelledBy ? `${ariaLabelledBy} ${valueId}` : undefined}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={toggle}
      >
        <CalendarDays size={ICON_SIZE.md} aria-hidden className={styles.triggerIcon} />
        <span id={valueId} className={styles.triggerValue}>
          {formatDateTimeLabel(value, locale, currentYear)}
        </span>
        <ChevronDown
          size={ICON_SIZE.md}
          aria-hidden
          className={clsx(styles.triggerIcon, open && styles.chevronOpen)}
        />
      </button>
      {popoverOpen ? (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label={label}
          className={styles.panel}
          data-placement={position?.placement}
          style={fixedPopoverStyle(position)}
        >
          <Calendar
            selected={value.date}
            today={today}
            min={min}
            max={max}
            onPick={(date) => onChange({ date, time: value.time })}
          />
          <div className={styles.timeColumn}>
            <span className={styles.timeTitle} aria-hidden="true">
              {t('common.dateTimePicker.time')}
            </span>
            <TypedTime key={value.time} time={value.time} onTime={pickTime} />
            <TimeOptions
              selected={value.time}
              layout="column"
              onPick={(time) => pickTime(time, true)}
            />
          </div>
        </div>
      ) : null}
      {isMobile ? (
        <Sheet
          open={open}
          title={label}
          onClose={() => setOpen(false)}
          footer={
            <Button variant="primary" fullWidth onClick={confirmSheet}>
              {t('common.dateTimePicker.confirm')}
            </Button>
          }
        >
          <Calendar
            selected={draft.date}
            today={today}
            min={min}
            max={max}
            onPick={(date) => setDraft((current) => ({ ...current, date }))}
          />
          <p className={styles.timeTitle} aria-hidden="true">
            {t('common.dateTimePicker.time')}
          </p>
          <div className={styles.sheetTime}>
            <TypedTime
              key={draft.time}
              time={draft.time}
              onTime={(time) => setDraft((current) => ({ ...current, time }))}
            />
            <TimeOptions
              selected={draft.time}
              layout="row"
              onPick={(time) => setDraft((current) => ({ ...current, time }))}
            />
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
