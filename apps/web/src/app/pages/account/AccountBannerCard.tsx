import { lazy, Suspense, useId, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from '@/shared/i18n';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { posterImageSrc, posterSrcAtSize } from '@/shared/utils/posterUrl';
import { useBannerActions } from '@/features/profile/hooks/useBannerActions';
import type { UserProfile } from '@/features/auth/types';
import settings from '@/shared/components/SettingsSection.module.css';
import styles from './AccountBannerCard.module.css';

const BannerPickerModal = lazy(() => import('@/features/profile/components/BannerPickerModal'));

function previewSrc(imageUrl: string): string | undefined {
  return posterSrcAtSize(imageUrl, 'w300') ?? posterImageSrc(imageUrl);
}

export default function AccountBannerCard({ user }: Readonly<{ user: UserProfile }>) {
  const { t } = useTranslation();
  const headingId = useId();
  const actions = useBannerActions();
  const [open, setOpen] = useState(false);
  const banner = user.banner ?? null;

  return (
    <Card
      as="section"
      aria-labelledby={headingId}
      padding="none"
      elevation="sm"
      className={settings.card}
    >
      <div className={clsx(settings.row, settings.noDivider, styles.row)}>
        <div className={settings.rowMain}>
          <h3 id={headingId} className={clsx(settings.rowLabel, styles.heading)}>
            {t('profile.banner.settingsTitle')}
          </h3>
          <p className={settings.rowSub}>{t('profile.banner.settingsDescription')}</p>
          {!banner && (
            <p className={clsx(settings.rowSub, styles.empty)}>
              {t('profile.banner.settingsEmpty')}
            </p>
          )}
        </div>
        {banner && (
          <img
            src={previewSrc(banner.imageUrl)}
            alt=""
            decoding="async"
            loading="lazy"
            data-testid="account-banner-preview"
            className={styles.preview}
          />
        )}
        <Button size="sm" onClick={() => setOpen(true)}>
          {banner ? t('profile.banner.settingsEdit') : t('profile.banner.settingsAdd')}
        </Button>
      </div>
      {open && (
        <Suspense fallback={null}>
          <BannerPickerModal
            open
            banner={banner}
            photoUrl={user.bannerPhotoUrl ?? null}
            onChoose={actions.chooseBanner}
            onRemove={actions.removeBanner}
            onUploadPhoto={actions.uploadBannerPhoto}
            onDeletePhoto={actions.deleteBannerPhoto}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </Card>
  );
}
