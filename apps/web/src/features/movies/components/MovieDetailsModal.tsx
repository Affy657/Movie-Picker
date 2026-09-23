import { useEffect, useId, useState, useRef } from 'react';
import clsx from 'clsx';
import { Bookmark, BookmarkCheck, Disc3, Film, ListPlus, RotateCcw, Trash2, X } from 'lucide-react';
import { Tabs, TabPanel } from '@/shared/components/Tabs';
import Chip from '@/shared/components/Chip';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { MovieMediaType, WatchProviderOffer } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { formatTmdbVote } from '@/shared/utils/formatTmdbVote';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { yearFromDate } from '@/shared/utils/formatReleaseDate';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import MovieExternalLinksRow from '@/features/movies/components/MovieExternalLinksRow';
import MovieDetailsEventTab, {
  type MovieDetailsEventContext,
} from '@/features/movies/components/MovieDetailsEventTab';
import { MovieDetailsContent } from '@/features/movies/components/MovieDetailsPanel';
import TrailerModal from '@/features/movies/components/TrailerModal';
import dragStyles from '@/shared/components/SheetDrag.module.css';
import Modal from '@/shared/components/Modal';
import styles from './MovieDetailsModal.module.css';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

export type MovieDetailsTabKey = 'event' | 'movie' | 'availability';
export type { MovieDetailsEventContext };

export interface MovieDetailsLibraryContext {
  inWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  onProposeToEvent?: () => void;
}

interface MovieDetailsModalProps {
  open: boolean;
  tmdbId: number;
  mediaType?: MovieMediaType;
  title?: string;
  year?: string;
  posterPath?: string | null;
  voteAverage?: number | null;
  runtimeMinutes?: number | null;
  ratingScale?: RatingScale;
  watchProviders?: WatchProviderOffer[];
  watchPageUrl?: string | null;
  initialTab?: MovieDetailsTabKey;
  eventContext?: MovieDetailsEventContext;
  libraryContext?: MovieDetailsLibraryContext;
  onClose: () => void;
}

function buildDetailsTabs(
  hasEventContext: boolean,
  isTv: boolean,
  providerCount: number,
  t: Translate
) {
  const eventTab = hasEventContext
    ? [{ key: 'event' as const, label: t('movies.details.tabEvent') }]
    : [];
  return [
    ...eventTab,
    {
      key: 'movie' as const,
      label: t(isTv ? 'movies.details.tabShow' : 'movies.details.tabMovie'),
    },
    {
      key: 'availability' as const,
      label: t('movies.details.tabAvailability'),
      badge: providerCount > 0 ? providerCount : undefined,
    },
  ];
}

function effectiveInitialTab(
  initialTab: MovieDetailsTabKey | undefined,
  hasEventContext: boolean
): MovieDetailsTabKey {
  if (initialTab === 'event' && !hasEventContext) return 'movie';
  if (initialTab) return initialTab;
  return hasEventContext ? 'event' : 'movie';
}

function wheelActionKey(eventContext: MovieDetailsModalProps['eventContext']) {
  return eventContext?.wheelExclusion?.excluded
    ? ('movies.list.includeInWheelAction' as const)
    : ('movies.list.excludeFromWheelAction' as const);
}

function removeAriaLabel(
  eventContext: MovieDetailsModalProps['eventContext'],
  title: string,
  t: Translate
) {
  if (eventContext?.isMine) return `${t('movies.list.removeButton')} ${title}`;
  return t('movies.list.removeAsHostAria', { title });
}

function hasEventFooterActions(eventContext: MovieDetailsModalProps['eventContext']) {
  if (!eventContext) return false;
  return (
    !!eventContext.onToggleWatchlist || !!eventContext.wheelExclusion || eventContext.canRemove
  );
}

function hasLibraryFooterActions(
  eventContext: MovieDetailsModalProps['eventContext'],
  libraryContext: MovieDetailsModalProps['libraryContext']
) {
  if (eventContext || !libraryContext) return false;
  return !!libraryContext.onToggleWatchlist || !!libraryContext.onProposeToEvent;
}

