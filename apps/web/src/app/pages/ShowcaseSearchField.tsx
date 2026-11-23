import { useEffect, useState, type FormEvent } from 'react';
import SearchField from '@/shared/components/SearchField';
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from '@/features/movies/hooks/useMovieSearch';
import { useTranslation } from '@/shared/i18n';
import styles from './ShowcaseListPage.module.css';

function isSearchable(term: string): boolean {
  return term.length === 0 || term.length >= SEARCH_MIN_CHARS;
}

export default function ShowcaseSearchField({
  query,
  onSearch,
}: Readonly<{ query: string; onSearch: (term: string) => void }>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(query);

  useEffect(() => {
    setDraft((current) => (current.trim() === query ? current : query));
  }, [query]);

  useEffect(() => {
    const term = draft.trim();
    if (term === query || !isSearchable(term)) return undefined;
    const timer = setTimeout(() => onSearch(term), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, query, onSearch]);

  const searchNow = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = draft.trim();
    if (term !== query && isSearchable(term)) onSearch(term);
  };

  return (
    <form role="search" className={styles.searchForm} onSubmit={searchNow}>
      <SearchField
        value={draft}
        onChange={setDraft}
        placeholder={t('showcase.searchFieldPlaceholder')}
        ariaLabel={t('showcase.searchFieldLabel')}
      />
    </form>
  );
}
