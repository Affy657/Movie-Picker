import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import type { LibraryEntry } from '@/features/library/hooks/useLibraryToolbar';
import ListMoviesPage from './ListMoviesPage';

vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

function film(tmdbId: number, title: string, voteAverage: number): LibraryEntry {
  return {
    tmdbId,
    mediaType: 'movie',
    title,
    year: '2000',
    posterPath: null,
    voteAverage,
    runtimeMinutes: 100,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

function renderPage() {
  render(
    <QueryClientWrapper>
      <LocaleProvider>
        <MemoryRouter>
          <ListMoviesPage
            title="À voir"
            subtitle={null}
            items={[film(200, 'Ancien Mais Bien Noté', 9), film(201, 'Recent Mais Mal Noté', 3)]}
            isLoading={false}
            isError={false}
            storageScope="watchlist"
            emptyIcon={null}
            labels={{
              listAria: 'Films de ma liste',
              loading: 'Chargement',
              loadError: 'Erreur',
              emptyTitle: 'Vide',
              emptyMessage: 'Rien',
            }}
            card={{
              inWatchlist: () => true,
              showListBadge: false,
              onToggleWatchlist: vi.fn(),
              error: null,
            }}
          />
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientWrapper>
  );
}

describe('ListMoviesPage', () => {
  it('gives the focus back to the filters toggle when Escape closes the filters panel', async () => {
    const user = userEvent.setup();
    renderPage();

    const toggle = screen.getByRole('button', { name: /^filtres$/i });
    await user.click(toggle);
    const panelId = toggle.getAttribute('aria-controls')!;
    within(document.getElementById(panelId)!).getAllByRole('button')[0]!.focus();
    await user.keyboard('{Escape}');

    expect(document.getElementById(panelId)).toBeNull();
    expect(toggle).toHaveFocus();
  });
});
