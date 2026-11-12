import { useEffect, useRef, useState, type RefObject, type SubmitEvent } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Plus } from 'lucide-react';
import { buttonClass } from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import SearchField from '@/shared/components/SearchField';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import UpcomingEventCard from '@/features/events/pages/my-events/UpcomingEventCard';
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
  const formRef = useRef<HTMLFormElement>(null);
  useReportSearchVisibility(formRef);

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
          {t('home.searchLabel')}
        </label>
        <SearchField
          id="home-search"
          className={styles.searchField}
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={t('home.searchPlaceholder')}
          iconSize={ICON_SIZE.md}
        />
      </form>
      <SearchExamples onPick={runSearch} />
    </div>
  );
}

function CreateNightCard({ isMobile }: Readonly<{ isMobile: boolean }>) {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <Card
        as={Link}
        to={ROUTES.createEvent}
        interactive
        padding="none"
        className={styles.createCompact}
      >
        <WheelGlyph className={styles.wheelSmall} />
        <span className={styles.createText}>
          <span className={styles.createTitle}>{t('home.createNight.title')}</span>
          <span className={styles.createBody}>{t('home.createNight.bodyShort')}</span>
        </span>
        <ChevronRight size={ICON_SIZE.md} aria-hidden className={styles.createChevron} />
      </Card>
    );
  }

  return (
    <Card padding="none" radius="lg" className={styles.createCard}>
      <WheelGlyph className={styles.wheel} />
      <div className={styles.createText}>
        <p className={styles.createTitle}>{t('home.createNight.title')}</p>
        <p className={styles.createBody}>{t('home.createNight.body')}</p>
        <div className={styles.createActions}>
          <Link to={ROUTES.createEvent} className={buttonClass({ variant: 'primary' })}>
            {t('home.createNight.action')}
          </Link>
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
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const next = useNextEvent(!!user);

  if (isLoading || next.isPending) {
    return <div className={styles.panelPlaceholder} aria-hidden="true" />;
  }

  if (!next.event) return <CreateNightCard isMobile={isMobile} />;

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
      <Link
        to={ROUTES.createEvent}
        className={buttonClass({ variant: 'secondary', fullWidth: true })}
      >
        <Plus size={ICON_SIZE.sm} aria-hidden />
        {t('home.nextEvent.createAnother')}
      </Link>
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
