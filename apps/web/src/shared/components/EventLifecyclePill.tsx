import clsx from 'clsx';
import type { MyEventLifecycle } from '@/shared/types/event';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import styles from './EventLifecyclePill.module.css';

const LIFECYCLE_LABEL_KEYS: Record<MyEventLifecycle, TranslationKey> = {
  upcoming: 'events.lifecycle.upcoming',
  live: 'events.lifecycle.live',
  finished: 'events.lifecycle.finished',
};

const LIFECYCLE_CLASSES: Record<MyEventLifecycle, string | undefined> = {
  upcoming: styles.upcoming,
  live: styles.live,
  finished: styles.finished,
};

type EventLifecyclePillProps = {
  lifecycle: MyEventLifecycle;

  label?: string;

  detail?: string | null;

  className?: string;
};

export default function EventLifecyclePill({
  lifecycle,
  label,
  detail,
  className,
}: Readonly<EventLifecyclePillProps>) {
  const { t } = useTranslation();

  return (
    <span className={clsx(styles.pill, LIFECYCLE_CLASSES[lifecycle], className)}>
      {lifecycle === 'live' && <span className={styles.pulse} aria-hidden />}
      {label ?? t(LIFECYCLE_LABEL_KEYS[lifecycle])}
      {detail ? <span className={styles.detail}> {detail}</span> : null}
    </span>
  );
}
