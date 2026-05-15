import { useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import type { AccentColor } from '@/shared/types/theme';
import styles from './AccentColorPicker.module.css';

/**
 * Palettes proposées dans l'UI — exclut 'default' volontairement :
 * la valeur stockée 'default' est visuellement identique à 'blue', donc on
 * affiche 'blue' comme sélection initiale pour les utilisateurs sans choix
 * explicite. Cliquer persiste alors une valeur explicite.
 */
const PICKER_COLORS = [
  'blue',
  'green',
  'purple',
  'pink',
  'orange',
] as const satisfies readonly Exclude<AccentColor, 'default'>[];
type PickerColor = (typeof PICKER_COLORS)[number];

/**
 * Couleurs CSS d'aperçu — alignées sur les variables `[data-accent='...']` de
 * `01-foundation.css`. MUST stay in sync : si tu changes la palette ici,
 * change aussi le bloc équivalent dans 01-foundation.css.
 */
const SWATCH_COLORS: Record<PickerColor, string> = {
  blue: '#2563eb',
  green: '#16a34a',
  purple: '#7c3aed',
  pink: '#db2777',
  orange: '#ea580c',
};

/** Mapping type-safe couleur → clé i18n (refusé à la compile si une couleur n'a pas de libellé). */
const ACCENT_LABEL_KEY: Record<PickerColor, TranslationKey> = {
  blue: 'auth.account.accentColorOptions.blue',
  green: 'auth.account.accentColorOptions.green',
  purple: 'auth.account.accentColorOptions.purple',
  pink: 'auth.account.accentColorOptions.pink',
  orange: 'auth.account.accentColorOptions.orange',
};

/** Délai avant de pousser le changement sur le serveur — absorbe le balayage clavier. */
const PATCH_DEBOUNCE_MS = 400;

/**
 * Sélecteur de palette d'accent — pattern WAI-ARIA `radiogroup`.
 * Clavier : ←/→ (et ↑/↓) déplacent la sélection, Home/End sautent aux extrêmes,
 * Tab entre dans le groupe sur l'option sélectionnée.
 *
 * Réseau : l'état local change immédiatement ; le PATCH serveur est debouncé
 * pour éviter une rafale d'appels lors du balayage clavier.
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

  // Valeur dernière confirmée serveur — point de rollback en cas d'erreur réseau.
  const lastCommittedRef = useRef<AccentColor>(accent);
  const patchTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (user) lastCommittedRef.current = accent;
    // On ne dépend que de `user` : on resync quand le profil arrive, pas à chaque local change.
  }, [user?.userId]);
  useEffect(
    () => () => {
      if (patchTimerRef.current !== null) clearTimeout(patchTimerRef.current);
    },
    []
  );

  // Pour la sélection : on traite la valeur stockée 'default' comme 'blue' (visuellement identique).
  const effectiveSelection: PickerColor = accent === 'default' ? 'blue' : (accent as PickerColor);

  const commit = useCallback(
    (next: PickerColor) => {
      if (next === effectiveSelection && accent !== 'default') return;
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
