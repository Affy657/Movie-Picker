import { useTranslation } from '@/shared/i18n';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import type { RatingScale } from '@/shared/types/theme';
import DurationRangeSlider from './DurationRangeSlider';
import {
  AVAILABILITY_OPTIONS,
  DECADE_OPTIONS,
  LANGUAGE_OPTIONS,
  MOVIE_GENRE_IDS,
  RUNTIME_MAX_MINUTES,
  RUNTIME_MIN_MINUTES,
  RUNTIME_STEP_MINUTES,
  VOTE_MIN_OPTIONS,
  runtimeRangeLabel,
  voteMinLabel,
} from './movieSearchFilterOptions';
import styles from './AddMovieForm.module.css';
import Card from '@/shared/components/Card';

interface MovieSearchFiltersPanelProps {
  panelId: string;
  tmdbLanguage: string;
  selectedGenres: number[];
  selectedDecade: string | undefined;
  voteMin: number | undefined;
  selectedLanguage: string | undefined;
  availabilityFilter: string | undefined;
  runtimeRange: [number, number];
  ratingScale?: RatingScale;
  onToggleGenre?: (id: number) => void;
  onToggleDecade: (decade: string) => void;
  onToggleVoteMin: (min: number) => void;
  onToggleLanguage?: (code: string) => void;
  onToggleAvailability?: (type: string) => void;
  onChangeRuntimeRange: (min: number, max: number) => void;
}

export default function MovieSearchFiltersPanel({
  panelId,
  tmdbLanguage,
  selectedGenres,
  selectedDecade,
  voteMin,
  selectedLanguage,
  availabilityFilter,
  runtimeRange,
  ratingScale,
  onToggleGenre,
  onToggleDecade,
  onToggleVoteMin,
  onToggleLanguage,
  onToggleAvailability,
  onChangeRuntimeRange,
}: Readonly<MovieSearchFiltersPanelProps>) {
  const { t } = useTranslation();
  const inFrench = tmdbLanguage.startsWith('fr');

  return (
    <Card id={panelId} padding="none" elevation="sm" className={styles.filtersPanel}>
      {onToggleGenre && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('movies.search.filterGenre')}</span>
          <div className={styles.genreChips}>
            {MOVIE_GENRE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`${styles.genreChip} ${selectedGenres.includes(id) ? styles.genreChipActive : ''}`}
                onClick={() => onToggleGenre(id)}
                aria-pressed={selectedGenres.includes(id)}
              >
                {genreLabel(id, tmdbLanguage)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t('movies.search.filterYear')}</span>
        <div className={styles.decadeChips}>
          {DECADE_OPTIONS.map((decade) => (
            <button
              key={decade}
              type="button"
              className={`${styles.decadeChip} ${selectedDecade === decade ? styles.decadeChipActive : ''}`}
              onClick={() => onToggleDecade(decade)}
              aria-pressed={selectedDecade === decade}
            >
              {decade}s
            </button>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t('movies.search.filterVoteMin')}</span>
        <div className={styles.voteChips}>
          {VOTE_MIN_OPTIONS.map((opt) => (
            <button
              key={opt.tmdb}
              type="button"
              className={`${styles.voteChip} ${voteMin === opt.tmdb ? styles.voteChipActive : ''}`}
              onClick={() => onToggleVoteMin(opt.tmdb)}
              aria-pressed={voteMin === opt.tmdb}
            >
              ★ {voteMinLabel(opt.tmdb, ratingScale)}+
            </button>
          ))}
        </div>
      </div>
      {onToggleLanguage && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('movies.search.filterLanguage')}</span>
          <div className={styles.langChips}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`${styles.langChip} ${selectedLanguage === lang.code ? styles.langChipActive : ''}`}
                onClick={() => onToggleLanguage(lang.code)}
                aria-pressed={selectedLanguage === lang.code}
              >
                <span className={styles.langCode} aria-hidden="true">
                  <span className={styles.langCodeText}>{lang.code.toUpperCase()}</span>
                </span>
                {inFrench ? lang.fr : lang.en}
              </button>
            ))}
          </div>
        </div>
      )}
      {onToggleAvailability && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('movies.search.filterAvailability')}</span>
          <div className={styles.availabilityChips}>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                className={`${styles.availabilityChip} ${availabilityFilter === opt.type ? styles.availabilityChipActive : ''}`}
                onClick={() => onToggleAvailability(opt.type)}
                aria-pressed={availabilityFilter === opt.type}
              >
                {inFrench ? opt.fr : opt.en}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t('movies.search.filterDuration')}</span>
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
    </Card>
  );
}
