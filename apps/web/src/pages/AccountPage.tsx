import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/apiError';
import { useAuth } from '../contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '../hooks/useDocumentTitle';
import type { UiThemePreference } from '../types/auth';

const themeChoices: { value: UiThemePreference; label: string }[] = [
  { value: 'system', label: 'Système (auto)' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

export default function AccountPage() {
  useDocumentTitle(pageTitle('Compte'));
  const { user, isLoading, logout, patchProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [uiTheme, setUiTheme] = useState<UiThemePreference>('system');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setUiTheme(user.uiTheme);
  }, [user]);

  if (isLoading) {
    return (
      <main className="page">
        <p className="placeholder">Chargement…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <h1>Compte</h1>
        <p className="lead">Connectez-vous ou créez un compte pour garder vos soirées.</p>
        <nav className="nav-actions" aria-label="Accès au compte">
          <Link
            to={`/connexion?returnTo=${encodeURIComponent('/compte')}`}
            className="btn btn-primary"
          >
            Connexion
          </Link>
          <Link to={`/inscription?returnTo=${encodeURIComponent('/compte')}`} className="btn">
            Inscription
          </Link>
        </nav>
        <p className="muted">
          Vous pouvez aussi continuer en invité : créez ou rejoignez une soirée via le lien partagé.
        </p>
      </main>
    );
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await patchProfile({
        displayName: displayName.trim(),
        uiTheme,
      });
      setSavedAt(Date.now());
    } catch (err) {
      const msg = ApiError.is(err) ? err.message : 'Enregistrement impossible.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <h1>Compte</h1>
      <p className="muted">
        <span>{user.emailMasked}</span>
      </p>

      <section className="section" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Profil</h2>
        <form onSubmit={(e) => void handleProfileSubmit(e)} className="form">
          {error && (
            <p id="account-form-error" className="error" role="alert">
              {error}
            </p>
          )}
          {savedAt != null && !error && (
            <p className="hint" role="status" aria-live="polite">
              Modifications enregistrées.
            </p>
          )}
          <label className="label" htmlFor="account-displayName">
            Pseudo affiché
          </label>
          <input
            id="account-displayName"
            type="text"
            className="input"
            autoComplete="nickname"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSavedAt(null);
            }}
            required
            maxLength={80}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'account-form-error' : undefined}
          />
          <label className="label" htmlFor="account-uiTheme">
            Thème de l’interface
          </label>
          <select
            id="account-uiTheme"
            className="input select"
            value={uiTheme}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'system' || v === 'light' || v === 'dark') {
                setUiTheme(v);
                setSavedAt(null);
              }
            }}
          >
            {themeChoices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="hint">
            Affichage clair, sombre ou selon votre appareil. Stocké sur ce compte.
          </p>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
        </form>
      </section>

      <section className="section" aria-labelledby="session-heading">
        <h2 id="session-heading">Session</h2>
        <div className="nav-actions">
          <button
            type="button"
            className="btn btn-danger"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
          >
            {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
        <p className="hint">
          La session est maintenue par un cookie sécurisé (httpOnly) émis par l’API.
        </p>
      </section>
    </main>
  );
}
