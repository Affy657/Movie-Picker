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

  const defaultTab: MovieDetailsTabKey = eventContext ? 'soiree' : 'film';
  const resolvedInitialTab = initialTab === 'soiree' && !eventContext ? 'film' : initialTab;
  const [activeTab, setActiveTab] = useState<MovieDetailsTabKey>(resolvedInitialTab ?? defaultTab);

  useEffect(() => {
    if (open) setActiveTab(resolvedInitialTab ?? defaultTab);
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
  const tabs = [
    ...(eventContext ? [{ key: 'soiree' as const, label: t('movies.details.tabSoiree') }] : []),
    { key: 'film' as const, label: t('movies.details.tabFilm') },
    {
      key: 'dispo' as const,
      label: t('movies.details.tabDispo'),
      badge: providers.length > 0 ? providers.length : undefined,
    },
  ];

  const wheelLabel = eventContext?.wheelExclusion?.excluded
    ? t('movies.list.includeInWheelAction')
    : t('movies.list.excludeFromWheelAction');
  const removeAria = eventContext?.isMine
    ? `${t('movies.list.removeButton')} ${title}`
    : t('movies.list.removeAsHostAria', { title });
  const hasFooterActions =
    !!eventContext &&
    (!!eventContext.onToggleWatchlist || !!eventContext.wheelExclusion || eventContext.canRemove);

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
