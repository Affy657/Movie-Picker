import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react';
import { useLocation } from 'react-router';
import { Search, X } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import LinkButton from '@/shared/components/LinkButton';
import SearchField from '@/shared/components/SearchField';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useHomeSearchHidden } from '@/app/pages/home/homeSearchVisibility';
import { SEARCH_EXAMPLES, useRunSearch } from '@/app/pages/home/homeSearch';
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

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector('input')?.focus({ preventScroll: true });
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (panelRef.current?.contains(target) || loupeRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
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

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  };

  return (
    <>
      <IconButton
        ref={loupeRef}
        ariaLabel={t('home.searchLabel')}
        className={styles.loupe}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <Search size={ICON_SIZE.lg} aria-hidden />
      </IconButton>
      {open ? (
        <form
          ref={panelRef}
          role="search"
          className={styles.panel}
          onSubmit={submit}
          onKeyDown={onKeyDown}
        >
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
          <p className={styles.examples}>
            <span>{t('home.searchExamplesLabel')}</span>
            {SEARCH_EXAMPLES.map((example) => (
              <LinkButton
                key={example}
                size="sm"
                onClick={() => {
                  if (runSearch(example)) setOpen(false);
                }}
              >
                {example}
              </LinkButton>
            ))}
          </p>
        </form>
      ) : null}
    </>
  );
}
