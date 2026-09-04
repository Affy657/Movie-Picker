import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

function Bomb({ fail }: { fail: boolean }) {
  if (fail) throw new Error('erreur de test volontaire');
  return <span>tout va bien</span>;
}

describe('ErrorBoundary', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleError.mockClear();
  });

  it('affiche le fallback et permet de réessayer', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary>
          <Bomb fail />
        </ErrorBoundary>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /problème est survenu/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/erreur de test volontaire/i);

    rerender(
      <MemoryRouter>
        <ErrorBoundary>
          <Bomb fail={false} />
        </ErrorBoundary>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /réessayer/i }));
    expect(screen.getByText(/tout va bien/i)).toBeInTheDocument();
  });

  it('lien Accueil présent', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Bomb fail />
        </ErrorBoundary>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /accueil/i })).toHaveAttribute('href', '/decouvrir');
  });
});
