import { useId, useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useMovieDetails } from '@/features/movies/hooks/useMovieDetails';
import { useTranslation } from '@/shared/i18n';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import styles from './MovieDetailsPanel.module.css';

interface MovieDetailsPanelProps {
  tmdbId: number;
}

/**
 * Panneau repliable « plus d'infos » : synopsis TMDB, réalisateur, casting, durée.
 * Les données sont chargées à la demande (première ouverture) puis mises en cache.
 */
export default function MovieDetailsPanel({ tmdbId }: MovieDetailsPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { data, isLoading, isError } = useMovieDetails(tmdbId, open);

  const toggle = () => setOpen((v) => !v);
  const Icon = open ? ChevronUp : ChevronDown;

  return (
    <div>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <Info aria-hidden size={14} />
          <span>{open ? t('movies.details.toggleHide') : t('movies.details.toggleShow')}</span>
          <Icon aria-hidden size={14} />
        </button>
      </div>
      {open && (
        <div id={panelId} className={styles.panel} role="region" aria-label={t('movies.details.regionLabel')}>
          {isLoading && <p className={styles.status}>{t('movies.details.loading')}</p>}
          {isError && <p className={styles.error}>{t('movies.details.error')}</p>}
          {data && <MovieDetailsBody data={data} />}
          {!isLoading && !isError && !data && (
            <p className={styles.status}>{t('movies.details.empty')}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface MovieDetailsBodyProps {
  data: {
    overview: string | null;
    tagline: string | null;
    director: string | null;
    cast: string[];
    runtimeMinutes: number | null;
    genres: string[];
    releaseDate: string | null;
  };
}

function MovieDetailsBody({ data }: MovieDetailsBodyProps) {
  const { t } = useTranslation();
  const facts: Array<[string, string]> = [];

  if (data.director) facts.push([t('movies.details.directorLabel'), data.director]);
  if (data.cast.length > 0) facts.push([t('movies.details.castLabel'), data.cast.slice(0, 6).join(', ')]);
  const runtimeLabel = formatRuntimeMinutes(data.runtimeMinutes);
  if (runtimeLabel) facts.push([t('movies.details.runtimeLabel'), runtimeLabel]);
  if (data.genres.length > 0) facts.push([t('movies.details.genresLabel'), data.genres.join(', ')]);
  if (data.releaseDate) facts.push([t('movies.details.releasedLabel'), data.releaseDate]);

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
    </>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{value}</dd>
    </>
  );
}
