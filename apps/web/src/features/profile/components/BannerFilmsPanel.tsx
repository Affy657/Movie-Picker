import { useState } from 'react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Film, Search } from 'lucide-react';
import { useLocale, useTranslation } from '@/shared/i18n';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import EmptyState from '@/shared/components/EmptyState';
import IconButton from '@/shared/components/IconButton';
import InlineError from '@/shared/components/InlineError';
import SearchField from '@/shared/components/SearchField';
import Spinner from '@/shared/components/Spinner';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import { searchMovies, type MovieSearchItem } from '@/features/movies/api/moviesApi';
import { fetchMovieBackdrops, type ProfileBanner } from '@/features/profile/api/profileApi';
import {
  BANNER_SUGGESTIONS,
  TMDB_BANNER_THUMBNAIL_BASE,
} from '@/features/profile/utils/bannerSuggestions';
import pickerStyles from '@/features/auth/components/AvatarPickerModal.module.css';
import styles from './BannerPickerModal.module.css';

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_MIN_CHARS = 2;

type ChosenFilm = { tmdbId: number; title: string; year: string };

type Props = {
  banner: ProfileBanner | null;
  disabled: boolean;
  onChoose: (tmdbId: number, imagePath: string) => void;
};

function choiceKey(tmdbId: number, imagePath: string): string {
  return `${tmdbId}:${imagePath}`;
}

function parseChoice(key: string): [number, string] {
  const separator = key.indexOf(':');
  return [Number(key.slice(0, separator)), key.slice(separator + 1)];
}

function currentKey(banner: ProfileBanner | null): string | null {
  if (banner?.source !== 'film' || !banner.tmdbId) return null;
  const path = banner.imageUrl.slice(banner.imageUrl.lastIndexOf('/'));
  return choiceKey(banner.tmdbId, path);
}

function FilmImages({
  film,
  banner,
  disabled,
  onBack,
  onChoose,
}: Readonly<{
  film: ChosenFilm;
  banner: ProfileBanner | null;
  disabled: boolean;
  onBack: () => void;
  onChoose: Props['onChoose'];
}>) {
  const { t } = useTranslation();
  const [browsed, setBrowsed] = useState<string | null>(null);
  const backdrops = useQuery({
    queryKey: queryKeys.profile.bannerBackdrops(film.tmdbId),
    queryFn: () => fetchMovieBackdrops(film.tmdbId),
  });
  const items = backdrops.data?.backdrops ?? [];

  return (
    <div className={styles.step}>
      <div className={styles.backRow}>
        <IconButton ariaLabel={t('profile.banner.backToFilms')} expandHitArea onClick={onBack}>
          <ChevronLeft size={ICON_SIZE.lg} aria-hidden />
        </IconButton>
        <h3 className={styles.filmHeading}>
          {film.title} <span className={styles.year}>({film.year})</span>
        </h3>
      </div>
      {backdrops.isPending && (
        <output className={styles.status}>
          <Spinner />
          {t('profile.banner.imagesLoading')}
        </output>
      )}
      {backdrops.isError && (
        <InlineError
          message={t('profile.banner.imagesError')}
          retryLabel={t('common.retry')}
          onRetry={() => void backdrops.refetch()}
        />
      )}
      {backdrops.isSuccess && items.length === 0 && (
        <EmptyState
          compact
          icon={<Film size={ICON_SIZE.xl} />}
          message={t('profile.banner.noImages')}
        />
      )}
      {items.length > 0 && (
        <>
          <p className={pickerStyles.hint}>{t('profile.banner.chooseImage')}</p>
          <ChoiceGroup
            value={browsed ?? currentKey(banner)}
            onChange={setBrowsed}
            onSelect={(key) => !disabled && onChoose(...parseChoice(key))}
            ariaLabel={t('profile.banner.chooseImage')}
            className={styles.grid}
          >
            {items.map((item, index) => {
              const key = choiceKey(film.tmdbId, item.path);
              const selected = key === (browsed ?? currentKey(banner));
              return (
                <ChoiceCard
                  key={key}
                  value={key}
                  layout="tile"
                  className={styles.tile}
                  ariaLabel={t('profile.banner.imageOption', {
                    index: index + 1,
                    count: items.length,
                  })}
                >
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={styles.thumb}
                  />
                  {selected && (
                    <Check
                      size={ICON_SIZE.md}
                      className={clsx(pickerStyles.check, styles.tileCheck)}
                      aria-hidden
                    />
                  )}
                </ChoiceCard>
              );
            })}
          </ChoiceGroup>
        </>
      )}
    </div>
  );
}

