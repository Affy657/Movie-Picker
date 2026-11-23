import { useEffect } from 'react';
import { useLocation } from 'react-router';
import changelogSource from '../../../../../CHANGELOG.md?raw';
import PageLayout from '@/shared/components/PageLayout';
import { usePageSeo } from '@/shared/hooks/usePageSeo';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { absoluteUrl } from '@/shared/seo/siteMeta';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { markReleaseNotesSeen } from '@/shared/releaseNotesSeen';
import {
  parseChangelog,
  type ChangelogRelease,
  type InlinePart,
} from './releaseNotes/parseChangelog';
import content from './ContentPage.module.css';
import styles from './ReleaseNotesPage.module.css';

const RELEASES = parseChangelog(changelogSource);

export const RECENT_RELEASES = 5;

const DATE_LOCALE = { fr: 'fr-FR', en: 'en-GB' } as const;

function releaseAnchor(version: string) {
  return `version-${version.replaceAll('.', '-')}`;
}

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

function ReleaseTitle({ release }: Readonly<{ release: ChangelogRelease }>) {
  const { t } = useTranslation();
  return (
    <h2 id={releaseAnchor(release.version)} className={content.sectionTitle}>
      {t('releaseNotes.version', { version: release.version })}
    </h2>
  );
}

function ReleaseBody({ release }: Readonly<{ release: ChangelogRelease }>) {
  const { t } = useTranslation();
  return (
    <>
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
    </>
  );
}

export default function ReleaseNotesPage() {
  const { t, locale } = useTranslation();
  const { hash } = useLocation();
  usePageSeo({
    title: pageTitle(t('releaseNotes.title')),
    description: t('releaseNotes.intro'),
    canonical: absoluteUrl(ROUTES.releaseNotes),
  });
  useEffect(() => markReleaseNotesSeen(), []);
  const dateFormat = new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
  const formatDate = (release: ChangelogRelease) =>
    dateFormat.format(new Date(`${release.date}T12:00:00Z`));
  const targeted = hash.slice(1);

  return (
    <PageLayout className={content.layout}>
      <h1 className={content.title}>{t('releaseNotes.title')}</h1>
      <p className={content.intro}>{t('releaseNotes.intro')}</p>
      {locale === 'fr' ? null : <p className={styles.note}>{t('releaseNotes.frenchOnly')}</p>}
      {RELEASES.slice(0, RECENT_RELEASES).map((release) => (
        <section
          key={release.version}
          className={styles.release}
          aria-labelledby={releaseAnchor(release.version)}
        >
          <ReleaseTitle release={release} />
          <p className={content.updatedAt}>
            <time dateTime={release.date}>{formatDate(release)}</time>
          </p>
          <ReleaseBody release={release} />
        </section>
      ))}
      <div className={styles.older}>
        {RELEASES.slice(RECENT_RELEASES).map((release) => (
          <details
            key={release.version}
            className={styles.folded}
            open={targeted === releaseAnchor(release.version)}
          >
            <summary className={styles.foldedSummary}>
              <ReleaseTitle release={release} />
              <time className={styles.foldedDate} dateTime={release.date}>
                {formatDate(release)}
              </time>
            </summary>
            <div className={styles.foldedBody}>
              <ReleaseBody release={release} />
            </div>
          </details>
        ))}
      </div>
    </PageLayout>
  );
}
