import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { ChoiceCard, ChoiceGroup } from '@/shared/components/ChoiceCard';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import type { AccentColor } from '@/shared/types/theme';
import styles from './AccentColorPicker.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

const PICKER_COLORS = [
  'blue',
  'green',
  'purple',
  'pink',
  'orange',
  'red',
  'cyan',
  'indigo',
] as const satisfies readonly AccentColor[];
type PickerColor = (typeof PICKER_COLORS)[number];

const SWATCH_COLORS: Record<PickerColor, string> = {
  blue: 'var(--accent-swatch-blue)',
  green: 'var(--accent-swatch-green)',
  purple: 'var(--accent-swatch-purple)',
  pink: 'var(--accent-swatch-pink)',
  orange: 'var(--accent-swatch-orange)',
  red: 'var(--accent-swatch-red)',
  cyan: 'var(--accent-swatch-cyan)',
  indigo: 'var(--accent-swatch-indigo)',
};

const ACCENT_LABEL_KEY: Record<PickerColor, TranslationKey> = {
  blue: 'auth.account.accentColorOptions.blue',
  green: 'auth.account.accentColorOptions.green',
  purple: 'auth.account.accentColorOptions.purple',
  pink: 'auth.account.accentColorOptions.pink',
  orange: 'auth.account.accentColorOptions.orange',
  red: 'auth.account.accentColorOptions.red',
  cyan: 'auth.account.accentColorOptions.cyan',
  indigo: 'auth.account.accentColorOptions.indigo',
};

const PATCH_DEBOUNCE_MS = 400;

export default function AccentColorPicker({
  id,
  ariaLabelledBy,
  className = '',
  onSaved,
}: Readonly<{
  id?: string;
  ariaLabelledBy?: string;
  className?: string;
  onSaved?: () => void;
}>) {
  const { accent, setAccent } = useTheme();
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const lastCommittedRef = useRef<AccentColor>(accent);
  const accentRef = useRef(accent);
  accentRef.current = accent;
  const patchTimerRef = useRef<number | null>(null);
  const userId = user?.userId;
  useEffect(() => {
    if (userId) lastCommittedRef.current = accentRef.current;
  }, [userId]);
  useEffect(
    () => () => {
      if (patchTimerRef.current !== null) clearTimeout(patchTimerRef.current);
    },
    []
  );

  const toPickerColor = (color: AccentColor): PickerColor =>
    (PICKER_COLORS as readonly string[]).includes(color) ? (color as PickerColor) : 'blue';

  const effectiveSelection: PickerColor = toPickerColor(accent);

  const commit = useCallback(
    (next: PickerColor) => {
      if (next === effectiveSelection) return;
      setError(null);
      setAccent(next);
      if (!user) {
        lastCommittedRef.current = next;
        return;
      }
      if (patchTimerRef.current !== null) clearTimeout(patchTimerRef.current);
      patchTimerRef.current = globalThis.setTimeout(() => {
        patchTimerRef.current = null;
        const rollback = lastCommittedRef.current;
        void patchProfile({ accentColor: next })
          .then(() => {
            lastCommittedRef.current = next;
            onSaved?.();
          })
          .catch(() => {
            setAccent(rollback);
            setError(
              t('auth.account.accentColorSaveError', {
                color: t(ACCENT_LABEL_KEY[next]),
                previous: t(ACCENT_LABEL_KEY[toPickerColor(rollback)]),
              })
            );
          });
      }, PATCH_DEBOUNCE_MS);
    },
    [effectiveSelection, setAccent, user, patchProfile, onSaved, t]
  );

  return (
    <>
      <div id={id} className={clsx(styles.root, className || undefined)}>
        <ChoiceGroup
          value={effectiveSelection}
          onChange={commit}
          ariaLabel={ariaLabelledBy ? undefined : t('auth.account.accentColorLabel')}
          ariaLabelledBy={ariaLabelledBy}
          className={styles.swatches}
        >
          {PICKER_COLORS.map((color) => {
            const selected = color === effectiveSelection;
            return (
              <ChoiceCard
                key={color}
                value={color}
                layout="tile"
                ariaLabel={t(ACCENT_LABEL_KEY[color])}
                className={styles.swatch}
                data-accent={color}
              >
                <span
                  className={styles.disc}
                  style={{ ['--swatch-color' as string]: SWATCH_COLORS[color] }}
                >
                  {selected ? (
                    <Check size={ICON_SIZE.md} className={styles.check} aria-hidden />
                  ) : null}
                </span>
              </ChoiceCard>
            );
          })}
        </ChoiceGroup>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
