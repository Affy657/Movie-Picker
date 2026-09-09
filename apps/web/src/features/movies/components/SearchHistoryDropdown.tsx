import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './SearchHistoryDropdown.module.css';

type SearchHistoryDropdownProps = {
  id: string;
  history: readonly string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
};

const SearchHistoryDropdown = forwardRef<HTMLDivElement, SearchHistoryDropdownProps>(
  function SearchHistoryDropdown({ id, history, onSelect, onRemove, onClear }, ref) {
    const { t } = useTranslation();

    return (
      <div className={styles.historyDropdown} id={id} ref={ref}>
        <div className={styles.historyHeader}>
          <span className={styles.historyTitle}>{t('movies.search.historyTitle')}</span>
          <button type="button" className={styles.historyClearBtn} onClick={onClear}>
            {t('movies.search.historyClear')}
          </button>
        </div>
        <ul className={styles.historyList}>
          {history.map((query) => (
            <li key={query} className={styles.historyItem}>
              <button
                type="button"
                className={styles.historyItemBtn}
                aria-label={t('movies.search.historySelectAria', { query })}
                onClick={() => onSelect(query)}
              >
                <Search className={styles.historyIcon} size={14} aria-hidden />
                <span className={styles.historyLabel}>{query}</span>
              </button>
              <button
                type="button"
                className={styles.historyRemoveBtn}
                aria-label={t('movies.search.historyRemoveAria', { query })}
                onClick={() => onRemove(query)}
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
);

export default SearchHistoryDropdown;
