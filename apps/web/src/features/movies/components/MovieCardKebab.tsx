import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import {
  Bookmark,
  BookmarkCheck,
  Disc3,
  ExternalLink,
  Info,
  ListPlus,
  MoreVertical,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { MovieDetailsTabKey } from '@/features/movies/components/MovieDetailsModal';
import {
  allocineUrl,
  imdbUrl,
  letterboxdUrl,
  tmdbPageUrl,
} from '@/features/movies/utils/movieExternalLinks';
import type { MovieData } from '@/shared/types/movie';
import type { MovieWheelExclusion, Translate } from '@/features/movies/types';
import styles from './MovieCardKebab.module.css';

export type ExternalLinksMode = 'all' | 'letterboxd';

interface CardKebabProps {
  title: string;
  year?: string;
  tmdbId: number;
  mediaType?: 'movie' | 'tv';
  isMine: boolean;
  isHost: boolean;
  canRemove: boolean;
  onRemove: () => void;
  inWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  onProposeToEvent?: () => void;
  onViewDetails?: () => void;
  externalLinks?: ExternalLinksMode;
  wheelExclusion?: MovieWheelExclusion;
  t: Translate;
}

export function CardKebabWhenAvailable({
  slotClassName,
  canRemove,
  onToggleWatchlist,
  onToggleWheelExclusion,
  ...kebabProps
}: Readonly<
  CardKebabProps & {
    slotClassName: string;
    onToggleWatchlist?: () => void;
    onToggleWheelExclusion?: () => void;
  }
>) {
  if (!canRemove && !onToggleWatchlist && !onToggleWheelExclusion && !kebabProps.onViewDetails)
    return null;
  return (
    <div className={slotClassName}>
      <CardKebab
        {...kebabProps}
        canRemove={canRemove}
        onToggleWatchlist={onToggleWatchlist}
        wheelExclusion={kebabProps.wheelExclusion}
      />
    </div>
  );
}

export function deriveWheelToggle(
  movie: MovieData,
  onToggleWatchlist?: (movie: MovieData) => void,
  onToggleWheelExclusion?: (movie: MovieData) => void
) {
  const excluded = !!movie.excludedFromWheel;
  const toggleWatchlist = onToggleWatchlist ? () => onToggleWatchlist(movie) : undefined;
  const toggleExclusion = onToggleWheelExclusion ? () => onToggleWheelExclusion(movie) : undefined;
  return { excluded, toggleWatchlist, toggleExclusion };
}

export function MovieCardKebab({
  movie,
  card,
  slotClassName,
  isHost,
  isInWatchlist,
  onRemove,
  onToggleWatchlist,
  onToggleWheelExclusion,
  t,
}: Readonly<{
  movie: MovieData;
  card: {
    isMine: boolean;
    canRemove: boolean;
    hasDetails: boolean;
    openDetails: (tab?: MovieDetailsTabKey) => void;
  };
  slotClassName: string;
  isHost: boolean;
  isInWatchlist?: boolean;
  onRemove: (movie: MovieData) => void;
  onToggleWatchlist?: (movie: MovieData) => void;
  onToggleWheelExclusion?: (movie: MovieData) => void;
  t: Translate;
}>) {
  const { excluded, toggleWatchlist, toggleExclusion } = deriveWheelToggle(
    movie,
    onToggleWatchlist,
    onToggleWheelExclusion
  );
  return (
    <CardKebabWhenAvailable
      slotClassName={slotClassName}
      title={movie.title}
      year={movie.year}
      tmdbId={movie.tmdbId}
      mediaType={movie.mediaType}
      externalLinks="letterboxd"
      isMine={card.isMine}
      isHost={isHost}
      canRemove={card.canRemove}
      onRemove={() => onRemove(movie)}
      inWatchlist={isInWatchlist}
      onToggleWatchlist={toggleWatchlist}
      onToggleWheelExclusion={toggleExclusion}
      onViewDetails={card.hasDetails ? () => card.openDetails('soiree') : undefined}
      wheelExclusion={toggleExclusion ? { excluded, onToggle: toggleExclusion } : undefined}
      t={t}
    />
  );
}

const DESCENDER_CHARS = /[gjpqy]/;
const KEBAB_MENU_VIEWPORT_MARGIN = 8;

function kebabLabelClassName(label: string): string | undefined {
  return DESCENDER_CHARS.test(label)
    ? styles.kebabItemLabel
    : clsx(styles.kebabItemLabel, styles.kebabItemLabelCaps);
}

function ExternalMenuLink({
  href,
  label,
  onClose,
}: Readonly<{
  href: string;
  label: string;
  onClose: () => void;
}>) {
  return (
    <a
      role="menuitem"
      className={styles.kebabItem}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClose}
      aria-label={label}
    >
      <ExternalLink aria-hidden size={14} />
      <span className={kebabLabelClassName(label)}>{label}</span>
    </a>
  );
}

