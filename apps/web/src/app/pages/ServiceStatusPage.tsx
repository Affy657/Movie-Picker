import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  CircleCheck,
  CircleX,
  Database,
  Globe,
  RefreshCw,
  Server,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import PageLayout from '@/shared/components/PageLayout';
import Spinner from '@/shared/components/Spinner';
import StatusDot from '@/shared/components/StatusDot';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { APP_VERSION } from '@/shared/appVersion';
import { fetchServiceReadiness } from '@/shared/api/serviceReadiness';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useTranslation } from '@/shared/i18n';
import { formatRelativeTime } from '@/shared/utils/formatRelativeTime';
import { ROUTES } from '@/app/routes';
import {
  serviceStatusOf,
  type ServiceComponentState,
  type ServiceOverall,
} from './status/serviceStatus';
import content from './ContentPage.module.css';
import styles from './ServiceStatusPage.module.css';

const SERVICE_STATUS_REFRESH_MS = 30_000;

const JUST_NOW_MS = 5_000;

const CLOCK_TICK_MS = 1_000;

const SERVICE_READINESS_QUERY_KEY = ['service-readiness'] as const;

const OVERALL_TONE: Record<ServiceOverall, string | undefined> = {
  operational: styles.operational,
  degraded: styles.degraded,
  down: styles.down,
  checking: undefined,
  offline: undefined,
};

const COMPONENT_TONE: Record<ServiceComponentState, string | undefined> = {
  operational: styles.stateOperational,
  unavailable: styles.stateUnavailable,
  unknown: undefined,
  checking: undefined,
};

const OVERALL_ICON: Record<Exclude<ServiceOverall, 'checking'>, LucideIcon> = {
  operational: CircleCheck,
  degraded: TriangleAlert,
  down: CircleX,
  offline: WifiOff,
};

const COMPONENTS = [
  { key: 'site', Icon: Globe },
  { key: 'api', Icon: Server },
  { key: 'database', Icon: Database },
] as const;

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function OverallIcon({ overall }: Readonly<{ overall: ServiceOverall }>) {
  if (overall === 'checking') return <Spinner className={styles.summarySpinner} />;
  const Icon = OVERALL_ICON[overall];
  return <Icon size={ICON_SIZE['2xl']} className={styles.summaryIcon} aria-hidden />;
}

function useCheckedLabel(checkedAt: number, online: boolean, checking: boolean): string {
  const { t, locale } = useTranslation();
  const now = useNow();
  if (!checkedAt) {
    return checking && online ? t('serviceStatus.checking') : t('serviceStatus.neverChecked');
  }
  const when = formatRelativeTime(new Date(checkedAt).toISOString(), locale);
  if (!online) return t('serviceStatus.lastCheckedAt', { when });
  if (now - checkedAt < JUST_NOW_MS) return t('serviceStatus.checkedJustNow');
  return t('serviceStatus.checkedAt', { when });
}

export default function ServiceStatusPage() {
  const { t } = useTranslation();
  useNoindexPage(
    pageTitle(t('serviceStatus.title')),
    ROUTES.serviceStatus,
    t('serviceStatus.seoDescription')
  );
  const online = useOnlineStatus();
  const readiness = useQuery({
    queryKey: SERVICE_READINESS_QUERY_KEY,
    queryFn: ({ signal }) => fetchServiceReadiness({ signal }),
    refetchInterval: SERVICE_STATUS_REFRESH_MS,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const status = serviceStatusOf({ online, result: readiness.data });
  const checking = readiness.isFetching && online;
  const checkedLabel = useCheckedLabel(readiness.dataUpdatedAt, online, checking);

  return (
    <PageLayout className={content.layout}>
      <h1 className={content.title}>{t('serviceStatus.title')}</h1>
      <p className={content.intro}>{t('serviceStatus.intro')}</p>
      <output className={clsx(styles.summary, OVERALL_TONE[status.overall])} aria-live="polite">
        <OverallIcon overall={status.overall} />
        <span className={styles.summaryText}>
          <strong className={styles.summaryTitle}>
            {t(`serviceStatus.overall.${status.overall}.title`)}
          </strong>
          <span className={styles.summaryMessage}>
            {t(`serviceStatus.overall.${status.overall}.message`)}
          </span>
        </span>
      </output>
      <Card
        as="ul"
        padding="none"
        className={styles.components}
        aria-label={t('serviceStatus.componentsLabel')}
      >
        {COMPONENTS.map(({ key, Icon }) => (
          <li key={key} className={styles.component}>
            <span className={styles.componentIcon}>
              <Icon size={ICON_SIZE.xl} aria-hidden />
            </span>
            <span className={styles.componentText}>
              <span className={styles.componentName}>
                {t(`serviceStatus.components.${key}.name`)}
              </span>
              <span className={styles.componentDetail}>
                {t(`serviceStatus.components.${key}.detail`)}
              </span>
            </span>
            <span className={clsx(styles.componentState, COMPONENT_TONE[status[key]])}>
              <StatusDot />
              {t(`serviceStatus.states.${key}.${status[key]}`)}
            </span>
          </li>
        ))}
      </Card>
      <div className={styles.meta}>
        <p className={styles.checkedAt}>{checkedLabel}</p>
        <p className={styles.versions}>
          <span>{t('serviceStatus.version', { version: APP_VERSION })}</span>
          {status.release ? (
            <span>{t('serviceStatus.apiRelease', { release: status.release })}</span>
          ) : null}
        </p>
        <Button
          size="sm"
          className={styles.checkNow}
          loading={checking}
          disabled={!online}
          onClick={() => void readiness.refetch()}
        >
          {checking ? null : <RefreshCw size={ICON_SIZE.md} aria-hidden />}
          {t('serviceStatus.checkNow')}
        </Button>
      </div>
    </PageLayout>
  );
}
