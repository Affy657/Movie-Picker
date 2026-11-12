import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import CreateEvent from '@/features/events/pages/CreateEvent';
import CreateEventDialogProvider from '@/features/events/components/create-event/CreateEventDialogProvider';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { LocaleProvider } from '@/shared/i18n';

const mockFetchApi = vi.fn();
vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { userId: 'u1', displayName: 'Vitest', emailMasked: 'v***@test.local' },
    isLoading: false,
    authCheckFailed: false,
  }),
}));
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));
vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: () => false }));

function PathProbe() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function renderAt(entry: string | { pathname: string; state: unknown }) {
  return render(
    <QueryClientWrapper>
      <LocaleProvider>
        <MemoryRouter initialEntries={[entry]}>
          <CreateEventDialogProvider>
            <Routes>
              <Route path="/new" element={<CreateEvent />} />
              <Route path="*" element={<PathProbe />} />
            </Routes>
          </CreateEventDialogProvider>
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientWrapper>
  );
}

describe('CreateEvent route', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
    mockFetchApi.mockImplementation((path: unknown) => {
      if (typeof path === 'string' && path.startsWith('/users/me/event-templates')) {
        return Promise.resolve({ items: [] });
      }
      if (typeof path === 'string' && path.startsWith('/events/mine')) {
        return Promise.resolve({ events: [], hasMore: false, totalActive: 0, totalFinished: 0 });
      }
      if (typeof path === 'string' && path.endsWith('/config')) {
        return Promise.resolve({
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: 4,
          maxParticipants: 12,
          wheelMode: 'strictRandom',
          winnerCount: 1,
          allowSeries: false,
        });
      }
      return Promise.resolve({});
    });
  });

  it('opens the creation window over My movie nights', async () => {
    renderAt('/new');

    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle soirée' });
    expect(within(dialog).getByRole('button', { name: 'Créer la soirée' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mes soirées', level: 1 })).toBeInTheDocument();
    expect(document.title).toBe(pageTitle('Nouvelle soirée'));
  });

  it('lands on My movie nights once the window is closed', async () => {
    const user = userEvent.setup();
    renderAt('/new');

    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle soirée' });
    await user.click(within(dialog).getByRole('button', { name: 'Fermer' }));

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/my-events'));
  });

  it('starts from the rules of the night to redo', async () => {
    renderAt({
      pathname: '/new',
      state: { reuseEventSlug: 'old', reuseEventTitle: 'Soirée du 31 octobre' },
    });

    expect(
      await screen.findByRole('button', { name: 'Règles : comme « Soirée du 31 octobre »' })
    ).toBeInTheDocument();
  });
});
