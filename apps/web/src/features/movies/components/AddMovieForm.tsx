import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import clsx from 'clsx';
import { Check, History, ListFilter, Plus, Search } from 'lucide-react';
import type { MovieSearchItem } from '@/features/movies/api/moviesApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import type { RatingScale } from '@/shared/types/theme';
import TmdbAttribution from '@/features/movies/components/TmdbAttribution';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useSearchHistory } from '@/features/movies/hooks/useSearchHistory';
import { SEARCH_MIN_CHARS, useMovieSearch } from '@/features/movies/hooks/useMovieSearch';
import { useMovieSearchFilters } from '@/features/movies/hooks/useMovieSearchFilters';
import { matchesSearchFilters } from '@/features/movies/utils/matchesSearchFilters';
import MovieSearchFiltersPanel from '@/features/movies/components/MovieSearchFiltersPanel';
import MovieSearchQuickFilters from '@/features/movies/components/MovieSearchQuickFilters';
import MovieSearchRow from '@/features/movies/components/MovieSearchRow';
import ActiveFilterChips from '@/features/movies/components/ActiveFilterChips';
import Chip from '@/shared/components/Chip';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import SearchHistoryDropdown, { HISTORY_ITEM_SELECTOR } from './SearchHistoryDropdown';
import styles from './AddMovieForm.module.css';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import CountBadge from '@/shared/components/CountBadge';

function searchFailureMessage(failure: unknown, t: Translate): string | null {
  return failure ? getErrorMessage(failure, t('movies.search.fallbackError')) : null;
}

function searchStatusLabel(
  search: { searching: boolean; answered: boolean; count: number },
  t: Translate
): string {
  if (search.searching) return t('movies.search.a11ySearching');
  if (!search.answered) return '';
  if (search.count === 0) return t('movies.search.a11yNoResults');
  return t('movies.search.a11yResultsCount', { count: search.count });
}

function itemKey(item: MovieSearchItem): string {
  return `${item.mediaType ?? 'movie'}-${item.id}`;
}

export type MovieSearchItemAside = { status?: ReactNode; action?: ReactNode };

export interface AddMovieFormProps {
  slug?: string;
  onAddItem: (item: MovieSearchItem) => Promise<void>;
  onAdded: (item: MovieSearchItem) => void;
  disabled?: boolean;
  isItemAlreadyAdded?: (item: MovieSearchItem) => boolean;
  alreadyAddedLabel?: string;
  alreadyAddedHint?: string;
  addErrorLabel?: string;
  addLabel?: string;
  addAriaLabel?: (title: string) => string;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  searchWrapClassName?: string;
  showWatchProviders?: boolean;
  includeSeries?: boolean;
  quickFilters?: boolean;
  historyChips?: boolean;
  flatResults?: boolean;
  hideAttribution?: boolean;
  suggestions?: { title: string; items: MovieSearchItem[]; action?: ReactNode };
  renderItemAside?: (item: MovieSearchItem) => MovieSearchItemAside | undefined;
  onOpenItem?: (item: MovieSearchItem) => void;
}

