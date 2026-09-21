import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Crown } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Chip from '@/shared/components/Chip';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import { averageRating, formatRating } from '@/shared/utils/formatRating';
import styles from './RatingNotes.module.css';

export type ParticipantRating = {
  participantId: string;
  pseudo: string;
  avatarId: string | null;
  value: number | null;
  isSelf: boolean;
  handle?: string | null;
  isCreator?: boolean;
};

export function ratingCountLabel(count: number, t: ReturnType<typeof useTranslation>['t']) {
  return pluralizeCount(count, 'events.ratings.countOne', 'events.ratings.countMany', t);
}

type Props = {
  participants: ParticipantRating[];
  scale: RatingScale;
  selfAction?: ReactNode;
  alwaysList?: boolean;
};

function RowName({ row }: Readonly<{ row: ParticipantRating }>) {
  const { t } = useTranslation();
  const name = row.isSelf ? t('events.ratings.you') : row.pseudo;
  return (
    <span className={styles.rowName}>
      {row.handle && !row.isSelf ? (
        <Link to={ROUTES.profile(row.handle)} className={styles.profileLink}>
          {name}
        </Link>
      ) : (
        name
      )}
      {row.isCreator ? (
        <span
          className={styles.hostBadge}
          role="img"
          aria-label={t('events.participants.hostBadge')}
          title={t('events.participants.hostBadge')}
        >
          <Crown aria-hidden size={ICON_SIZE.xs} />
        </span>
      ) : null}
    </span>
  );
}

function RowValue({
  row,
  scale,
  selfAction,
}: Readonly<{ row: ParticipantRating; scale: RatingScale; selfAction: ReactNode }>) {
  const { t, locale } = useTranslation();
  if (row.value !== null) {
    return <span className={styles.rowValue}>{formatRating(row.value, scale, locale)}</span>;
  }
  if (row.isSelf && selfAction) return <>{selfAction}</>;
  return <span className={styles.rowPending}>{t('events.ratings.pending')}</span>;
}

export default function RatingNotes({
  participants,
  scale,
  selfAction,
  alwaysList = false,
}: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const values = participants.map((p) => p.value).filter((v): v is number => v !== null);
  const average = averageRating(values);

  return (
    <section className={styles.notes} aria-label={t('events.ratings.listTitle')}>
      <div className={styles.notesHead}>
        <h3 className={styles.notesTitle}>{t('events.ratings.listTitle')}</h3>
        {average !== null ? (
          <span className={styles.summary}>
            <Chip tone="neutral" size="sm">
              {t('events.ratings.average', {
                value: formatRating(average, scale, locale, { decimals: 1 }),
              })}
            </Chip>
            <span className={styles.count}>{ratingCountLabel(values.length, t)}</span>
          </span>
        ) : null}
      </div>
      {values.length === 0 && !alwaysList ? (
        <p className={styles.empty}>{t('events.ratings.nobodyYet')}</p>
      ) : (
        <ul className={styles.list}>
          {participants.map((row) => (
            <li key={row.participantId} className={styles.row}>
              <Avatar avatarId={row.avatarId} pseudo={row.pseudo} size="sm" />
              <RowName row={row} />
              <RowValue row={row} scale={scale} selfAction={selfAction} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
