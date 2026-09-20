import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import CreateEvent from '@/features/events/pages/CreateEvent';
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

function RenderCreateEvent() {
  return render(
    <QueryClientWrapper>
      <LocaleProvider>
        <MemoryRouter>
          <CreateEvent />
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientWrapper>
  );
}

const TEMPLATES_PATH = '/users/me/event-templates';

function isTemplatesCall(path: unknown): boolean {
  return typeof path === 'string' && path.startsWith(TEMPLATES_PATH);
}

function LocationStateProbe() {
  return <p data-testid="location-state">{JSON.stringify(useLocation().state)}</p>;
}

const HORROR_TEMPLATE = {
  id: 't1',
  name: 'Soirée horreur',
  theme: '🎃 Halloween',
  maxProposalsPerParticipant: 4,
  maxParticipants: 12,
  wheelMode: 'strictRandom',
  richSharePreview: true,
  allowSeries: true,
  winnerCount: 1,
};

function mockTemplates(items: unknown[]) {
  mockFetchApi.mockImplementation((path: unknown) => {
    if (isTemplatesCall(path)) return Promise.resolve({ items });
    if (path === '/events') return Promise.resolve({ slug: 'abc', shareUrl: 'x' });
    return Promise.resolve({});
  });
}

function configCallBody(): Record<string, unknown> {
  const configCall = mockFetchApi.mock.calls.find(
    ([path]) => typeof path === 'string' && path.startsWith('/events/abc/config')
  );
  expect(configCall).toBeDefined();
  return JSON.parse((configCall![1] as { body: string }).body) as Record<string, unknown>;
}

