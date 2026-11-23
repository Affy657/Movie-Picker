import { Fragment, useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Bookmark,
  CalendarDays,
  ChevronRight,
  Film,
  Layers,
  SearchX,
  Users,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import Avatar from '@/shared/components/Avatar';
import { buttonClass } from '@/shared/components/Button';
import EmptyState from '@/shared/components/EmptyState';
import InlineError from '@/shared/components/InlineError';
import Spinner from '@/shared/components/Spinner';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { GlobalSearchKind } from '@/shared/analytics/usageCounts';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation, type LocaleCode, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import { posterImageSrc, posterSrcAtSize } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import { useGlobalSearch, type GlobalSearchResponse } from './globalSearchApi';
import { SEARCH_RESULT_ATTRIBUTE } from './resultsKeyboard';
import styles from './GlobalSearchResults.module.css';

export type GlobalSearchSource = 'header' | 'home';

type Pick = (kind: GlobalSearchKind) => void;

interface ResultRow {
  key: string;
  to: string;
  media: ReactNode;
  name: string;
  meta: readonly (string | null)[];
}

interface FoundSection {
  kind: GlobalSearchKind;
  label: string;
  rows: ResultRow[];
}

const resultMarker = { [SEARCH_RESULT_ATTRIBUTE]: '' };

function countOf(found: GlobalSearchResponse): number {
  return (
    found.titles.length +
    found.sagas.length +
    found.nights.length +
    found.groups.length +
    found.lists.length +
    found.members.length +
    found.publicLists.length
  );
}

function PosterThumb({
  posterPath,
  Icon,
}: Readonly<{ posterPath: string | null; Icon: LucideIcon }>) {
  const src = posterSrcAtSize(posterImageSrc(posterPath), 'w92');
  return (
    <span className={styles.poster} aria-hidden>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" />
      ) : (
        <Icon size={ICON_SIZE.sm} />
      )}
    </span>
  );
}

function IconTile({ Icon }: Readonly<{ Icon: LucideIcon }>) {
  return (
    <span className={styles.tile} aria-hidden>
      <Icon size={ICON_SIZE.md} />
    </span>
  );
}

