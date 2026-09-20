import { useId, useState } from 'react';
import { Film } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import Chip from '@/shared/components/Chip';
import DialogTitleBar from '@/shared/components/DialogTitleBar';
import Modal from '@/shared/components/Modal';
import Sheet from '@/shared/components/Sheet';
import StarRating from '@/shared/components/StarRating';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import { averageRating, formatRating } from '@/shared/utils/formatRating';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import styles from './MovieRatingDialog.module.css';

export type ParticipantRating = {
  participantId: string;
  pseudo: string;
  avatarId: string | null;
  value: number | null;
  isSelf: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  movie: { title: string; year?: string | null; posterPath?: string | null };
  mine: number | null;
  participants: ParticipantRating[];
  scale: RatingScale;
  canRate: boolean;
  saving: boolean;
  error: string | null;
  onSave: (value: number) => void;
  onClear: () => void;
};

export function ratingCountLabel(count: number, t: ReturnType<typeof useTranslation>['t']) {
  return pluralizeCount(count, 'events.ratings.countOne', 'events.ratings.countMany', t);
}

export default function MovieRatingDialog({
  open,
  onClose,
  movie,
  mine,
  participants,
  scale,
  canRate,
  saving,
  error,
  onSave,
  onClear,
}: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const isMobile = useIsMobile();
  const titleId = useId();
  const [draft, setDraft] = useState<number | null>(mine);
  const values = participants.map((p) => p.value).filter((v): v is number => v !== null);
  const average = averageRating(values);
  const title = t(canRate ? 'events.ratings.dialogTitleRate' : 'events.ratings.dialogTitleRead');
  const poster = posterImageSrc(movie.posterPath);
  const starLabel = (stars: number) =>
    pluralizeCount(stars, 'events.ratings.starAriaOne', 'events.ratings.starAriaMany', t);

  const body = (
    <div className={styles.body}>
      <div className={styles.movie}>
        {poster ? (
          <img src={poster} alt="" className={styles.poster} width={48} height={72} />
        ) : (
          <span className={styles.posterPlaceholder} aria-hidden>
            <Film size={ICON_SIZE.xl} />
          </span>
        )}
        <span className={styles.movieText}>
          <span className={styles.movieTitle}>{movie.title}</span>
          {movie.year ? <span className={styles.movieYear}>{movie.year}</span> : null}
        </span>
      </div>

      {canRate ? (
        <div className={styles.picker}>
          <StarRating
            size="lg"
            value={draft}
            onChange={setDraft}
            ariaLabel={t('events.ratings.starsLabel')}
            starLabel={starLabel}
          />
          <output className={styles.value} aria-live="polite">
            {draft === null ? (
              <span className={styles.valueHint}>{t('events.ratings.pickHint')}</span>
            ) : (
              formatRating(draft, scale, locale)
            )}
          </output>
          <p className={styles.hint}>{t('events.ratings.halfHint')}</p>
        </div>
      ) : null}

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <section className={styles.notes} aria-label={t('events.ratings.listTitle')}>
        <div className={styles.notesHead}>
          <h3 className={styles.notesTitle}>{t('events.ratings.listTitle')}</h3>
          {average !== null ? (
            <Chip tone="neutral" size="sm">
              {t('events.ratings.average', {
                value: formatRating(average, scale, locale, { decimals: 1 }),
              })}
            </Chip>
          ) : null}
        </div>
        {values.length === 0 ? (
          <p className={styles.empty}>{t('events.ratings.nobodyYet')}</p>
        ) : (
          <ul className={styles.list}>
            {participants.map((p) => (
              <li key={p.participantId} className={styles.row}>
                <Avatar avatarId={p.avatarId} pseudo={p.pseudo} size="sm" />
                <span className={styles.rowName}>
                  {p.isSelf ? t('events.ratings.you') : p.pseudo}
                </span>
                {p.value === null ? (
                  <span className={styles.rowPending}>{t('events.ratings.pending')}</span>
                ) : (
                  <span className={styles.rowValue}>{formatRating(p.value, scale, locale)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  const footer = canRate ? (
    <div className={styles.footer}>
      {mine !== null ? (
        <Button size="sm" variant="ghost" tone="danger" onClick={onClear} disabled={saving}>
          {t('events.ratings.clear')}
        </Button>
      ) : (
        <span />
      )}
      <Button
        size="sm"
        variant="primary"
        disabled={draft === null || draft === mine}
        loading={saving}
        onClick={() => draft !== null && onSave(draft)}
      >
        {t('events.ratings.save')}
      </Button>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={open} title={title} onClose={onClose} footer={footer}>
        {body}
      </Sheet>
    );
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" column ariaLabelledBy={titleId}>
      <DialogTitleBar
        titleId={titleId}
        title={title}
        onClose={onClose}
        closeLabel={t('common.close')}
      />
      <div className={styles.modalBody}>{body}</div>
      {footer ? <div className={styles.modalFooter}>{footer}</div> : null}
    </Modal>
  );
}
