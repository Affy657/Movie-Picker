import { useCallback, useState } from 'react';
import clsx from 'clsx';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Bookmark, BookmarkCheck, Film, PlayCircle, Plus, Share2 } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import { NIGHT_QUERY_PARAM, ROUTES, parseMovieRef } from '@/app/routes';
import NotFoundPage from '@/app/pages/NotFoundPage';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import MovieNightBar from '@/features/events/components/MovieNightBar';
import ProposeToEventModal from '@/features/events/components/ProposeToEventModal';
import type { ProposableMovie } from '@/features/events/hooks/useProposeMovieToEvent';
import type { MovieDetails, MovieVideo } from '@/features/movies/api/moviesApi';
import type {
  MovieBrowseCardItem,
  MovieLibraryActions,
} from '@/features/movies/components/MovieBrowseCard';
import TrailerModal from '@/features/movies/components/TrailerModal';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import { useMovieNights } from '@/features/movies/hooks/useMovieNights';
import {
  readMoviePageState,
  useOpenMoviePage,
  type MoviePageSeed,
} from '@/features/movies/hooks/useOpenMoviePage';
import {
  useWatchlistToggle,
  type WatchlistToggleItem,
} from '@/features/library/hooks/useWatchlistToggle';
import AddToListMenu from '@/features/library/components/AddToListMenu';
import type { WatchedStatus } from '@/features/library/api/watchedApi';
import WatchedRating, { hasWatchedRating } from '@/features/library/components/WatchedRating';
import WatchedToggle from '@/features/library/components/WatchedToggle';
import { useWatchedTitle } from '@/features/library/hooks/useWatched';
import { ApiError } from '@/shared/api/apiError';
import BackLink from '@/shared/components/BackLink';
import Button, { buttonClass } from '@/shared/components/Button';
import ErrorState from '@/shared/components/ErrorState';
import IconButton from '@/shared/components/IconButton';
import InlineError from '@/shared/components/InlineError';
import PageLayout from '@/shared/components/PageLayout';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useHasHoverCapability } from '@/shared/hooks/useHasHoverCapability';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { useLocale, useTranslation, type Translate, type TranslationKey } from '@/shared/i18n';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import type { MovieMediaType } from '@/shared/types/movie';
import { toTitleSummary } from '@/shared/utils/titleSummary';
import MovieHero, { type MovieHeroView } from '@/app/pages/movie/MovieHero';
import { MovieInfosCard, MovieLinksCard, MovieNightsCard } from '@/app/pages/movie/MovieAside';
import MovieRails from '@/app/pages/movie/MovieRails';
import { MovieCast, MovieCrew, MovieSynopsis, MovieVideos } from '@/app/pages/movie/MovieSections';
import {
  buildHeroView,
  buildInfoRows,
  castOf,
  crewOf,
  directorOf,
  documentTitleOf,
  libraryItemOf,
  titleOf,
  videosOf,
  yearOf,
  youtubeWatchUrl,
} from '@/app/pages/movie/movieView';
import styles from './MoviePage.module.css';

interface MoviePageCopy {
  loading: TranslationKey;
  notFoundTitle: TranslationKey;
  notFoundMessage: TranslationKey;
  loadError: TranslationKey;
}

const PAGE_COPY: Record<MovieMediaType, MoviePageCopy> = {
  movie: {
    loading: 'moviePage.loading',
    notFoundTitle: 'moviePage.notFoundTitle',
    notFoundMessage: 'moviePage.notFoundMessage',
    loadError: 'moviePage.loadError',
  },
  tv: {
    loading: 'moviePage.loadingShow',
    notFoundTitle: 'moviePage.notFoundTitleShow',
    notFoundMessage: 'moviePage.notFoundMessageShow',
    loadError: 'moviePage.loadErrorShow',
  },
};

function isNotFound(error: unknown): boolean {
  return ApiError.is(error) && error.code === 404;
}

interface HeroActionsProps {
  view: MovieHeroView;
  item: WatchlistToggleItem;
  signedIn: boolean;
  fromNight: boolean;
  inWatchlist: boolean;
  watched: { status: WatchedStatus | undefined; pending: boolean; toggle: () => void };
  trailer: MovieVideo | undefined;
  shareUrl: string;
  onPropose: () => void;
  onToggleWatchlist: () => void;
  onPlay: (video: MovieVideo) => void;
  t: Translate;
}

