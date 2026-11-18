import clsx from 'clsx';
import { Bookmark } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { ModeIcon } from '@/features/movies/components/WatchProviderChips';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { Translate } from '@/shared/i18n';
import styles from './movieCardParts.module.css';

export { CardKebab, MovieCardKebab } from './MovieCardKebab';

export function PaidOfferChip(
  props: Readonly<
    {
      type: 'rent' | 'buy';
      count: number;
      ariaLabel: string;
    } & ({ onClick: () => void; href?: never } | { href?: string; onClick?: never })
  >
) {
  const { type, count, ariaLabel } = props;
  const content = (
    <>
      <ModeIcon type={type} size={ICON_SIZE.sm} />
      <span className={styles.paidChipCount}>{count}</span>
    </>
  );
  if (props.onClick) {
    return (
      <button
        type="button"
        className={styles.paidChip}
        onClick={props.onClick}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }
  if (props.href) {
    return (
      <a
        href={props.href}
        className={styles.paidChip}
        aria-label={ariaLabel}
        target="_blank"
        rel="noreferrer noopener"
      >
        {content}
      </a>
    );
  }
  return (
    <span
      className={clsx(styles.paidChip, styles.paidChipStatic)}
      role="img"
      aria-label={ariaLabel}
    >
      {content}
    </span>
  );
}

export function OverflowChip({
  count,
  onClick,
  ariaLabel,
}: Readonly<{ count: number; onClick: () => void; ariaLabel: string }>) {
  return (
    <button type="button" className={styles.paidChip} onClick={onClick} aria-label={ariaLabel}>
      <span className={styles.paidChipCount}>+{count}</span>
    </button>
  );
}

export interface MovieContributor {
  avatarId: string | null;
  pseudo: string;
  name: string;
  label: string;
}

export function ContributorBadge({ contributor }: Readonly<{ contributor: MovieContributor }>) {
  return (
    <span className={styles.contributorBadge} role="img" aria-label={contributor.label}>
      <Avatar
        avatarId={contributor.avatarId}
        pseudo={contributor.pseudo}
        size="xs"
        className={styles.contributorAvatar}
      />
    </span>
  );
}

export function ContributorCell({ contributor }: Readonly<{ contributor: MovieContributor }>) {
  return (
    <span className={styles.contributorCell}>
      <Avatar avatarId={contributor.avatarId} pseudo={contributor.pseudo} size="xs" />
      <span className={styles.contributorName} aria-hidden="true">
        {contributor.name}
      </span>
      <span className="visually-hidden">{contributor.label}</span>
    </span>
  );
}

export function WatchlistBadge({
  inWatchlist,
  t,
}: Readonly<{ inWatchlist?: boolean; t: Translate }>) {
  if (!inWatchlist) return null;
  return (
    <span
      className={styles.watchlistBadge}
      role="img"
      aria-label={t('watchlist.card.inWatchlistBadgeAria')}
    >
      <Bookmark aria-hidden size={ICON_SIZE.xs} fill="currentColor" />
    </span>
  );
}
