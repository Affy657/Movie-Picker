import { useEffect, useState } from 'react';
import { fetchOAuthProviders } from '@/features/auth/api/authApi';

export function useOAuthProviders(): string[] {
  const [providers, setProviders] = useState<string[]>([]);

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
