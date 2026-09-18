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

  it('opens an inline panel on desktop when clicking the trigger', async () => {
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

  it('opens a sheet on mobile when clicking the trigger', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajouter un film' }));

    expect(screen.getByRole('heading', { name: 'Ajouter un film à ma liste' })).toBeInTheDocument();
  });

  it('hides the trigger while the panel is open, then shows it again on close', async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajouter un film' }));
    expect(screen.queryByRole('button', { name: 'Ajouter un film' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fermer/i }));
    expect(screen.getByRole('button', { name: 'Ajouter un film' })).toBeInTheDocument();
  });

  it('a first Escape only closes the search history, the next one closes the panel', async () => {
    stubMatchMedia(false);
    localStorage.setItem('moviepicker_search_history_test-user', JSON.stringify(['inception']));
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ajouter un film' }));
    const input = screen.getByPlaceholderText(/ajouter un film/i);
    await user.click(input);
    expect(screen.getByRole('group', { name: /recherches récentes/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: /recherches récentes/i })).not.toBeInTheDocument();
    expect(screen.getByText('Ajouter un film à ma liste')).toBeInTheDocument();
    expect(input).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('Ajouter un film à ma liste')).not.toBeInTheDocument();
    localStorage.removeItem('moviepicker_search_history_test-user');
  });

  it('gives the focus back to the trigger after closing', async () => {
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
