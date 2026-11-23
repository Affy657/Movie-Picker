import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { buttonClass, withNudgedText } from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { TECH_METRICS, TECH_METRICS_BUILD_DATE } from './generated/techMetrics';
import { TECH_PAGE_LAST_UPDATE } from './lastUpdate';
import { TechHint } from './TechBlocks';
import { GitHubLogo } from './TechLogos';
import { useTechFormat } from './techFormat';
import styles from './techPage.module.css';

export const SOURCE_REPOSITORY_URL = 'https://github.com/Affy657/Movie-Picker';

type HeroMetric = {
  key: string;
  value: number;
  unitKey?: TranslationKey;
};

const METRIC_KEYS: readonly HeroMetric[] = [
  { key: 'metricLines', value: TECH_METRICS.linesOfCode },
  { key: 'metricEndpoints', value: TECH_METRICS.endpoints },
  { key: 'metricTests', value: TECH_METRICS.testCases },
  { key: 'metricCommits', value: TECH_METRICS.commits },
  { key: 'metricMonths', value: TECH_METRICS.monthsActive, unitKey: 'tech.hero.metricMonthsUnit' },
  {
    key: 'metricCoverage',
    value: TECH_METRICS.coverageLines,
    unitKey: 'tech.hero.metricCoverageUnit',
  },
];

export default function TechHero() {
  const { t } = useTranslation();
  const format = useTechFormat();

  const metricHint = (key: string) =>
    key === 'metricTests'
      ? t('tech.hero.metricTestsHint', {
          web: format.number(TECH_METRICS.webTestCases),
          api: format.number(TECH_METRICS.apiTestCases),
          e2e: format.number(TECH_METRICS.e2eTestCases),
          files: format.number(TECH_METRICS.testFiles + TECH_METRICS.e2eScenarios),
        })
      : t(`tech.hero.${key}Hint` as TranslationKey);

  return (
    <header className={`${styles.hero} on-dark`}>
      <div className={styles.heroInner}>
        <p className={styles.heroEyebrow}>{t('tech.hero.eyebrow')}</p>
        <h1 className={styles.heroTitle}>{t('tech.hero.title')}</h1>
        <div className={styles.heroByline}>
          <p className={styles.heroAuthor}>{t('tech.hero.byline')}</p>
          <a
            href={SOURCE_REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('tech.hero.sourceLinkAria')}
            className={buttonClass({ variant: 'secondary', size: 'sm' })}
          >
            {withNudgedText([
              <GitHubLogo key="logo" size={ICON_SIZE.md} />,
              t('tech.hero.sourceLink'),
            ])}
          </a>
        </div>
        <div className={styles.heroLeadGroup}>
          <p className={styles.heroLead}>{t('tech.hero.lead')}</p>
          <p className={styles.heroLead}>{t('tech.hero.leadIntent')}</p>
        </div>

        <ul className={styles.metrics}>
          {METRIC_KEYS.map(({ key, value, unitKey }) => (
            <li className={styles.metric} key={key}>
              <span className={styles.metricValue}>
                {format.number(value)}
                {unitKey ? (
                  <>
                    {' '}
                    <span className={styles.metricUnit}>{t(unitKey)}</span>
                  </>
                ) : null}
              </span>
              <span className={styles.metricLabel}>
                <TechHint label={metricHint(key)} placement="bottom" className={styles.metricHint}>
                  {t(`tech.hero.${key}` as TranslationKey)}
                </TechHint>
              </span>
              {key === 'metricLines' ? (
                <span className={styles.metricDetail}>
                  {t('tech.hero.metricLinesDetail', {
                    share: format.number(TECH_METRICS.testLinesShare),
                  })}
                </span>
              ) : null}
            </li>
          ))}
        </ul>

        <p className={styles.stamp}>
          {t('tech.hero.stamp', {
            update: format.date(TECH_PAGE_LAST_UPDATE),
            build: format.date(TECH_METRICS_BUILD_DATE),
          })}
        </p>
      </div>
    </header>
  );
}
