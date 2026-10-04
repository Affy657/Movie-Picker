import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineError from '@/shared/components/InlineError';

describe('InlineError', () => {
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
