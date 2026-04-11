import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthPageShell from '@/features/auth/components/AuthPageShell';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { pageTitle, useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { safeReturnTo } from '@/shared/utils/returnTo';
import { withReturnTo, ROUTES } from '@/app/routes';

export default function LoginPage() {
  useDocumentTitle(pageTitle('Connexion'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));

  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginAction = useCallback(async () => {
    await login(email.trim(), password);
    navigate(returnTo, { replace: true });
  }, [email, password, login, navigate, returnTo]);

  const { run: submit, loading, error } = useAsyncAction(loginAction, 'Connexion impossible.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <PageLayout>
      <AuthPageShell title="Connexion" description="Accédez à vos soirées et à votre profil.">
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
          <Link to={withReturnTo(ROUTES.register, returnTo)}>Créer un compte</Link>
        </p>
      </AuthPageShell>
    </PageLayout>
  );
}