function ResultLink({ row, onOpen }: Readonly<{ row: ResultRow; onOpen: () => void }>) {
  const details = row.meta.filter((part): part is string => Boolean(part));
  return (
    <li>
      <Link to={row.to} className={styles.row} onClick={onOpen} {...resultMarker}>
        {row.media}
        <span className={styles.text}>
          <span className={styles.name}>{row.name}</span>
          {details.length > 0 ? (
            <>
              {' '}
              <span className={styles.meta}>
                {details.map((part, index) => (
                  <Fragment key={part}>
                    {index > 0 ? ' ' : null}
                    <span>{part}</span>
                  </Fragment>
                ))}
              </span>
            </>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

function ResultSection({
  section,
  onPick,
  children,
}: Readonly<{ section: FoundSection; onPick: Pick; children?: ReactNode }>) {
  const labelId = useId();
  return (
    <section className={styles.section} aria-labelledby={labelId}>
      <h2 id={labelId} className={styles.sectionLabel}>
        {section.label}
      </h2>
      <ul className={styles.list}>
        {section.rows.map((row) => (
          <ResultLink key={row.key} row={row} onOpen={() => onPick(section.kind)} />
        ))}
      </ul>
      {children}
    </section>
  );
}

function filmCount(count: number, t: Translate) {
  return pluralizeCount(count, 'globalSearch.filmsOne', 'globalSearch.filmsMany', t);
}

function foundSections(
  found: GlobalSearchResponse,
  t: Translate,
  locale: LocaleCode
): FoundSection[] {
  const sections: FoundSection[] = [
    {
      kind: 'title',
      label: t('globalSearch.sections.titles'),
      rows: found.titles.map((title) => ({
        key: `${title.mediaType}-${title.tmdbId}`,
        to: ROUTES.moviePage(title),
        media: <PosterThumb posterPath={title.posterPath} Icon={Film} />,
        name: title.title,
        meta: [title.year, title.mediaType === 'tv' ? t('globalSearch.series') : null],
      })),
    },
    {
      kind: 'saga',
      label: t('globalSearch.sections.sagas'),
      rows: found.sagas.map((saga) => ({
        key: String(saga.id),
        to: ROUTES.movieCollection(saga.id),
        media: <PosterThumb posterPath={saga.posterPath} Icon={Layers} />,
        name: saga.name,
        meta: [filmCount(saga.movieCount, t)],
      })),
    },
    {
      kind: 'night',
      label: t('globalSearch.sections.nights'),
      rows: found.nights.map((night) => ({
        key: night.slug,
        to: ROUTES.eventDetail(night.slug),
        media: <IconTile Icon={CalendarDays} />,
        name: night.title,
        meta: [
          formatMyEventsListDate(night.date, locale),
          night.isFinished ? t('globalSearch.finishedNight') : null,
        ],
      })),
    },
    {
      kind: 'group',
      label: t('globalSearch.sections.groups'),
      rows: found.groups.map((group) => ({
        key: group.id,
        to: ROUTES.group(group.id),
        media: <IconTile Icon={Users} />,
        name: group.name,
        meta: [
          pluralizeCount(
            group.memberCount,
            'globalSearch.membersOne',
            'globalSearch.membersMany',
            t
          ),
        ],
      })),
    },
    {
      kind: 'list',
      label: t('globalSearch.sections.lists'),
      rows: found.lists.map((list) => ({
        key: list.id,
        to: ROUTES.list(list.id),
        media: <PosterThumb posterPath={list.posterPath} Icon={Bookmark} />,
        name: list.name,
        meta: [filmCount(list.itemCount, t)],
      })),
    },
    {
      kind: 'member',
      label: t('globalSearch.sections.members'),
      rows: found.members.map((member) => ({
        key: member.handle,
        to: ROUTES.profile(member.handle),
        media: <Avatar avatarId={member.avatarId} pseudo={member.displayName} size="md" />,
        name: member.displayName,
        meta: [`@${member.handle}`],
      })),
    },
    {
      kind: 'public_list',
      label: t('globalSearch.sections.publicLists'),
      rows: found.publicLists.map((list) => ({
        key: list.id,
        to: ROUTES.publicList(list.ownerHandle, list.id),
        media: <PosterThumb posterPath={list.posterPath} Icon={Bookmark} />,
        name: list.name,
        meta: [
          filmCount(list.itemCount, t),
          t('globalSearch.byOwner', { name: list.ownerDisplayName }),
        ],
      })),
    },
  ];
  return sections.filter((section) => section.rows.length > 0);
}

function FoundResults({
  query,
  found,
  onPick,
}: Readonly<{ query: string; found: GlobalSearchResponse; onPick: Pick }>) {
  const { t, locale } = useTranslation();
  if (countOf(found) === 0) {
    return (
      <EmptyState
        compact
        icon={<SearchX size={ICON_SIZE.lg} />}
        message={t('globalSearch.empty', { query })}
        actions={
          <Link
            to={ROUTES.movieSearchFor(query)}
            className={buttonClass({ variant: 'soft', size: 'sm' })}
            onClick={() => onPick('all_titles')}
            {...resultMarker}
          >
            {t('globalSearch.emptyAction')}
          </Link>
        }
      />
    );
  }
  return (
    <>
      {foundSections(found, t, locale).map((section) => (
        <ResultSection key={section.kind} section={section} onPick={onPick}>
          {section.kind === 'title' ? (
            <Link
              to={ROUTES.movieSearchFor(query)}
              className={styles.seeAll}
              onClick={() => onPick('all_titles')}
              {...resultMarker}
            >
              {t('globalSearch.seeAllTitles')}
              <ChevronRight size={ICON_SIZE.sm} aria-hidden />
            </Link>
          ) : null}
        </ResultSection>
      ))}
    </>
  );
}

export default function GlobalSearchResults({
  term,
  source,
  onPick,
  className,
}: Readonly<{
  term: string;
  source: GlobalSearchSource;
  onPick: Pick;
  className?: string;
}>) {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const { query, ready, results } = useGlobalSearch(term);
  const pick: Pick = (kind) => {
    track('global_search_result_opened', { kind, source });
    onPick(kind);
  };
  const stale = results.isPlaceholderData;
  const found = stale && results.data && countOf(results.data) === 0 ? undefined : results.data;
  const announcement =
    ready && found && !stale
      ? pluralizeCount(countOf(found), 'globalSearch.resultsOne', 'globalSearch.resultsMany', t, {
          query,
        })
      : '';

  let body: ReactNode;
  if (found) {
    body = <FoundResults query={query} found={found} onPick={pick} />;
  } else if (results.isError) {
    body = (
      <InlineError
        message={t('globalSearch.error')}
        retryLabel={t('globalSearch.retry')}
        onRetry={() => void results.refetch()}
      />
    );
  } else {
    body = (
      <p className={styles.loading}>
        <Spinner />
        {t('globalSearch.loading')}
      </p>
    );
  }

  return (
    <>
      <p role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {announcement}
      </p>
      {ready ? (
        <div className={clsx(styles.results, className)} aria-busy={results.isFetching}>
          {body}
        </div>
      ) : null}
    </>
  );
}
