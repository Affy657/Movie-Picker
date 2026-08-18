import { Disc3, Lock } from 'lucide-react';
import clsx from 'clsx';
import type { EventWheelState } from '@/features/events/hooks/useEventWheel';
import { useTranslation } from '@/shared/i18n';
import styles from './EventWheelActions.module.css';

type EventWheelActionsProps = {
  wheel: EventWheelState;
};

export default function EventWheelActions({ wheel }: Readonly<EventWheelActionsProps>) {
  const { t } = useTranslation();
  if (!wheel.canSpin && !wheel.showClose) return null;

  const spinLabel = wheel.showRelaunch
    ? t('events.wheel.relaunchButton')
    : t('events.wheel.launchButton');

  return (
    <>
      {wheel.canSpin && (
        <button
          type="button"
          className={clsx('btn btn-primary', styles.spin)}
          onClick={wheel.launch}
          disabled={wheel.loading || wheel.spinDisabled}
          title={wheel.spinDisabled ? t('events.wheel.emptyPlaceholder') : undefined}
        >
          <Disc3 size={16} aria-hidden />
          <span className={styles.spinLabel}>
            {wheel.loading ? t('events.wheel.spinning') : spinLabel}
          </span>
        </button>
      )}
      {wheel.showClose && (
        <button
          type="button"
          className={clsx('btn', styles.close)}
          onClick={wheel.closeEvent}
          disabled={wheel.loading}
        >
          <Lock size={15} aria-hidden />
          <span className={styles.closeLabel}>{t('events.wheel.closeButton')}</span>
        </button>
      )}
    </>
  );
}