function SearchResults({
  items,
  onOpen,
}: Readonly<{ items: MovieSearchItem[]; onOpen: (film: ChosenFilm) => void }>) {
  const { t } = useTranslation();
  return (
    <ul className={styles.results} aria-label={t('profile.banner.results')}>
      {items.map((item) => {
        const poster = tmdbPosterSrcForListDisplay(posterImageSrc(item.posterPath));
        return (
          <li key={item.id}>
            <button
              type="button"
              className={styles.result}
              onClick={() => onOpen({ tmdbId: item.id, title: item.title, year: item.year })}
            >
              {poster ? (
                <img
                  src={poster}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={styles.resultPoster}
                />
              ) : (
                <span className={styles.resultPoster} aria-hidden="true">
                  <Film size={ICON_SIZE.lg} />
                </span>
              )}
              <span className={styles.resultText}>
                <span className={styles.resultTitle}>{item.title}</span>{' '}
                {item.year && <span className={styles.year}>({item.year})</span>}
              </span>
              <ChevronRight size={ICON_SIZE.md} className={styles.resultChevron} aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function BannerFilmsPanel({ banner, disabled, onChoose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { locale, tmdbLanguage } = useLocale();
  const [term, setTerm] = useState('');
  const [film, setFilm] = useState<ChosenFilm | null>(null);
  const [browsed, setBrowsed] = useState<string | null>(null);
  const query = useDebouncedValue(term.trim(), SEARCH_DEBOUNCE_MS);
  const searching = query.length >= SEARCH_MIN_CHARS;
  const search = useQuery({
    queryKey: queryKeys.profile.bannerSearch(query, tmdbLanguage),
    queryFn: ({ signal }) => searchMovies(query, { signal, lang: tmdbLanguage }),
    enabled: searching,
  });

  if (film) {
    return (
      <FilmImages
        film={film}
        banner={banner}
        disabled={disabled}
        onBack={() => setFilm(null)}
        onChoose={onChoose}
      />
    );
  }

  const selectedKey = browsed ?? currentKey(banner);
  const results = search.data?.items ?? [];

  return (
    <div className={styles.step}>
      <SearchField
        value={term}
        onChange={setTerm}
        placeholder={t('profile.banner.searchLabel')}
        ariaLabel={t('profile.banner.searchLabel')}
      />
      {searching ? (
        <>
          {search.isPending && (
            <output className={styles.status}>
              <Spinner />
            </output>
          )}
          {search.isError && (
            <InlineError
              message={t('profile.banner.searchError')}
              retryLabel={t('common.retry')}
              onRetry={() => void search.refetch()}
            />
          )}
          {search.isSuccess && results.length === 0 && (
            <EmptyState
              compact
              icon={<Search size={ICON_SIZE.xl} />}
              title={t('profile.banner.noResultsTitle')}
              message={t('profile.banner.noResultsMessage')}
            />
          )}
          {results.length > 0 && <SearchResults items={results} onOpen={setFilm} />}
        </>
      ) : (
        <>
          <p className={styles.sectionLabel}>{t('profile.banner.suggestions')}</p>
          <ChoiceGroup
            value={selectedKey}
            onChange={setBrowsed}
            onSelect={(key) => !disabled && onChoose(...parseChoice(key))}
            ariaLabel={t('profile.banner.suggestions')}
            className={styles.grid}
          >
            {BANNER_SUGGESTIONS.map((suggestion) => {
              const key = choiceKey(suggestion.tmdbId, suggestion.imagePath);
              const title = locale === 'en' ? suggestion.title.en : suggestion.title.fr;
              return (
                <ChoiceCard
                  key={key}
                  value={key}
                  layout="tile"
                  className={styles.tile}
                  ariaLabel={t('profile.banner.filmOption', { title, year: suggestion.year })}
                >
                  <img
                    src={TMDB_BANNER_THUMBNAIL_BASE + suggestion.imagePath}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={styles.thumb}
                  />
                  <span className={styles.tileLabel} aria-hidden="true">
                    {title} <span className={styles.year}>({suggestion.year})</span>
                  </span>
                  {key === selectedKey && (
                    <Check
                      size={ICON_SIZE.md}
                      className={clsx(pickerStyles.check, styles.tileCheck)}
                      aria-hidden
                    />
                  )}
                </ChoiceCard>
              );
            })}
          </ChoiceGroup>
        </>
      )}
    </div>
  );
}
