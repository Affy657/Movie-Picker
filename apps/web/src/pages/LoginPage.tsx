import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/apiError';
import { useAuth } from '../contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '../hooks/useDocumentTitle';
import { safeReturnTo } from '../utils/returnTo';

export default function LoginPage() {
  useDocumentTitle(pageTitle('Connexion'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const msg = ApiError.is(err) ? err.message : 'Connexion impossible.';
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
      <h1>Connexion</h1>
      <p className="muted">Accédez à vos soirées et à votre profil.</p>
      <form
        onSubmit={handleSubmit}
        className="form"
        aria-describedby={error ? 'login-form-error' : undefined}
      >
        {error && (
          <p id="login-form-error" className="error" role="alert">
            {error}
          </p>
        )}
        <label className="label" htmlFor="login-email">
          E-mail
        </label>
        <input
          id="login-email"
          type="email"
          className="input"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
        />
        <label className="label" htmlFor="login-password">
          Mot de passe
        </label>
        <input
          id="login-password"
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-invalid={error ? true : undefined}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="muted">
        Pas encore de compte ?{' '}
        <Link to={`/inscription?returnTo=${encodeURIComponent(returnTo)}`}>Créer un compte</Link>
      </p>
    </main>
  );
}