export default function AddMovieForm({
  slug,
  onAddItem,
  onAdded,
  disabled,
  isItemAlreadyAdded,
  alreadyAddedLabel,
  alreadyAddedHint,
  addErrorLabel,
  addLabel,
  addAriaLabel,
  searchPlaceholder,
  searchAriaLabel,
  searchWrapClassName,
  showWatchProviders = true,
  includeSeries = false,
  quickFilters = false,
  historyChips = false,
  flatResults = false,
  hideAttribution = false,
  suggestions,
  renderItemAside,
  onOpenItem,
}: Readonly<AddMovieFormProps>) {
  const { t } = useTranslation();
  const { tmdbLanguage } = useLocale();
  const { user } = useAuth();
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory(user?.userId);
  const minCharsHintId = useId();
  const filtersPanelId = useId();

  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [historyDismissed, setHistoryDismissed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const filters = useMovieSearchFilters(tmdbLanguage, user?.ratingScale);
  const apiFiltersAlone = filters.hasApiFilters && !suggestions;

  const trimmedForSearch = useMemo(() => query.trim(), [query]);

  const immediateSearchRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);

  const closeFilters = useCallback(() => filters.setFiltersOpen(false), [filters]);
  useClickOutside(filtersPanelRef, closeFilters, filters.filtersOpen, {
    ignoreSelector: '[data-filters-toggle]',
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const filterChangedRef = filters.filterChangedRef;
  const takeImmediateSearch = useCallback(() => {
    const immediate = immediateSearchRef.current || filterChangedRef.current;
    immediateSearchRef.current = false;
    filterChangedRef.current = false;
    return immediate;
  }, [filterChangedRef]);

  const {
    searchKey,
    results,
    meta: searchMeta,
    searching,
    answered,
    failure,
    emptySearchKey,
    searchNow,
  } = useMovieSearch({
    term: trimmedForSearch,
    filters: filters.activeFilters,
    hasApiFilters: apiFiltersAlone,
    lang: tmdbLanguage,
    eventSlug: slug,
    includeSeries,
    takeImmediate: takeImmediateSearch,
    onSearched: addToHistory,
  });

  useEffect(() => setAddError(null), [searchKey]);

  const error = addError ?? searchFailureMessage(failure, t);
  const a11ySearchStatus = searchStatusLabel({ searching, answered, count: results.length }, t);

  const searchAllowed = trimmedForSearch.length >= SEARCH_MIN_CHARS || apiFiltersAlone;

  const search = useCallback(() => {
    if (!searchAllowed) return;
    setAddError(null);
    searchNow();
  }, [searchAllowed, searchNow]);

  const selectHistoryItem = useCallback((q: string) => {
    immediateSearchRef.current = true;
    setHistoryDismissed(true);
    setQuery(q);
  }, []);

  const dismissHistory = useCallback(() => setHistoryDismissed(true), []);

  const historyAvailable = !historyChips && !trimmedForSearch && history.length > 0;
  const showHistory = inputFocused && !historyDismissed && historyAvailable;
  const focusHistoryItem = useHistoryFocus(containerRef, showHistory, setHistoryDismissed);

  const displayedResults = useMemo(
    () =>
      filters.availabilityFilter
        ? results.filter((r) =>
            r.watchProviders?.some((p) => p.type === filters.availabilityFilter)
          )
        : results,
    [results, filters.availabilityFilter]
  );

  const shownSuggestions = useMemo(
    () =>
      suggestions?.items.filter((item) =>
        matchesSearchFilters(item, filters.activeFilters, filters.availabilityFilter)
      ) ?? [],
    [suggestions, filters.activeFilters, filters.availabilityFilter]
  );

  const leaveSearch = useCallback(() => {
    setInputFocused(false);
    setHistoryDismissed(false);
  }, []);
  useFocusLeave(containerRef, !disabled, leaveSearch);

  const addMovie = async (item: MovieSearchItem) => {
    setAddError(null);
    setAdding(true);
    try {
      await onAddItem(item);
      onAdded(item);
      setHistoryDismissed(true);
      searchInputRef.current?.focus();
    } catch (err) {
      setAddError(getErrorMessage(err, addErrorLabel ?? t('movies.search.addError')));
    } finally {
      setAdding(false);
    }
  };

  const addActionLabels = addActionLabelsFor(
    { addLabel, addAriaLabel, alreadyAddedLabel, alreadyAddedHint },
    t
  );

  if (disabled) return null;

  const classes = formClasses(flatResults, quickFilters);

  const trimmed = trimmedForSearch;
  const flags = viewFlags({
    trimmed,
    searching,
    searchAllowed,
    resultsCount: results.length,
    displayedCount: displayedResults.length,
    hasError: !!error,
    answeredEmpty: emptySearchKey === searchKey,
    availabilityFilter: filters.availabilityFilter,
    historyChips,
    historyCount: history.length,
    suggestionsCount: suggestions?.items.length ?? 0,
  });

  const renderRow = (item: MovieSearchItem) => {
    const aside = renderItemAside?.(item);
    return (
      <MovieSearchRow
        key={itemKey(item)}
        item={item}
        ratingScale={user?.ratingScale}
        showAvailability={showWatchProviders}
        status={aside?.status}
        action={
          aside?.action ?? (
            <AddAction
              item={item}
              alreadyAdded={isItemAlreadyAdded?.(item) ?? false}
              adding={adding}
              onAdd={addMovie}
              labels={addActionLabels}
            />
          )
        }
        onOpen={onOpenItem ? () => onOpenItem(item) : undefined}
      />
    );
  };

  return (
    <div className={classes.root}>
      <div className={clsx(styles.searchWrap, searchWrapClassName)} ref={containerRef}>
        <div className={styles.searchRow}>
          <div className={classes.inputWrap}>
            <button
              type="button"
              className={styles.searchIconBtn}
              onClick={search}
              disabled={searching || !searchAllowed}
              aria-label={t('movies.search.searchButton')}
            >
              <Search size={ICON_SIZE.md} aria-hidden />
            </button>
            <input
              ref={searchInputRef}
              type="search"
              enterKeyHint="search"
              autoCorrect="off"
              className={classes.input}
              aria-label={searchAriaLabel ?? t('movies.search.inputLabel')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHistoryDismissed(false);
              }}
              onKeyDown={(e) =>
                handleSearchKeyDown(e, {
                  search,
                  showHistory,
                  dismissHistory,
                  historyAvailable,
                  focusHistoryItem,
                })
              }
              onFocus={() => setInputFocused(true)}
              placeholder={searchPlaceholder ?? t('movies.search.placeholder')}
              autoComplete="off"
              aria-busy={searching}
              aria-describedby={flags.showMinCharsHint ? minCharsHintId : undefined}
            />
          </div>
          {quickFilters ? null : <FiltersToggle filters={filters} panelId={filtersPanelId} />}
        </div>

        {showHistory && (
          <SearchHistoryDropdown
            history={history}
            inputRef={searchInputRef}
            onSelect={selectHistoryItem}
            onRemove={removeFromHistory}
            onClear={clearHistory}
            onClose={dismissHistory}
          />
        )}
      </div>

      <FiltersArea
        quick={quickFilters}
        filters={filters}
        tmdbLanguage={tmdbLanguage}
        panelId={filtersPanelId}
        panelRef={filtersPanelRef}
        ratingScale={user?.ratingScale}
      />

      <SearchMessages
        flags={flags}
        term={trimmed}
        withTip={quickFilters}
        minCharsHintId={minCharsHintId}
        statusLabel={a11ySearchStatus}
        error={error}
      />
      {flags.showHistoryChips ? (
        <HistoryChips history={history} onSelect={selectHistoryItem} />
      ) : null}
      {flags.showResults ? (
        <ResultsBlock
          region={showWatchProviders && !hideAttribution ? searchMeta?.watchProvidersRegion : null}
          flat={flatResults}
          withAttribution={!hideAttribution}
        >
          {displayedResults.map(renderRow)}
        </ResultsBlock>
      ) : null}
      {flags.showSuggestions && suggestions ? (
        <SuggestionsSection
          title={suggestions.title}
          action={suggestions.action}
          flat={flatResults}
        >
          {shownSuggestions.map(renderRow)}
        </SuggestionsSection>
      ) : null}
    </div>
  );
}

type ViewInput = {
  trimmed: string;
  searching: boolean;
  searchAllowed: boolean;
  resultsCount: number;
  displayedCount: number;
  hasError: boolean;
  answeredEmpty: boolean;
  availabilityFilter: string | undefined;
  historyChips: boolean;
  historyCount: number;
  suggestionsCount: number;
};

function viewFlags(input: ViewInput) {
  const settled = !input.searching;
  const showNoResults =
    settled &&
    input.searchAllowed &&
    input.resultsCount === 0 &&
    !input.hasError &&
    input.answeredEmpty;
  const empty = input.trimmed.length === 0;
  return {
    showMinCharsHint: !empty && input.trimmed.length < SEARCH_MIN_CHARS,
    showNoResults,
    showAvailabilityEmpty:
      settled &&
      input.resultsCount > 0 &&
      input.displayedCount === 0 &&
      input.availabilityFilter != null,
    showResults: input.displayedCount > 0,
    showHistoryChips: input.historyChips && empty && input.historyCount > 0,
    showSuggestions: input.suggestionsCount > 0 && (empty || showNoResults),
  };
}

type KeyHandlers = {
  search: () => void;
  showHistory: boolean;
  dismissHistory: () => void;
  historyAvailable: boolean;
  focusHistoryItem: (position: 'first' | 'last') => void;
};

function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>, h: KeyHandlers) {
  if (e.key === 'Enter') {
    e.preventDefault();
    h.search();
    return;
  }
  if (e.key === 'Escape' && h.showHistory) {
    e.preventDefault();
    e.stopPropagation();
    h.dismissHistory();
    return;
  }
  if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && h.historyAvailable) {
    e.preventDefault();
    h.focusHistoryItem(e.key === 'ArrowDown' ? 'first' : 'last');
  }
}