export function CardKebab({
  title,
  year,
  tmdbId,
  mediaType,
  isMine,
  isHost,
  canRemove,
  onRemove,
  inWatchlist,
  onToggleWatchlist,
  onProposeToEvent,
  onViewDetails,
  externalLinks = 'all',
  wheelExclusion,
  t,
}: Readonly<CardKebabProps>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number; ready: boolean }>({
    top: 0,
    right: 0,
    ready: false,
  });
  const close = useCallback(() => setOpen(false), []);

  const repositionMenu = useCallback(() => {
    if (!btnRef.current || !menuRef.current) return;
    const btnRect = btnRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - btnRect.bottom;
    const top =
      spaceBelow >= menuRect.height + KEBAB_MENU_VIEWPORT_MARGIN
        ? btnRect.bottom + 4
        : Math.max(KEBAB_MENU_VIEWPORT_MARGIN, btnRect.top - menuRect.height - 4);
    const right = Math.min(
      Math.max(window.innerWidth - btnRect.right, KEBAB_MENU_VIEWPORT_MARGIN),
      window.innerWidth - menuRect.width - KEBAB_MENU_VIEWPORT_MARGIN
    );
    setMenuPos({ top, right, ready: true });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    repositionMenu();
  }, [open, repositionMenu]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', repositionMenu, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', repositionMenu, true);
    };
  }, [open, close, repositionMenu]);

  useEffect(() => {
    if (!open || !menuPos.ready) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();
  }, [open, menuPos.ready]);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    );
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowDown') nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    else if (e.key === 'ArrowUp')
      nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = items.length - 1;
    items[nextIndex]?.focus();
  };

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right, ready: false });
    }
    setOpen((v) => !v);
  };

  const removeAria = isMine
    ? `${t('movies.list.removeButton')} ${title}`
    : t('movies.list.removeAsHostAria', { title });

  const lbUrl = letterboxdUrl(tmdbId, mediaType, title);
  const imdbHref = imdbUrl(title, year);
  const allocineHref = allocineUrl(title);
  const tmdbHref = tmdbPageUrl(tmdbId, mediaType);

  const hasPrimaryGroup =
    !!onToggleWatchlist || !!onProposeToEvent || !!onViewDetails || !!wheelExclusion;
  const hasLinksGroup = tmdbId > 0;
  const showAllExternalLinks = externalLinks === 'all';

  const watchlistLabel = inWatchlist
    ? t('watchlist.card.removeAction')
    : t('watchlist.card.addAction');
  const proposeLabel = t('watchlist.card.proposeAction');
  const detailsLabel = t('watchlist.card.detailsAction');
  const wheelLabel = wheelExclusion?.excluded
    ? t('movies.list.includeInWheelAction')
    : t('movies.list.excludeFromWheelAction');
  const removeLabel = t('movies.list.removeButton');

  return (
    <div className={styles.kebab} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className={styles.kebabBtn}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('movies.list.moreActionsAria', { title })}
      >
        <MoreVertical aria-hidden size={18} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.kebabMenu}
            role="menu"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              right: `${menuPos.right}px`,
              zIndex: 9999,
              visibility: menuPos.ready ? 'visible' : 'hidden',
            }}
          >
            {onToggleWatchlist && (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabItem}
                onClick={() => {
                  setOpen(false);
                  onToggleWatchlist();
                }}
              >
                {inWatchlist ? (
                  <BookmarkCheck aria-hidden size={14} />
                ) : (
                  <Bookmark aria-hidden size={14} />
                )}
                <span className={kebabLabelClassName(watchlistLabel)}>{watchlistLabel}</span>
              </button>
            )}
            {onProposeToEvent && (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabItem}
                onClick={() => {
                  setOpen(false);
                  onProposeToEvent();
                }}
              >
                <ListPlus aria-hidden size={14} />
                <span className={kebabLabelClassName(proposeLabel)}>{proposeLabel}</span>
              </button>
            )}
            {onViewDetails && (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabItem}
                onClick={() => {
                  setOpen(false);
                  onViewDetails();
                }}
              >
                <Info aria-hidden size={14} />
                <span className={kebabLabelClassName(detailsLabel)}>{detailsLabel}</span>
              </button>
            )}
            {wheelExclusion && (
              <button
                type="button"
                role="menuitem"
                className={styles.kebabItem}
                onClick={() => {
                  setOpen(false);
                  wheelExclusion.onToggle();
                }}
              >
                {wheelExclusion.excluded ? (
                  <RotateCcw aria-hidden size={14} />
                ) : (
                  <Disc3 aria-hidden size={14} />
                )}
                <span className={kebabLabelClassName(wheelLabel)}>{wheelLabel}</span>
              </button>
            )}
            {hasPrimaryGroup && hasLinksGroup && <hr className={styles.kebabDivider} />}
            {hasLinksGroup && (
              <>
                <ExternalMenuLink
                  href={lbUrl}
                  label={t('movies.list.letterboxdButton')}
                  onClose={close}
                />
                {showAllExternalLinks ? (
                  <>
                    <ExternalMenuLink
                      href={imdbHref}
                      label={t('movies.list.imdbButton')}
                      onClose={close}
                    />
                    <ExternalMenuLink
                      href={allocineHref}
                      label={t('movies.list.allocineButton')}
                      onClose={close}
                    />
                    <ExternalMenuLink
                      href={tmdbHref}
                      label={t('movies.list.tmdbButton')}
                      onClose={close}
                    />
                  </>
                ) : null}
              </>
            )}
            {canRemove && (hasPrimaryGroup || hasLinksGroup) && (
              <hr className={styles.kebabDivider} />
            )}
            {canRemove && (
              <button
                type="button"
                role="menuitem"
                className={clsx(styles.kebabItem, styles.kebabItemDanger)}
                onClick={() => {
                  setOpen(false);
                  onRemove();
                }}
                aria-label={removeAria}
                title={!isMine && isHost ? t('movies.list.removeAsHostTitle') : undefined}
              >
                <Trash2 aria-hidden size={14} />
                <span className={kebabLabelClassName(removeLabel)}>{removeLabel}</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
