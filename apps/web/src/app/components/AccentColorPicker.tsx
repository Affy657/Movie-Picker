import { useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import type { AccentColor } from '@/shared/types/theme';
import styles from './AccentColorPicker.module.css';

const PICKER_COLORS = [
  'default',
  'blue',
  'green',
  'purple',
  'pink',
  'orange',
] as const satisfies readonly AccentColor[];
type PickerColor = (typeof PICKER_COLORS)[number];

const SWATCH_COLORS: Record<PickerColor, string> = {
  default: '#2563eb',
  blue: '#2563eb',
  green: '#16a34a',
  purple: '#7c3aed',
  pink: '#db2777',
  orange: '#ea580c',
};

const ACCENT_LABEL_KEY: Record<PickerColor, TranslationKey> = {
  default: 'auth.account.accentColorOptions.default',
  blue: 'auth.account.accentColorOptions.blue',
  green: 'auth.account.accentColorOptions.green',
  purple: 'auth.account.accentColorOptions.purple',
  pink: 'auth.account.accentColorOptions.pink',
  orange: 'auth.account.accentColorOptions.orange',
};

const PATCH_DEBOUNCE_MS = 400;

export default function AccentColorPicker({
  id,
  className = '',
}: {
  id?: string;
  className?: string;
}) {
  const { accent, setAccent } = useTheme();
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();

  const lastCommittedRef = useRef<AccentColor>(accent);
  const patchTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (user) lastCommittedRef.current = accent;
  }, [user?.userId]);
  useEffect(
    () => () => {
      if (patchTimerRef.current !== null) clearTimeout(patchTimerRef.current);
    },
    []
  );

  const effectiveSelection: PickerColor = accent as PickerColor;

  const commit = useCallback(
    (next: PickerColor) => {
      if (next === effectiveSelection) return;
      setAccent(next);
      if (!user) {
        lastCommittedRef.current = next;
        return;
      }
      if (patchTimerRef.current !== null) clearTimeout(patchTimerRef.current);
      patchTimerRef.current = window.setTimeout(() => {
        patchTimerRef.current = null;
        const rollback = lastCommittedRef.current;
        void patchProfile({ accentColor: next })
          .then(() => {
            lastCommittedRef.current = next;
          })
          .catch(() => {
            setAccent(rollback);
          });
      }, PATCH_DEBOUNCE_MS);
    },
    [effectiveSelection, accent, setAccent, user, patchProfile]
  );

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    const last = PICKER_COLORS.length - 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      commit(PICKER_COLORS[idx === last ? 0 : idx + 1]!);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      commit(PICKER_COLORS[idx === 0 ? last : idx - 1]!);
    } else if (e.key === 'Home') {
      e.preventDefault();
      commit(PICKER_COLORS[0]!);
    } else if (e.key === 'End') {
      e.preventDefault();
      commit(PICKER_COLORS[last]!);
    }
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={id ? undefined : t('auth.account.accentColorLabel')}
      className={clsx(styles.root, className || undefined)}
    >
      {PICKER_COLORS.map((color, idx) => {
        const selected = color === effectiveSelection;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(ACCENT_LABEL_KEY[color])}
            tabIndex={selected ? 0 : -1}
            className={clsx(styles.swatch, selected && styles.swatchSelected)}
            data-accent={color}
            style={{ ['--swatch-color' as string]: SWATCH_COLORS[color] }}
            onClick={() => commit(color)}
            onKeyDown={(e) => handleKey(e, idx)}
          >
            {selected ? <Check size={16} className={styles.check} aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}
