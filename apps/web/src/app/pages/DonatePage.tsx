import { Link } from 'react-router';
import { HeartHandshake } from 'lucide-react';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation } from '@/shared/i18n';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { ROUTES } from '@/app/routes';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import { KOFI_URL } from '@/shared/donations/kofi';
import content from './ContentPage.module.css';
import styles from './DonatePage.module.css';

export default function DonatePage() {
  const { t } = useTranslation();
  const { track } = useAnalytics();

  usePageSeo({
    title: pageTitle(t('donate.title')),
    description: t('donate.seoDescription'),
    canonical: absoluteUrl(ROUTES.donate),
  });

  return (
    <PageLayout className={content.layout}>
      <h1 className={content.title}>{t('donate.title')}</h1>
      <p className={content.intro}>{t('donate.intro')}</p>

      <section className={styles.kofiCard} aria-labelledby="donate-kofi-heading">
        <span className={styles.kofiIcon} aria-hidden>
          <HeartHandshake size={28} />
        </span>
        <h2 id="donate-kofi-heading" className={styles.kofiTitle}>
          {t('donate.kofiTitle')}
        </h2>
        <p className={styles.kofiBody}>{t('donate.kofiBody')}</p>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          aria-label={t('donate.kofiCtaAria')}
          onClick={() => track('donation_link_clicked', { provider: 'kofi' })}
        >
          {t('donate.kofiCta')}
        </a>
        <p className={styles.kofiNote}>{t('donate.kofiNote')}</p>
      </section>

      <section className={content.section}>
        <h2 className={content.sectionTitle}>{t('donate.costsTitle')}</h2>
        <p>{t('donate.costsIntro')}</p>
        <ul className={styles.costs}>
          <li>{t('donate.costsHosting')}</li>
          <li>{t('donate.costsDatabase')}</li>
          <li>{t('donate.costsDomain')}</li>
          <li>{t('donate.costsMonitoring')}</li>
        </ul>
      </section>

      <section className={content.section}>
        <h2 className={content.sectionTitle}>{t('donate.noPerksTitle')}</h2>
        <p>{t('donate.noPerksBody')}</p>
      </section>

      <section className={content.section}>
        <h2 className={content.sectionTitle}>{t('donate.badgeTitle')}</h2>
        <p>{t('donate.badgeBody')}</p>
        <p>{t('donate.badgeMismatch', { email: SUPPORT_EMAIL })}</p>
      </section>

      <Link to={ROUTES.home} className={`btn ${content.backLink}`}>
        {t('donate.back')}
      </Link>
    </PageLayout>
  );
}
