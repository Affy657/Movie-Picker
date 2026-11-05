import { Check, Film, X } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import Modal from '@/shared/components/Modal';
import PosterBackdrop from '@/shared/components/PosterBackdrop';
import StarRating from '@/shared/components/StarRating';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import type { RatingScale } from '@/shared/types/theme';
import { formatRating } from '@/shared/utils/formatRating';
import { formatRuntimeMinutes } from '@/shared/utils/formatRuntime';
import { keepPunctuationAttached } from '@/shared/utils/keepPunctuationAttached';
import { posterImageSrc } from '@/shared/utils/posterUrl';
import { useAutoSavedRating } from './useAutoSavedRating';
import styles from './MovieRatingDialog.module.css';

type RatedMovie = {
  title: string;
  year?: string | null;
  runtimeMinutes?: number | null;
  posterPath?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  movie: RatedMovie;
  mine: number | null;
  scale: RatingScale;
  error: string | null;
  onSave: (value: number) => Promise<boolean>;
  onClear: () => Promise<boolean>;
  onNext?: (rated: number | null) => void;
  position?: { index: number; total: number };
  previous?: { title: string; value: number } | null;
};

function SheetPoster({ posterPath }: Readonly<{ posterPath?: string | null }>) {
  const src = posterImageSrc(posterPath);
  if (!src) {
    return (
      <span className={styles.posterPlaceholder} aria-hidden>
        <Film size={ICON_SIZE['4xl']} />
      </span>
    );
  }
  return <img src={src} alt="" className={styles.poster} decoding="async" />;
}

function SheetActions({
  failed,
  saving,
  rated,
  hasNext,
  onClose,
  onRetry,
  onClear,
  onLeave,
}: Readonly<{
  failed: boolean;
  saving: boolean;
  rated: boolean;
  hasNext: boolean;
  onClose: () => void;
  onRetry: () => void;
  onClear: () => void;
  onLeave: () => void;
}>) {
  const { t } = useTranslation();
  if (failed) {
    return (
      <>
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button variant="primary" className={styles.main} onClick={onRetry}>
          {t('common.retry')}
        </Button>
      </>
    );
  }
  if (!rated) {
    return (
      <Button variant="ghost" className={styles.main} onClick={onLeave}>
        {t(hasNext ? 'events.ratings.skipMovie' : 'events.ratings.later')}
      </Button>
    );
  }
  return (
    <>
      <Button variant="ghost" disabled={saving} onClick={onClear}>
        {t('events.ratings.clear')}
      </Button>
      <Button variant="primary" className={styles.main} disabled={saving} onClick={onLeave}>
        {t(hasNext ? 'events.ratings.nextMovie' : 'events.ratings.seeRatings')}
      </Button>
    </>
  );
}

export default function MovieRatingDialog({
  open,
  onClose,
  movie,
  mine,
  scale,
  error,
  onSave,
  onClear,
  onNext,
  position,
  previous,
}: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { draft, status, pick, retry, clear } = useAutoSavedRating(mine, onSave, onClear);
  const facts = [movie.year, formatRuntimeMinutes(movie.runtimeMinutes)].filter(Boolean);
  const failed = status === 'failed';
  const starLabel = (stars: number) =>
    pluralizeCount(stars, 'events.ratings.starAriaOne', 'events.ratings.starAriaMany', t);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      surface="bare"
      ariaLabel={t('events.ratings.dialogTitleRate')}
      className={clsx('on-dark', styles.dialog)}
    >
      <div className={styles.layout}>
        <IconButton
          tone="onPoster"
          size="lg"
          ariaLabel={t('common.close')}
          className={styles.close}
          onClick={onClose}
        >
          <X size={ICON_SIZE.lg} aria-hidden />
        </IconButton>
        <div className={styles.stage}>
          <PosterBackdrop posterPath={movie.posterPath} />
          <div className={styles.stageTop}>
            <span className={styles.position}>
              {position ? (
                <span className={styles.positionLabel}>
                  {t('events.ratings.position', position)}
                </span>
              ) : null}
              {previous ? (
                <span className={styles.previous}>
                  {t('events.ratings.previousSaved', {
                    title: previous.title,
                    value: formatRating(previous.value, scale, locale),
                  })}
                </span>
              ) : null}
            </span>
          </div>
          <div className={styles.film}>
            <SheetPoster posterPath={movie.posterPath} />
            <div className={styles.filmText}>
              <h2 className={styles.title}>{keepPunctuationAttached(movie.title)}</h2>
              {facts.length > 0 ? (
                <span className={styles.facts}>
                  {facts.map((fact) => (
                    <span key={fact}>{fact}</span>
                  ))}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <section className={styles.panel} aria-label={t('events.ratings.starsLabel')}>
          <h3 className={styles.overline}>{t('events.ratings.starsLabel')}</h3>
          <StarRating
            size="xl"
            value={draft}
            onChange={pick}
            ariaLabel={t('events.ratings.starsLabel')}
            starLabel={starLabel}
          />
          <div className={styles.value}>
            {draft === null ? (
              <span className={styles.valueHint}>{t('events.ratings.pickHint')}</span>
            ) : (
              <>
                <span className={styles.valueNumber}>{formatRating(draft, scale, locale)}</span>
                {status === 'saved' ? (
                  <output className={styles.saved}>
                    <Check size={ICON_SIZE.sm} aria-hidden />
                    <span>{t('events.ratings.saved')}</span>
                  </output>
                ) : null}
              </>
            )}
          </div>
          {failed && error ? (
            <p className={clsx('error', styles.error)} role="alert">
              {error}
            </p>
          ) : (
            <p className={styles.hint}>{t('events.ratings.halfHint')}</p>
          )}
          <div className={styles.actions}>
            <SheetActions
              failed={failed}
              saving={status === 'saving'}
              rated={draft !== null}
              hasNext={!!onNext}
              onClose={onClose}
              onRetry={retry}
              onClear={() => void clear()}
              onLeave={onNext ? () => onNext(draft) : onClose}
            />
          </div>
        </section>
      </div>
    </Modal>
  );
}
