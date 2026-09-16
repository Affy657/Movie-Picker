import { Film, Trophy } from 'lucide-react';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ProposerBadge } from '@/features/movies/components/movieCardParts';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { MovieData } from '@/shared/types/movie';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { posterImageSrc, tmdbPosterSrcSetForList } from '@/shared/utils/posterUrl';
import { getParticipantId } from '@/shared/utils/movieParticipant';
import styles from './EventWinnerSummary.module.css';

type Props = {
  winners: MovieData[];
  isFinished: boolean;
  participantAvatars?: Record<string, string>;
};

function WinnerPoster({ posterPath }: Readonly<{ posterPath: string | null | undefined }>) {
  const src = posterImageSrc(posterPath);
  if (!src) {
    return (
      <span className={styles.posterPlaceholder} aria-hidden>
        <Film size={ICON_SIZE['2xl']} />
      </span>
    );
  }
  return (
    <img
      src={src}
      srcSet={tmdbPosterSrcSetForList(src)}
      sizes="64px"
      alt=""
      className={styles.poster}
      width={64}
      height={96}
      decoding="async"
    />
  );
}

export default function EventWinnerSummary({
  winners,
  isFinished,
  participantAvatars,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (winners.length === 0) return null;
  const several = winners.length > 1;
  const heading = isFinished
    ? pluralizeCount(winners.length, 'events.winners.finishedOne', 'events.winners.finishedMany', t)
    : t('events.winners.upcoming');

  return (
    <Card as="section" padding="md" elevation="sm" className={styles.root} aria-label={heading}>
      <h2 className={styles.heading}>
        <Trophy size={ICON_SIZE.md} aria-hidden className={styles.headingIcon} />
        <span className={styles.headingLabel}>{heading}</span>
      </h2>
      <ol className={styles.list}>
        {winners.map((movie, index) => {
          const facts = [movie.year, formatRuntimeMinutes(movie.runtimeMinutes)].filter(Boolean);
          return (
            <li key={movie.id} className={styles.item}>
              <span className={styles.posterCol}>
                <WinnerPoster posterPath={movie.posterPath} />
                {several ? <span className={styles.rank}>{index + 1}</span> : null}
              </span>
              <span className={styles.body}>
                <span className={styles.title}>{movie.title}</span>
                {facts.length > 0 ? (
                  <span className={styles.facts}>
                    {facts.map((fact) => (
                      <span key={fact}>{fact}</span>
                    ))}
                  </span>
                ) : null}
                <ProposerBadge
                  avatarId={participantAvatars?.[getParticipantId(movie)] ?? ''}
                  pseudo={movie.proposerPseudo}
                  handle={movie.proposerHandle}
                  t={t}
                />
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
