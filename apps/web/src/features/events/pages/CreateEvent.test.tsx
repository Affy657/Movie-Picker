import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import CreateEvent from '@/features/events/pages/CreateEvent';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { LocaleProvider } from '@/shared/i18n';

const mockFetchApi = vi.fn();
vi.mock('@/shared/api/client', () => ({ fetchApi: (...args: unknown[]) => mockFetchApi(...args) }));
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

  it('envoie le nombre de films gagnants choisi à la création', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockResolvedValueOnce({
      slug: 'abc123',
      shareUrl: '/e/abc123',
      creatorParticipant: { _id: 'p-new', pseudo: 'Vitest' },
    });
    mockFetchApi.mockResolvedValueOnce({});
    RenderCreateEvent();

    await user.click(screen.getByText(/options/i));
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

  it("affiche un message d'erreur si l'API échoue", async () => {
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

  it('n’affiche pas la rangée de templates quand il n’y en a aucun', async () => {
    RenderCreateEvent();

    await waitFor(() => expect(mockFetchApi).toHaveBeenCalled());
    expect(screen.queryByText('Mes templates')).not.toBeInTheDocument();
  });

  it('applique un template aux champs du formulaire', async () => {
    const user = userEvent.setup();
    mockFetchApi.mockImplementation((path: unknown) =>
      isTemplatesCall(path)
        ? Promise.resolve({
            items: [
              {
                id: 't1',
                name: 'Soirée horreur',
                theme: '🎃 Halloween',
                maxProposalsPerParticipant: 4,
                maxParticipants: 12,
                wheelMode: 'strictRandom',
                richSharePreview: true,
                allowSeries: true,
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
    expect(screen.getByLabelText(/films max par personne/i)).toHaveValue(4);
    expect(screen.getByLabelText(/participants max/i)).toHaveValue(12);
    expect(screen.getByRole('radio', { name: /aléatoire strict/i })).toBeChecked();
  });

  it('retire la coche de la pastille dès qu’un champ couvert change', async () => {
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

  it('annonce la configuration reprise d’une soirée passée et ouvre les options', async () => {
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

    expect(
      await screen.findByText(/Configuration de « Soirée du 31 octobre » reprise/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/films max par personne/i)).toHaveValue(4);
  });

  it('transmet toute la configuration du template à la soirée créée', async () => {
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
          wheelMode: 'strictRandom',
          richSharePreview: false,
          allowSeries: true,
        })
      );
    });
  });
});
