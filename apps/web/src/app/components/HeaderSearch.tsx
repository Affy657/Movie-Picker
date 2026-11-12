import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useLocation } from 'react-router';
import { Search, X } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import SearchField from '@/shared/components/SearchField';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useHomeSearchHidden } from '@/app/pages/home/homeSearchVisibility';
import { useRunSearch } from '@/app/pages/home/homeSearch';
import SearchExamples from '@/app/pages/home/SearchExamples';
import styles from './HeaderSearch.module.css';

export default function HeaderSearch() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const searchHidden = useHomeSearchHidden();
  const runSearch = useRunSearch();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const loupeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLFormElement>(null);
  const available = isMobile && pathname === ROUTES.home && searchHidden;

  useClickOutside([panelRef, loupeRef], () => setOpen(false), open, {
    returnFocusTo: loupeRef,
    closeOnFocusLeave: true,
  });

  useEffect(() => {
    if (!available) setOpen(false);
  }, [available]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector('input')?.focus({ preventScroll: true });
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
        ariaLabel={t('home.searchLabel')}
        className={styles.loupe}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        tabIndex={open ? -1 : undefined}
      >
        <Search size={ICON_SIZE.lg} aria-hidden />
      </IconButton>
      {open ? (
        <form ref={panelRef} role="search" className={styles.panel} onSubmit={submit}>
          <div className={styles.fieldRow}>
            <label className="visually-hidden" htmlFor="header-search">
              {t('home.searchLabel')}
            </label>
            <SearchField
              id="header-search"
              className={styles.field}
              value={term}
              onChange={setTerm}
              placeholder={t('home.searchPlaceholder')}
              iconSize={ICON_SIZE.md}
            />
            <IconButton ariaLabel={t('home.closeSearch')} onClick={close}>
              <X size={ICON_SIZE.lg} aria-hidden />
            </IconButton>
          </div>
          <SearchExamples
            onPick={(example) => {
              if (runSearch(example)) setOpen(false);
            }}
          />
        </form>
      ) : null}
    </>
  );
}
