import { Link } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import styles from './ContentPage.module.css';

export default function LegalNoticePage() {
  const { t } = useTranslation();
  usePageSeo({
    title: pageTitle(t('legal.noticeTitle')),
    canonical: absoluteUrl(ROUTES.legalNotice),
    noindex: true,
  });

  return (
    <PageLayout className={styles.layout}>
      <h1 className={styles.title}>{t('legal.noticeTitle')}</h1>
      <p className={styles.intro}>{t('legal.noticeIntro')}</p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.noticeEditorTitle')}</h2>
        <p>{t('legal.noticeEditorBody', { email: SUPPORT_EMAIL })}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.noticeHostingTitle')}</h2>
        <p>{t('legal.noticeHostingBody')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.noticeIpTitle')}</h2>
        <p>{t('legal.noticeIpBody')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.noticeDonationsTitle')}</h2>
        <p>{t('legal.noticeDonationsBody')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('legal.noticeContactTitle')}</h2>
        <p>{t('legal.noticeContactBody', { email: SUPPORT_EMAIL })}</p>
      </section>

      <Link to={ROUTES.home} className={`btn ${styles.backLink}`}>
        {t('legal.backToApp')}
      </Link>
    </PageLayout>
  );
}
