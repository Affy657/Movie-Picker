import { useCallback, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Check, Film, Plus, ThumbsUp } from 'lucide-react';
import {
  addMovieToEvent,
  removeMovieFromEvent,
  type MovieSearchItem,
} from '@/features/movies/api/moviesApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useWatchlist, useWatchlistAvailability } from '@/features/movies/hooks/useWatchlist';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import AddMovieForm, { type MovieSearchItemAside } from '@/features/movies/components/AddMovieForm';
import { MovieDetailsContent } from '@/features/movies/components/MovieDetailsPanel';
import MovieFacts from '@/features/movies/components/MovieFacts';
import StreamingStatus from '@/features/movies/components/StreamingStatus';
import TmdbAttribution from '@/features/movies/components/TmdbAttribution';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { getErrorMessage } from '@/shared/api/apiError';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { safeTmdbWatchUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import type { MovieData, MovieMediaType } from '@/shared/types/movie';
import Modal from '@/shared/components/Modal';
import Sheet from '@/shared/components/Sheet';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ROUTES } from '@/app/routes';
import styles from './ProposeMovieDialog.module.css';

const MAX_SUGGESTIONS = 30;
const PITCH_MAX_LENGTH = 140;

type Proposal = { key: string; id: string; title: string };

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  eventName: string;
  participant: { participantId: string; pseudo: string };
  movies: MovieData[];
  onChanged: () => void;
  onVote: (movieId: string, value: 1) => void;
};

function keyOf(tmdbId: number, mediaType?: MovieMediaType | null): string {
  return `${mediaType ?? 'movie'}-${tmdbId}`;
}

function proposerId(movie: MovieData): string {
  return typeof movie.participantId === 'string' ? movie.participantId : movie.participantId.id;
}

