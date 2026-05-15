import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useTranslation } from '@/shared/i18n';
import { ACCENT_COLORS, type AccentColor } from '@/shared/types/theme';
import { isAccentColor } from '@/shared/utils/accentColor';
import styles from './AccentColorPicker.module.css';

/**
 * Couleurs CSS d'aperçu — alignées sur les variables `[data-accent='...']` de
 * `01-foundation.css`. Évite d'avoir à instancier un sous-arbre `data-accent` juste
 * pour montrer une pastille (plus simple, pas de FOUC).
 */
const SWATCH_COLORS: Record<Exclude<AccentColor, 'default'>, string> = {
  blue: '#2563eb',
  green: '#16a34a',
  purple: '#7c3aed',
  pink: '#db2777',
  orange: '#ea580c',
};

/**
 * Sélecteur de palette d'accent — pattern WAI-ARIA `radiogroup`.
 * Clavier : ←/→ (et ↑/↓) déplacent la sélection, Space/Enter confirme,
 * Tab entre dans le groupe sur l'option active.
 */
export default function AccentColorPicker({
  id,
  className = '',
}: {
  /** Si défini, doit cibler le `<label htmlFor>` externe pour l'accessibilité. */
  id?: string;
  className?: string;
}) {
  const { accent, setAccent } = useTheme();
  const { user, patchProfile } = useAuth();
  const { t } = useTranslation();

  const handleChange = (next: AccentColor) => {
    if (!isAccentColor(next)) return;
    if (next === accent) return;
    const prev = accent;
    setAccent(next);
    if (user) {
      void patchProfile({ accentColor: next }).catch(() => {
        setAccent(prev);
      });
    }
  };

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    const last = ACCENT_COLORS.length - 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = idx === last ? 0 : idx + 1;
      handleChange(ACCENT_COLORS[nextIdx]!);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = idx === 0 ? last : idx - 1;
      handleChange(ACCENT_COLORS[nextIdx]!);
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleChange(ACCENT_COLORS[0]!);
    } else if (e.key === 'End') {
      e.preventDefault();
      handleChange(ACCENT_COLORS[last]!);
    }
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={id ? undefined : t('auth.account.accentColorLabel')}
      className={clsx(styles.root, className || undefined)}
    >
      {ACCENT_COLORS.map((color, idx) => {
        const selected = color === accent;
        const swatchColor = color === 'default' ? undefined : SWATCH_COLORS[color];
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(`auth.account.accentColorOptions.${color}` as const)}
            tabIndex={selected ? 0 : -1}
            className={clsx(
              styles.swatch,
              selected && styles.swatchSelected,
              color === 'default' && styles.swatchDefault
            )}
            style={swatchColor ? { ['--swatch-color' as string]: swatchColor } : undefined}
            onClick={() => handleChange(color)}
            onKeyDown={(e) => handleKey(e, idx)}
          >
            {selected ? <Check size={16} className={styles.check} aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}
