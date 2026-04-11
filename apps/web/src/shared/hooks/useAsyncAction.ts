import { useCallback, useState } from 'react';
import { getErrorMessage } from '@/shared/api/apiError';

type UseAsyncActionResult<TArgs extends unknown[], TResult> = {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
};

/**
 * Encapsule le pattern répété : loading + error + try/catch/finally.
 * `getErrorMessage` est appelé automatiquement pour extraire un message user-friendly.
 */
export function useAsyncAction<TArgs extends unknown[], TResult = void>(
  action: (...args: TArgs) => Promise<TResult>,
  fallbackMessage = 'Une erreur est survenue.'
): UseAsyncActionResult<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setError(null);
      setLoading(true);
      try {
        return await action(...args);
      } catch (err) {
        setError(getErrorMessage(err, fallbackMessage));
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [action, fallbackMessage]
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, loading, error, clearError };
}
