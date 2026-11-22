import { Fragment, useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CalendarDays, ChevronRight, Film, SearchX } from 'lucide-react';
import clsx from 'clsx';
import Avatar from '@/shared/components/Avatar';
import { buttonClass } from '@/shared/components/Button';
import EmptyState from '@/shared/components/EmptyState';
import InlineError from '@/shared/components/InlineError';
import Spinner from '@/shared/components/Spinner';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { GlobalSearchKind } from '@/shared/analytics/usageCounts';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import { formatMyEventsListDate } from '@/shared/utils/formatMyEventsListDate';
import { posterImageSrc, posterSrcAtSize } from '@/shared/utils/posterUrl';
import { ROUTES } from '@/app/routes';
import { useGlobalSearch, type GlobalSearchResponse } from './globalSearchApi';
import { SEARCH_RESULT_ATTRIBUTE } from './resultsKeyboard';
import styles from './GlobalSearchResults.module.css';

export type GlobalSearchSource = 'header' | 'home';

type Pick = (kind: GlobalSearchKind) => void;

const resultMarker = { [SEARCH_RESULT_ATTRIBUTE]: '' };

function countOf(found: GlobalSearchResponse): number {
  return found.titles.length + found.nights.length + found.members.length;
}

function ResultSection({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  const labelId = useId();
  return (
    <section className={styles.section} aria-labelledby={labelId}>
      <h2 id={labelId} className={styles.sectionLabel}>
        {label}
      </h2>
      {children}
    </section>
  );
}

function ResultLink({
  to,
  media,
  name,
  meta,
  onOpen,
}: Readonly<{
  to: string;
  media: ReactNode;
  name: string;
  meta: readonly (string | null)[];
  onOpen: () => void;
}>) {
  const details = meta.filter((part): part is string => Boolean(part));
  return (
    <li>
      <Link to={to} className={styles.row} onClick={onOpen} {...resultMarker}>
        {media}
        <span className={styles.text}>
          <span className={styles.name}>{name}</span>
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

function PosterThumb({ posterPath }: Readonly<{ posterPath: string | null }>) {
  const src = posterSrcAtSize(posterImageSrc(posterPath), 'w92');
  return (
    <span className={styles.poster} aria-hidden>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" />
      ) : (
        <Film size={ICON_SIZE.sm} />
      )}
    </span>
  );
}

function TitleResults({
  query,
  titles,
  onPick,
}: Readonly<{ query: string; titles: GlobalSearchResponse['titles']; onPick: Pick }>) {
  const { t } = useTranslation();
  return (
    <ResultSection label={t('globalSearch.sections.titles')}>
      <ul className={styles.list}>
        {titles.map((title) => (
          <ResultLink
            key={`${title.mediaType}-${title.tmdbId}`}
            to={ROUTES.moviePage(title)}
            media={<PosterThumb posterPath={title.posterPath} />}
            name={title.title}
            meta={[title.year, title.mediaType === 'tv' ? t('globalSearch.series') : null]}
            onOpen={() => onPick('title')}
          />
        ))}
      </ul>
      <Link
        to={ROUTES.movieSearchFor(query)}
        className={styles.seeAll}
        onClick={() => onPick('all_titles')}
        {...resultMarker}
      >
        {t('globalSearch.seeAllTitles')}
        <ChevronRight size={ICON_SIZE.sm} aria-hidden />
      </Link>
    </ResultSection>
  );
}

function NightResults({
  nights,
  onPick,
}: Readonly<{ nights: GlobalSearchResponse['nights']; onPick: Pick }>) {
  const { t, locale } = useTranslation();
  return (
    <ResultSection label={t('globalSearch.sections.nights')}>
      <ul className={styles.list}>
        {nights.map((night) => (
          <ResultLink
            key={night.slug}
            to={ROUTES.eventDetail(night.slug)}
            media={
              <span className={styles.tile} aria-hidden>
                <CalendarDays size={ICON_SIZE.md} />
              </span>
            }
            name={night.title}
            meta={[
              formatMyEventsListDate(night.date, locale),
              night.isFinished ? t('globalSearch.finishedNight') : null,
            ]}
            onOpen={() => onPick('night')}
          />
        ))}
      </ul>
    </ResultSection>
  );
}

function MemberResults({
  members,
  onPick,
}: Readonly<{ members: GlobalSearchResponse['members']; onPick: Pick }>) {
  const { t } = useTranslation();
  return (
    <ResultSection label={t('globalSearch.sections.members')}>
      <ul className={styles.list}>
        {members.map((member) => (
          <ResultLink
            key={member.handle}
            to={ROUTES.profile(member.handle)}
            media={<Avatar avatarId={member.avatarId} pseudo={member.displayName} size="md" />}
            name={member.displayName}
            meta={[`@${member.handle}`]}
            onOpen={() => onPick('member')}
          />
        ))}
      </ul>
    </ResultSection>
  );
}

function FoundResults({
  query,
  found,
  onPick,
}: Readonly<{ query: string; found: GlobalSearchResponse; onPick: Pick }>) {
  const { t } = useTranslation();
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
      {found.titles.length > 0 ? (
        <TitleResults query={query} titles={found.titles} onPick={onPick} />
      ) : null}
      {found.nights.length > 0 ? <NightResults nights={found.nights} onPick={onPick} /> : null}
      {found.members.length > 0 ? <MemberResults members={found.members} onPick={onPick} /> : null}
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

  if (!ready) return null;

  const pick: Pick = (kind) => {
    track('global_search_result_opened', { kind, source });
    onPick(kind);
  };
  const found = results.data;

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
    <div className={clsx(styles.results, className)} aria-busy={results.isFetching}>
      <p role="status" className="visually-hidden">
        {found
          ? pluralizeCount(countOf(found), 'globalSearch.resultsOne', 'globalSearch.resultsMany', t)
          : ''}
      </p>
      {body}
    </div>
  );
}
