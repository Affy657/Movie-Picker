import { useId, useRef, type KeyboardEvent, type RefObject } from 'react';
import { History, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import IconButton from '@/shared/components/IconButton';
import LinkButton from '@/shared/components/LinkButton';
import { ICON_SIZE } from '@/shared/components/iconSize';
import styles from './SearchHistoryDropdown.module.css';

export const HISTORY_ITEM_SELECTOR = '[data-history-item]';

type SearchHistoryDropdownProps = {
  history: readonly string[];
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  onClose: () => void;
};

function isTypingKey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return (event.key.length === 1 && event.key !== ' ') || event.key === 'Backspace';
}

export default function SearchHistoryDropdown({
  history,
  inputRef,
  onSelect,
  onRemove,
  onClear,
  onClose,
}: Readonly<SearchHistoryDropdownProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);

  const itemButtons = () =>
    Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>(HISTORY_ITEM_SELECTOR) ?? []);
  const focusInput = () => inputRef.current?.focus();
  const focusedIndex = () => {
    const list = listRef.current;
    const row = document.activeElement?.closest('li');
    if (!list || !row || row.parentElement !== list) return -1;
    return Array.from(list.children).indexOf(row);
  };
  const focusIsInside = () => listRef.current?.contains(document.activeElement) ?? false;

  const select = (query: string) => {
    focusInput();
    onSelect(query);
  };

  const remove = (index: number) => {
    const query = history[index];
    if (query === undefined) return;
    if (focusIsInside()) {
      const buttons = itemButtons();
      const neighbour = buttons[index + 1] ?? buttons[index - 1];
      if (neighbour) neighbour.focus();
      else focusInput();
    }
    onRemove(query);
  };

  const clear = () => {
    focusInput();
    onClear();
  };

  const close = () => {
    focusInput();
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = itemButtons();
    const index = focusedIndex();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        (buttons[index + 1] ?? buttons[0])?.focus();
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (index <= 0) focusInput();
        else buttons[index - 1]?.focus();
        return;
      case 'Home':
        event.preventDefault();
        buttons[0]?.focus();
        return;
      case 'End':
        event.preventDefault();
        buttons[buttons.length - 1]?.focus();
        return;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case 'Delete':
        if (index >= 0) {
          event.preventDefault();
          remove(index);
        }
        return;
      default:
        if (isTypingKey(event)) focusInput();
    }
  };

  return (
    <div
      className={styles.historyDropdown}
      role="group"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className={styles.historyHeader}>
        <span className={styles.historyTitle} id={titleId}>
          {t('movies.search.historyTitle')}
        </span>
        <LinkButton size="sm" onClick={clear}>
          {t('movies.search.historyClear')}
        </LinkButton>
      </div>
      <ul className={styles.historyList} ref={listRef}>
        {history.map((query, index) => (
          <li key={query} className={styles.historyItem}>
            <button
              type="button"
              className={styles.historyItemBtn}
              aria-label={t('movies.search.historySelectAria', { query })}
              onClick={() => select(query)}
              data-history-item
            >
              <History className={styles.historyIcon} size={ICON_SIZE.sm} aria-hidden />
              <span className={styles.historyLabel}>{query}</span>
            </button>
            <IconButton
              size="sm"
              className={styles.historyRemoveBtn}
              ariaLabel={t('movies.search.historyRemoveAria', { query })}
              onClick={() => remove(index)}
            >
              <X size={ICON_SIZE.md} aria-hidden />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
