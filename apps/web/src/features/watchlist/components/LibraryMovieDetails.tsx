import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import LazyMovieDetailsModal from '@/features/movies/components/LazyMovieDetailsModal';
import type { MovieDetailsTabKey } from '@/features/movies/components/MovieDetailsModal';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import {
  useMovieDetailsParam,
  type MovieDetailsTarget,
} from '@/features/movies/hooks/useMovieDetailsParam';
import {
  useWatchlistToggle,
  type WatchlistToggleItem,
} from '@/features/watchlist/hooks/useWatchlistToggle';
import type { WatchProviderOffer } from '@/shared/types/movie';
import { yearFromDate } from '@/shared/utils/formatReleaseDate';

export interface LibraryMovieSeed extends WatchlistToggleItem {
  watchProviders?: WatchProviderOffer[];
  tmdbWatchPageUrl?: string | null;
}

interface OpenedDetails {
  seed: LibraryMovieSeed;
  tab?: MovieDetailsTabKey;
}

function sameMovie(a: MovieDetailsTarget, b: MovieDetailsTarget): boolean {
  return a.tmdbId === b.tmdbId && a.mediaType === b.mediaType;
}

export function useLibraryMovieDetails() {
  const { target, open: openParam, close } = useMovieDetailsParam();
  const [opened, setOpened] = useState<OpenedDetails | null>(null);

  const open = useCallback(
    (seed: LibraryMovieSeed, tab?: MovieDetailsTabKey) => {
      setOpened({ seed, tab });
      openParam(seed.tmdbId, seed.mediaType);
    },
    [openParam]
  );

  const current = opened && target && sameMovie(opened.seed, target) ? opened : null;
  return {
    target,
    seed: current?.seed ?? null,
    initialTab: current?.tab,
    open,
    close,
  };
}

interface LibraryMovieDetailsProps {
  target: MovieDetailsTarget | null;
  seed: LibraryMovieSeed | null;
  initialTab?: MovieDetailsTabKey;
  watchlist: ReturnType<typeof useWatchlistToggle>;
  onPropose: (item: LibraryMovieSeed) => void;
  onClose: () => void;
}

export default function LibraryMovieDetails({
  target,
  seed,
  initialTab,
  watchlist,
  onPropose,
  onClose,
}: Readonly<LibraryMovieDetailsProps>) {
  const { user } = useAuth();
  const [closing, setClosing] = useState(false);
  useEffect(() => setClosing(false), [target]);
  const detailsQuery = useMovieDetails(target?.tmdbId, !!target && !seed, target?.mediaType);
  const fetched = detailsQuery.data;
  const item: LibraryMovieSeed | null =
    seed ??
    (target && fetched
      ? {
          tmdbId: target.tmdbId,
          mediaType: target.mediaType,
          title: fetched.title,
          year: yearFromDate(fetched.releaseDate) ?? '',
          posterPath: fetched.posterPath,
          voteAverage: fetched.voteAverage,
          runtimeMinutes: fetched.runtimeMinutes,
        }
      : null);

  if (!target || closing) return null;
  const close = () => {
    setClosing(true);
    onClose();
  };
  return (
    <LazyMovieDetailsModal
      open
      tmdbId={target.tmdbId}
      mediaType={target.mediaType}
      title={item?.title}
      year={item?.year}
      posterPath={item?.posterPath}
      voteAverage={item?.voteAverage}
      runtimeMinutes={item?.runtimeMinutes}
      watchProviders={seed?.watchProviders}
      watchPageUrl={seed?.tmdbWatchPageUrl}
      initialTab={initialTab}
      libraryContext={
        user && item
          ? {
              inWatchlist: watchlist.has(item),
              onToggleWatchlist: () => watchlist.toggle(item),
              onProposeToEvent: () => onPropose(item),
            }
          : undefined
      }
      onClose={close}
    />
  );
}
