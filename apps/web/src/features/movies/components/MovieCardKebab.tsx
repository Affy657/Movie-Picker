import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { ICON_SIZE } from '@/shared/components/iconSize';
import { MenuItem, MenuPanel, MenuSeparator } from '@/shared/components/Menu';
import { MENU_ANCHOR_GAP_PX, MENU_VIEWPORT_MARGIN_PX } from '@/shared/components/menuGeometry';

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
    <MenuItem
      href={href}
      external
      icon={<ExternalLink aria-hidden size={ICON_SIZE.sm} />}
      onClick={onClose}
    >
      {label}
    </MenuItem>
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
      spaceBelow >= menuRect.height + MENU_VIEWPORT_MARGIN_PX
        ? btnRect.bottom + MENU_ANCHOR_GAP_PX
        : Math.max(MENU_VIEWPORT_MARGIN_PX, btnRect.top - menuRect.height - MENU_ANCHOR_GAP_PX);
    const right = Math.min(
      Math.max(window.innerWidth - btnRect.right, MENU_VIEWPORT_MARGIN_PX),
      window.innerWidth - menuRect.width - MENU_VIEWPORT_MARGIN_PX
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

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + MENU_ANCHOR_GAP_PX,
        right: window.innerWidth - rect.right,
        ready: false,
      });
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

  const menuLabel = t('movies.list.moreActionsAria', { title });
  const pick = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div className={styles.kebab} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className={styles.kebabBtn}
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={menuLabel}
      >
        <MoreVertical aria-hidden size={ICON_SIZE.lg} />
      </button>
      {open &&
        createPortal(
          <MenuPanel
            ref={menuRef}
            ariaLabel={menuLabel}
            anchored={false}
            className={styles.kebabMenu}
            style={{
              top: `${menuPos.top}px`,
              right: `${menuPos.right}px`,
              visibility: menuPos.ready ? 'visible' : 'hidden',
            }}
          >
            {onToggleWatchlist && (
              <MenuItem
                icon={
                  inWatchlist ? (
                    <BookmarkCheck aria-hidden size={ICON_SIZE.sm} />
                  ) : (
                    <Bookmark aria-hidden size={ICON_SIZE.sm} />
                  )
                }
                onClick={pick(onToggleWatchlist)}
              >
                {inWatchlist ? t('watchlist.card.removeAction') : t('watchlist.card.addAction')}
              </MenuItem>
            )}
            {onProposeToEvent && (
              <MenuItem
                icon={<ListPlus aria-hidden size={ICON_SIZE.sm} />}
                onClick={pick(onProposeToEvent)}
              >
                {t('watchlist.card.proposeAction')}
              </MenuItem>
            )}
            {onViewDetails && (
              <MenuItem
                icon={<Info aria-hidden size={ICON_SIZE.sm} />}
                onClick={pick(onViewDetails)}
              >
                {t('watchlist.card.detailsAction')}
              </MenuItem>
            )}
            {wheelExclusion && (
              <MenuItem
                icon={
                  wheelExclusion.excluded ? (
                    <RotateCcw aria-hidden size={ICON_SIZE.sm} />
                  ) : (
                    <Disc3 aria-hidden size={ICON_SIZE.sm} />
                  )
                }
                onClick={pick(wheelExclusion.onToggle)}
              >
                {wheelExclusion.excluded
                  ? t('movies.list.includeInWheelAction')
                  : t('movies.list.excludeFromWheelAction')}
              </MenuItem>
            )}
            {hasPrimaryGroup && hasLinksGroup && <MenuSeparator />}
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
            {canRemove && (hasPrimaryGroup || hasLinksGroup) && <MenuSeparator />}
            {canRemove && (
              <MenuItem
                tone="danger"
                icon={<Trash2 aria-hidden size={ICON_SIZE.sm} />}
                onClick={pick(onRemove)}
                ariaLabel={removeAria}
                title={!isMine && isHost ? t('movies.list.removeAsHostTitle') : undefined}
              >
                {t('movies.list.removeButton')}
              </MenuItem>
            )}
          </MenuPanel>,
          document.body
        )}
    </div>
  );
}
