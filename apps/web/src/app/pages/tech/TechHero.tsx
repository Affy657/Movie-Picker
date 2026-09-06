import { useTranslation } from '@/shared/i18n';
import { TECH_METRICS, TECH_METRICS_BUILD_DATE } from './generated/techMetrics';
import styles from './techPage.module.css';

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR').format(value);
}

export default function TechHero() {
  const { t, locale } = useTranslation();

  const credits = [
    { term: t('tech.hero.production'), value: t('tech.hero.productionValue') },
    { term: t('tech.hero.period'), value: t('tech.hero.periodValue') },
    { term: t('tech.hero.format'), value: t('tech.hero.formatValue') },
    { term: t('tech.hero.ui'), value: t('tech.hero.uiValue') },
    { term: t('tech.hero.server'), value: t('tech.hero.serverValue') },
    { term: t('tech.hero.delivery'), value: t('tech.hero.deliveryValue') },
  ];

  const metrics = [
    { value: TECH_METRICS.linesOfCode, label: t('tech.hero.metricLines') },
    { value: TECH_METRICS.endpoints, label: t('tech.hero.metricEndpoints') },
    { value: TECH_METRICS.testFiles, label: t('tech.hero.metricTests') },
    { value: TECH_METRICS.ciJobs, label: t('tech.hero.metricJobs') },
  ];

  return (
    <header className={`${styles.hero} on-dark`}>
      <div className={styles.heroInner}>
        <p className={styles.heroEyebrow}>{t('tech.hero.eyebrow')}</p>
        <h1 className={styles.heroTitle}>
          {t('tech.hero.titleLead')}
          <br />
          {t('tech.hero.titleAccent')}
        </h1>
        <p className={styles.heroLead}>{t('tech.hero.lead')}</p>

        <dl className={styles.credits} aria-label={t('tech.hero.creditsLabel')}>
          {credits.map((credit) => (
            <div key={credit.term} className={styles.creditRow}>
              <dt className={styles.creditTerm}>{credit.term}</dt>
              <dd className={styles.creditValue}>{credit.value}</dd>
            </div>
          ))}
        </dl>

        <ul className={styles.metrics}>
          {metrics.map((metric) => (
            <li className={styles.metric} key={metric.label}>
              <span className={styles.metricValue}>{formatNumber(metric.value, locale)}</span>
              <span className={styles.metricLabel}>{metric.label}</span>
            </li>
          ))}
        </ul>

        <p className={styles.stamp}>{t('tech.hero.stamp', { date: TECH_METRICS_BUILD_DATE })}</p>
      </div>
    </header>
  );
}