type AddActionLabels = {
  add: string;
  aria: (title: string) => string;
  added: string;
  addedHint?: string;
};

function addActionLabelsFor(
  custom: {
    addLabel?: string;
    addAriaLabel?: (title: string) => string;
    alreadyAddedLabel?: string;
    alreadyAddedHint?: string;
  },
  t: Translate
): AddActionLabels {
  return {
    add: custom.addLabel ?? t('movies.search.addButton'),
    aria: custom.addAriaLabel ?? ((title) => t('movies.search.addButtonAria', { title })),
    added: custom.alreadyAddedLabel ?? t('movies.search.alreadyListed'),
    addedHint: custom.alreadyAddedHint,
  };
}

function AddAction({
  item,
  alreadyAdded,
  adding,
  onAdd,
  labels,
}: Readonly<{
  item: MovieSearchItem;
  alreadyAdded: boolean;
  adding: boolean;
  onAdd: (item: MovieSearchItem) => void;
  labels: AddActionLabels;
}>) {
  if (alreadyAdded) {
    return (
      <span className={styles.added} title={labels.addedHint}>
        <Check size={ICON_SIZE.md} aria-hidden />
        {labels.added}
      </span>
    );
  }
  return (
    <Button
      type="button"
      variant="secondary"
      className={styles.addButton}
      onClick={() => onAdd(item)}
      disabled={adding}
      aria-label={labels.aria(item.title)}
    >
      <Plus size={ICON_SIZE.md} aria-hidden />
      <span className={styles.addLabel}>{labels.add}</span>
    </Button>
  );
}

