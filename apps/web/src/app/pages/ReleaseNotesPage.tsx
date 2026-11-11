import { useEffect } from 'react';
import changelogSource from '../../../../../CHANGELOG.md?raw';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { markReleaseNotesSeen } from '@/shared/releaseNotesSeen';
import { parseChangelog, type InlinePart } from './releaseNotes/parseChangelog';
import content from './ContentPage.module.css';
import styles from './ReleaseNotesPage.module.css';

const RELEASES = parseChangelog(changelogSource);

function Inline({ parts }: Readonly<{ parts: readonly InlinePart[] }>) {
  return (
    <>
      {parts.map((part, index) => {
        const key = `${index}-${part.text.slice(0, 12)}`;
        const text = part.code ? <code key={key}>{part.text}</code> : part.text;
        return part.strong ? <strong key={key}>{text}</strong> : <span key={key}>{text}</span>;
      })}
    </>
  );
}

export default function ReleaseNotesPage() {
  const { t, locale } = useTranslation();
  usePageSeo({
    title: pageTitle(t('releaseNotes.title')),
    description: t('releaseNotes.intro'),
    canonical: absoluteUrl(ROUTES.releaseNotes),
  });
  useEffect(() => markReleaseNotesSeen(), []);
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' });

  return (
    <PageLayout className={content.layout}>
      <h1 className={content.title}>{t('releaseNotes.title')}</h1>
      <p className={content.intro}>{t('releaseNotes.intro')}</p>
      {locale === 'fr' ? null : <p className={styles.note}>{t('releaseNotes.frenchOnly')}</p>}
      {RELEASES.map((release) => {
        const headingId = `version-${release.version.replaceAll('.', '-')}`;
        return (
          <section key={release.version} className={styles.release} aria-labelledby={headingId}>
            <h2 id={headingId} className={content.sectionTitle}>
              {t('releaseNotes.version', { version: release.version })}
            </h2>
            <p className={content.updatedAt}>
              <time dateTime={release.date}>
                {dateFormat.format(new Date(`${release.date}T12:00:00Z`))}
              </time>
            </p>
            {release.summary.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
            ))}
            {release.sections.map((section) => (
              <div key={section.kind} className={styles.group}>
                <h3 className={styles.groupTitle}>
                  {t(`releaseNotes.sections.${section.kind}` as TranslationKey)}
                </h3>
                <ul className={content.sectionList}>
                  {section.items.map((item, index) => (
                    <li key={`${index}-${item[0]?.text.slice(0, 16) ?? ''}`}>
                      <Inline parts={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </PageLayout>
  );
}
