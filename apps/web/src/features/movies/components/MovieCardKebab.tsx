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
import { letterboxdUrl } from '@/features/movies/utils/movieExternalLinks';
import type { MovieData } from '@/shared/types/movie';
import type { MovieWheelExclusion, Translate } from '@/features/movies/types';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import styles from './MovieCardKebab.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { MenuItem, MenuPanel, MenuSeparator } from '@/shared/components/Menu';
import { MENU_ANCHOR_GAP_PX, MENU_VIEWPORT_MARGIN_PX } from '@/shared/components/menuGeometry';

export interface CardKebabProps {
  title: string;
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
  wheelExclusion?: MovieWheelExclusion;
  t: Translate;
}

export function kebabHasActions({
  tmdbId,
  canRemove,
  onToggleWatchlist,
  onProposeToEvent,
  onViewDetails,
  wheelExclusion,
}: Readonly<
  Pick<
    CardKebabProps,
    | 'tmdbId'
    | 'canRemove'
    | 'onToggleWatchlist'
    | 'onProposeToEvent'
    | 'onViewDetails'
    | 'wheelExclusion'
  >
>): boolean {
  return (
    !!onToggleWatchlist ||
    !!onProposeToEvent ||
    (!!onViewDetails && tmdbId > 0) ||
    !!wheelExclusion ||
    canRemove
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
  const hasHover = useHasHoverCapability();
  const { excluded, toggleWatchlist, toggleExclusion } = deriveWheelToggle(
    movie,
    onToggleWatchlist,
    onToggleWheelExclusion
  );
  const wheelExclusion = toggleExclusion ? { excluded, onToggle: toggleExclusion } : undefined;
  const onViewDetails = card.hasDetails ? () => card.openDetails('soiree') : undefined;
  if (
    !kebabHasActions({
      tmdbId: movie.tmdbId,
      canRemove: card.canRemove,
      onToggleWatchlist: toggleWatchlist,
      onViewDetails,
      wheelExclusion,
    })
  )
    return null;
  if (!hasHover && card.hasDetails) return null;
  return (
    <div className={slotClassName}>
      <CardKebab
        title={movie.title}
        tmdbId={movie.tmdbId}
        mediaType={movie.mediaType}
        isMine={card.isMine}
        isHost={isHost}
        canRemove={card.canRemove}
        onRemove={() => onRemove(movie)}
        inWatchlist={isInWatchlist}
        onToggleWatchlist={toggleWatchlist}
        onViewDetails={onViewDetails}
        wheelExclusion={wheelExclusion}
        t={t}
      />
    </div>
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

  const showDetails = !!onViewDetails && tmdbId > 0;
  const hasPrimaryGroup =
    !!onToggleWatchlist || !!onProposeToEvent || showDetails || !!wheelExclusion;
  const hasLinksGroup = tmdbId > 0;

  if (
    !kebabHasActions({
      tmdbId,
      canRemove,
      onToggleWatchlist,
      onProposeToEvent,
      onViewDetails,
      wheelExclusion,
    })
  )
    return null;

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

  const menuLabel = t('movies.list.moreActionsAria', { title });
  const pick = (action: () => void) => () => {
    setOpen(false);
    btnRef.current?.focus();
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
            {showDetails && onViewDetails && (
              <MenuItem
                icon={<Info aria-hidden size={ICON_SIZE.sm} />}
                onClick={pick(onViewDetails)}
              >
                {t('watchlist.card.detailsAction')}
              </MenuItem>
            )}
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
              <ExternalMenuLink
                href={lbUrl}
                label={t('movies.list.letterboxdButton')}
                onClose={close}
              />
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
