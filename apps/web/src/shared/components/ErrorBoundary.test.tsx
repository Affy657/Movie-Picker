import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { LocaleProvider } from '@/shared/i18n';
import { reloadForFreshBuild } from '@/shared/pwa/staleBuildReload';
import type { ReactNode } from 'react';

vi.mock('@/shared/pwa/staleBuildReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/pwa/staleBuildReload')>()),
  reloadForFreshBuild: vi.fn(),
}));

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

  it('shows the fallback and allows retrying', async () => {
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

  it('reloads on a failed chunk, React.lazy would only rethrow the same rejection', async () => {
    const user = userEvent.setup();
    function MissingChunk(): never {
      throw new TypeError('Failed to fetch dynamically imported module: /assets/Page.js');
    }
    render(
      <BoundaryHarness>
        <MissingChunk />
      </BoundaryHarness>
    );

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(reloadForFreshBuild).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: /problème est survenu/i })).toBeInTheDocument();
  });

  it('keeps the plain retry for any other error', async () => {
    const user = userEvent.setup();
    vi.mocked(reloadForFreshBuild).mockClear();
    render(
      <BoundaryHarness>
        <Bomb fail />
      </BoundaryHarness>
    );

    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(reloadForFreshBuild).not.toHaveBeenCalled();
  });

  it('Home link present', () => {
    render(
      <BoundaryHarness>
        <Bomb fail />
      </BoundaryHarness>
    );
    expect(screen.getByRole('link', { name: /accueil/i })).toHaveAttribute('href', '/');
  });
});
