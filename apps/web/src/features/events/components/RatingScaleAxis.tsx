import type { CSSProperties } from 'react';
import clsx from 'clsx';
import Avatar from '@/shared/components/Avatar';
import { useTranslation } from '@/shared/i18n';
import type { RatingScale } from '@/shared/types/theme';
import {
  averageRating,
  formatRating,
  RATING_MAX,
  ratingScaleMax,
} from '@/shared/utils/formatRating';
import styles from './RatingScaleAxis.module.css';

export type ParticipantRating = {
  participantId: string;
  pseudo: string;
  avatarId: string | null;
  value: number | null;
  isSelf: boolean;
  handle?: string | null;
  isCreator?: boolean;
};

const MAX_STACKED = 3;
const MAX_FACES = 6;
const MAX_DENSE_MARKS = 4;

type RatedRow = ParticipantRating & { value: number };

function byValue(rows: RatedRow[]): RatedRow[][] {
  const groups = new Map<number, RatedRow[]>();
  for (const row of rows) groups.set(row.value, [...(groups.get(row.value) ?? []), row]);
  return [...groups.entries()].sort(([a], [b]) => a - b).map(([, group]) => group);
}

const at = (value: number) => ({ '--at': `${(value / RATING_MAX) * 100}%` }) as CSSProperties;

function Face({ row }: Readonly<{ row: RatedRow }>) {
  return (
    <span className={styles.person} data-self={row.isSelf || undefined} data-axis-face>
      <Avatar avatarId={row.avatarId} pseudo={row.pseudo} size="sm" />
    </span>
  );
}

function FacesMark({ group }: Readonly<{ group: RatedRow[] }>) {
  const shown = group.slice(0, MAX_STACKED);
  const hidden = group.length - shown.length;
  return (
    <span className={styles.mark} style={at(group[0]?.value ?? 0)} data-axis-mark>
      {hidden > 0 ? <span className={styles.more}>{`+${hidden}`}</span> : null}
      {shown.map((row) => (
        <Face key={row.participantId} row={row} />
      ))}
    </span>
  );
}

function DenseMark({ group }: Readonly<{ group: RatedRow[] }>) {
  const ordered = [...group.filter((row) => row.isSelf), ...group.filter((row) => !row.isSelf)];
  const shown = ordered.slice(0, MAX_DENSE_MARKS);
  const hidden = ordered.length - shown.length;
  return (
    <span
      className={clsx(styles.mark, styles.denseMark)}
      style={at(group[0]?.value ?? 0)}
      data-axis-mark
    >
      {hidden > 0 ? <span className={styles.more}>{`+${hidden}`}</span> : null}
      {shown.map((row) =>
        row.isSelf ? (
          <Face key={row.participantId} row={row} />
        ) : (
          <span key={row.participantId} className={styles.dot} data-axis-dot />
        )
      )}
    </span>
  );
}

export default function RatingScaleAxis({
  participants,
  scale,
}: Readonly<{ participants: ParticipantRating[]; scale: RatingScale }>) {
  const { t, locale } = useTranslation();
  const rated = participants.filter((row): row is RatedRow => row.value !== null);
  const average = averageRating(rated.map((row) => row.value));
  if (average === null) return null;

  const max = ratingScaleMax(scale);
  const averageLabel = t('events.ratings.average', {
    value: formatRating(average, scale, locale, { decimals: 1 }),
  });
  const people = rated
    .map((row) => {
      const name = row.isSelf ? t('events.ratings.you') : row.pseudo;
      return `${name} ${formatRating(row.value, scale, locale)}`;
    })
    .join(', ');
  const ticks = Array.from({ length: 6 }, (_, index) => (index * max) / 5);
  const dense = rated.length > MAX_FACES;

  return (
    <div
      className={styles.axis}
      data-dense={dense || undefined}
      role="img"
      aria-label={t('events.ratings.scaleAria', { max, people, average: averageLabel })}
    >
      <span className={styles.meanLine} style={at(average)} />
      <span className={styles.mean} style={at(average)}>
        {averageLabel}
      </span>
      <span className={styles.line} />
      {ticks.map((tick) => (
        <span key={tick} className={styles.tick} style={at((tick / max) * RATING_MAX)}>
          <span className={styles.tickLabel}>{tick}</span>
        </span>
      ))}
      {byValue(rated).map((group) =>
        dense ? (
          <DenseMark key={group[0]?.value} group={group} />
        ) : (
          <FacesMark key={group[0]?.value} group={group} />
        )
      )}
    </div>
  );
}