function HeroActions({
  view,
  item,
  signedIn,
  fromNight,
  inWatchlist,
  watched,
  trailer,
  shareUrl,
  onPropose,
  onToggleWatchlist,
  onPlay,
  t,
}: Readonly<HeroActionsProps>) {
  const isMobile = useIsMobile();
  const share = useShareAction(
    shareUrl,
    view.title,
    t('moviePage.shareText', { title: view.title }),
    'movie'
  );
  const titleUnknown = !view.title;
  const propose =
    signedIn && !fromNight ? (
      <Button variant="primary" fullWidth={isMobile} disabled={titleUnknown} onClick={onPropose}>
        <Plus aria-hidden size={ICON_SIZE.md} />
        {t('moviePage.propose')}
      </Button>
    ) : null;
  const trailerButton = trailer ? (
    <Button className={styles.trailer} onClick={() => onPlay(trailer)}>
      <PlayCircle aria-hidden size={ICON_SIZE.md} />
      {t('moviePage.trailer')}
    </Button>
  ) : null;
  const shareButton = (
    <IconButton
      ariaLabel={share.copied ? t('share.copied') : t('moviePage.share')}
      disabled={titleUnknown}
      onClick={() => void share.nativeShare()}
    >
      <Share2 aria-hidden size={ICON_SIZE.md} />
    </IconButton>
  );
  const memberActions = signedIn ? (
    <MemberActions
      item={item}
      inWatchlist={inWatchlist}
      watched={watched}
      disabled={titleUnknown}
      isMobile={isMobile}
      onToggleWatchlist={onToggleWatchlist}
      t={t}
    />
  ) : null;

  if (isMobile) {
    return (
      <>
        {propose}
        {memberActions}
        <div className={styles.actionRow}>
          {trailerButton}
          {shareButton}
        </div>
      </>
    );
  }
  return (
    <>
      <div className={styles.actionRow}>
        {propose}
        {trailerButton}
        {shareButton}
      </div>
      {memberActions}
    </>
  );
}

function MemberActions({
  item,
  inWatchlist,
  watched,
  disabled,
  isMobile,
  onToggleWatchlist,
  t,
}: Readonly<{
  item: WatchlistToggleItem;
  inWatchlist: boolean;
  watched: HeroActionsProps['watched'];
  disabled: boolean;
  isMobile: boolean;
  onToggleWatchlist: () => void;
  t: Translate;
}>) {
  const pairItem = isMobile ? styles.pairItem : undefined;
  const watchlistToggle = (
    <Button
      variant={inWatchlist ? 'soft' : 'secondary'}
      fullWidth={isMobile}
      className={pairItem}
      aria-pressed={inWatchlist}
      disabled={disabled}
      onClick={onToggleWatchlist}
    >
      {inWatchlist ? (
        <BookmarkCheck aria-hidden size={ICON_SIZE.md} />
      ) : (
        <Bookmark aria-hidden size={ICON_SIZE.md} />
      )}
      {t('moviePage.watchlistToggle')}
    </Button>
  );
  const watchedToggle = (
    <WatchedToggle
      status={watched.status}
      disabled={disabled || watched.pending}
      fullWidth={isMobile}
      className={pairItem}
      onToggle={watched.toggle}
    />
  );
  const lists = <AddToListMenu item={item} disabled={disabled} fullWidth={isMobile} />;

  if (isMobile) {
    return (
      <>
        <div className={styles.actionRow}>
          {watchlistToggle}
          {watchedToggle}
        </div>
        {lists}
      </>
    );
  }
  return (
    <div className={styles.actionRow}>
      {lists}
      {watchlistToggle}
      {watchedToggle}
    </div>
  );
}

function useMoviePageNavigation(fromApp: boolean, nightSlug: string | null) {
  const navigate = useNavigate();
  const goBack = useCallback(() => {
    if (fromApp) {
      void navigate(-1);
      return;
    }
    void navigate(nightSlug ? ROUTES.eventDetail(nightSlug) : ROUTES.home);
  }, [fromApp, navigate, nightSlug]);
  const leaveNight = useCallback(() => {
    if (fromApp) {
      void navigate(-1);
      return;
    }
    if (nightSlug) void navigate(ROUTES.eventDetail(nightSlug), { replace: true });
  }, [fromApp, navigate, nightSlug]);
  return { goBack, leaveNight };
}

