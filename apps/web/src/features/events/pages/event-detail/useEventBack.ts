import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';

export function useEventBack(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (globalThis.history.length > 1) {
      navigate(-1);
    } else {
      navigate(ROUTES.home);
    }
  }, [navigate]);
}
