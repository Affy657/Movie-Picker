import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CalendarDays, ExternalLink, Eye, Star, Trophy } from 'lucide-react';
import { ROUTES, withReturnTo } from '@/app/routes';
import type { MovieNight, MovieNights } from '@/features/movies/api/moviesApi';
import {
  allocineUrl,
  imdbUrl,
  letterboxdUrl,
  tmdbPageUrl,
} from '@/features/movies/utils/movieExternalLinks';
import AvatarStack from '@/shared/components/AvatarStack';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { LocaleCode } from '@/shared/i18n/locales';
import type { MovieMediaType } from '@/shared/types/movie';
import type { RatingScale } from '@/shared/types/theme';
import { formatReleaseDate } from '@/shared/utils/formatReleaseDate';
import { scoreParts } from '@/app/pages/movie/moviePageFacts';
import styles from './MovieAside.module.css';

const SEEN_NAMES_SHOWN = 2;

export interface MovieInfoRow {
  label: string;
  value: string;
}

function AsideCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  const headingId = useId();
  return (
    <Card as="section" padding="md" radius="lg" className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.cardTitle}>
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Row({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <li className={styles.row}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowText}>{children}</span>
    </li>
  );
}

function WinRow({
  win,
  locale,
  t,
}: Readonly<{ win: MovieNight; locale: LocaleCode; t: Translate }>) {
  const label = win.date
    ? t('moviePage.nightsWonOn', { title: win.title, date: formatReleaseDate(win.date, locale) })
    : t('moviePage.nightsWonAt', { title: win.title });
  return (
    <Row icon={<Trophy aria-hidden size={ICON_SIZE.sm} />}>
      <Link to={ROUTES.eventDetail(win.slug)} className={styles.inlineLink}>
        {label}
      </Link>
      {win.recapSlug ? (
        <>
          {' '}
          <Link to={ROUTES.nightRecap(win.recapSlug)} className={styles.inlineLink}>
            {t('moviePage.nightsRecap')}
          </Link>
        </>
      ) : null}
    </Row>
  );
}

function seenSentence(nights: MovieNights, t: Translate): string {
  const names = nights.seenBy
    .slice(0, SEEN_NAMES_SHOWN)
    .map((viewer) => viewer.pseudo)
    .join(', ');
  const others = nights.seenCount - Math.min(nights.seenBy.length, SEEN_NAMES_SHOWN);
  if (others <= 0) return t('moviePage.nightsSeenBy', { names });
  return pluralizeCount(
    others,
    'moviePage.nightsSeenByMoreOne',
    'moviePage.nightsSeenByMoreMany',
    t,
    { names }
  );
}

function NightsRows({
  nights,
  scale,
  locale,
  t,
}: Readonly<{ nights: MovieNights; scale: RatingScale; locale: LocaleCode; t: Translate }>) {
  const win = nights.nights.find((night) => night.isWinner);
  const rating = nights.rating ? scoreParts(nights.rating.average, scale, locale) : null;
  return (
    <ul className={styles.rows}>
      <Row icon={<CalendarDays aria-hidden size={ICON_SIZE.sm} />}>
        {pluralizeCount(
          nights.proposalCount,
          'moviePage.nightsProposedOne',
          'moviePage.nightsProposedMany',
          t
        )}
      </Row>
      {win ? <WinRow win={win} locale={locale} t={t} /> : null}
      {nights.rating && rating ? (
        <Row icon={<Star aria-hidden size={ICON_SIZE.sm} />}>
          {pluralizeCount(
            nights.rating.count,
            'moviePage.nightsRatedOne',
            'moviePage.nightsRatedMany',
            t,
            { rating: `${rating.value}/${rating.max}` }
          )}
        </Row>
      ) : null}
      {nights.seenCount > 0 ? (
        <Row icon={<Eye aria-hidden size={ICON_SIZE.sm} />}>
          <AvatarStack
            size="xs"
            people={nights.seenBy.map((viewer) => ({
              key: viewer.pseudo,
              avatarId: viewer.avatarId,
              pseudo: viewer.pseudo,
            }))}
          />
          {seenSentence(nights, t)}
        </Row>
      ) : null}
    </ul>
  );
}

export function MovieNightsCard({
  authPending,
  signedIn,
  nights,
  scale,
  returnTo,
}: Readonly<{
  authPending: boolean;
  signedIn: boolean;
  nights: MovieNights | undefined;
  scale: RatingScale;
  returnTo: string;
}>) {
  const { t, locale } = useTranslation();
  if (authPending) return null;
  let body: ReactNode = null;
  if (!signedIn) {
    body = (
      <p className={styles.muted}>
        {t('moviePage.nightsSignedOut')}{' '}
        <Link to={withReturnTo(ROUTES.login, returnTo)} className={styles.inlineLink}>
          {t('moviePage.nightsSignIn')}
        </Link>
      </p>
    );
  } else if (nights && nights.proposalCount > 0) {
    body = <NightsRows nights={nights} scale={scale} locale={locale} t={t} />;
  } else if (nights) {
    body = <p className={styles.muted}>{t('moviePage.nightsEmpty')}</p>;
  }
  if (!body) return null;
  return <AsideCard title={t('moviePage.nightsTitle')}>{body}</AsideCard>;
}

export function MovieInfosCard({ rows }: Readonly<{ rows: MovieInfoRow[] }>) {
  const { t } = useTranslation();
  if (rows.length === 0) return null;
  return (
    <AsideCard title={t('moviePage.infos')}>
      <dl className={styles.infos}>
        {rows.map((row) => (
          <div key={row.label} className={styles.info}>
            <dt className={styles.infoLabel}>{row.label}</dt>
            <dd className={styles.infoValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </AsideCard>
  );
}

export function MovieLinksCard({
  tmdbId,
  mediaType,
  title,
  year,
}: Readonly<{ tmdbId: number; mediaType: MovieMediaType; title: string; year?: string }>) {
  const { t } = useTranslation();
  const links = [
    { href: letterboxdUrl(tmdbId, mediaType, title), label: t('movies.details.letterboxdShort') },
    { href: imdbUrl(title, year), label: t('movies.details.imdbShort') },
    { href: allocineUrl(title), label: t('movies.details.allocineShort') },
    { href: tmdbPageUrl(tmdbId, mediaType), label: t('movies.details.tmdbShort') },
  ];
  return (
    <AsideCard title={t('moviePage.links')}>
      <ul className={styles.links}>
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} target="_blank" rel="noreferrer noopener" className={styles.link}>
              <ExternalLink aria-hidden size={ICON_SIZE.xs} />
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </AsideCard>
  );
}