export default function MovieDetailsModal({
  open,
  tmdbId,
  mediaType,
  title: titleProp,
  year: yearProp,
  posterPath: posterPathProp,
  voteAverage: voteAverageProp,
  runtimeMinutes: runtimeMinutesProp,
  ratingScale: ratingScaleProp,
  watchProviders,
  watchPageUrl,
  initialTab,
  eventContext,
  libraryContext,
  onClose,
}: Readonly<MovieDetailsModalProps>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragBind = useSheetDrag(dialogRef, onClose, open);
  const titleId = useId();
  const idBase = useId();
  const filmPanelId = useId();
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [backdropLoaded, setBackdropLoaded] = useState(false);

  const startingTab = effectiveInitialTab(initialTab, !!eventContext);
  const [activeTab, setActiveTab] = useState<MovieDetailsTabKey>(startingTab);

  useEffect(() => {
    if (open) setActiveTab(startingTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTrailerUrl(null);
      setBackdropLoaded(false);
    }
  }, [open]);

  const detailsQuery = useMovieDetails(tmdbId, open, mediaType);
  const details = detailsQuery.data;
  const isTv = mediaType === 'tv';

  const title = titleProp ?? details?.title ?? '';
  const year = yearProp ?? yearFromDate(details?.releaseDate);
  const posterSrc = posterImageSrc(posterPathProp ?? details?.posterPath);
  const posterSrcSet = tmdbPosterSrcSetForList(posterSrc);
  const backdropSrc = details?.backdropPath ?? null;
  const genres = details?.genres ?? [];
  const voteLabel = formatTmdbVote(
    voteAverageProp ?? details?.voteAverage,
    ratingScaleProp ?? user?.ratingScale
  );
  const lengthLabel =
    isTv && details?.seasonCount
      ? pluralizeCount(
          details.seasonCount,
          'movies.details.seasonsOne',
          'movies.details.seasonsMany',
          t
        )
      : formatRuntimeMinutes(runtimeMinutesProp ?? details?.runtimeMinutes);
  const facts = [year, lengthLabel, voteLabel].filter((fact): fact is string => !!fact);

  const providers = watchProviders ?? details?.watchProviders ?? [];
  const resolvedWatchPageUrl =
    watchProviders === undefined ? (details?.tmdbWatchPageUrl ?? null) : watchPageUrl;
  const tabs = buildDetailsTabs(!!eventContext, isTv, providers.length, t);

  const wheelLabel = t(wheelActionKey(eventContext));
  const removeAria = removeAriaLabel(eventContext, title, t);
  const hasFooterActions = hasEventFooterActions(eventContext);
  const hasLibraryFooter = hasLibraryFooterActions(eventContext, libraryContext);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      surface="borderless"
      bottomSheetOnMobile
      column
      anchoredTop
      ariaLabelledBy={titleId}
      dialogRef={dialogRef}
      className={clsx(styles.dialog, dragStyles.surface)}
    >
      {open && (
        <>
          <div className={clsx(dragStyles.grab, styles.grab)} {...dragBind}>
            <span
              className={clsx(
                dragStyles.handle,
                dragStyles.handleMobileOnly,
                styles.handle,
                backdropSrc && styles.handleOnBackdrop
              )}
              aria-hidden="true"
            />
            <div className={clsx(styles.header, backdropSrc && styles.headerWithBackdrop)}>
              {backdropSrc ? (
                <div className={styles.backdrop} aria-hidden="true">
                  <img
                    src={backdropSrc}
                    alt=""
                    decoding="async"
                    className={clsx(styles.backdropImg, backdropLoaded && styles.backdropImgLoaded)}
                    onLoad={() => setBackdropLoaded(true)}
                  />
                </div>
              ) : null}
              <IconButton
                className={styles.close}
                tone={backdropSrc ? 'onPoster' : 'default'}
                ariaLabel={t('common.close')}
                onClick={onClose}
              >
                <X aria-hidden size={ICON_SIZE.lg} />
              </IconButton>
              <div className={styles.headerRow}>
                {posterSrc ? (
                  <img
                    src={posterSrc}
                    srcSet={posterSrcSet}
                    sizes="80px"
                    alt=""
                    className={styles.poster}
                  />
                ) : (
                  <div className={styles.posterPlaceholder} aria-hidden>
                    <Film size={ICON_SIZE.xl} />
                  </div>
                )}
                <div className={styles.headerInfo}>
                  <h2 id={titleId} className={styles.title}>
                    {title}
                  </h2>
                  {facts.length > 0 ? (
                    <p className={styles.facts}>
                      {facts.map((fact) => (
                        <span key={fact}>{fact}</span>
                      ))}
                    </p>
                  ) : null}
                  {genres.length > 0 ? (
                    <ul className={styles.genres} aria-label={t('movies.details.genresLabel')}>
                      {genres.map((genre) => (
                        <li key={genre}>
                          <Chip size="sm" tone="muted">
                            {genre}
                          </Chip>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tabsBar}>
            <Tabs
              idBase={idBase}
              tabs={tabs}
              active={activeTab}
              onChange={setActiveTab}
              ariaLabel={t('movies.details.tabsAria', { title })}
            />
          </div>

          <div className={styles.body}>
            {eventContext && (
              <TabPanel idBase={idBase} tabKey="event" active={activeTab === 'event'}>
                <MovieDetailsEventTab movie={eventContext.movie} context={eventContext} t={t} />
              </TabPanel>
            )}

            <TabPanel idBase={idBase} tabKey="movie" active={activeTab === 'movie'}>
              <MovieDetailsContent
                query={detailsQuery}
                mediaType={mediaType}
                panelId={filmPanelId}
                onPlayTrailer={(url) => setTrailerUrl(url)}
              />
              {tmdbId > 0 && (
                <MovieExternalLinksRow
                  tmdbId={tmdbId}
                  mediaType={mediaType}
                  title={title}
                  year={year}
                />
              )}
            </TabPanel>

            <TabPanel idBase={idBase} tabKey="availability" active={activeTab === 'availability'}>
              {providers.length > 0 ? (
                <WatchProviderChips
                  providers={providers}
                  watchPageUrl={resolvedWatchPageUrl}
                  separators
                  labelStyle="text"
                />
              ) : (
                <p className={styles.availabilityEmpty}>{t('movies.watchProviders.emptyLabel')}</p>
              )}
            </TabPanel>
          </div>

          {hasFooterActions && eventContext && (
            <div className={styles.footer}>
              {eventContext.onToggleWatchlist && (
                <Button size="sm" onClick={eventContext.onToggleWatchlist}>
                  {eventContext.isInWatchlist ? (
                    <BookmarkCheck aria-hidden size={ICON_SIZE.md} />
                  ) : (
                    <Bookmark aria-hidden size={ICON_SIZE.md} />
                  )}
                  <span className={styles.footerBtnLabel}>
                    {eventContext.isInWatchlist
                      ? t('watchlist.card.removeAction')
                      : t('watchlist.card.addAction')}
                  </span>
                </Button>
              )}
              {eventContext.wheelExclusion && (
                <Button size="sm" onClick={eventContext.wheelExclusion.onToggle}>
                  {eventContext.wheelExclusion.excluded ? (
                    <RotateCcw aria-hidden size={ICON_SIZE.md} />
                  ) : (
                    <Disc3 aria-hidden size={ICON_SIZE.md} />
                  )}
                  <span className={styles.footerBtnLabel}>{wheelLabel}</span>
                </Button>
              )}
              {eventContext.canRemove && (
                <Button
                  size="sm"
                  tone="danger"
                  className={styles.footerBtnDanger}
                  onClick={eventContext.onRemove}
                  aria-label={removeAria}
                  title={
                    !eventContext.isMine && eventContext.isHost
                      ? t('movies.list.removeAsHostTitle')
                      : undefined
                  }
                >
                  <Trash2 aria-hidden size={ICON_SIZE.md} />
                  <span className={styles.footerBtnLabel}>{t('movies.list.removeButton')}</span>
                </Button>
              )}
            </div>
          )}

          {hasLibraryFooter && libraryContext && (
            <div className={styles.footer}>
              {libraryContext.onToggleWatchlist && (
                <Button size="sm" onClick={libraryContext.onToggleWatchlist}>
                  {libraryContext.inWatchlist ? (
                    <BookmarkCheck aria-hidden size={ICON_SIZE.md} />
                  ) : (
                    <Bookmark aria-hidden size={ICON_SIZE.md} />
                  )}
                  <span className={styles.footerBtnLabel}>
                    {libraryContext.inWatchlist
                      ? t('watchlist.card.removeAction')
                      : t('watchlist.card.addAction')}
                  </span>
                </Button>
              )}
              {libraryContext.onProposeToEvent && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    libraryContext.onProposeToEvent?.();
                  }}
                >
                  <ListPlus aria-hidden size={ICON_SIZE.md} />
                  <span className={styles.footerBtnLabel}>{t('watchlist.card.proposeAction')}</span>
                </Button>
              )}
            </div>
          )}

          <p className={styles.attribution}>{t('movies.details.regionAttribution')}</p>

          <TrailerModal
            open={trailerUrl != null}
            movieTitle={title}
            trailerUrl={trailerUrl}
            onClose={() => setTrailerUrl(null)}
          />
        </>
      )}
    </Modal>
  );
}
