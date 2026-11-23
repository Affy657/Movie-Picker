import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';

function hasInAppPreviousPage(): boolean {
  const state: unknown = globalThis.history.state;
  if (typeof state !== 'object' || state === null || !('idx' in state)) return false;
  return typeof state.idx === 'number' && state.idx > 0;
}

export function useEventBack(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (hasInAppPreviousPage()) {
      void navigate(-1);
    } else {
      void navigate(ROUTES.home);
    }
  }, [navigate]);
}
