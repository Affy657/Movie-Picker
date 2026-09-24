import { useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { RatingScale } from '@/shared/types/theme';
import { RATING_SCALES } from '@/shared/types/theme';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import SegmentedRadioGroup from '@/shared/components/SegmentedRadioGroup';

const LABEL_KEY: Record<RatingScale, TranslationKey> = {
  five: 'auth.account.ratingScaleOptions.five',
  ten: 'auth.account.ratingScaleOptions.ten',
};

export default function RatingScaleToggle({
  className = '',
  id,
  ariaLabelledBy,
  onSaved,
}: Readonly<{
  className?: string;
  id?: string;
  ariaLabelledBy?: string;
  onSaved?: () => void;
}>) {
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();
  const current: RatingScale = user?.ratingScale ?? 'five';
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    void patchProfile({ ratingScale: value })
      .then(() => onSaved?.())
      .catch(() => setError(t('auth.account.ratingScaleSaveError')));
  };

  return (
    <>
      <SegmentedRadioGroup
        options={options}
        value={current}
        onChange={commit}
        ariaLabel={t('auth.account.ratingScaleLabel')}
        ariaLabelledBy={ariaLabelledBy}
        className={className}
        id={id}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