function useWatchlistSuggestions(enabled: boolean): MovieSearchItem[] {
  const watchlist = useWatchlist({ enabled });
  const availability = useWatchlistAvailability({ enabled });
  return useMemo(() => {
    const offers = new Map(
      (availability.data?.items ?? []).map((a) => [keyOf(a.tmdbId, a.mediaType), a])
    );
    return [...(watchlist.data ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, MAX_SUGGESTIONS)
      .map((item) => {
        const offer = offers.get(keyOf(item.tmdbId, item.mediaType));
        return {
          id: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title,
          year: item.year,
          posterPath: item.posterPath,
          voteAverage: item.voteAverage ?? offer?.voteAverage,
          runtimeMinutes: item.runtimeMinutes ?? offer?.runtimeMinutes,
          genreIds: item.genreIds,
          watchProviders: offer?.watchProviders,
          tmdbWatchPageUrl: offer?.tmdbWatchPageUrl,
        };
      });
  }, [watchlist.data, availability.data]);
}

export default function ProposeMovieDialog({
  open,
  onClose,
  slug,
  eventName,
  participant,
  movies,
  onChanged,
  onVote,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const isMobile = useIsMobile();
  const [proposed, setProposed] = useState<Proposal[]>([]);
  const [toast, setToast] = useState<Proposal | null>(null);
  const [preview, setPreview] = useState<MovieSearchItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suggestions = useWatchlistSuggestions(open && !!user);

  const moviesByKey = useMemo(
    () => new Map(movies.map((m) => [keyOf(m.tmdbId, m.mediaType), m])),
    [movies]
  );
  const proposedKeys = useMemo(() => new Set(proposed.map((p) => p.key)), [proposed]);

  const propose = useCallback(
    async (item: MovieSearchItem, pitchNote?: string) => {
      setError(null);
      const created = await addMovieToEvent(slug, {
        tmdbId: item.id,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterPath: item.posterPath,
        participantId: participant.participantId,
        genreIds: item.genreIds,
        ...(pitchNote ? { pitchNote } : {}),
      });
      track('movie_added', { mediaType: item.mediaType });
      const entry = { key: keyOf(item.id, item.mediaType), id: created.id, title: item.title };
      setProposed((prev) => [...prev.filter((p) => p.key !== entry.key), entry]);
      setToast(entry);
      onChanged();
    },
    [slug, participant.participantId, track, onChanged]
  );

  const undo = async () => {
    if (!toast) return;
    const entry = toast;
    setToast(null);
    setError(null);
    try {
      await removeMovieFromEvent(slug, entry.id, participant.participantId);
      setProposed((prev) => prev.filter((p) => p.key !== entry.key));
      onChanged();
    } catch (e) {
      setError(getErrorMessage(e, t('events.propose.undoError')));
    }
  };

  const asideFor = (item: MovieSearchItem): MovieSearchItemAside | undefined => {
    const key = keyOf(item.id, item.mediaType);
    if (proposedKeys.has(key)) {
      return {
        action: (
          <span className={styles.done}>
            <Check size={ICON_SIZE.md} aria-hidden />
            <span className={styles.doneLabel}>{t('events.propose.added')}</span>
          </span>
        ),
      };
    }
    const movie = moviesByKey.get(key);
    if (!movie) return undefined;
    if (proposerId(movie) === participant.participantId) {
      return {
        status: <span className={styles.by}>{t('events.propose.byYou')}</span>,
        action: (
          <span className={styles.done}>
            <Check size={ICON_SIZE.md} aria-hidden />
          </span>
        ),
      };
    }
    const voted = movie.myVote === 1;
    return {
      status: (
        <span className={styles.by}>
          {t('events.propose.byOther', { name: movie.proposerPseudo })}
        </span>
      ),
      action: (
        <Button
          type="button"
          variant={voted ? 'soft' : 'secondary'}
          className={styles.voteButton}
          aria-pressed={voted}
          aria-label={t(voted ? 'events.propose.unvoteAria' : 'events.propose.voteAria', {
            title: item.title,
          })}
          onClick={() => onVote(movie.id, 1)}
        >
          <ThumbsUp size={ICON_SIZE.md} aria-hidden />
          <span className={styles.voteLabel}>
            {t(voted ? 'events.propose.voted' : 'events.propose.vote')}
          </span>
        </Button>
      ),
    };
  };

  const count = proposed.length;
  const title = t('events.propose.title');
  const detail = (
    <p className={styles.detail}>
      <span>{eventName}</span>
      <span className={styles.sep} aria-hidden="true" />
      <span>
        {pluralizeCount(
          movies.length,
          'events.propose.moviesCountOne',
          'events.propose.moviesCountMany',
          t
        )}
      </span>
    </p>
  );

  const body = (
    <>
      {preview ? (
        <MoviePreview
          item={preview}
          aside={asideFor(preview)}
          onBack={() => setPreview(null)}
          onPropose={async (pitchNote) => {
            await propose(preview, pitchNote);
            setPreview(null);
          }}
        />
      ) : null}
      <div hidden={!!preview} className={styles.search}>
        <AddMovieForm
          slug={slug}
          onAddItem={(item) => propose(item)}
          onAdded={() => undefined}
          addLabel={t('events.propose.add')}
          addAriaLabel={(movieTitle) => t('events.propose.addAria', { title: movieTitle })}
          addErrorLabel={t('events.propose.addError')}
          searchPlaceholder={t('events.propose.searchPlaceholder')}
          quickFilters
          historyChips
          flatResults
          hideAttribution
          suggestions={
            suggestions.length > 0
              ? {
                  title: t('events.propose.myList'),
                  items: suggestions,
                  action: (
                    <Link to={ROUTES.watchlist} className={styles.seeAll}>
                      {t('events.propose.myListSeeAll')}
                    </Link>
                  ),
                }
              : undefined
          }
          renderItemAside={asideFor}
          onOpenItem={(item) => {
            setToast(null);
            setPreview(item);
          }}
        />
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  const footer = (
    <div className={styles.footer}>
      {toast ? (
        <div className={styles.toast}>
          <Check size={ICON_SIZE.lg} aria-hidden className={styles.toastIcon} />
          <span role="status" className={styles.toastText}>
            {t('events.propose.toast', { title: toast.title })}
          </span>
          <Button type="button" variant="ghost" className={styles.toastAction} onClick={undo}>
            {t('events.propose.undo')}
          </Button>
        </div>
      ) : null}
      <div className={styles.footerRow}>
        <div className={styles.footerText}>
          {count > 0 ? (
            <span className={styles.count}>
              {pluralizeCount(
                count,
                'events.propose.sessionCountOne',
                'events.propose.sessionCountMany',
                t
              )}
            </span>
          ) : null}
          <TmdbAttribution className={styles.attribution} />
        </div>
        <Button type="button" variant={count > 0 ? 'primary' : 'secondary'} onClick={onClose}>
          {count > 0 ? t('events.propose.done') : t('common.close')}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet
        open={open}
        title={title}
        detail={detail}
        onClose={onClose}
        size="lg"
        footer={footer}
        className={styles.sheet}
      >
        <div className={styles.body}>{body}</div>
      </Sheet>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      column
      title={title}
      titleDetail={detail}
      className={styles.modal}
    >
      <div className={styles.scroll}>
        <div className={styles.body}>{body}</div>
      </div>
      {footer}
    </Modal>
  );
}

type PreviewProps = {
  item: MovieSearchItem;
  aside: MovieSearchItemAside | undefined;
  onBack: () => void;
  onPropose: (pitchNote: string | undefined) => Promise<void>;
};

function MoviePreview({ item, aside, onBack, onPropose }: Readonly<PreviewProps>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const panelId = useId();
  const pitchId = useId();
  const [pitch, setPitch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const details = useMovieDetails(item.id, true, item.mediaType);
  const rawPoster = posterImageSrc(item.posterPath);
  const poster = rawPoster ? tmdbPosterSrcForListDisplay(rawPoster) : undefined;
  const providers = item.watchProviders ?? details.data?.watchProviders;
  const streams = (providers ?? []).some((p) => p.type === 'flatrate');
  const genres = details.data?.genres.join(', ');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onPropose(pitch.trim() || undefined);
    } catch (err) {
      setError(getErrorMessage(err, t('events.propose.addError')));
    } finally {
      setBusy(false);
    }
  };

  let outcome: ReactNode;
  if (aside) {
    outcome = (
      <div className={styles.previewOutcome}>
        {aside.status}
        {aside.action}
      </div>
    );
  } else {
    outcome = (
      <form className={styles.pitchForm} onSubmit={submit}>
        <label htmlFor={pitchId} className={styles.pitchLabel}>
          {t('events.propose.pitchLabel')}{' '}
          <span className={styles.pitchOptional}>{t('events.propose.pitchOptional')}</span>
        </label>
        <textarea
          id={pitchId}
          className={styles.pitchInput}
          maxLength={PITCH_MAX_LENGTH}
          rows={3}
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder={t('events.propose.pitchPlaceholder')}
        />
        <Button type="submit" variant="primary" disabled={busy} className={styles.previewAdd}>
          <Plus size={ICON_SIZE.md} aria-hidden />
          {t('events.propose.previewAdd')}
        </Button>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className={styles.preview}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={ICON_SIZE.md} aria-hidden />
        {t('events.propose.back')}
      </button>
      <div className={styles.previewTop}>
        <div className={styles.previewPoster}>
          {poster ? (
            <img src={poster} alt="" decoding="async" />
          ) : (
            <div className={styles.previewPosterEmpty} aria-hidden>
              <Film size={ICON_SIZE['2xl']} />
            </div>
          )}
        </div>
        <div className={styles.previewInfo}>
          <h3 className={styles.previewTitle}>{item.title}</h3>
          <MovieFacts movie={item} scale={user?.ratingScale} className={styles.facts} />
          {genres ? <p className={styles.genres}>{genres}</p> : null}
        </div>
      </div>
      <section className={styles.where} aria-label={t('events.propose.streamingTitle')}>
        {streams ? (
          <StreamingStatus
            providers={providers}
            watchPageUrl={safeTmdbWatchUrl(item.tmdbWatchPageUrl)}
            maxVisible={6}
          />
        ) : (
          <p className={styles.notStreaming}>{t('events.propose.notStreaming')}</p>
        )}
      </section>
      {outcome}
      <MovieDetailsContent
        query={{ data: details.data, isLoading: details.isLoading, isError: details.isError }}
        mediaType={item.mediaType}
        panelId={panelId}
      />
    </div>
  );
}
