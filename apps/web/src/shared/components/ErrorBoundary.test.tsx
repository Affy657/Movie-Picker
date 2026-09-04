import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { LocaleProvider } from '@/shared/i18n';
import type { ReactNode } from 'react';

function Bomb({ fail }: { fail: boolean }) {
  if (fail) throw new Error('erreur de test volontaire');
  return <span>tout va bien</span>;
}

function BoundaryHarness({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <LocaleProvider>
      <MemoryRouter>
        <ErrorBoundary>{children}</ErrorBoundary>
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe('ErrorBoundary', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleError.mockClear();
  });

  it('affiche le fallback et permet de réessayer', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BoundaryHarness>
        <Bomb fail />
      </BoundaryHarness>
    );

    expect(screen.getByRole('heading', { name: /problème est survenu/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/erreur de test volontaire/i);

    rerender(
      <BoundaryHarness>
        <Bomb fail={false} />
      </BoundaryHarness>
    );
    await user.click(screen.getByRole('button', { name: /réessayer/i }));
    expect(screen.getByText(/tout va bien/i)).toBeInTheDocument();
  });

  it('lien Accueil présent', () => {
    render(
      <BoundaryHarness>
        <Bomb fail />
      </BoundaryHarness>
    );
    expect(screen.getByRole('link', { name: /accueil/i })).toHaveAttribute('href', '/decouvrir');
  });
});
