import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineError from '@/shared/components/InlineError';
import { noteRateLimit, resetRateLimitCooldownForTests } from '@/shared/api/rateLimitCooldown';

describe('InlineError', () => {
  afterEach(() => {
    resetRateLimitCooldownForTests();
    vi.useRealTimers();
  });

  it('holds the retry back for the delay a rate limit asked for', () => {
    vi.useFakeTimers();
    noteRateLimit(3_000);
    render(<InlineError message="Trop de requêtes." retryLabel="Réessayer" onRetry={vi.fn()} />);

    expect(screen.getByRole('button', { name: /réessayer dans 3 s/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByRole('button', { name: /réessayer dans 2 s/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeEnabled();
  });

  it('announces the failure and retries on demand', async () => {
    const onRetry = vi.fn();
    render(
      <InlineError
        message="Les statistiques n’ont pas pu être chargées."
        retryLabel="Réessayer"
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Les statistiques n’ont pas pu être chargées.'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('stays polite when several blocks fail at once', () => {
    render(
      <InlineError
        message="Cette sélection est momentanément indisponible."
        retryLabel="Réessayer"
        onRetry={vi.fn()}
        messageRole="status"
      />
    );

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cette sélection est momentanément indisponible.'
    );
  });
});
