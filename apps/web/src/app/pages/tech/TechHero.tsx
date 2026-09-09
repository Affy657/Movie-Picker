import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { TECH_METRICS, TECH_METRICS_BUILD_DATE } from './generated/techMetrics';
import { TechHint } from './TechBlocks';
import styles from './techPage.module.css';

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR').format(value);
}

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
  const { t, locale } = useTranslation();

  const metricHint = (key: string) =>
    key === 'metricTests'
      ? t('tech.hero.metricTestsHint', {
          web: TECH_METRICS.webTestCases,
          api: TECH_METRICS.apiTestCases,
          files: TECH_METRICS.testFiles,
        })
      : t(`tech.hero.${key}Hint` as TranslationKey);

  return (
    <header className={`${styles.hero} on-dark`}>
      <div className={styles.heroInner}>
        <p className={styles.heroEyebrow}>{t('tech.hero.eyebrow')}</p>
        <h1 className={styles.heroTitle}>{t('tech.hero.title')}</h1>
        <div className={styles.heroLeadGroup}>
          <p className={styles.heroLead}>{t('tech.hero.lead')}</p>
          <p className={styles.heroLead}>{t('tech.hero.leadIntent')}</p>
        </div>

        <ul className={styles.metrics}>
          {METRIC_KEYS.map(({ key, value, unitKey }) => (
            <li className={styles.metric} key={key}>
              <span className={styles.metricValue}>
                {formatNumber(value, locale)}
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
            </li>
          ))}
        </ul>

        <p className={styles.stamp}>{t('tech.hero.stamp', { date: TECH_METRICS_BUILD_DATE })}</p>
      </div>
    </header>
  );
}
