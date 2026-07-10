import clsx from 'clsx';
import { useMemo } from 'react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { RatingScale } from '@/shared/types/theme';
import { RATING_SCALES } from '@/shared/types/theme';
import { useTranslation, type TranslationKey } from '@/shared/i18n';
import styles from './ThemeToggle.module.css';

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

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    const last = options.length - 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(options[idx === last ? 0 : idx + 1]!.value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(options[idx === 0 ? last : idx - 1]!.value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(options[0]!.value);
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(options[last]!.value);
    }
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={id ? undefined : t('auth.account.ratingScaleLabel')}
      className={clsx(styles.root, className || undefined)}
    >
      {options.map((opt, idx) => {
        const selected = opt.value === current;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={clsx(styles.option, selected && styles.optionSelected)}
            onClick={() => commit(opt.value)}
            onKeyDown={(e) => handleKey(e, idx)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
