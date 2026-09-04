import { Link } from 'react-router';
import { Clapperboard, Disc3, Link2, Sparkles, ThumbsUp } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { APP_DOCUMENT_TITLE } from '@/shared/hooks/useDocumentTitle';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { SITE_URL } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  usePageSeo({
    title: APP_DOCUMENT_TITLE,
    canonical: `${SITE_URL}${ROUTES.discover}`,
    ogType: 'website',
  });
  const { t } = useTranslation();

  return (
    <PageLayout className={styles.landing}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.kicker}>
            <Sparkles size={14} aria-hidden />
            <span className={styles.kickerText}>Movie night, simplifiée</span>
          </span>
          <h1 className={styles.title}>
            Choisissez le film de la soirée <span className={styles.titleAccent}>ensemble.</span>
          </h1>
          <p className={styles.tagline}>
            Plus de débats interminables. Créez un événement, invitez vos amis, votez sur les
            propositions — et laissez la roue trancher si besoin.
          </p>
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
          <p className={styles.featuresKicker}>En 4 étapes</p>
          <h2 id="landing-features-heading" className={styles.featuresTitle}>
            De l'invitation au générique
          </h2>
          <p className={styles.featuresSubtitle}>
            Une soirée ciné qui démarre vraiment à l'heure. Promis.
          </p>
        </div>
        <ul className={styles.featureGrid}>
          <li className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden>
              <Link2 size={24} />
            </span>
            <div className={styles.featureBody}>
              <h3 className={styles.featureTitle}>Lancez la soirée</h3>
              <p className={styles.featureText}>
                Un lien, un QR code — tout le monde rejoint en deux clics.
              </p>
            </div>
          </li>
          <li className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden>
              <Clapperboard size={24} />
            </span>
            <div className={styles.featureBody}>
              <h3 className={styles.featureTitle}>Proposez vos films</h3>
              <p className={styles.featureText}>
                Affiches, infos, plateformes : la liste se construit toute seule depuis TMDB.
              </p>
            </div>
          </li>
          <li className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden>
              <ThumbsUp size={24} />
            </span>
            <div className={styles.featureBody}>
              <h3 className={styles.featureTitle}>Votez ensemble</h3>
              <p className={styles.featureText}>
                Pouce en l'air, déjà vu, on garde — les favoris du groupe ressortent vite.
              </p>
            </div>
          </li>
          <li className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden>
              <Disc3 size={24} />
            </span>
            <div className={styles.featureBody}>
              <h3 className={styles.featureTitle}>La roue tranche</h3>
              <p className={styles.featureText}>
                Toujours pas d'accord ? Un coup de roue et le verdict tombe.
              </p>
            </div>
          </li>
        </ul>
      </section>
    </PageLayout>
  );
}
