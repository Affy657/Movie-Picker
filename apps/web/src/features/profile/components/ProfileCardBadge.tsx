import clsx from 'clsx';
import type { ReactNode } from 'react';
import cardStyles from '@/features/movies/components/ShowcaseMovieCard.module.css';
import styles from './ProfileCardBadge.module.css';

export default function ProfileCardBadge({
  description,
  icon,
  children,
}: Readonly<{ description: string; icon?: ReactNode; children: ReactNode }>) {
  return (
    <span className={clsx(cardStyles.badge, cardStyles.badgeStacked, styles.badge)}>
      <span className="visually-hidden">{description}</span>
      {icon}
      <span aria-hidden>{children}</span>
    </span>
  );
}
