import { useCallback, useRef, useState } from 'react';
import { getErrorMessage } from '@/shared/api/apiError';

type UseAsyncActionResult<TArgs extends unknown[], TResult> = {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useAsyncAction<TArgs extends unknown[], TResult = void>(
  action: (...args: TArgs) => Promise<TResult>,
  fallbackMessage = 'Une erreur est survenue.'
): UseAsyncActionResult<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;
      setError(null);
      setLoading(true);
      try {
        return await action(...args);
      } catch (err) {
        setError(getErrorMessage(err, fallbackMessage));
        return undefined;
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [action, fallbackMessage]
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, loading, error, clearError };
}
