import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import CreateEvent from '@/features/events/pages/CreateEvent';
import CreateEventDialogProvider from '@/features/events/components/create-event/CreateEventDialogProvider';
import { loadCreateEventDialog } from '@/features/events/components/create-event/createEventDialogContext';
import SessionGate from '@/app/components/SessionGate';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { LocaleProvider } from '@/shared/i18n';

const SIGNED_IN = {
  user: { userId: 'u1', displayName: 'Vitest', emailMasked: 'v***@test.local' },
  isLoading: false,
  authCheckFailed: false,
};
const CHECKING = { user: null, isLoading: true, authCheckFailed: false };
const SIGNED_OUT = { user: null, isLoading: false, authCheckFailed: false };

const mockAuth = vi.hoisted(() => ({ current: {} as unknown }));
const mockFetchApi = vi.fn();
vi.mock('@/shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/api/client')>()),
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => mockAuth.current,
}));
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));
vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: () => false }));

function PathProbe() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

function routes(entry: string | { pathname: string; state: unknown }) {
  return (
    <QueryClientWrapper>
      <LocaleProvider>
        <MemoryRouter initialEntries={[entry]}>
          <CreateEventDialogProvider>
            <Routes>
              <Route
                path="/new"
                element={
                  <SessionGate
                    icon={null}
                    headingKey="nav.createEvent"
                    titleKey="events.create.signedOutTitle"
                    messageKey="events.create.signedOutMessage"
                    returnTo="/new"
                  >
                    <CreateEvent />
                  </SessionGate>
                }
              />
              <Route path="*" element={<PathProbe />} />
            </Routes>
          </CreateEventDialogProvider>
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientWrapper>
  );
}

function renderAt(entry: string | { pathname: string; state: unknown }) {
  const view = render(routes(entry));
  return { ...view, rerender: () => view.rerender(routes(entry)) };
}

describe('CreateEvent route', () => {
  beforeAll(async () => {
    await loadCreateEventDialog();
  });

  beforeEach(() => {
    mockAuth.current = SIGNED_IN;
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

  it('waits for the session before opening the window', async () => {
    mockAuth.current = CHECKING;
    const view = renderAt('/new');

    expect(
      await screen.findByRole('heading', { name: 'Mes soirées', level: 1 })
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('dialog', { name: 'Nouvelle soirée' })).not.toBeInTheDocument();

    mockAuth.current = SIGNED_IN;
    view.rerender();

    expect(await screen.findByRole('dialog', { name: 'Nouvelle soirée' })).toBeInTheDocument();
  });

  it('closes the window when the session turns out to be over, and stays on the page', async () => {
    const view = renderAt('/new');
    await screen.findByRole('dialog', { name: 'Nouvelle soirée' });

    mockAuth.current = SIGNED_OUT;
    view.rerender();

    expect(await screen.findByText('Créez votre soirée')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Nouvelle soirée' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('path')).not.toBeInTheDocument();
  });
});
