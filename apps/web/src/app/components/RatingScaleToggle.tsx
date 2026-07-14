import { useMemo } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { RatingScale } from '@/shared/types/theme';
import { RATING_SCALES } from '@/shared/types/theme';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import SegmentedRadioGroup from './SegmentedRadioGroup';

const LABEL_KEY: Record<RatingScale, TranslationKey> = {
  five: 'auth.account.ratingScaleOptions.five',
  ten: 'auth.account.ratingScaleOptions.ten',
};

export default function RatingScaleToggle({
  className = '',
  id,
}: Readonly<{ className?: string; id?: string }>) {
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();
  const current: RatingScale = user?.ratingScale ?? 'five';

  const options = useMemo(
    () =>
      RATING_SCALES.map((code) => ({
        value: code,
        label: t(LABEL_KEY[code]),
      })),
    [t]
  );

  const commit = (value: RatingScale) => {
    if (!user || value === current) return;
    void patchProfile({ ratingScale: value });
  };

  return (
    <SegmentedRadioGroup
      options={options}
      value={current}
      onChange={commit}
      ariaLabel={t('auth.account.ratingScaleLabel')}
      className={className}
      id={id}
    />
  );
}
