import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Crown } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import RatingScaleAxis, { type ParticipantRating } from './RatingScaleAxis';
import styles from './RatingNotes.module.css';

export type { ParticipantRating };

const MAX_ROWS = 5;

function listOrder(participants: ParticipantRating[]): ParticipantRating[] {
  const others = participants.filter((row) => !row.isSelf);
  return [
    ...participants.filter((row) => row.isSelf),
    ...others.filter((row) => row.value !== null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    ...others.filter((row) => row.value === null),
  ];
}

export function ratingCountLabel(count: number, t: ReturnType<typeof useTranslation>['t']) {
  return pluralizeCount(count, 'events.ratings.countOne', 'events.ratings.countMany', t);
}

type Props = {
  participants: ParticipantRating[];
  scale: RatingScale;
  selfAction?: ReactNode;
  alwaysList?: boolean;
  action?: ReactNode;
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
  action,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const nobodyRated = participants.every((p) => p.value === null);
  const ordered = listOrder(participants);
  const hidden = ordered.length - MAX_ROWS;
  const rows = expanded || hidden <= 0 ? ordered : ordered.slice(0, MAX_ROWS);

  return (
    <section className={styles.notes} aria-label={t('events.ratings.listTitle')}>
      <div className={styles.notesHead}>
        <h3 className={styles.notesTitle}>{t('events.ratings.listTitle')}</h3>
        {action}
      </div>
      <RatingScaleAxis participants={participants} scale={scale} />
      {nobodyRated && !alwaysList ? (
        <p className={styles.empty}>{t('events.ratings.nobodyYet')}</p>
      ) : (
        <>
          <ul id={listId} className={styles.list}>
            {rows.map((row) => (
              <li key={row.participantId} className={styles.row}>
                <Avatar avatarId={row.avatarId} pseudo={row.pseudo} size="sm" />
                <RowName row={row} />
                <RowValue row={row} scale={scale} selfAction={selfAction} />
              </li>
            ))}
          </ul>
          {hidden > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.toggle}
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded
                ? t('events.ratings.showLess')
                : pluralizeCount(
                    hidden,
                    'events.ratings.showOthersOne',
                    'events.ratings.showOthersMany',
                    t
                  )}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
