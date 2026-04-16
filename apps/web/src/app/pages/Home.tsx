import { Link } from 'react-router-dom';
import { Clapperboard, Disc3, Link2, ThumbsUp } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { APP_DOCUMENT_TITLE, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { ROUTES } from '@/app/routes';
import styles from './Home.module.css';

export default function Home() {
  useDocumentTitle(APP_DOCUMENT_TITLE);

  return (
    <PageLayout className={styles.landing}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Movie Picker</h1>
        <p className={styles.tagline}>Choisissez le film de la soirée à plusieurs.</p>
        <nav className={`nav-actions ${styles.cta}`} aria-label="Actions principales">
          <Link to={ROUTES.createEvent} className="btn btn-primary">
            Créer une soirée
          </Link>
        </nav>
      </header>

      <section aria-labelledby="landing-features-heading">
        <h2 id="landing-features-heading" className="visually-hidden">
          Fonctionnalités
        </h2>
        <ul className={styles.featureGrid}>
          <li className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden>
              <Link2 size={28} />
            </span>
            <div className={styles.featureBody}>
              <h3 className={styles.featureTitle}>Soirée partagée</h3>
              <p className={styles.featureText}>
                Créez un événement, partagez le lien ou le QR code : tout le monde rejoint la même
                liste.
              </p>
            </div>
          </li>
          <li className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden>
              <Clapperboard size={28} />
            </span>
            <div className={styles.featureBody}>
              <h3 className={styles.featureTitle}>Films TMDB</h3>
              <p className={styles.featureText}>
                Recherchez et ajoutez des films depuis la base TMDB, avec affiches et infos.
              </p>
            </div>
          </li>
          <li className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden>
              <ThumbsUp size={28} />
            </span>
            <div className={styles.featureBody}>
              <h3 className={styles.featureTitle}>Votes et réactions</h3>
              <p className={styles.featureText}>
                Chacun donne son avis sur les propositions pour faire émerger les favoris du groupe.
              </p>
            </div>
          </li>
          <li className={styles.feature}>
            <span className={styles.featureIcon} aria-hidden>
              <Disc3 size={28} />
            </span>
            <div className={styles.featureBody}>
              <h3 className={styles.featureTitle}>La roue tranche</h3>
              <p className={styles.featureText}>
                En cas d’égalité ou pour le fun, lancez la roue pour désigner le film de la soirée.
              </p>
            </div>
          </li>
        </ul>
      </section>
    </PageLayout>
  );
}
