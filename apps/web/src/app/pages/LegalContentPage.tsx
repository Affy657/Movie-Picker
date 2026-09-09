import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { SUPPORT_EMAIL } from '@/shared/support/supportMailto';
import styles from './ContentPage.module.css';
import { buttonClass } from '@/shared/components/Button';

function withMailtoLinks(body: string): ReactNode {
  const parts = body.split(SUPPORT_EMAIL);
  if (parts.length === 1) return body;
  return parts.map((part, index) => (
    <Fragment key={`${index}-${part.slice(0, 12)}`}>
      {index > 0 ? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : null}
      {part}
    </Fragment>
  ));
}

export type LegalSection = {
  title: string;
  body: string;
  items?: readonly string[];
};

type LegalContentPageProps = {
  heading: string;
  intro: string;
  canonical: string;
  updatedAt: string;
  sections: readonly LegalSection[];
};

export default function LegalContentPage({
  heading,
  intro,
  canonical,
  updatedAt,
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
      <p className={styles.updatedAt}>{t('legal.updatedAt', { date: updatedAt })}</p>
      {sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <p>{withMailtoLinks(section.body)}</p>
          {section.items ? (
            <ul className={styles.sectionList}>
              {section.items.map((item) => (
                <li key={item.slice(0, 24)}>{withMailtoLinks(item)}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <Link to={ROUTES.home} className={buttonClass({ className: styles.backLink })}>
        {t('legal.backToApp')}
      </Link>
    </PageLayout>
  );
}
