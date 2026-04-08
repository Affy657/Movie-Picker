import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getNextUiPreference } from '../utils/uiThemePreference';

/** Bouton accessible : cycle clair → sombre → auto (système) ; persiste en local et sur le compte si connecté. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { preference, resolvedTheme, setUiPreference } = useTheme();
  const { user, patchProfile } = useAuth();

  const label =
    preference === 'system'
      ? `Auto (${resolvedTheme === 'dark' ? 'sombre' : 'clair'})`
      : preference === 'dark'
        ? 'Sombre'
        : 'Clair';

  const handleClick = () => {
    const prev = preference;
    const next = getNextUiPreference(prev);
    setUiPreference(next);
    if (user) {
      void patchProfile({ uiTheme: next }).catch(() => {
        setUiPreference(prev);
      });
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-theme ${className}`.trim()}
      onClick={handleClick}
      aria-label={`Thème actuel : ${label}. Appuyer pour passer au suivant.`}
    >
      {label}
    </button>
  );
}
