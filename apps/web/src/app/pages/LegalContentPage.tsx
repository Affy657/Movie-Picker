import { Link } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import styles from './ContentPage.module.css';

export type LegalSection = {
  title: string;
  body: string;
};

type LegalContentPageProps = {
  heading: string;
  intro: string;
  canonical: string;
  sections: readonly LegalSection[];
};

export default function LegalContentPage({
  heading,
  intro,
  canonical,
  sections,
}: Readonly<LegalContentPageProps>) {
  const { t } = useTranslation();
  usePageSeo({
    title: pageTitle(heading),
    canonical,
    noindex: true,
  });

  return (
    <PageLayout className={styles.layout}>
      <h1 className={styles.title}>{heading}</h1>
      <p className={styles.intro}>{intro}</p>
      {sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}
      <Link to={ROUTES.home} className={`btn ${styles.backLink}`}>
        {t('legal.backToApp')}
      </Link>
    </PageLayout>
  );
}
