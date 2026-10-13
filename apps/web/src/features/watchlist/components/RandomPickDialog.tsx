import { useState } from 'react';
import clsx from 'clsx';
import { CalendarPlus, Clock, Dices, Film, Star } from 'lucide-react';
import Button from '@/shared/components/Button';
import LinkButton from '@/shared/components/LinkButton';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { randomIndex } from '@/shared/utils/random';
import type { WatchlistEntry } from '@/features/watchlist/hooks/useWatchlistToolbar';
import { useRandomPick } from '@/features/watchlist/hooks/useRandomPick';
import type { PickIndex } from '@/features/watchlist/utils/randomPick';
import { watchlistItemKey } from '@/features/movies/utils/watchlistItemKey';
import styles from './RandomPickDialog.module.css';

export type RandomPickScope = 'list' | 'selection';

interface RandomPickDialogProps {
  items: readonly WatchlistEntry[];
  scope: RandomPickScope;
  ratingScale?: RatingScale;
  onClose: () => void;
  onPropose: (item: WatchlistEntry) => void;
  onOpenDetails: (item: WatchlistEntry) => void;
  pickIndex?: PickIndex;
}

const POOL_KEYS = {
  list: ['watchlist.randomPick.poolListOne', 'watchlist.randomPick.poolList'],
  selection: ['watchlist.randomPick.poolSelectionOne', 'watchlist.randomPick.poolSelection'],
} as const;

function posterSrc(item: WatchlistEntry | undefined): string | undefined {
  return tmdbPosterSrcForListDisplay(posterImageSrc(item?.posterPath));
}

function DrawnPoster({ item }: Readonly<{ item: WatchlistEntry | undefined }>) {
  const src = posterSrc(item);
  if (!src) {
    return (
      <span className={styles.posterPlaceholder}>
        <Film size={ICON_SIZE['2xl']} />
      </span>
    );
  }
  return <img src={src} alt="" className={styles.poster} decoding="async" />;
}

function DrawnFacts({
  item,
  ratingScale,
  onOpenDetails,
}: Readonly<{
  item: WatchlistEntry;
  ratingScale?: RatingScale;
  onOpenDetails: (item: WatchlistEntry) => void;
}>) {
  const { t } = useTranslation();
  const vote = formatTmdbVote(item.voteAverage, ratingScale);
  const runtime = formatRuntimeMinutes(item.runtimeMinutes);
  return (
    <>
      <h3 className={styles.title}>{item.title}</h3>
      <p className={styles.meta}>
        {item.year ? <span>{item.year}</span> : null}
        {vote ? (
          <span>
            <Star size={ICON_SIZE.sm} aria-hidden />
            {vote}
          </span>
        ) : null}
        {runtime ? (
          <span>
            <Clock size={ICON_SIZE.sm} aria-hidden />
            {runtime}
          </span>
        ) : null}
      </p>
      <LinkButton className={styles.details} onClick={() => onOpenDetails(item)}>
        {t('watchlist.card.detailsAction')}
      </LinkButton>
    </>
  );
}

function PickActions({
  shuffling,
  stacked,
  canDrawAgain,
  onDrawAgain,
  onPropose,
}: Readonly<{
  shuffling: boolean;
  stacked: boolean;
  canDrawAgain: boolean;
  onDrawAgain: () => void;
  onPropose: () => void;
}>) {
  const { t } = useTranslation();
  const inactive = shuffling || undefined;
  return (
    <div className={clsx(styles.actions, stacked && styles.actionsStacked)}>
      {canDrawAgain ? (
        <Button aria-disabled={inactive} onClick={onDrawAgain}>
          <Dices size={ICON_SIZE.md} aria-hidden />
          {t('watchlist.randomPick.again')}
        </Button>
      ) : null}
      <Button variant="primary" aria-disabled={inactive} onClick={onPropose}>
        <CalendarPlus size={ICON_SIZE.md} aria-hidden />
        {t('watchlist.card.proposeAction')}
      </Button>
    </div>
  );
}

export default function RandomPickDialog({
  items,
  scope,
  ratingScale,
  onClose,
  onPropose,
  onOpenDetails,
  pickIndex = randomIndex,
}: Readonly<RandomPickDialogProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [{ pool, keys }] = useState(() => {
    const byKey = new Map(
      items.map((item) => [watchlistItemKey(item.tmdbId, item.mediaType), item])
    );
    return { pool: byKey, keys: [...byKey.keys()] };
  });
  const { current, shown, shuffling, canDrawAgain, drawAgain } = useRandomPick(keys, pickIndex);
  const drawn = current === null ? undefined : pool.get(current);
  if (!drawn) return null;

  const shownItem = shown === null ? undefined : pool.get(shown);
  const preload = shuffling ? posterSrc(drawn) : undefined;
  const [oneKey, manyKey] = POOL_KEYS[scope];
  const title = t('watchlist.randomPick.title');

  const body = (
    <div className={styles.body}>
      <p className={styles.pool}>{pluralizeCount(pool.size, oneKey, manyKey, t)}</p>
      <div className={styles.draw}>
        <div
          className={clsx(styles.slot, isMobile && styles.slotFitted, !shuffling && styles.landed)}
          aria-hidden
        >
          <DrawnPoster item={shownItem} />
        </div>
        {preload ? <img src={preload} alt="" hidden /> : null}
        {shuffling ? (
          <>
            <Skeleton variant="block" className={styles.skeletonTitle} />
            <Skeleton variant="block" className={styles.skeletonMeta} />
          </>
        ) : (
          <DrawnFacts item={drawn} ratingScale={ratingScale} onOpenDetails={onOpenDetails} />
        )}
        <p className="visually-hidden" aria-live="polite">
          {shuffling ? '' : t('watchlist.randomPick.announce', { title: drawn.title })}
        </p>
      </div>
    </div>
  );

  const actions = (
    <PickActions
      shuffling={shuffling}
      stacked={isMobile}
      canDrawAgain={canDrawAgain}
      onDrawAgain={drawAgain}
      onPropose={() => onPropose(drawn)}
    />
  );

  return (
    <ResponsiveDialog open title={title} onClose={onClose} footer={actions}>
      {body}
    </ResponsiveDialog>
  );
}
