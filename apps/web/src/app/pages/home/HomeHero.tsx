import { useEffect, useRef, useState, type RefObject, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Plus } from 'lucide-react';
import Button, { buttonClass } from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import SearchField from '@/shared/components/SearchField';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { takeWelcomePending } from '@/features/auth/welcome';
import UpcomingEventCard from '@/features/events/pages/my-events/UpcomingEventCard';
import { useOpenCreateEvent } from '@/features/events/components/create-event/createEventDialogContext';
import GlobalSearchResults from '@/app/components/globalSearch/GlobalSearchResults';
import { useResultsKeyboard } from '@/app/components/globalSearch/resultsKeyboard';
import HomePosterWall from './HomePosterWall';
import WheelGlyph from './WheelGlyph';
import { useNextEvent } from './useNextEvent';
import { useRunSearch } from './homeSearch';
import SearchExamples from './SearchExamples';
import { setHomeSearchHidden } from './homeSearchVisibility';
import styles from './HomeHero.module.css';

function coveredTopPx(element: Element): number {
  return Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
}

function useReportSearchVisibility(form: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const element = form.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const coveredTop = coveredTopPx(element);
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry) return;
        setHomeSearchHidden(!entry.isIntersecting && entry.boundingClientRect.top < coveredTop);
      },
      { rootMargin: `-${coveredTop}px 0px 0px 0px` }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      setHomeSearchHidden(false);
    };
  }, [form]);
}

function HomeSearch() {
  const { t } = useTranslation();
  const runSearch = useRunSearch();
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  useReportSearchVisibility(formRef);
  useResultsKeyboard(formRef, showResults);
  useClickOutside(formRef, () => setShowResults(false), showResults, {
    closeOnFocusLeave: true,
    returnFocusTo: fieldRef,
  });

  const typeSearch = (value: string) => {
    setSearchTerm(value);
    setShowResults(true);
  };

  const submitSearch = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch(searchTerm);
  };

  return (
    <div className={styles.opener}>
      <h1 className={styles.title}>{t('home.title')}</h1>
      <p className={styles.intro}>{t('home.intro')}</p>
      <form ref={formRef} className={styles.searchForm} role="search" onSubmit={submitSearch}>
        <label className="visually-hidden" htmlFor="home-search">
          {t('globalSearch.label')}
        </label>
        <SearchField
          ref={fieldRef}
          id="home-search"
          className={styles.searchField}
          value={searchTerm}
          onChange={typeSearch}
          placeholder={t('globalSearch.placeholder')}
          iconSize={ICON_SIZE.md}
        />
        {showResults ? (
          <GlobalSearchResults
            term={searchTerm}
            source="home"
            className={styles.searchResults}
            onPick={() => setShowResults(false)}
          />
        ) : null}
      </form>
      <SearchExamples onPick={runSearch} />
    </div>
  );
}

type Welcome = { name: string; handle: string };

function CreateNightCard({
  isMobile,
  onCreate,
  welcome,
}: Readonly<{ isMobile: boolean; onCreate: (() => void) | null; welcome?: Welcome }>) {
  const { t } = useTranslation();
  const title = welcome
    ? t('home.welcome.title', { name: welcome.name })
    : t('home.createNight.title');
  const action = welcome ? t('home.welcome.action') : t('home.createNight.action');

  if (isMobile) {
    const content = (
      <>
        <WheelGlyph className={styles.wheelSmall} />
        <span className={styles.createText}>
          <span className={styles.createTitle}>{title}</span>
          <span className={styles.createBody}>
            {welcome ? action : t('home.createNight.bodyShort')}
          </span>
        </span>
        <ChevronRight size={ICON_SIZE.md} aria-hidden className={styles.createChevron} />
      </>
    );
    return onCreate ? (
      <Card
        as="button"
        type="button"
        onClick={onCreate}
        interactive
        padding="none"
        className={styles.createCompact}
      >
        {content}
      </Card>
    ) : (
      <Card
        as={Link}
        to={ROUTES.createEvent}
        interactive
        padding="none"
        className={styles.createCompact}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card padding="none" radius="lg" className={styles.createCard}>
      <WheelGlyph className={styles.wheel} />
      <div className={styles.createText}>
        <p className={styles.createTitle}>{title}</p>
        <p className={styles.createBody}>
          {welcome
            ? t('home.welcome.body', { handle: welcome.handle })
            : t('home.createNight.body')}
        </p>
        <div className={styles.createActions}>
          {onCreate ? (
            <Button variant="primary" onClick={onCreate}>
              {action}
            </Button>
          ) : (
            <Link to={ROUTES.createEvent} className={buttonClass({ variant: 'primary' })}>
              {action}
            </Link>
          )}
          <Link to={ROUTES.howItWorks} className={styles.textLink}>
            {t('home.createNight.howItWorks')}
            <ChevronRight size={ICON_SIZE.sm} aria-hidden />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function NightPanel() {
  const { t } = useTranslation();
  const openCreateEvent = useOpenCreateEvent();
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const next = useNextEvent(!!user);
  const [welcomePending] = useState(takeWelcomePending);
  const welcome =
    welcomePending && user ? { name: user.displayName, handle: user.handle } : undefined;

  if (isLoading || next.isPending) {
    return <div className={styles.panelPlaceholder} aria-hidden="true" />;
  }

  if (!next.event) {
    return (
      <CreateNightCard
        isMobile={isMobile}
        onCreate={user ? () => openCreateEvent() : null}
        welcome={welcome}
      />
    );
  }

  if (isMobile) {
    return <UpcomingEventCard event={next.event} eyebrow={t('home.nextEvent.title')} />;
  }

  return (
    <div className={styles.nextEvent}>
      <div className={styles.nextEventHeader}>
        <p className={styles.eyebrow}>{t('home.nextEvent.title')}</p>
        <Link to={ROUTES.myEvents} className={styles.textLink}>
          {t('nav.myEvents')}
          <ChevronRight size={ICON_SIZE.sm} aria-hidden />
        </Link>
      </div>
      <UpcomingEventCard event={next.event} />
      <Button variant="secondary" fullWidth onClick={() => openCreateEvent()}>
        <Plus size={ICON_SIZE.sm} aria-hidden />
        {t('home.nextEvent.createAnother')}
      </Button>
    </div>
  );
}

export default function HomeHero() {
  return (
    <div className={styles.hero}>
      <HomePosterWall />
      <div className={styles.inner}>
        <HomeSearch />
        <div className={styles.panel}>
          <NightPanel />
        </div>
      </div>
    </div>
  );
}
