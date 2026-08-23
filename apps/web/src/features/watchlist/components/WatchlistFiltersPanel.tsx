import clsx from 'clsx';
import { useTranslation } from '@/shared/i18n';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import DurationRangeSlider from '@/features/movies/components/DurationRangeSlider';
import {
  DECADE_OPTIONS,
  MOVIE_GENRE_IDS,
  RUNTIME_MAX_MINUTES,
  RUNTIME_MIN_MINUTES,
  RUNTIME_STEP_MINUTES,
  runtimeRangeLabel,
  voteMinLabel,
} from '@/features/movies/components/movieSearchFilterOptions';
import { WATCHLIST_VOTE_MIN_OPTIONS } from '@/features/watchlist/hooks/useWatchlistToolbar';
import type { RatingScale } from '@/shared/types/theme';
import type { MovieMediaType } from '@/shared/types/movie';
import styles from './WatchlistFiltersPanel.module.css';

interface WatchlistFiltersPanelProps {
  panelId?: string;
  className?: string;
  boxed?: boolean;
  onReset?: () => void;
  tmdbLanguage: string;
  ratingScale?: RatingScale;
  selectedGenres: number[];
  onToggleGenre: (id: number) => void;
  selectedMediaTypes: MovieMediaType[];
  onToggleMediaType: (mediaType: MovieMediaType) => void;
  selectedDecade: string | undefined;
  onToggleDecade: (decade: string) => void;
  voteMin?: number | undefined;
  onToggleVoteMin?: (min: number) => void;
  runtimeRange?: [number, number];
  onChangeRuntimeRange?: (min: number, max: number) => void;
}

export default function WatchlistFiltersPanel({
  panelId,
  className,
  boxed = false,
  onReset,
  tmdbLanguage,
  ratingScale,
  selectedGenres,
  onToggleGenre,
  selectedMediaTypes,
  onToggleMediaType,
  selectedDecade,
  onToggleDecade,
  voteMin,
  onToggleVoteMin,
  runtimeRange,
  onChangeRuntimeRange,
}: Readonly<WatchlistFiltersPanelProps>) {
  const { t } = useTranslation();

  return (
    <div id={panelId} className={clsx(styles.panel, boxed && styles.boxed, className)}>
      <div className={styles.group}>
        <span className={styles.groupLabel}>{t('watchlist.toolbar.filterGenre')}</span>
        <div className={styles.chipRow}>
          {MOVIE_GENRE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`${styles.chip} ${selectedGenres.includes(id) ? styles.chipActive : ''}`}
              onClick={() => onToggleGenre(id)}
              aria-pressed={selectedGenres.includes(id)}
            >
              <span className={styles.chipLabel}>{genreLabel(id, tmdbLanguage)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>{t('watchlist.toolbar.filterType')}</span>
        <div className={styles.chipRow}>
          <button
            type="button"
            className={`${styles.chip} ${selectedMediaTypes.includes('movie') ? styles.chipActive : ''}`}
            onClick={() => onToggleMediaType('movie')}
            aria-pressed={selectedMediaTypes.includes('movie')}
          >
            <span className={styles.chipLabel}>{t('watchlist.toolbar.filterTypeMovie')}</span>
          </button>
          <button
            type="button"
            className={`${styles.chip} ${selectedMediaTypes.includes('tv') ? styles.chipActive : ''}`}
            onClick={() => onToggleMediaType('tv')}
            aria-pressed={selectedMediaTypes.includes('tv')}
          >
            <span className={styles.chipLabel}>{t('watchlist.toolbar.filterTypeTv')}</span>
          </button>
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>{t('watchlist.toolbar.filterDecade')}</span>
        <div className={styles.chipRow}>
          {DECADE_OPTIONS.map((decade) => (
            <button
              key={decade}
              type="button"
              className={`${styles.chip} ${selectedDecade === decade ? styles.chipActive : ''}`}
              onClick={() => onToggleDecade(decade)}
              aria-pressed={selectedDecade === decade}
            >
              <span className={styles.chipLabel}>{decade}s</span>
            </button>
          ))}
        </div>
      </div>

      {onToggleVoteMin ? (
        <div className={styles.group}>
          <span className={styles.groupLabel}>{t('watchlist.toolbar.filterVoteMin')}</span>
          <div className={styles.chipRow}>
            {WATCHLIST_VOTE_MIN_OPTIONS.map((opt) => (
              <button
                key={opt.tmdb}
                type="button"
                className={`${styles.chip} ${voteMin === opt.tmdb ? styles.chipActive : ''}`}
                onClick={() => onToggleVoteMin(opt.tmdb)}
                aria-pressed={voteMin === opt.tmdb}
              >
                <span className={styles.chipLabel}>★ {voteMinLabel(opt.tmdb, ratingScale)}+</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {onChangeRuntimeRange && runtimeRange ? (
        <div className={styles.group}>
          <span className={styles.groupLabel}>{t('watchlist.toolbar.filterDuration')}</span>
          <DurationRangeSlider
            min={RUNTIME_MIN_MINUTES}
            max={RUNTIME_MAX_MINUTES}
            step={RUNTIME_STEP_MINUTES}
            valueMin={runtimeRange[0]}
            valueMax={runtimeRange[1]}
            onChange={onChangeRuntimeRange}
            formatLabel={(value, bound) => runtimeRangeLabel(value, tmdbLanguage, bound)}
            ariaLabelMin={t('movies.search.durationMinAria')}
            ariaLabelMax={t('movies.search.durationMaxAria')}
          />
        </div>
      ) : null}

      {onReset ? (
        <div className={styles.footerRow}>
          <button type="button" className={styles.footerReset} onClick={onReset}>
            {t('watchlist.toolbar.filtersResetAll')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
