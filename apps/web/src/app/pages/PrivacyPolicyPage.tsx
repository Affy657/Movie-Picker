import { Link } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import styles from './ContentPage.module.css';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  usePageSeo({
    title: pageTitle(t('legal.privacyTitle')),
    canonical: absoluteUrl(ROUTES.privacyPolicy),
    noindex: true,
  });

  return (
    <PageLayout className={styles.layout}>
      <h1 className={styles.title}>{t('legal.privacyTitle')}</h1>
      <p className={styles.intro}>{t('legal.privacyIntro')}</p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.privacyDataTitle')}</h2>
        <p>{t('legal.privacyDataBody')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.privacyOAuthTitle')}</h2>
        <p>{t('legal.privacyOAuthBody')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.privacyDonationsTitle')}</h2>
        <p>{t('legal.privacyDonationsBody')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.privacyRetentionTitle')}</h2>
        <p>{t('legal.privacyRetentionBody')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.privacyRightsTitle')}</h2>
        <p>{t('legal.privacyRightsBody', { email: SUPPORT_EMAIL })}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.privacyContactTitle')}</h2>
        <p>{t('legal.privacyContactBody', { email: SUPPORT_EMAIL })}</p>
      </section>

      <Link to={ROUTES.home} className={`btn ${styles.backLink}`}>
        {t('legal.backToApp')}
      </Link>
    </PageLayout>
  );
}