type Filters = ReturnType<typeof useMovieSearchFilters>;

function FiltersToggle({ filters, panelId }: Readonly<{ filters: Filters; panelId: string }>) {
  const { t } = useTranslation();
  const activeFiltersCount = filters.activeFilterChips.length;
  return (
    <Button
      variant={filters.filtersOpen ? 'soft' : 'secondary'}
      className={clsx(styles.filterIconBtn, styles.filterIconBtnLabeled)}
      onClick={() => filters.setFiltersOpen((v) => !v)}
      aria-expanded={filters.filtersOpen}
      aria-controls={panelId}
      data-filters-toggle
    >
      <ListFilter size={ICON_SIZE.sm} aria-hidden />
      <span className={styles.filterIconBtnLabel}>{t('movies.search.filtersToggle')}</span>
      {activeFiltersCount > 0 && (
        <CountBadge value={activeFiltersCount} size="sm" aria-hidden="true" />
      )}
    </Button>
  );
}

function FiltersArea({
  quick,
  filters,
  tmdbLanguage,
  panelId,
  panelRef,
  ratingScale,
}: Readonly<{
  quick: boolean;
  filters: Filters;
  tmdbLanguage: string;
  panelId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  ratingScale?: RatingScale;
}>) {
  const { t } = useTranslation();
  if (quick) return <MovieSearchQuickFilters filters={filters} tmdbLanguage={tmdbLanguage} />;
  return (
    <>
      <ActiveFilterChips
        chips={filters.activeFilterChips}
        groupAriaLabel={t('movies.search.filtersToggle')}
        removeAriaLabel={t('movies.search.removeFilterAria')}
        clearAllLabel={t('movies.search.filtersClearAll')}
        onClearAll={filters.clearAllFilters}
      />
      {filters.filtersOpen && (
        <div ref={panelRef}>
          <MovieSearchFiltersPanel
            panelId={panelId}
            tmdbLanguage={tmdbLanguage}
            selectedGenres={filters.selectedGenres}
            selectedDecade={filters.selectedDecade}
            voteMin={filters.voteMin}
            selectedLanguage={filters.selectedLanguage}
            availabilityFilter={filters.availabilityFilter}
            runtimeRange={filters.runtimeRange}
            ratingScale={ratingScale}
            onToggleGenre={filters.toggleGenre}
            onToggleDecade={filters.toggleDecade}
            onToggleVoteMin={filters.toggleVoteMin}
            onToggleLanguage={filters.toggleLanguage}
            onToggleAvailability={filters.toggleAvailability}
            onChangeRuntimeRange={filters.changeRuntimeRange}
          />
        </div>
      )}
    </>
  );
}

function HistoryChips({
  history,
  onSelect,
}: Readonly<{ history: string[]; onSelect: (query: string) => void }>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.sectionTitle}>
        {t('movies.search.historyTitle')}
      </h3>
      <div className={styles.recentChips}>
        {history.map((entry) => (
          <Chip
            key={entry}
            icon={History}
            onClick={() => onSelect(entry)}
            ariaLabel={t('movies.search.historySelectAria', { query: entry })}
          >
            {entry}
          </Chip>
        ))}
      </div>
    </section>
  );
}

