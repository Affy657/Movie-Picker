import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { genreLabel } from '@/shared/utils/tmdbGenres';
import Chip from '@/shared/components/Chip';
import type { useMovieSearchFilters } from '@/features/movies/hooks/useMovieSearchFilters';
import {
  DECADE_OPTIONS,
  MOVIE_GENRE_IDS,
  RUNTIME_MAX_MINUTES,
  RUNTIME_MIN_MINUTES,
} from './movieSearchFilterOptions';
import styles from './MovieSearchQuickFilters.module.css';

const SHORT_RUNTIME_MAX_MINUTES = 120;
const WELL_RATED_TMDB_MIN = 7;

type Filters = ReturnType<typeof useMovieSearchFilters>;
type Group = 'genre' | 'decade';

type Props = {
  filters: Filters;
  tmdbLanguage: string;
};

export default function MovieSearchQuickFilters({ filters, tmdbLanguage }: Readonly<Props>) {
  const { t } = useTranslation();
  const [openGroup, setOpenGroup] = useState<Group | null>(null);
  const [runtimeMin, runtimeMax] = filters.runtimeRange;
  const short = runtimeMin === RUNTIME_MIN_MINUTES && runtimeMax === SHORT_RUNTIME_MAX_MINUTES;
  const toggleGroup = (group: Group) =>
    setOpenGroup((current) => (current === group ? null : group));
  const genreCount = filters.selectedGenres.length;

  return (
    <div className={styles.root}>
      <fieldset className={styles.row} aria-label={t('movies.search.quickFiltersAria')}>
        <Chip
          selected={filters.availabilityFilter === 'flatrate'}
          onClick={() => filters.toggleAvailability('flatrate')}
        >
          {t('movies.search.quickStreaming')}
        </Chip>
        <Chip
          selected={short}
          onClick={() =>
            filters.changeRuntimeRange(
              RUNTIME_MIN_MINUTES,
              short ? RUNTIME_MAX_MINUTES : SHORT_RUNTIME_MAX_MINUTES
            )
          }
        >
          {t('movies.search.quickShort')}
        </Chip>
        <Chip
          selected={filters.voteMin === WELL_RATED_TMDB_MIN}
          onClick={() => filters.toggleVoteMin(WELL_RATED_TMDB_MIN)}
        >
          {t('movies.search.quickWellRated')}
        </Chip>
        <Chip
          selected={genreCount > 0}
          expanded={openGroup === 'genre'}
          onClick={() => toggleGroup('genre')}
        >
          {genreCount > 0
            ? `${t('movies.search.quickGenre')} (${genreCount})`
            : t('movies.search.quickGenre')}
          <ChevronDown className={styles.chevron} aria-hidden />
        </Chip>
        <Chip
          selected={!!filters.selectedDecade}
          expanded={openGroup === 'decade'}
          onClick={() => toggleGroup('decade')}
        >
          {filters.selectedDecade ? `${filters.selectedDecade}s` : t('movies.search.quickDecade')}
          <ChevronDown className={styles.chevron} aria-hidden />
        </Chip>
      </fieldset>
      {openGroup === 'genre' ? (
        <fieldset className={styles.group} aria-label={t('movies.search.quickGenre')}>
          {MOVIE_GENRE_IDS.map((id) => (
            <Chip
              key={id}
              size="sm"
              selected={filters.selectedGenres.includes(id)}
              onClick={() => filters.toggleGenre(id)}
            >
              {genreLabel(id, tmdbLanguage)}
            </Chip>
          ))}
        </fieldset>
      ) : null}
      {openGroup === 'decade' ? (
        <fieldset className={styles.group} aria-label={t('movies.search.quickDecade')}>
          {DECADE_OPTIONS.map((decade) => (
            <Chip
              key={decade}
              size="sm"
              selected={filters.selectedDecade === decade}
              onClick={() => filters.toggleDecade(decade)}
            >
              {decade}s
            </Chip>
          ))}
        </fieldset>
      ) : null}
    </div>
  );
}