function MovieLoadError({
  error,
  copy,
  onRetry,
}: Readonly<{ error: unknown; copy: MoviePageCopy; onRetry: () => void }>) {
  const { t } = useTranslation();
  if (isNotFound(error)) {
    return (
      <ErrorState
        icon={<Film size={ICON_SIZE['4xl']} />}
        title={t(copy.notFoundTitle)}
        message={t(copy.notFoundMessage)}
        actions={
          <Link to={ROUTES.home} className={buttonClass({ variant: 'primary' })}>
            {t('errors.backHome')}
          </Link>
        }
      />
    );
  }
  return (
    <ErrorState
      icon={<Film size={ICON_SIZE['4xl']} />}
      title={t(copy.loadError)}
      message=""
      actions={
        <Button variant="primary" onClick={onRetry}>
          {t('moviePage.retry')}
        </Button>
      }
    />
  );
}

function MovieSynopsisBlock({
  detailsQuery,
  mediaType,
  copy,
}: Readonly<{
  detailsQuery: UseQueryResult<MovieDetails>;
  mediaType: MovieMediaType;
  copy: MoviePageCopy;
}>) {
  const { t } = useTranslation();
  const details = detailsQuery.data;
  if (detailsQuery.isError && !details) {
    return (
      <InlineError
        message={t(copy.loadError)}
        retryLabel={t('moviePage.retry')}
        onRetry={() => void detailsQuery.refetch()}
      />
    );
  }
  return (
    <MovieSynopsis
      overview={details?.overview ?? null}
      tagline={details?.tagline ?? null}
      isTv={mediaType === 'tv'}
      pending={detailsQuery.isPending}
    />
  );
}

function seedOfItem(item: MovieBrowseCardItem): MoviePageSeed {
  return toTitleSummary(item);
}

function seoTitleOf(
  detailsQuery: UseQueryResult<MovieDetails>,
  failedWithoutSeed: boolean,
  documentTitle: string,
  copy: MoviePageCopy,
  t: Translate
): string {
  if (failedWithoutSeed) {
    return t(isNotFound(detailsQuery.error) ? copy.notFoundTitle : copy.loadError);
  }
  return documentTitle || t(copy.loading);
}

