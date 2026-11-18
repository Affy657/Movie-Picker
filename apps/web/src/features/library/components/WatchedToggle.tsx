import { Link } from 'react-router';
import clsx from 'clsx';
import { Check, Eye } from 'lucide-react';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { formatShortDate } from '@/shared/utils/formatMyEventsListDate';
import { ROUTES } from '@/app/routes';
import type { WatchedStatus } from '@/features/library/api/watchedApi';
import styles from './WatchedToggle.module.css';

interface WatchedToggleProps {
  status: WatchedStatus | undefined;
  disabled: boolean;
  fullWidth?: boolean;
  className?: string;
  onToggle: () => void;
}

function SeenAtNight({
  status,
  className,
}: Readonly<{ status: WatchedStatus; className?: string }>) {
  const { t, locale } = useTranslation();
  const label = status.watchedAt
    ? t('watched.button.night', { date: formatShortDate(status.watchedAt.slice(0, 10), locale) })
    : t('watched.button.nightUndated');
  return (
    <p className={clsx(styles.night, className)}>
      <Check aria-hidden size={ICON_SIZE.md} className={styles.nightIcon} />
      {status.nightSlug ? (
        <Link to={ROUTES.eventDetail(status.nightSlug)} className={styles.nightLink}>
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      )}
    </p>
  );
}

export default function WatchedToggle({
  status,
  disabled,
  fullWidth,
  className,
  onToggle,
}: Readonly<WatchedToggleProps>) {
  const { t } = useTranslation();
  if (status?.status === 'night') return <SeenAtNight status={status} className={className} />;
  const seen = status?.status === 'elsewhere';
  return (
    <Button
      variant={seen ? 'soft' : 'secondary'}
      fullWidth={fullWidth}
      className={className}
      disabled={disabled}
      onClick={onToggle}
    >
      {seen ? <Check aria-hidden size={ICON_SIZE.md} /> : <Eye aria-hidden size={ICON_SIZE.md} />}
      {t(seen ? 'watched.button.marked' : 'watched.button.mark')}
    </Button>
  );
}
