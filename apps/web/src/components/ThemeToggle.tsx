import { useTheme } from '../contexts/ThemeContext';

/** Bouton accessible pour basculer clair / sombre (préférence persistée). */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`btn btn-theme ${className}`.trim()}
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
    >
      {isDark ? 'Thème clair' : 'Thème sombre'}
    </button>
  );
}
