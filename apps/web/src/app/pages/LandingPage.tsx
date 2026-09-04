import { Link } from 'react-router';
import { Clapperboard, Disc3, Link2, Sparkles, ThumbsUp } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { APP_DOCUMENT_TITLE } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { SITE_URL } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import styles from './LandingPage.module.css';

const LANDING_STEPS = [
  { slug: 'invite', Icon: Link2 },
  { slug: 'propose', Icon: Clapperboard },
  { slug: 'vote', Icon: ThumbsUp },
  { slug: 'wheel', Icon: Disc3 },
] as const;

export default function LandingPage() {
  const { t } = useTranslation();
  usePageSeo({
    title: APP_DOCUMENT_TITLE,
    description: t('landing.seoDescription'),
    imageAlt: t('landing.ogImageAlt'),
    canonical: `${SITE_URL}${ROUTES.discover}`,
    ogType: 'website',
  });

  return (
    <PageLayout className={styles.landing}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.kicker}>
            <Sparkles size={14} aria-hidden />
            <span className={styles.kickerText}>{t('landing.kicker')}</span>
          </span>
          <h1 className={styles.title}>
            {t('landing.titleLead')}{' '}
            <span className={styles.titleAccent}>{t('landing.titleAccent')}</span>
          </h1>
          <p className={styles.tagline}>{t('landing.tagline')}</p>
          <nav className={`nav-actions ${styles.cta}`} aria-label={t('home.actionsAriaLabel')}>
            <Link to={ROUTES.login} className={`btn ${styles.ctaPrimary}`}>
              {t('home.ctaLogin')}
            </Link>
            <Link to={ROUTES.register} className={`btn ${styles.ctaSecondary}`}>
              {t('home.ctaRegister')}
            </Link>
          </nav>
        </div>
      </header>

      <section aria-labelledby="landing-features-heading">
        <div className={styles.featuresHeader}>
          <p className={styles.featuresKicker}>{t('landing.stepsKicker')}</p>
          <h2 id="landing-features-heading" className={styles.featuresTitle}>
            {t('landing.stepsTitle')}
          </h2>
          <p className={styles.featuresSubtitle}>{t('landing.stepsSubtitle')}</p>
        </div>
        <ul className={styles.featureGrid}>
          {LANDING_STEPS.map(({ slug, Icon }) => (
            <li key={slug} className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden>
                <Icon size={24} />
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>{t(`landing.steps.${slug}.title`)}</h3>
                <p className={styles.featureText}>{t(`landing.steps.${slug}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </PageLayout>
  );
}
