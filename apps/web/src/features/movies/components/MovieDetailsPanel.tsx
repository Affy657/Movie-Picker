import { PlayCircle } from 'lucide-react';
import type { MovieDetails } from '@/features/movies/api/moviesApi';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { formatReleaseDate } from '@/shared/utils/formatReleaseDate';
import { extractYouTubeId } from '@/shared/utils/youtube';
import type { MovieMediaType } from '@/shared/types/movie';
import styles from './MovieDetailsPanel.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

const MAX_CAST = 6;

export type MovieDetailsFacts = Pick<
  MovieDetails,
  | 'overview'
  | 'tagline'
  | 'director'
  | 'cast'
  | 'runtimeMinutes'
  | 'releaseDate'
  | 'trailerUrl'
  | 'episodeCount'
>;

export interface MovieDetailsQueryState {
  data?: MovieDetailsFacts;
  isLoading: boolean;
  isError: boolean;
}

interface MovieDetailsContentProps {
  query: MovieDetailsQueryState;
  mediaType?: MovieMediaType;
  panelId: string;
  onPlayTrailer?: (url: string) => void;
}

export function MovieDetailsContent({
  query,
  mediaType,
  panelId,
  onPlayTrailer,
}: Readonly<MovieDetailsContentProps>) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = query;
  const isTv = mediaType === 'tv';
  return (
    <section
      id={panelId}
      className={styles.panel}
      aria-label={t(isTv ? 'movies.details.regionLabelShow' : 'movies.details.regionLabel')}
    >
      {isLoading && <p className={styles.status}>{t('movies.details.loading')}</p>}
      {isError && <p className={styles.error}>{t('movies.details.error')}</p>}
      {data && <MovieDetailsBody data={data} isTv={isTv} onPlayTrailer={onPlayTrailer} />}
      {!isLoading && !isError && !data && (
        <p className={styles.status}>{t('movies.details.empty')}</p>
      )}
    </section>
  );
}

function episodesLabel(data: MovieDetailsFacts, t: Translate): string | null {
  const count = data.episodeCount
    ? pluralizeCount(
        data.episodeCount,
        'movies.details.episodesOne',
        'movies.details.episodesMany',
        t
      )
    : null;
  const runtime = formatRuntimeMinutes(data.runtimeMinutes);
  if (count && runtime) return t('movies.details.episodesWithRuntime', { count, runtime });
  if (count) return count;
  return runtime ? t('movies.details.episodeRuntime', { runtime }) : null;
}

function MovieDetailsBody({
  data,
  isTv,
  onPlayTrailer,
}: Readonly<{
  data: MovieDetailsFacts;
  isTv: boolean;
  onPlayTrailer?: (url: string) => void;
}>) {
  const { t, locale } = useTranslation();
  const facts: Array<[string, string]> = [];
  const trailerYtId = extractYouTubeId(data.trailerUrl);
  const safeTrailerUrl = trailerYtId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailerYtId)}`
    : null;

  if (data.director)
    facts.push([
      t(isTv ? 'movies.details.creatorLabel' : 'movies.details.directorLabel'),
      data.director,
    ]);
  if (data.cast.length > 0)
    facts.push([t('movies.details.castLabel'), data.cast.slice(0, MAX_CAST).join(', ')]);
  const episodes = isTv ? episodesLabel(data, t) : null;
  if (episodes) facts.push([t('movies.details.episodesLabel'), episodes]);
  if (data.releaseDate)
    facts.push([
      t(isTv ? 'movies.details.firstAiredLabel' : 'movies.details.releasedLabel'),
      formatReleaseDate(data.releaseDate, locale),
    ]);

  const hasContent = !!data.overview || !!data.tagline || facts.length > 0;
  if (!hasContent) {
    return <p className={styles.status}>{t('movies.details.empty')}</p>;
  }

  return (
    <>
      {data.tagline && <p className={styles.tagline}>« {data.tagline} »</p>}
      {data.overview && <p className={styles.overview}>{data.overview}</p>}
      {facts.length > 0 && (
        <dl className={styles.factList}>
          {facts.map(([label, value]) => (
            <FactRow key={label} label={label} value={value} />
          ))}
        </dl>
      )}
      {safeTrailerUrl &&
        (onPlayTrailer ? (
          <div className={styles.trailerRow}>
            <button
              type="button"
              className={styles.trailerLink}
              onClick={() => onPlayTrailer(safeTrailerUrl)}
            >
              <PlayCircle aria-hidden size={ICON_SIZE.sm} />
              <span className={styles.trailerLinkLabel}>{t('movies.details.trailerLink')}</span>
            </button>
          </div>
        ) : (
          <div className={styles.trailerRow}>
            <a
              href={safeTrailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.trailerLink}
            >
              <PlayCircle aria-hidden size={ICON_SIZE.sm} />
              <span className={styles.trailerLinkLabel}>{t('movies.details.trailerLink')}</span>
            </a>
          </div>
        ))}
    </>
  );
}

function FactRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{value}</dd>
    </>
  );
}
