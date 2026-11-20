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
  'teal',
  'green',
  'lime',
  'gold',
  'orange',
  'pink',
  'purple',
] as const satisfies readonly AccentColor[];
type PickerColor = (typeof PICKER_COLORS)[number];

const SWATCH_COLORS: Record<PickerColor, string> = {
  blue: 'var(--color-accent-swatch-blue)',
  teal: 'var(--color-accent-swatch-teal)',
  green: 'var(--color-accent-swatch-green)',
  lime: 'var(--color-accent-swatch-lime)',
  gold: 'var(--color-accent-swatch-gold)',
  orange: 'var(--color-accent-swatch-orange)',
  pink: 'var(--color-accent-swatch-pink)',
  purple: 'var(--color-accent-swatch-purple)',
};

const ACCENT_LABEL_KEY: Record<PickerColor, TranslationKey> = {
  blue: 'auth.account.accentColorOptions.blue',
  teal: 'auth.account.accentColorOptions.teal',
  green: 'auth.account.accentColorOptions.green',
  lime: 'auth.account.accentColorOptions.lime',
  gold: 'auth.account.accentColorOptions.gold',
  orange: 'auth.account.accentColorOptions.orange',
  pink: 'auth.account.accentColorOptions.pink',
  purple: 'auth.account.accentColorOptions.purple',
};

const PATCH_DEBOUNCE_MS = 400;

function toPickerColor(color: AccentColor): PickerColor {
  return (PICKER_COLORS as readonly string[]).includes(color) ? (color as PickerColor) : 'blue';
}

export function AccentColorSummary({ color }: Readonly<{ color: AccentColor }>) {
  const { t } = useTranslation();
  const shown = toPickerColor(color);
  return (
    <span className={styles.summary}>
      <span
        className={clsx(styles.disc, styles.summaryDisc)}
        style={{ ['--swatch-color' as string]: SWATCH_COLORS[shown] }}
        aria-hidden="true"
      />
      {t(ACCENT_LABEL_KEY[shown])}
    </span>
  );
}

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
  const sendPendingPatchRef = useRef<(() => void) | null>(null);
  const userId = user?.userId;
  useEffect(() => {
    if (userId) lastCommittedRef.current = accentRef.current;
  }, [userId]);
  useEffect(
    () => () => {
      if (patchTimerRef.current === null) return;
      clearTimeout(patchTimerRef.current);
      patchTimerRef.current = null;
      sendPendingPatchRef.current?.();
    },
    []
  );

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
      sendPendingPatchRef.current = () => {
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
      };
      patchTimerRef.current = globalThis.setTimeout(() => {
        patchTimerRef.current = null;
        sendPendingPatchRef.current?.();
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
