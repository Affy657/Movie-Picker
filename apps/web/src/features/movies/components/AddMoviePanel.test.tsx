import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import AddMoviePanel from './AddMoviePanel';

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'test-user' }, isLoading: false }),
}));
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function renderPanel() {
  return render(
    <LocaleProvider>
      <AddMoviePanel
        triggerLabel="Ajouter un film"
        panelTitle="Ajouter un film à ma liste"
        onAdded={() => undefined}
      />
    </LocaleProvider>
  );
}

describe('AddMoviePanel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("n'affiche pas le panneau avant l'ouverture", () => {
    stubMatchMedia(false);
    renderPanel();

    expect(screen.queryByText('Ajouter un film à ma liste')).not.toBeInTheDocument();
  });

  it('ouvre un panneau inline sur desktop au clic sur le déclencheur', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajouter un film' }));

    expect(screen.getByText('Ajouter un film à ma liste')).toBeInTheDocument();
  });

  it('referme le panneau inline au clic sur le bouton de fermeture', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajouter un film' }));
    expect(screen.getByText('Ajouter un film à ma liste')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fermer/i }));
    expect(screen.queryByText('Ajouter un film à ma liste')).not.toBeInTheDocument();
  });

  it('ouvre une feuille (sheet) sur mobile au clic sur le déclencheur', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajouter un film' }));

    expect(screen.getByRole('heading', { name: 'Ajouter un film à ma liste' })).toBeInTheDocument();
  });

  it('masque le déclencheur pendant que le panneau est ouvert, puis le réaffiche à la fermeture', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajouter un film' }));
    expect(screen.queryByRole('button', { name: 'Ajouter un film' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fermer/i }));
    expect(screen.getByRole('button', { name: 'Ajouter un film' })).toBeInTheDocument();
  });

  it('rend le focus au déclencheur après la fermeture', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajouter un film' }));
    await user.click(screen.getByRole('button', { name: /fermer/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ajouter un film' })).toHaveFocus()
    );
  });
});
