import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/apiError';
import { useAuth } from '../contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '../hooks/useDocumentTitle';
import { safeReturnTo } from '../utils/returnTo';

export default function RegisterPage() {
  useDocumentTitle(pageTitle('Inscription'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim());
      navigate(returnTo, { replace: true });
    } catch (err) {
      const msg = ApiError.is(err) ? err.message : 'Inscription impossible.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Link to="/" className="back-link">
        ← Accueil
      </Link>
      <h1>Inscription</h1>
      <p className="muted">Créez un compte pour retrouver vos soirées.</p>
      <form
        onSubmit={handleSubmit}
        className="form"
        aria-describedby={error ? 'register-form-error' : undefined}
      >
        {error && (
          <p id="register-form-error" className="error" role="alert">
            {error}
          </p>
        )}
        <label className="label" htmlFor="register-displayName">
          Pseudo affiché
        </label>
        <input
          id="register-displayName"
          type="text"
          className="input"
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={80}
          aria-invalid={error ? true : undefined}
        />
        <label className="label" htmlFor="register-email">
          E-mail
        </label>
        <input
          id="register-email"
          type="email"
          className="input"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
        />
        <label className="label" htmlFor="register-password">
          Mot de passe
        </label>
        <input
          id="register-password"
          type="password"
          className="input"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          aria-invalid={error ? true : undefined}
          aria-describedby="register-password-hint"
        />
        <p id="register-password-hint" className="hint">
          8 caractères minimum, au moins une lettre et un chiffre.
        </p>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p className="muted">
        Déjà inscrit ?{' '}
        <Link to={`/connexion?returnTo=${encodeURIComponent(returnTo)}`}>Se connecter</Link>
      </p>
    </main>
  );
}