describe('CreateEvent', () => {
  beforeEach(() => {
    mockFetchApi.mockReset();
    mockFetchApi.mockImplementation((path: unknown) =>
      isTemplatesCall(path) ? Promise.resolve({ items: [] }) : Promise.resolve({})
    );
  });

  it('affiche le formulaire avec titre, date, heure', () => {
    RenderCreateEvent();
    expect(document.title).toBe(pageTitle('Nouvelle soirée'));
    expect(screen.getByRole('heading', { name: /créer une soirée/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/titre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/heure/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /créer la soirée/i })).toBeInTheDocument();
  });

  it('soumission appelle l’API avec titre, date, heure', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockResolvedValueOnce({
      slug: 'abc123',
      shareUrl: '/e/abc123',
      creatorParticipant: { _id: 'p-new', pseudo: 'Vitest' },
    });
    RenderCreateEvent();
    const titleInput = screen.getByLabelText(/titre/i);
    const dateInput = screen.getByLabelText(/date/i);
    const timeInput = screen.getByLabelText(/heure/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Ma soirée');
    fireEvent.change(dateInput, { target: { value: '2030-12-31' } });
    fireEvent.change(timeInput, { target: { value: '20:00' } });
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Ma soirée', date: '2030-12-31', time: '20:00' }),
        })
      );
    });
  });

  it('sends the chosen number of winning movies at creation', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockResolvedValueOnce({
      slug: 'abc123',
      shareUrl: '/e/abc123',
      creatorParticipant: { _id: 'p-new', pseudo: 'Vitest' },
    });
    mockFetchApi.mockResolvedValueOnce({});
    RenderCreateEvent();

    await user.click(screen.getByText(/options avancées/i));
    const winnerCount = screen.getByLabelText(/films gagnants/i);
    await user.clear(winnerCount);
    await user.type(winnerCount, '4');
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      const configCall = mockFetchApi.mock.calls.find(
        ([url]) => typeof url === 'string' && url.includes('/config')
      );
      expect(configCall).toBeDefined();
      expect(JSON.parse(configCall![1].body).winnerCount).toBe(4);
    });
  });

  it('shows an error message when the API fails', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) =>
      isTemplatesCall(path)
        ? Promise.resolve({ items: [] })
        : Promise.reject(new Error('Serveur indisponible'))
    );
    RenderCreateEvent();
    const titleInput = screen.getByLabelText(/titre/i);
    const dateInput = screen.getByLabelText(/date/i);
    const timeInput = screen.getByLabelText(/heure/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Ma soirée');
    fireEvent.change(dateInput, { target: { value: '2030-12-31' } });
    fireEvent.change(timeInput, { target: { value: '20:00' } });
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/serveur indisponible/i);
    });
  });

  it('does not show the template row when there is none', async () => {
    RenderCreateEvent();

    await waitFor(() => expect(mockFetchApi).toHaveBeenCalled());
    expect(screen.queryByText('Mes templates')).not.toBeInTheDocument();
  });

  it('applies a template to the form fields and sums it up without opening the options', async () => {
    const user = userEvent.setup();
    mockTemplates([HORROR_TEMPLATE]);
    RenderCreateEvent();

    const chip = await screen.findByRole('button', { name: /Soirée horreur/ });
    await user.click(chip);

    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/options avancées/i).closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Configuration appliquée : 🎃 Halloween, 4 films par personne, 12 participants max, aléatoire strict, séries autorisées.'
    );
    expect(screen.getByLabelText(/films max par personne/i)).toHaveValue(4);
    expect(screen.getByLabelText(/participants max/i)).toHaveValue(12);
    expect(screen.getByRole('radio', { name: /aléatoire strict/i })).toBeChecked();
  });

  it('pressing the applied chip again brings the options back to the defaults', async () => {
    const user = userEvent.setup();
    mockTemplates([HORROR_TEMPLATE]);
    RenderCreateEvent();

    const chip = await screen.findByRole('button', { name: /Soirée horreur/ });
    await user.click(chip);
    await user.click(chip);

    expect(screen.getByRole('button', { name: /Soirée horreur/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.queryByLabelText(/films max par personne/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/participants max/i)).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /pondéré par les votes/i })).toBeChecked();
  });

  it('offers to reset the options once one of them leaves the defaults', async () => {
    const user = userEvent.setup();
    RenderCreateEvent();

    expect(screen.queryByRole('button', { name: /réinitialiser les options/i })).toBeNull();
    await user.click(screen.getByText(/options avancées/i));
    await user.click(screen.getByRole('switch', { name: /autoriser les séries/i }));
    expect(screen.getByRole('button', { name: /enregistrer en template/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /réinitialiser les options/i }));

    expect(screen.getByRole('switch', { name: /autoriser les séries/i })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.queryByRole('button', { name: /réinitialiser les options/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /enregistrer en template/i })).toBeNull();
  });

  it('removes the tick from the chip as soon as a covered field changes', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) =>
      isTemplatesCall(path)
        ? Promise.resolve({
            items: [
              {
                id: 't1',
                name: 'Soirée horreur',
                theme: null,
                maxProposalsPerParticipant: 4,
                maxParticipants: 12,
                wheelMode: 'weightedByVotes',
                richSharePreview: true,
                allowSeries: false,
                winnerCount: 1,
              },
            ],
          })
        : Promise.resolve({})
    );
    RenderCreateEvent();

    const chip = await screen.findByRole('button', { name: /Soirée horreur/ });
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByText(/options avancées/i));
    fireEvent.change(screen.getByLabelText(/films max par personne/i), { target: { value: '7' } });

    expect(screen.getByRole('button', { name: /Soirée horreur/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('announces and sums up the configuration taken from a past movie night', async () => {
    mockFetchApi.mockImplementation((path: unknown) => {
      if (isTemplatesCall(path)) return Promise.resolve({ items: [] });
      if (typeof path === 'string' && path.includes('/config')) {
        return Promise.resolve({
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: 4,
          maxParticipants: 12,
          wheelMode: 'strictRandom',
          allowSeries: false,
        });
      }
      return Promise.resolve({});
    });

    render(
      <QueryClientWrapper>
        <LocaleProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: '/new',
                state: { reuseEventSlug: 'abc', reuseEventTitle: 'Soirée du 31 octobre' },
              },
            ]}
          >
            <CreateEvent />
          </MemoryRouter>
        </LocaleProvider>
      </QueryClientWrapper>
    );

    const notice = await screen.findByText(/Configuration de « Soirée du 31 octobre » reprise/);
    expect(notice).toHaveTextContent(
      '🎃 Halloween, 4 films par personne, 12 participants max, aléatoire strict.'
    );
    expect(screen.getByLabelText(/films max par personne/i)).toHaveValue(4);
  });

  it('drops the reused-configuration notice once a template is applied instead', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) => {
      if (isTemplatesCall(path)) return Promise.resolve({ items: [HORROR_TEMPLATE] });
      if (typeof path === 'string' && path.includes('/config')) {
        return Promise.resolve({
          theme: '🎬 Classiques',
          maxProposalsPerParticipant: 2,
          maxParticipants: 6,
          wheelMode: 'weightedByVotes',
          allowSeries: false,
        });
      }
      return Promise.resolve({});
    });
    render(
      <QueryClientWrapper>
        <LocaleProvider>
          <MemoryRouter
            initialEntries={[
              {
                pathname: '/new',
                state: { reuseEventSlug: 'abc', reuseEventTitle: 'Soirée du 31' },
              },
            ]}
          >
            <CreateEvent />
          </MemoryRouter>
        </LocaleProvider>
      </QueryClientWrapper>
    );

    expect(
      await screen.findByText(/Configuration de « Soirée du 31 » reprise/)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Soirée horreur/ }));

    expect(screen.queryByText(/Configuration de « Soirée du 31 » reprise/)).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/Configuration appliquée : 🎃 Halloween/);
  });

  it('creates the movie night without any cap by default', async () => {
    const user = userEvent.setup();
    mockTemplates([]);
    RenderCreateEvent();

    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      expect(configCallBody()).toEqual(
        expect.objectContaining({
          maxParticipants: 0,
          maxProposalsPerParticipant: 0,
          maxVotesPerParticipant: 0,
        })
      );
    });
  });

  it('enabling the participants limit sends the default cap, ready to be adjusted', async () => {
    const user = userEvent.setup();
    mockTemplates([]);
    RenderCreateEvent();

    await user.click(screen.getByText(/options avancées/i));
    await user.click(screen.getByRole('switch', { name: /limiter le nombre de participants/i }));
    expect(screen.getByLabelText(/participants max/i)).toHaveValue(10);
    await user.click(screen.getByRole('switch', { name: /limiter les films proposés/i }));
    expect(screen.getByLabelText(/films max par personne/i)).toHaveValue(3);
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      expect(configCallBody()).toEqual(
        expect.objectContaining({ maxParticipants: 10, maxProposalsPerParticipant: 3 })
      );
    });
  });

  it('refuses an empty title under the field, without calling the API', async () => {
    const user = userEvent.setup();
    mockTemplates([]);
    RenderCreateEvent();

    const titleInput = screen.getByLabelText(/titre/i);
    await user.clear(titleInput);
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    expect(screen.getByText('Donnez un titre à la soirée.')).toBeInTheDocument();
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveFocus();
    expect(mockFetchApi).not.toHaveBeenCalledWith('/events', expect.anything());

    await user.type(titleInput, 'Ma soirée');
    expect(screen.queryByText('Donnez un titre à la soirée.')).not.toBeInTheDocument();
  });

  it('warns about a date already in the past without blocking the creation', async () => {
    const user = userEvent.setup();
    mockTemplates([]);
    RenderCreateEvent();

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2000-01-01' } });
    expect(screen.getByText('Cette date est déjà passée.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith('/events', expect.anything());
    });
  });

  it('sends the host to the movie night with a warning when the options could not be saved', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) => {
      if (isTemplatesCall(path)) return Promise.resolve({ items: [] });
      if (path === '/events') return Promise.resolve({ slug: 'abc', shareUrl: 'x' });
      return Promise.reject(new Error('boom'));
    });
    render(
      <QueryClientWrapper>
        <LocaleProvider>
          <MemoryRouter initialEntries={['/new']}>
            <Routes>
              <Route path="/new" element={<CreateEvent />} />
              <Route path="/e/:slug" element={<LocationStateProbe />} />
            </Routes>
          </MemoryRouter>
        </LocaleProvider>
      </QueryClientWrapper>
    );

    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    expect(JSON.parse((await screen.findByTestId('location-state')).textContent ?? '')).toEqual(
      expect.objectContaining({ justCreated: true, configNotSaved: true })
    );
  });

  it('without the vote limit enabled, the movie night is created without a limit', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) => {
      if (isTemplatesCall(path)) return Promise.resolve({ items: [] });
      if (path === '/events') return Promise.resolve({ slug: 'abc', shareUrl: 'x' });
      return Promise.resolve({});
    });
    RenderCreateEvent();

    await user.click(screen.getByText(/options avancées/i));
    expect(
      screen.getByRole('switch', { name: /limiter les votes par participant/i })
    ).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText(/^votes par participant$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      const configCall = mockFetchApi.mock.calls.find(
        ([path]) => typeof path === 'string' && path.startsWith('/events/abc/config')
      );
      expect(configCall).toBeDefined();
      expect(JSON.parse((configCall![1] as { body: string }).body)).toEqual(
        expect.objectContaining({ maxVotesPerParticipant: 0 })
      );
    });
  });

  it('activer la limite de votes envoie la valeur choisie', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) => {
      if (isTemplatesCall(path)) return Promise.resolve({ items: [] });
      if (path === '/events') return Promise.resolve({ slug: 'abc', shareUrl: 'x' });
      return Promise.resolve({});
    });
    RenderCreateEvent();

    await user.click(screen.getByText(/options avancées/i));
    await user.click(screen.getByRole('switch', { name: /limiter les votes par participant/i }));
    const field = screen.getByLabelText(/^votes par participant$/i);
    expect(field).toHaveValue(3);
    await user.clear(field);
    await user.type(field, '2');
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      const configCall = mockFetchApi.mock.calls.find(
        ([path]) => typeof path === 'string' && path.startsWith('/events/abc/config')
      );
      expect(configCall).toBeDefined();
      expect(JSON.parse((configCall![1] as { body: string }).body)).toEqual(
        expect.objectContaining({ maxVotesPerParticipant: 2 })
      );
    });
  });

  it('limit enabled but counter cleared: the default value is still sent', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) => {
      if (isTemplatesCall(path)) return Promise.resolve({ items: [] });
      if (path === '/events') return Promise.resolve({ slug: 'abc', shareUrl: 'x' });
      return Promise.resolve({});
    });
    RenderCreateEvent();

    await user.click(screen.getByText(/options avancées/i));
    await user.click(screen.getByRole('switch', { name: /limiter les votes par participant/i }));
    await user.clear(screen.getByLabelText(/^votes par participant$/i));
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      const configCall = mockFetchApi.mock.calls.find(
        ([path]) => typeof path === 'string' && path.startsWith('/events/abc/config')
      );
      expect(configCall).toBeDefined();
      expect(JSON.parse((configCall![1] as { body: string }).body)).toEqual(
        expect.objectContaining({ maxVotesPerParticipant: 3 })
      );
    });
  });

  it('passes the whole template configuration to the created movie night', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) => {
      if (isTemplatesCall(path)) {
        return Promise.resolve({
          items: [
            {
              id: 't1',
              name: 'Soirée horreur',
              theme: '🎃 Halloween',
              maxProposalsPerParticipant: 4,
              maxParticipants: 12,
              maxVotesPerParticipant: 2,
              wheelMode: 'strictRandom',
              richSharePreview: false,
              allowSeries: true,
            },
          ],
        });
      }
      if (path === '/events') return Promise.resolve({ slug: 'abc', shareUrl: 'x' });
      return Promise.resolve({});
    });
    RenderCreateEvent();

    await user.click(await screen.findByRole('button', { name: /Soirée horreur/ }));
    await user.click(screen.getByRole('button', { name: /créer la soirée/i }));

    await waitFor(() => {
      const configCall = mockFetchApi.mock.calls.find(
        ([path]) => typeof path === 'string' && path.startsWith('/events/abc/config')
      );
      expect(configCall).toBeDefined();
      expect(JSON.parse((configCall![1] as { body: string }).body)).toEqual(
        expect.objectContaining({
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: 4,
          maxParticipants: 12,
          maxVotesPerParticipant: 2,
          wheelMode: 'strictRandom',
          richSharePreview: false,
          allowSeries: true,
        })
      );
    });
  });
});