function MoviePageContent({
  tmdbId,
  mediaType,
}: Readonly<{ tmdbId: number; mediaType: MovieMediaType }>) {
  const { t, locale } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user, isLoading: authPending } = useAuth();
  const location = useLocation();
  const openMoviePage = useOpenMoviePage();
  const [params] = useSearchParams();
  const nightSlug = params.get(NIGHT_QUERY_PARAM);
  const pageState = readMoviePageState(location.state);
  const seed = pageState?.seed?.tmdbId === tmdbId ? pageState.seed : undefined;
  const signedIn = !!user;
  const scale = user?.ratingScale ?? 'five';
  const copy = PAGE_COPY[mediaType];

  const detailsQuery = useMovieDetails(tmdbId, true, mediaType);
  const details = detailsQuery.data;
  const nightsQuery = useMovieNights(tmdbId, mediaType, signedIn);
  const watchlist = useWatchlistToggle(signedIn);
  const hasHover = useHasHoverCapability();
  const [proposeTarget, setProposeTarget] = useState<ProposableMovie | null>(null);
  const [playing, setPlaying] = useState<MovieVideo | null>(null);

  const viewInput = { mediaType, details, seed, t, locale, tmdbLanguage };
  const view = buildHeroView(viewInput);
  const title = titleOf(details, seed);
  const year = yearOf(details, seed);
  const canonicalPath = ROUTES.moviePage({ tmdbId, mediaType, title: title || undefined });
  const videos = videosOf(details);
  const item = libraryItemOf({ tmdbId, mediaType, details, seed, view });
  const watched = useWatchedTitle(item, signedIn);
  const failedWithoutSeed = detailsQuery.isError && !seed;

  usePageSeo({
    title: pageTitle(
      seoTitleOf(detailsQuery, failedWithoutSeed, documentTitleOf(title, year), copy, t)
    ),
    description: details?.overview ?? undefined,
    canonical: absoluteUrl(canonicalPath),
    image: view.backdropSrc ?? undefined,
    noindex: true,
  });

  const { goBack, leaveNight } = useMoviePageNavigation(!!pageState?.fromApp, nightSlug);

  const library: MovieLibraryActions = {
    hasHover,
    isLoggedIn: signedIn,
    has: watchlist.has,
    toggle: watchlist.toggle,
    propose: (target) => setProposeTarget(target),
  };

  if (failedWithoutSeed) {
    return (
      <MovieLoadError
        error={detailsQuery.error}
        copy={copy}
        onRetry={() => void detailsQuery.refetch()}
      />
    );
  }

  return (
    <>
      {nightSlug ? (
        <MovieNightBar
          slug={nightSlug}
          tmdbId={tmdbId}
          mediaType={mediaType}
          onBack={goBack}
          onRemoved={leaveNight}
        />
      ) : null}
      <PageLayout className={clsx(styles.page, nightSlug && styles.withDock)}>
        <MovieHero
          view={view}
          nights={nightsQuery.data}
          scale={scale}
          personalScore={
            hasWatchedRating(watched.status)
              ? {
                  label: t('watched.rating.label'),
                  content: (
                    <WatchedRating status={watched.status} scale={scale} onRate={watched.rate} />
                  ),
                }
              : null
          }
          topLink={nightSlug ? null : <BackLink onClick={goBack}>{t('moviePage.back')}</BackLink>}
          actions={
            <HeroActions
              view={view}
              item={item}
              signedIn={signedIn}
              fromNight={!!nightSlug}
              inWatchlist={watchlist.has(item)}
              watched={{
                status: watched.status,
                pending: watched.isPending,
                toggle: watched.toggle,
              }}
              trailer={videos[0]}
              shareUrl={absoluteUrl(canonicalPath)}
              onPropose={() => setProposeTarget(item)}
              onToggleWatchlist={() => watchlist.toggle(item)}
              onPlay={setPlaying}
              t={t}
            />
          }
        />
        <div className={styles.content}>
          {watchlist.error || watched.error ? (
            <p className="error" role="alert">
              {watchlist.error ?? watched.error}
            </p>
          ) : null}
          <div className={styles.body}>
            <div className={styles.main}>
              <MovieSynopsisBlock detailsQuery={detailsQuery} mediaType={mediaType} copy={copy} />
              <MovieVideos videos={videos} onPlay={setPlaying} />
              <MovieCast cast={castOf(details)} />
              <MovieCrew crew={crewOf(details, mediaType)} />
            </div>
            <aside className={styles.aside}>
              <MovieNightsCard
                authPending={authPending}
                signedIn={signedIn}
                nights={nightsQuery.data}
                scale={scale}
                returnTo={`${location.pathname}${location.search}`}
              />
              <MovieInfosCard rows={buildInfoRows(viewInput, view)} />
              <MovieLinksCard tmdbId={tmdbId} mediaType={mediaType} title={title} year={year} />
            </aside>
          </div>
          <MovieRails
            current={{ tmdbId, mediaType }}
            collection={details?.collection ?? null}
            director={directorOf(details)}
            library={library}
            onSelect={(next) => openMoviePage(seedOfItem(next))}
          />
          <p className={styles.attribution}>{t('moviePage.attribution')}</p>
        </div>
      </PageLayout>
      <TrailerModal
        open={playing != null}
        movieTitle={title}
        trailerUrl={playing ? youtubeWatchUrl(playing) : null}
        onClose={() => setPlaying(null)}
      />
      {proposeTarget ? (
        <ProposeToEventModal open movie={proposeTarget} onClose={() => setProposeTarget(null)} />
      ) : null}
    </>
  );
}

export default function MoviePage({ mediaType }: Readonly<{ mediaType: MovieMediaType }>) {
  const { movieRef } = useParams();
  const tmdbId = parseMovieRef(movieRef);
  if (!tmdbId) return <NotFoundPage />;
  return <MoviePageContent key={`${mediaType}-${tmdbId}`} tmdbId={tmdbId} mediaType={mediaType} />;
}
