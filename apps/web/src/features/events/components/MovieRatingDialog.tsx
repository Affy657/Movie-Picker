import { useId, useState } from 'react';
import { Film } from 'lucide-react';
import Button from '@/shared/components/Button';
import DialogTitleBar from '@/shared/components/DialogTitleBar';
import Modal from '@/shared/components/Modal';
import Sheet from '@/shared/components/Sheet';
import StarRating from '@/shared/components/StarRating';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import RatingNotes, { type ParticipantRating } from './RatingNotes';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import styles from './MovieRatingDialog.module.css';

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

      <RatingNotes participants={participants} scale={scale} />
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
