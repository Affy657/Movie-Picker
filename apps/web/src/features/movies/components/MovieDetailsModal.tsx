import { useEffect, useId, useState, useRef } from 'react';
import clsx from 'clsx';
import { Bookmark, BookmarkCheck, Disc3, Film, RotateCcw, Trash2, X } from 'lucide-react';
import { Tabs, TabPanel } from '@/shared/components/Tabs';
import { useSheetDrag } from '@/shared/hooks/useSheetDrag';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import { useTranslation } from '@/shared/i18n';
import type { MovieMediaType, WatchProviderOffer } from '@/shared/types/movie';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import MovieExternalLinksRow from '@/features/movies/components/MovieExternalLinksRow';
import MovieDetailsEventTab, {
  type MovieDetailsEventContext,
} from '@/features/movies/components/MovieDetailsEventTab';
import { MovieDetailsContent } from '@/features/movies/components/MovieDetailsPanel';
import TrailerModal from '@/features/movies/components/TrailerModal';
import dragStyles from '@/shared/components/sheetDrag.module.css';
import Modal from '@/shared/components/Modal';
import styles from './MovieDetailsModal.module.css';
import IconButton from '@/shared/components/IconButton';

export type MovieDetailsTabKey = 'soiree' | 'film' | 'dispo';
export type { MovieDetailsEventContext };

interface MovieDetailsModalProps {
  open: boolean;
  title: string;
  year?: string;
  tmdbId: number;
  mediaType?: MovieMediaType;
  posterSrc?: string | null;
  voteLabel?: string | null;
  runtimeLabel?: string | null;
  watchProviders?: WatchProviderOffer[];
  watchPageUrl?: string | null;
  initialTab?: MovieDetailsTabKey;
  eventContext?: MovieDetailsEventContext;
  onClose: () => void;
}

function buildDetailsTabs(
  hasEventContext: boolean,
  providerCount: number,
  t: ReturnType<typeof useTranslation>['t']
) {
  const eventTab = hasEventContext
    ? [{ key: 'soiree' as const, label: t('movies.details.tabSoiree') }]
    : [];
  return [
    ...eventTab,
    { key: 'film' as const, label: t('movies.details.tabFilm') },
    {
      key: 'dispo' as const,
      label: t('movies.details.tabDispo'),
      badge: providerCount > 0 ? providerCount : undefined,
    },
  ];
}

function effectiveInitialTab(
  initialTab: MovieDetailsTabKey | undefined,
  hasEventContext: boolean
): MovieDetailsTabKey {
  if (initialTab === 'soiree' && !hasEventContext) return 'film';
  if (initialTab) return initialTab;
  return hasEventContext ? 'soiree' : 'film';
}

function wheelActionKey(eventContext: MovieDetailsModalProps['eventContext']) {
  return eventContext?.wheelExclusion?.excluded
    ? ('movies.list.includeInWheelAction' as const)
    : ('movies.list.excludeFromWheelAction' as const);
}