function NoResults({ term, withTip }: Readonly<{ term: string; withTip: boolean }>) {
  const { t } = useTranslation();
  const forQuery = term.length >= SEARCH_MIN_CHARS;
  return (
    <div className={styles.noResults}>
      <p className={styles.noResultsHint}>
        {forQuery
          ? t('movies.search.noResultsForQuery', { query: term })
          : t('movies.search.noResultsForFilters')}
      </p>
      {withTip && forQuery ? (
        <p className={styles.noResultsTip}>{t('movies.search.noResultsTip')}</p>
      ) : null}
    </div>
  );
}

function ResultsBlock({
  region,
  flat,
  withAttribution,
  children,
}: Readonly<{
  region: string | null | undefined;
  flat: boolean;
  withAttribution: boolean;
  children: ReactNode;
}>) {
  const { t } = useTranslation();
  return (
    <>
      {region ? (
        <p className={styles.regionHint}>{t('movies.search.regionHint', { region })}</p>
      ) : null}
      <ul
        className={clsx(styles.results, flat && styles.resultsFlat)}
        aria-label={t('movies.search.resultsListAria')}
      >
        {children}
      </ul>
      {withAttribution ? <TmdbAttribution /> : null}
    </>
  );
}

function SuggestionsSection({
  title,
  action,
  flat,
  children,
}: Readonly<{ title: string; action?: ReactNode; flat: boolean; children: ReactNode[] }>) {
  const { t } = useTranslation();
  const titleId = useId();
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.sectionHead}>
        <h3 id={titleId} className={styles.sectionTitle}>
          {title}
        </h3>
        {action}
      </div>
      {children.length > 0 ? (
        <ul className={clsx(styles.results, flat && styles.resultsFlat)} aria-label={title}>
          {children}
        </ul>
      ) : (
        <p className={styles.noResultsHint}>{t('movies.search.noResultsForFilters')}</p>
      )}
    </section>
  );
}

function useHistoryFocus(
  containerRef: RefObject<HTMLDivElement | null>,
  showHistory: boolean,
  setHistoryDismissed: (dismissed: boolean) => void
) {
  const pendingRef = useRef<'first' | 'last' | null>(null);

  const focusEntry = useCallback(
    (position: 'first' | 'last') => {
      const items = containerRef.current?.querySelectorAll<HTMLElement>(HISTORY_ITEM_SELECTOR);
      if (!items?.length) return;
      items[position === 'first' ? 0 : items.length - 1]?.focus();
    },
    [containerRef]
  );

  useEffect(() => {
    const position = pendingRef.current;
    if (!position || !showHistory) return;
    pendingRef.current = null;
    focusEntry(position);
  });

  return (position: 'first' | 'last') => {
    if (showHistory) {
      focusEntry(position);
      return;
    }
    pendingRef.current = position;
    setHistoryDismissed(false);
  };
}

function SearchMessages({
  flags,
  term,
  withTip,
  minCharsHintId,
  statusLabel,
  error,
}: Readonly<{
  flags: ReturnType<typeof viewFlags>;
  term: string;
  withTip: boolean;
  minCharsHintId: string;
  statusLabel: string;
  error: string | null;
}>) {
  const { t } = useTranslation();
  return (
    <>
      {flags.showMinCharsHint ? (
        <p id={minCharsHintId} className={styles.minCharsHint}>
          {t('movies.search.liveSearchMinCharsHint', { min: SEARCH_MIN_CHARS })}
        </p>
      ) : null}
      <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {statusLabel}
      </p>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {flags.showNoResults ? <NoResults term={term} withTip={withTip} /> : null}
      {flags.showAvailabilityEmpty ? (
        <p className={styles.noResultsHint}>{t('movies.search.noResultsAvailability')}</p>
      ) : null}
    </>
  );
}

function useFocusLeave(
  containerRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onLeave: () => void
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!enabled || !el) return;
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node | null)) onLeave();
    };
    el.addEventListener('focusout', onFocusOut);
    return () => el.removeEventListener('focusout', onFocusOut);
  }, [containerRef, enabled, onLeave]);
}

function formClasses(flat: boolean, quick: boolean) {
  return {
    root: clsx(styles.root, flat && styles.rootFlat),
    inputWrap: clsx(styles.inputWrap, quick && styles.inputWrapWide),
    input: clsx('input', quick && styles.inputLarge),
  };
}
