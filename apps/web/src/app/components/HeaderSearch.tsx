import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import { useLocation } from 'react-router';
import { Search, X } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import SearchField from '@/shared/components/SearchField';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useHomeSearchHidden } from '@/app/pages/home/homeSearchVisibility';
import { useRunSearch } from '@/app/pages/home/homeSearch';
import SearchExamples from '@/app/pages/home/SearchExamples';
import GlobalSearchResults from './globalSearch/GlobalSearchResults';
import { GLOBAL_SEARCH_MIN_LENGTH } from './globalSearch/globalSearchApi';
import { useResultsKeyboard } from './globalSearch/resultsKeyboard';
import styles from './HeaderSearch.module.css';

export default function HeaderSearch() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const homeSearchHidden = useHomeSearchHidden();
  const runSearch = useRunSearch();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const loupeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLFormElement>(null);
  const panelId = useId();
  const available = pathname !== ROUTES.home || homeSearchHidden;

  useResultsKeyboard(panelRef, open);
  useClickOutside([panelRef, loupeRef], () => setOpen(false), open, {
    returnFocusTo: loupeRef,
    closeOnFocusLeave: true,
  });

  useEffect(() => {
    if (!available) setOpen(false);
  }, [available]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector('input')?.focus({ preventScroll: true });
    else setTerm('');
  }, [open]);

  if (!available) return null;

  const close = () => {
    setOpen(false);
    loupeRef.current?.focus({ preventScroll: true });
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (runSearch(term)) setOpen(false);
  };

  return (
    <>
      <IconButton
        ref={loupeRef}
        ariaLabel={t('globalSearch.open')}
        className={styles.loupe}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        tabIndex={open ? -1 : undefined}
      >
        <Search size={ICON_SIZE.lg} aria-hidden />
      </IconButton>
      {open ? (
        <form ref={panelRef} id={panelId} role="search" className={styles.panel} onSubmit={submit}>
          <div className={styles.fieldRow}>
            <label className="visually-hidden" htmlFor="header-search">
              {t('globalSearch.label')}
            </label>
            <SearchField
              id="header-search"
              className={styles.field}
              value={term}
              onChange={setTerm}
              placeholder={t('globalSearch.placeholder')}
              iconSize={ICON_SIZE.md}
            />
            <IconButton
              ariaLabel={t('globalSearch.close')}
              className={styles.close}
              onClick={close}
            >
              <X size={ICON_SIZE.lg} aria-hidden />
            </IconButton>
          </div>
          {term.trim().length < GLOBAL_SEARCH_MIN_LENGTH ? (
            <SearchExamples
              onPick={(example) => {
                if (runSearch(example)) setOpen(false);
              }}
            />
          ) : null}
          <GlobalSearchResults
            term={term}
            source="header"
            className={styles.results}
            onPick={() => setOpen(false)}
          />
        </form>
      ) : null}
    </>
  );
}
