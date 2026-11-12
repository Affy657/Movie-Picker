import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Film, Tv } from 'lucide-react';
import type { MovieNights } from '@/features/movies/api/moviesApi';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { LocaleCode } from '@/shared/i18n/locales';
import type { WatchProviderOffer } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { safeTmdbWatchUrl } from '@/shared/utils/isSafeTmdbWatchPageUrl';
import WatchProviderChips from '@/features/movies/components/WatchProviderChips';
import { countLabel, scoreParts, type Audience } from '@/app/pages/movie/moviePageFacts';
import styles from './MovieHero.module.css';

export interface MovieHeroView {
  title: string;
  originalTitle: string | null;
  facts: string[];
  genres: string[];
  audience: Audience | null;
  posterSrc: string | undefined;
  posterSrcSet: string | undefined;
  backdropSrc: string | null;
  voteAverage: number | null;
  voteCount: number | null;
  providers: WatchProviderOffer[];
  watchPageUrl: string | null;
  isTv: boolean;
  detailsLoaded: boolean;
}

interface MovieHeroProps {
  view: MovieHeroView;
  nights: MovieNights | undefined;
  scale: RatingScale;
  topLink: ReactNode;
  actions: ReactNode;
}

export function audienceShort(audience: Audience, t: Translate): string {
  return audience.kind === 'all'
    ? t('moviePage.audienceAll')
    : t('moviePage.audienceShort', { age: audience.age });
}

function Score({
  value,
  label,
  detail,
  highlight = false,
}: Readonly<{
  value: { value: string; max: number };
  label: string;
  detail: string | null;
  highlight?: boolean;
}>) {
  return (
    <div className={clsx(styles.score, highlight && styles.scoreHighlight)}>
      <dt className={styles.scoreLabel}>
        <span className={styles.scoreSource}>{label}</span>
        {detail ? <span className={styles.scoreDetail}>{detail}</span> : null}
      </dt>
      <dd className={styles.scoreValue}>
        {value.value}
        <small className={styles.scoreMax}>/{value.max}</small>
      </dd>
    </div>
  );
}

function Scores({
  view,
  nights,
  scale,
  locale,
  t,
}: Readonly<{
  view: MovieHeroView;
  nights: MovieNights | undefined;
  scale: RatingScale;
  locale: LocaleCode;
  t: Translate;
}>) {
  const tmdb = scoreParts(view.voteAverage, scale, locale);
  const mine = scoreParts(nights?.rating?.average, scale, locale);
  if (!tmdb && !mine) return null;
  const votes = view.voteCount
    ? pluralizeCount(view.voteCount, 'moviePage.votesOne', 'moviePage.votesMany', t, {
        count: countLabel(view.voteCount, locale),
      })
    : null;
  const ratings = nights?.rating
    ? pluralizeCount(nights.rating.count, 'moviePage.ratingsOne', 'moviePage.ratingsMany', t)
    : null;
  return (
    <dl className={styles.scores} aria-label={t('moviePage.scoresAria')}>
      {tmdb ? <Score value={tmdb} label={t('moviePage.scoreTmdb')} detail={votes} /> : null}
      {mine ? (
        <Score value={mine} label={t('moviePage.scoreNights')} detail={ratings} highlight />
      ) : null}
    </dl>
  );
}

function Streaming({ view, t }: Readonly<{ view: MovieHeroView; t: Translate }>) {
  if (!view.detailsLoaded && view.providers.length === 0) return null;
  const href = safeTmdbWatchUrl(view.watchPageUrl);
  const flatrate = view.providers.filter((p) => p.type === 'flatrate');
  const hasOtherOffers = view.providers.some((p) => p.type === 'rent' || p.type === 'buy');
  return (
    <div className={styles.streaming}>
      {flatrate.length > 0 ? (
        <>
          <span className={styles.streamingLabel}>{t('moviePage.streamingOn')}</span>
          <WatchProviderChips
            providers={flatrate}
            watchPageUrl={view.watchPageUrl}
            showTypeIcon={false}
          />
        </>
      ) : (
        <span className={styles.notStreaming}>
          <Tv aria-hidden size={ICON_SIZE.sm} />
          {t('moviePage.notStreaming')}
        </span>
      )}
      {hasOtherOffers && href ? (
        <a href={href} target="_blank" rel="noreferrer noopener" className={styles.otherOffers}>
          {t('moviePage.otherOffers')}
        </a>
      ) : null}
    </div>
  );
}

function Poster({ view }: Readonly<{ view: MovieHeroView }>) {
  if (!view.posterSrc) {
    return (
      <div className={clsx(styles.poster, styles.posterPlaceholder)} aria-hidden>
        <Film size={ICON_SIZE['3xl']} />
      </div>
    );
  }
  return (
    <img
      src={view.posterSrc}
      srcSet={view.posterSrcSet}
      sizes="(max-width: 47.9375rem) 120px, 264px"
      alt=""
      className={styles.poster}
      fetchPriority="high"
    />
  );
}

export default function MovieHero({
  view,
  nights,
  scale,
  topLink,
  actions,
}: Readonly<MovieHeroProps>) {
  const { t, locale } = useTranslation();
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  return (
    <header className={styles.hero}>
      {view.backdropSrc ? (
        <div className={styles.backdrop} aria-hidden>
          <img
            src={view.backdropSrc}
            alt=""
            decoding="async"
            className={clsx(styles.backdropImg, backdropLoaded && styles.backdropImgLoaded)}
            onLoad={() => setBackdropLoaded(true)}
          />
        </div>
      ) : null}
      <div className={styles.inner}>
        {topLink ? <div className={styles.topLink}>{topLink}</div> : null}
        <div className={styles.grid}>
          <Poster view={view} />
          <div className={styles.heading}>
            <h1 className={styles.title}>{view.title}</h1>
            {view.originalTitle ? (
              <p className={styles.originalTitle}>
                {t('moviePage.originalTitle', { title: view.originalTitle })}
              </p>
            ) : null}
            <p className={styles.facts}>
              {view.facts.map((fact) => (
                <span key={fact}>{fact}</span>
              ))}
              {view.audience ? (
                <span className={styles.audience}>{audienceShort(view.audience, t)}</span>
              ) : null}
            </p>
          </div>
          <div className={styles.details}>
            {view.genres.length > 0 ? (
              <p className={styles.genres}>{view.genres.join(', ')}</p>
            ) : null}
            <Scores view={view} nights={nights} scale={scale} locale={locale} t={t} />
            <Streaming view={view} t={t} />
            <div className={styles.actions}>{actions}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