function removeAriaLabel(
  eventContext: MovieDetailsModalProps['eventContext'],
  title: string,
  t: ReturnType<typeof useTranslation>['t']
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

export default function MovieDetailsModal({
  open,
  title,
  year,
  tmdbId,
  mediaType,
  posterSrc,
  voteLabel,
  runtimeLabel,
  watchProviders,
  watchPageUrl,
  initialTab,
  eventContext,
  onClose,
}: Readonly<MovieDetailsModalProps>) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragBind = useSheetDrag(dialogRef, onClose, open);
  const titleId = useId();
  const idBase = useId();
  const filmPanelId = useId();
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);

  const startingTab = effectiveInitialTab(initialTab, !!eventContext);
  const [activeTab, setActiveTab] = useState<MovieDetailsTabKey>(startingTab);

  useEffect(() => {
    if (open) setActiveTab(startingTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) setTrailerUrl(null);
  }, [open]);

  const needsProviderFetch = watchProviders === undefined;
  const providerDetailsQuery = useMovieDetails(tmdbId, open && needsProviderFetch, mediaType);
  const providers = watchProviders ?? providerDetailsQuery.data?.watchProviders ?? [];
  const resolvedWatchPageUrl = needsProviderFetch
    ? (providerDetailsQuery.data?.tmdbWatchPageUrl ?? null)
    : watchPageUrl;
  const tabs = buildDetailsTabs(!!eventContext, providers.length, t);

  const wheelLabel = t(wheelActionKey(eventContext));
  const removeAria = removeAriaLabel(eventContext, title, t);
  const hasFooterActions = hasEventFooterActions(eventContext);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      surface="borderless"
      bottomSheetOnMobile
      column
      anchoredTop
      labelledBy={titleId}
      dialogRef={dialogRef}
      className={clsx(styles.dialog, dragStyles.surface)}
    >
      {open && (
        <>
          <div className={dragStyles.grab} {...dragBind}>
            <span
              className={clsx(dragStyles.handle, dragStyles.handleMobileOnly)}
              aria-hidden="true"
            />
            <div className={styles.header}>
              {posterSrc ? (
                <img src={posterSrc} alt="" className={styles.poster} />
              ) : (
                <div className={styles.posterPlaceholder} aria-hidden>
                  <Film size={18} />
                </div>
              )}
              <div className={styles.headerInfo}>
                <h2 id={titleId} className={styles.title}>
                  {title}
                </h2>
                <p className={styles.facts}>
                  {year ? <span>{year}</span> : null}
                  {runtimeLabel ? <span>{runtimeLabel}</span> : null}
                  {voteLabel ? <span>{voteLabel}</span> : null}
                </p>
              </div>
              <IconButton label={t('common.close')} onClick={onClose}>
                <X aria-hidden size={18} />
              </IconButton>
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
              <TabPanel idBase={idBase} tabKey="soiree" active={activeTab === 'soiree'}>
                <MovieDetailsEventTab movie={eventContext.movie} context={eventContext} t={t} />
              </TabPanel>
            )}

            <TabPanel idBase={idBase} tabKey="film" active={activeTab === 'film'}>
              <MovieDetailsContent
                tmdbId={tmdbId}
                mediaType={mediaType}
                open={activeTab === 'film'}
                panelId={filmPanelId}
                className={styles.details}
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

            <TabPanel idBase={idBase} tabKey="dispo" active={activeTab === 'dispo'}>
              {providers.length > 0 ? (
                <WatchProviderChips
                  providers={providers}
                  watchPageUrl={resolvedWatchPageUrl}
                  separators
                />
              ) : (
                <p className={styles.dispoEmpty}>{t('movies.watchProviders.emptyLabel')}</p>
              )}
            </TabPanel>
          </div>

          {hasFooterActions && eventContext && (
            <div className={styles.footer}>
              {eventContext.onToggleWatchlist && (
                <button
                  type="button"
                  className={styles.footerBtn}
                  onClick={eventContext.onToggleWatchlist}
                >
                  {eventContext.isInWatchlist ? (
                    <BookmarkCheck aria-hidden size={15} />
                  ) : (
                    <Bookmark aria-hidden size={15} />
                  )}
                  <span className={styles.footerBtnLabel}>
                    {eventContext.isInWatchlist
                      ? t('watchlist.card.removeAction')
                      : t('watchlist.card.addAction')}
                  </span>
                </button>
              )}
              {eventContext.wheelExclusion && (
                <button
                  type="button"
                  className={styles.footerBtn}
                  onClick={eventContext.wheelExclusion.onToggle}
                >
                  {eventContext.wheelExclusion.excluded ? (
                    <RotateCcw aria-hidden size={15} />
                  ) : (
                    <Disc3 aria-hidden size={15} />
                  )}
                  <span className={styles.footerBtnLabel}>{wheelLabel}</span>
                </button>
              )}
              {eventContext.canRemove && (
                <button
                  type="button"
                  className={clsx(styles.footerBtn, styles.footerBtnDanger)}
                  onClick={eventContext.onRemove}
                  aria-label={removeAria}
                  title={
                    !eventContext.isMine && eventContext.isHost
                      ? t('movies.list.removeAsHostTitle')
                      : undefined
                  }
                >
                  <Trash2 aria-hidden size={15} />
                  <span className={styles.footerBtnLabel}>{t('movies.list.removeButton')}</span>
                </button>
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
