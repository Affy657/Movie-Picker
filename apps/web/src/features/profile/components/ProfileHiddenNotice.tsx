import clsx from 'clsx';
import { Link } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import Chip from '@/shared/components/Chip';
import { buttonClass } from '@/shared/components/Button';
import styles from './ProfileHiddenNotice.module.css';

export default function ProfileHiddenNotice({
  label,
  to,
  className,
}: Readonly<{ label: string; to: string; className?: string }>) {
  const { t } = useTranslation();
  return (
    <div className={clsx(styles.hidden, className)}>
      <Chip tone="warning" size="sm">
        {label}
      </Chip>
      <Link
        to={to}
        className={buttonClass({ variant: 'ghost', size: 'sm', className: styles.makeVisible })}
      >
        {t('profile.watchlist.makeVisible')}
      </Link>
    </div>
  );
}
