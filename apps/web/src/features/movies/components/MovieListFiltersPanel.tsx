import clsx from 'clsx';
import { genreLabel } from '@/shared/utils/tmdbGenres';
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
import Card from '@/shared/components/Card';
import Chip from '@/shared/components/Chip';
import styles from './MovieListFiltersPanel.module.css';
import LinkButton from '@/shared/components/LinkButton';

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
    <Card id={panelId} elevation="sm" className={clsx(styles.panel, className)}>
      <div className={styles.group}>
        <span className={styles.groupLabel}>{labels.genre}</span>
        <div className={styles.chipRow}>
          {MOVIE_GENRE_IDS.map((id) => (
            <Chip
              key={id}
              onClick={() => onToggleGenre(id)}
              pressed={selectedGenres.includes(id)}
              selected={selectedGenres.includes(id)}
            >
              {genreLabel(id, tmdbLanguage)}
            </Chip>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>{labels.type}</span>
        <div className={styles.chipRow}>
          <Chip
            onClick={() => onToggleMediaType('movie')}
            pressed={selectedMediaTypes.includes('movie')}
            selected={selectedMediaTypes.includes('movie')}
          >
            {labels.typeMovie}
          </Chip>
          <Chip
            onClick={() => onToggleMediaType('tv')}
            pressed={selectedMediaTypes.includes('tv')}
            selected={selectedMediaTypes.includes('tv')}
          >
            {labels.typeTv}
          </Chip>
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>{labels.decade}</span>
        <div className={styles.chipRow}>
          {DECADE_OPTIONS.map((decade) => (
            <Chip
              key={decade}
              onClick={() => onToggleDecade(decade)}
              pressed={selectedDecade === decade}
              selected={selectedDecade === decade}
            >
              {decade}s
            </Chip>
          ))}
        </div>
      </div>

      {onToggleVoteMin && labels.voteMin ? (
        <div className={styles.group}>
          <span className={styles.groupLabel}>{labels.voteMin}</span>
          <div className={styles.chipRow}>
            {MOVIE_LIST_VOTE_MIN_OPTIONS.map((opt) => (
              <Chip
                key={opt.tmdb}
                onClick={() => onToggleVoteMin(opt.tmdb)}
                pressed={voteMin === opt.tmdb}
                selected={voteMin === opt.tmdb}
              >
                ★ {voteMinLabel(opt.tmdb, ratingScale)}+
              </Chip>
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
          <LinkButton onClick={onReset}>{labels.resetAll}</LinkButton>
        </div>
      ) : null}
    </Card>
  );
}
