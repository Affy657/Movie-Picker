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
import Chip from '@/shared/components/Chip';

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
          <div className={styles.chipRow}>
            {MOVIE_GENRE_IDS.map((id) => (
              <Chip
                key={id}
                selected={selectedGenres.includes(id)}
                onClick={() => onToggleGenre(id)}
              >
                {genreLabel(id, tmdbLanguage)}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t('movies.search.filterYear')}</span>
        <div className={styles.chipRow}>
          {DECADE_OPTIONS.map((decade) => (
            <Chip
              key={decade}
              selected={selectedDecade === decade}
              onClick={() => onToggleDecade(decade)}
            >
              {decade}s
            </Chip>
          ))}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>{t('movies.search.filterVoteMin')}</span>
        <div className={styles.chipRow}>
          {VOTE_MIN_OPTIONS.map((opt) => (
            <Chip
              key={opt.tmdb}
              selected={voteMin === opt.tmdb}
              onClick={() => onToggleVoteMin(opt.tmdb)}
            >
              ★ {voteMinLabel(opt.tmdb, ratingScale)}+
            </Chip>
          ))}
        </div>
      </div>
      {onToggleLanguage && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('movies.search.filterLanguage')}</span>
          <div className={styles.chipRow}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <Chip
                key={lang.code}
                selected={selectedLanguage === lang.code}
                onClick={() => onToggleLanguage(lang.code)}
              >
                <span className={styles.langCode} aria-hidden="true">
                  <span className={styles.langCodeText}>{lang.code.toUpperCase()}</span>
                </span>
                {inFrench ? lang.fr : lang.en}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {onToggleAvailability && (
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{t('movies.search.filterAvailability')}</span>
          <div className={styles.chipRow}>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <Chip
                key={opt.type}
                selected={availabilityFilter === opt.type}
                onClick={() => onToggleAvailability(opt.type)}
              >
                {inFrench ? opt.fr : opt.en}
              </Chip>
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
