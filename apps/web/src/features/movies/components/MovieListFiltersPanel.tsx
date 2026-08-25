import clsx from 'clsx';
import { genreLabel } from '@/features/profile/lib/tmdbGenres';
import DurationRangeSlider from '@/features/movies/components/DurationRangeSlider';
import {
  DECADE_OPTIONS,
  MOVIE_GENRE_IDS,
  MOVIE_LIST_VOTE_MIN_OPTIONS,
  RUNTIME_MAX_MINUTES,
  RUNTIME_MIN_MINUTES,
  RUNTIME_STEP_MINUTES,
  runtimeRangeLabel,
  voteMinLabel,
} from '@/features/movies/components/movieSearchFilterOptions';
import type { RatingScale } from '@/shared/types/theme';
import type { MovieMediaType } from '@/shared/types/movie';
import styles from './MovieListFiltersPanel.module.css';

interface MovieListFiltersPanelLabels {
  genre: string;
  type: string;
  typeMovie: string;
  typeTv: string;
  decade: string;
  voteMin?: string;
  duration?: string;
  durationMinAria?: string;
  durationMaxAria?: string;
  resetAll?: string;
}

interface MovieListFiltersPanelProps {
  panelId?: string;
  className?: string;
  boxed?: boolean;
  onReset?: () => void;
  tmdbLanguage: string;
  labels: MovieListFiltersPanelLabels;
  ratingScale?: RatingScale;
  selectedGenres: number[];
  onToggleGenre: (id: number) => void;
  selectedMediaTypes: MovieMediaType[];
  onToggleMediaType: (mediaType: MovieMediaType) => void;
  selectedDecade: string | undefined;
  onToggleDecade: (decade: string) => void;
  voteMin?: number;
  onToggleVoteMin?: (min: number) => void;
  runtimeRange?: [number, number];
  onChangeRuntimeRange?: (min: number, max: number) => void;
}

export default function MovieListFiltersPanel({
  panelId,
  className,
  boxed = false,
  onReset,
  tmdbLanguage,
  labels,
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
}: Readonly<MovieListFiltersPanelProps>) {
  return (
    <div id={panelId} className={clsx(styles.panel, boxed && styles.boxed, className)}>
      <div className={styles.group}>
        <span className={styles.groupLabel}>{labels.genre}</span>
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
        <span className={styles.groupLabel}>{labels.type}</span>
        <div className={styles.chipRow}>
          <button
            type="button"
            className={`${styles.chip} ${selectedMediaTypes.includes('movie') ? styles.chipActive : ''}`}
            onClick={() => onToggleMediaType('movie')}
            aria-pressed={selectedMediaTypes.includes('movie')}
          >
            <span className={styles.chipLabel}>{labels.typeMovie}</span>
          </button>
          <button
            type="button"
            className={`${styles.chip} ${selectedMediaTypes.includes('tv') ? styles.chipActive : ''}`}
            onClick={() => onToggleMediaType('tv')}
            aria-pressed={selectedMediaTypes.includes('tv')}
          >
            <span className={styles.chipLabel}>{labels.typeTv}</span>
          </button>
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>{labels.decade}</span>
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

      {onToggleVoteMin && labels.voteMin ? (
        <div className={styles.group}>
          <span className={styles.groupLabel}>{labels.voteMin}</span>
          <div className={styles.chipRow}>
            {MOVIE_LIST_VOTE_MIN_OPTIONS.map((opt) => (
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

      {onChangeRuntimeRange && runtimeRange && labels.duration ? (
        <div className={styles.group}>
          <span className={styles.groupLabel}>{labels.duration}</span>
          <DurationRangeSlider
            min={RUNTIME_MIN_MINUTES}
            max={RUNTIME_MAX_MINUTES}
            step={RUNTIME_STEP_MINUTES}
            valueMin={runtimeRange[0]}
            valueMax={runtimeRange[1]}
            onChange={onChangeRuntimeRange}
            formatLabel={(value, bound) => runtimeRangeLabel(value, tmdbLanguage, bound)}
            ariaLabelMin={labels.durationMinAria ?? ''}
            ariaLabelMax={labels.durationMaxAria ?? ''}
          />
        </div>
      ) : null}

      {onReset && labels.resetAll ? (
        <div className={styles.footerRow}>
          <button type="button" className={styles.footerReset} onClick={onReset}>
            {labels.resetAll}
          </button>
        </div>
      ) : null}
    </div>
  );
}
