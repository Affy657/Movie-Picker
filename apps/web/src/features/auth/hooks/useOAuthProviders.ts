import { useEffect, useState } from 'react';
import { fetchOAuthProviders, type OAuthProvider } from '@/features/auth/api/authApi';

export function useOAuthProviders(): OAuthProvider[] {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    let active = true;
    fetchOAuthProviders()
      .then((list) => {
        if (active) setProviders(list);
      })
      .catch(() => {
        if (active) setProviders([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return providers;
}
