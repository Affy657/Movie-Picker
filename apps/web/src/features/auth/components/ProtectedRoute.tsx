import { Navigate, useLocation } from 'react-router-dom';
import PageLayout from '@/shared/components/PageLayout';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { withReturnTo, ROUTES } from '@/app/routes';

type Props = { children: React.ReactNode };

export function ProtectedRoute({ children }: Props) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <PageLayout>
        <p className="placeholder">Chargement du compte…</p>
      </PageLayout>
    );
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={withReturnTo(ROUTES.login, returnTo)} replace />;
  }

  return <>{children}</>;
}
