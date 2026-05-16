import { useId, useState } from 'react';
import clsx from 'clsx';
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
 * Wrapper auto-géré ; pour un placement non-adjacent du bouton et du panneau, utiliser
 * `MovieDetailsToggle` + `MovieDetailsContent` avec un state partagé côté parent.
 */
export default function MovieDetailsPanel({ tmdbId }: MovieDetailsPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <div className={styles.toggleRow}>
        <MovieDetailsToggle open={open} onToggle={() => setOpen((v) => !v)} panelId={panelId} />
      </div>
      <MovieDetailsContent tmdbId={tmdbId} open={open} panelId={panelId} />
    </div>
  );
}

interface MovieDetailsToggleProps {
  open: boolean;
  onToggle: () => void;
  panelId: string;
  className?: string;
}

export function MovieDetailsToggle({
  open,
  onToggle,
  panelId,
  className,
}: MovieDetailsToggleProps) {
  const { t } = useTranslation();
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      className={clsx(styles.toggleBtn, className)}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={panelId}
    >
      <Info aria-hidden size={14} />
      <span>{open ? t('movies.details.toggleHide') : t('movies.details.toggleShow')}</span>
      <Icon aria-hidden size={14} />
    </button>
  );
}

interface MovieDetailsContentProps {
  tmdbId: number;
  open: boolean;
  panelId: string;
  className?: string;
}

export function MovieDetailsContent({
  tmdbId,
  open,
  panelId,
  className,
}: MovieDetailsContentProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useMovieDetails(tmdbId, open);
  if (!open) return null;
  return (
    <div
      id={panelId}
      className={clsx(styles.panel, className)}
      role="region"
      aria-label={t('movies.details.regionLabel')}
    >
      {isLoading && <p className={styles.status}>{t('movies.details.loading')}</p>}
      {isError && <p className={styles.error}>{t('movies.details.error')}</p>}
      {data && <MovieDetailsBody data={data} />}
      {!isLoading && !isError && !data && (
        <p className={styles.status}>{t('movies.details.empty')}</p>
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
  if (data.cast.length > 0)
    facts.push([t('movies.details.castLabel'), data.cast.slice(0, 6).join(', ')]);
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
