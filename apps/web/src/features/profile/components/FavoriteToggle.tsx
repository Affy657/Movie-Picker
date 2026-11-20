import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { FavoriteToggleState } from '@/features/profile/hooks/useFavoriteToggle';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { ModalActions } from '@/shared/components/Modal';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { useTranslation } from '@/shared/i18n';
import type { FavoriteTitle } from '@/shared/types/movie';
import { posterImageSrc, tmdbPosterSrcForListDisplay } from '@/shared/utils/posterUrl';
import styles from './FavoriteToggle.module.css';

const keyOf = (favorite: FavoriteTitle) => `${favorite.mediaType}:${favorite.tmdbId}`;

function FavoritePoster({ posterPath }: Readonly<{ posterPath: string | null }>) {
  const raw = posterImageSrc(posterPath);
  const src = raw ? tmdbPosterSrcForListDisplay(raw) : undefined;
  if (src) return <img src={src} alt="" className={styles.thumb} loading="lazy" />;
  return <span className={styles.thumbEmpty} aria-hidden />;
}

function ReplaceFavoriteDialog({
  title,
  favorite,
}: Readonly<{ title: string; favorite: FavoriteToggleState }>) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const out = favorite.favorites.find((candidate) => keyOf(candidate) === selected);

  return (
    <ResponsiveDialog
      open
      title={t('moviePage.favorite.replaceTitle')}
      onClose={favorite.stopChoosing}
      footer={
        <ModalActions>
          <Button type="button" onClick={favorite.stopChoosing}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!out}
            loading={favorite.pending}
            onClick={() => out && favorite.replace(out)}
          >
            {t('moviePage.favorite.replaceConfirm')}
          </Button>
        </ModalActions>
      }
    >
      <p className={styles.intro}>{t('moviePage.favorite.replaceIntro', { title })}</p>
      {favorite.error && (
        <p className={styles.error} role="alert">
          {favorite.error}
        </p>
      )}
      <ChoiceGroup
        value={selected}
        onChange={setSelected}
        ariaLabel={t('moviePage.favorite.replaceGroup')}
        className={styles.choices}
      >
        {favorite.favorites.map((candidate) => (
          <ChoiceCard
            key={keyOf(candidate)}
            value={keyOf(candidate)}
            indicator
            title={candidate.title}
            description={candidate.year || undefined}
          >
            <FavoritePoster posterPath={candidate.posterPath} />
          </ChoiceCard>
        ))}
      </ChoiceGroup>
    </ResponsiveDialog>
  );
}

export default function FavoriteToggle({
  title,
  favorite,
  disabled = false,
  compact = false,
}: Readonly<{
  title: string;
  favorite: FavoriteToggleState;
  disabled?: boolean;
  compact?: boolean;
}>) {
  const { t } = useTranslation();
  const label = t('moviePage.favorite.toggle');
  const heart = (
    <Heart aria-hidden size={ICON_SIZE.md} fill={favorite.isFavorite ? 'currentColor' : 'none'} />
  );
  const shared = {
    'aria-pressed': favorite.isFavorite,
    disabled: disabled || favorite.pending,
    onClick: favorite.toggle,
  };

  return (
    <>
      {compact ? (
        <IconButton ariaLabel={label} {...shared}>
          {heart}
        </IconButton>
      ) : (
        <Button variant={favorite.isFavorite ? 'soft' : 'secondary'} {...shared}>
          {heart}
          {label}
        </Button>
      )}
      {favorite.choosing && !favorite.isFavorite && (
        <ReplaceFavoriteDialog title={title} favorite={favorite} />
      )}
    </>
  );
}
