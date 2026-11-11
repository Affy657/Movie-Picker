import clsx from 'clsx';
import { CircleCheck, Clock, Hourglass, type LucideIcon } from 'lucide-react';
import type { MyEventLifecycle } from '@/shared/types/event';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import styles from './EventLifecyclePill.module.css';
import StatusDot from './StatusDot';
import { ICON_SIZE } from './iconSize';

const LIFECYCLE_LABEL_KEYS: Record<MyEventLifecycle, TranslationKey> = {
  upcoming: 'events.lifecycle.upcoming',
  live: 'events.lifecycle.live',
  pending: 'events.lifecycle.pending',
  finished: 'events.lifecycle.finished',
};

const LIFECYCLE_CLASSES: Record<MyEventLifecycle, string | undefined> = {
  upcoming: styles.upcoming,
  live: styles.live,
  pending: styles.pending,
  finished: styles.finished,
};

const TEXT_ICONS: Record<Exclude<MyEventLifecycle, 'live'>, LucideIcon> = {
  upcoming: Clock,
  pending: Hourglass,
  finished: CircleCheck,
};

export type EventLifecyclePillVariant = 'pill' | 'text';

type EventLifecyclePillProps = {
  lifecycle: MyEventLifecycle;

  label?: string;

  detail?: string | null;

  className?: string;

  variant?: EventLifecyclePillVariant;
};

export default function EventLifecyclePill({
  lifecycle,
  label,
  detail,
  className,
  variant = 'pill',
}: Readonly<EventLifecyclePillProps>) {
  const { t } = useTranslation();
  const TextIcon = variant === 'text' && lifecycle !== 'live' ? TEXT_ICONS[lifecycle] : null;

  return (
    <span
      className={clsx(
        variant === 'text' ? styles.text : styles.pill,
        LIFECYCLE_CLASSES[lifecycle],
        className
      )}
    >
      {lifecycle === 'live' && <StatusDot pulsing />}
      {TextIcon ? <TextIcon size={ICON_SIZE.sm} aria-hidden className={styles.icon} /> : null}
      {label ?? t(LIFECYCLE_LABEL_KEYS[lifecycle])}
      {detail ? <span className={styles.detail}> {detail}</span> : null}
    </span>
  );
}
