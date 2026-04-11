import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthPageShell from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { withReturnTo, ROUTES } from '@/app/routes';

export default function RegisterPage() {
  useDocumentTitle(pageTitle('Inscription'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const registerAction = useCallback(async () => {
    await register(email.trim(), password, displayName.trim());
    navigate(returnTo, { replace: true });
  }, [email, password, displayName, register, navigate, returnTo]);

  const { run: submit, loading, error } = useAsyncAction(registerAction, 'Inscription impossible.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <PageLayout>
      <AuthPageShell title="Inscription" description="Créez un compte pour retrouver vos soirées.">
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
          Déjà inscrit ? <Link to={withReturnTo(ROUTES.login, returnTo)}>Se connecter</Link>
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
