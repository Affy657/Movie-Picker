import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { LocaleProvider } from '@/shared/i18n';
import CreateEventDialog from './CreateEventDialog';

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
const mockTrack = vi.fn();
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: mockTrack }),
}));
vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: () => false }));

const HORROR_TEMPLATE = {
  id: 't1',
  name: 'Soirée horreur',
  theme: '🎃 Halloween',
  maxProposalsPerParticipant: 4,
  maxParticipants: 12,
  maxVotesPerParticipant: null,
  wheelMode: 'strictRandom',
  richSharePreview: true,
  allowSeries: true,
  winnerCount: 1,
};

const PAST_NIGHT = {
  id: 'e9',
  slug: 'cineclub',
  title: 'Ciné-club du mercredi',
  date: '2026-11-04',
  time: '20:30',
  createdAt: '2026-10-30T10:00:00Z',
  updatedAt: '2026-10-30T10:00:00Z',
  isCreator: true,
  isParticipant: true,
};

type Routes = {
  templates?: unknown[];
  pastNights?: unknown[];
  create?: () => Promise<unknown>;
  config?: () => Promise<unknown>;
  reusedConfig?: unknown;
};

function routeApi({
  templates = [],
  pastNights = [],
  create = () =>
    Promise.resolve({
      slug: 'abc',
      shareUrl: '/e/abc',
      creatorParticipant: { _id: 'p1', pseudo: 'Vitest' },
    }),
  config = () => Promise.resolve({}),
  reusedConfig = {},
}: Routes = {}) {
  mockFetchApi.mockImplementation((path: unknown, init?: { method?: string }) => {
    if (typeof path !== 'string') return Promise.resolve({});
    if (path.startsWith('/users/me/event-templates')) {
      return init?.method === 'POST'
        ? Promise.resolve({ ...HORROR_TEMPLATE, id: 't2', name: 'Modèle 1' })
        : Promise.resolve({ items: templates });
    }
    if (path.startsWith('/events/mine')) {
      return Promise.resolve({
        events: pastNights,
        hasMore: false,
        totalActive: 0,
        totalFinished: pastNights.length,
      });
    }
    if (path === '/events') return create();
    if (path === '/events/abc/config') return config();
    if (path.endsWith('/config')) return Promise.resolve(reusedConfig);
    return Promise.resolve({});
  });
}

function createBodies(): Record<string, unknown>[] {
  return mockFetchApi.mock.calls
    .filter(([path]) => path === '/events')
    .map(([, init]) => JSON.parse((init as { body: string }).body) as Record<string, unknown>);
}

function configBody(): Record<string, unknown> {
  const call = mockFetchApi.mock.calls.find(
    ([path, init]) =>
      path === '/events/abc/config' && (init as { method?: string } | undefined)?.method
  );
  expect(call).toBeDefined();
  return JSON.parse((call![1] as { body: string }).body) as Record<string, unknown>;
}

function LocationProbe() {
  const location = useLocation();
  return (
    <p data-testid="location">
      {location.pathname} {JSON.stringify(location.state)}
    </p>
  );
}

const onClose = vi.fn();

function renderDialog(props: Partial<Parameters<typeof CreateEventDialog>[0]> = {}) {
  return render(
    <QueryClientWrapper>
      <LocaleProvider>
        <MemoryRouter initialEntries={['/my-events']}>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <CreateEventDialog open onClose={onClose} {...props} />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>
    </QueryClientWrapper>
  );
}

function dialog() {
  return screen.getByRole('dialog', { name: 'Soirée créée' });
}

async function openRules(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^règles/i }));
  return screen.findByRole('dialog', { name: 'Règles de la soirée' });
}

function formDialog(): HTMLDialogElement {
  return screen.getByRole('dialog', { name: 'Nouvelle soirée' }) as HTMLDialogElement;
}

function pressEscape(target: HTMLDialogElement) {
  const cancel = new Event('cancel', { cancelable: true });
  target.dispatchEvent(cancel);
  if (!cancel.defaultPrevented) target.close();
}

function clickBackdrop(target: HTMLDialogElement) {
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 100, y: 100, width: 300, height: 300 })
  );
  fireEvent.pointerDown(target, { clientX: 20, clientY: 20 });
  fireEvent.click(target, { clientX: 20, clientY: 20 });
}

function holdCreation(): () => void {
  let finish: (value: unknown) => void = () => undefined;
  routeApi({
    create: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  return () => finish({ slug: 'abc', shareUrl: '/e/abc' });
}

describe('CreateEventDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T09:00:00Z'));
    mockFetchApi.mockReset();
    mockTrack.mockReset();
    onClose.mockReset();
    routeApi();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when', () => {
    it('opens on tonight at 20:00, with a name that follows the date', () => {
      renderDialog();

      expect(screen.getByRole('heading', { name: 'Nouvelle soirée' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /ce soir/i })).toBeChecked();
      expect(screen.getByRole('radio', { name: '20:00' })).toBeChecked();
      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du jeudi 12 novembre');
    });

    it('offers tonight, tomorrow and the coming weekend', () => {
      renderDialog();

      const dates = within(screen.getByRole('radiogroup', { name: 'Quand' }));
      expect(dates.getByRole('radio', { name: /demain/i })).toBeInTheDocument();
      expect(dates.getByRole('radio', { name: /samedi/i })).toBeInTheDocument();
      expect(dates.getByRole('radio', { name: /dimanche/i })).toBeInTheDocument();
      expect(dates.getByRole('radio', { name: /autre date/i })).toBeInTheDocument();
    });

    it('renames the night after the date while the name is untouched', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('radio', { name: /demain/i }));

      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du vendredi 13 novembre');
    });

    it('keeps a name typed by the host when the date changes', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.clear(screen.getByLabelText('Nom'));
      await user.type(screen.getByLabelText('Nom'), 'Soirée frissons');
      await user.click(screen.getByRole('radio', { name: /samedi/i }));

      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée frissons');
    });

    it('reveals a date field for another day', async () => {
      const user = userEvent.setup();
      renderDialog();

      expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: /autre date/i }));

      expect(screen.getByLabelText('Date')).toHaveValue('2026-11-12');
    });

    it('closes the date field once a shortcut is picked again', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('radio', { name: /autre date/i }));
      await user.click(screen.getByRole('radio', { name: /ce soir/i }));

      expect(screen.queryByLabelText('Date')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /ce soir/i })).toBeChecked();
    });

    it('closes the time field once a shortcut is picked again', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('radio', { name: 'Autre' }));
      await user.click(screen.getByRole('radio', { name: '20:30' }));

      expect(screen.queryByLabelText('Heure')).not.toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '20:30' })).toBeChecked();
    });

    it('moves the focus into the field it reveals', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('radio', { name: /autre date/i }));

      expect(screen.getByLabelText('Date')).toHaveFocus();
    });

    it('moves the focus into the time field it reveals', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('radio', { name: 'Autre' }));

      expect(screen.getByLabelText('Heure')).toHaveFocus();
    });

    it('keeps the focus on the days when the arrows reach « Autre date »', async () => {
      const user = userEvent.setup();
      renderDialog();

      screen.getByRole('radio', { name: /dimanche/i }).focus();
      await user.keyboard('{ArrowRight}');

      const other = screen.getByRole('radio', { name: /autre date/i });
      expect(other).toBeChecked();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(other).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('radio', { name: /dimanche/i })).toHaveFocus();
    });

    it('enters the date field once « Autre date » is activated from the keyboard', async () => {
      const user = userEvent.setup();
      renderDialog();

      screen.getByRole('radio', { name: /dimanche/i }).focus();
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');

      expect(screen.getByLabelText('Date')).toHaveFocus();
    });

    it('keeps the focus on the hours when the arrows reach « Autre »', async () => {
      const user = userEvent.setup();
      renderDialog();

      screen.getByRole('radio', { name: '21:00' }).focus();
      await user.keyboard('{ArrowRight}');

      const other = screen.getByRole('radio', { name: 'Autre' });
      expect(other).toBeChecked();
      expect(screen.getByLabelText('Heure')).toBeInTheDocument();
      expect(other).toHaveFocus();
    });

    it('shows the chosen day on « Autre date »', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('radio', { name: /autre date/i }));
      fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-12-24' } });

      expect(screen.getByRole('radio', { name: /autre date/i })).toHaveTextContent('24 déc.');
    });

    it('reveals a time field for another hour', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('radio', { name: 'Autre' }));

      expect(screen.getByLabelText('Heure')).toHaveValue('20:00');
    });

    it('opens on another hour when the next half hour is not a shortcut', () => {
      vi.setSystemTime(new Date('2026-11-12T20:20:00Z'));
      renderDialog();

      expect(screen.getByRole('radio', { name: 'Autre' })).toBeChecked();
      expect(screen.getByLabelText('Heure')).toHaveValue('21:30');
    });

    it('opens on tomorrow at midnight right at 23:30 in Paris', () => {
      vi.setSystemTime(new Date('2026-11-12T22:30:05Z'));
      renderDialog();

      expect(screen.getByRole('radio', { name: /demain/i })).toBeChecked();
      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du vendredi 13 novembre');
      expect(screen.getByLabelText('Heure')).toHaveValue('00:00');
    });

    it('warns about a start already past without blocking the creation', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('radio', { name: /autre date/i }));
      fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-01' } });

      expect(screen.getByText('Cette date est déjà passée.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() => expect(createBodies()).toHaveLength(1));
    });
  });

  describe('theme', () => {
    it('picks a suggested theme and sends it with the night', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: /horreur/i }));
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() => expect(configBody().theme).toBe('🎃 Horreur'));
    });

    it('drops the theme when its chip is pressed again', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: /horreur/i }));
      await user.click(screen.getByRole('button', { name: /horreur/i }));
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() => expect(configBody().theme).toBe(''));
    });

    it('opens the free theme field on « Autre… », ready to type', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Autre…' }));

      expect(screen.getByRole('textbox', { name: 'Thème' })).toHaveFocus();
    });

    it('closes the free theme field and drops its text when « Autre… » is pressed again', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Autre…' }));
      await user.type(screen.getByRole('textbox', { name: 'Thème' }), 'Nanars');
      await user.click(screen.getByRole('button', { name: 'Autre…' }));

      expect(screen.queryByRole('textbox', { name: 'Thème' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() => expect(configBody().theme).toBe(''));
    });
  });

  describe('creation', () => {
    it('creates the night with its name, date, time and default rules', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() =>
        expect(createBodies()[0]).toMatchObject({
          title: 'Soirée du jeudi 12 novembre',
          date: '2026-11-12',
          time: '20:00',
        })
      );
      expect(configBody()).toMatchObject({
        maxProposalsPerParticipant: 0,
        maxParticipants: 0,
        maxVotesPerParticipant: 0,
        wheelMode: 'weightedByVotes',
        winnerCount: 1,
        allowSeries: false,
      });
      expect(mockTrack).toHaveBeenCalledWith('event_created');
    });

    it('creates under the suggested name when the name is emptied', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.clear(screen.getByLabelText('Nom'));
      await user.keyboard('{Enter}');

      await waitFor(() =>
        expect(createBodies()[0]).toMatchObject({ title: 'Soirée du jeudi 12 novembre' })
      );
    });

    it('gives the suggested name back when the name is left empty', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.clear(screen.getByLabelText('Nom'));
      await user.tab();

      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du jeudi 12 novembre');
    });

    it('creates the night on Enter in the name', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.type(screen.getByLabelText('Nom'), '{Enter}');

      await waitFor(() => expect(createBodies()).toHaveLength(1));
    });

    it('keeps the form and says why when the API fails', async () => {
      const user = userEvent.setup();
      routeApi({ create: () => Promise.reject(new Error('Serveur indisponible')) });
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Serveur indisponible');
      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du jeudi 12 novembre');
    });

    it('retries a failed creation under the same request id', async () => {
      const user = userEvent.setup();
      let attempts = 0;
      routeApi({
        create: () => {
          attempts += 1;
          return attempts === 1
            ? Promise.reject(new Error('Réseau coupé'))
            : Promise.resolve({ slug: 'abc', shareUrl: '/e/abc' });
        },
      });
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await screen.findByRole('alert');
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() => expect(createBodies()).toHaveLength(2));
      const [first, second] = createBodies();
      expect(second!.clientRequestId).toBe(first!.clientRequestId);
    });

    it('retries under a new request id once the name changed', async () => {
      const user = userEvent.setup();
      let attempts = 0;
      routeApi({
        create: () => {
          attempts += 1;
          return attempts === 1
            ? Promise.reject(new Error('Réseau coupé'))
            : Promise.resolve({ slug: 'abc', shareUrl: '/e/abc' });
        },
      });
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await screen.findByRole('alert');
      await user.type(screen.getByLabelText('Nom'), ' bis');
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() => expect(createBodies()).toHaveLength(2));
      const [first, second] = createBodies();
      expect(second!.clientRequestId).not.toBe(first!.clientRequestId);
    });

    it('stays open while the night is being created, then hands over its link', async () => {
      const user = userEvent.setup();
      const finishCreation = holdCreation();
      renderDialog();
      const form = formDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() => expect(createBodies()).toHaveLength(1));
      pressEscape(form);
      await user.click(within(form).getByRole('button', { name: 'Fermer' }));
      clickBackdrop(form);

      expect(onClose).not.toHaveBeenCalled();
      expect(form).toHaveAttribute('open');
      finishCreation();
      expect(await screen.findByRole('heading', { name: 'Soirée créée' })).toBeInTheDocument();
      expect(createBodies()).toHaveLength(1);
    });

    it('shows the window again when the browser closes it during the creation', async () => {
      const user = userEvent.setup();
      holdCreation();
      renderDialog();
      const form = formDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() => expect(createBodies()).toHaveLength(1));
      form.close();

      expect(onClose).not.toHaveBeenCalled();
      expect(form).toHaveAttribute('open');
    });

    it('closes on Escape again once the creation failed', async () => {
      const user = userEvent.setup();
      routeApi({ create: () => Promise.reject(new Error('Serveur indisponible')) });
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await screen.findByRole('alert');
      pressEscape(formDialog());

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('rules', () => {
    it('opens the rules straight away, with every starting point and every rule', async () => {
      const user = userEvent.setup();
      routeApi({ templates: [HORROR_TEMPLATE], pastNights: [PAST_NIGHT] });
      renderDialog();

      await screen.findByRole('button', { name: 'Règles : par défaut' });
      await waitFor(() => expect(mockFetchApi).toHaveBeenCalledWith('/events/mine?scope=finished'));
      const rules = await openRules(user);

      expect(within(rules).getByRole('button', { name: 'Par défaut' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(
        await within(rules).findByRole('button', { name: /comme « ciné-club du mercredi »/i })
      ).toBeInTheDocument();
      expect(within(rules).getByRole('button', { name: 'Soirée horreur' })).toBeInTheDocument();
      expect(within(rules).getByLabelText('Participants')).toHaveAttribute(
        'placeholder',
        'Sans limite'
      );
      expect(within(rules).getByLabelText('Films par personne')).toHaveValue(null);
      expect(within(rules).getByLabelText('Votes par personne')).toHaveValue(null);
      expect(within(rules).getByLabelText('Films gagnants')).toHaveValue(1);
      expect(within(rules).getByRole('radio', { name: 'Selon les votes' })).toBeChecked();
      expect(within(rules).getByRole('switch', { name: /séries tv/i })).not.toBeChecked();
    });

    it('goes back to the night when the rules are closed, without losing anything', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.clear(screen.getByLabelText('Nom'));
      await user.type(screen.getByLabelText('Nom'), 'Soirée frissons');
      const rules = await openRules(user);
      await user.click(within(rules).getByRole('button', { name: 'Fermer' }));

      expect(screen.queryByRole('dialog', { name: 'Règles de la soirée' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Nouvelle soirée' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée frissons');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('applies a template to the theme and the rules', async () => {
      const user = userEvent.setup();
      routeApi({ templates: [HORROR_TEMPLATE] });
      renderDialog();

      const rules = await openRules(user);
      await user.click(await within(rules).findByRole('button', { name: 'Soirée horreur' }));
      expect(within(rules).getByLabelText('Films par personne')).toHaveValue(4);
      await user.click(within(rules).getByRole('button', { name: 'Terminé' }));

      expect(screen.getByRole('button', { name: 'Règles : Soirée horreur' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() =>
        expect(configBody()).toMatchObject({
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: 4,
          maxParticipants: 12,
          wheelMode: 'strictRandom',
          allowSeries: true,
        })
      );
    });

    it('takes the rules of the last night hosted', async () => {
      const user = userEvent.setup();
      routeApi({
        pastNights: [PAST_NIGHT],
        reusedConfig: {
          theme: '⭐ Classiques',
          maxProposalsPerParticipant: 2,
          maxParticipants: 8,
          maxVotesPerParticipant: 3,
          wheelMode: 'weightedByVotes',
          winnerCount: 1,
          allowSeries: false,
        },
      });
      renderDialog();

      const rules = await openRules(user);
      await user.click(
        await within(rules).findByRole('button', { name: /comme « ciné-club du mercredi »/i })
      );
      await waitFor(() => expect(within(rules).getByLabelText('Participants')).toHaveValue(8));
      await user.click(within(rules).getByRole('button', { name: 'Terminé' }));

      expect(
        screen.getByRole('button', { name: 'Règles : comme « Ciné-club du mercredi »' })
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() =>
        expect(configBody()).toMatchObject({
          theme: '⭐ Classiques',
          maxProposalsPerParticipant: 2,
          maxParticipants: 8,
          maxVotesPerParticipant: 3,
        })
      );
    });

    it('starts from a past night when asked to redo it', async () => {
      routeApi({
        reusedConfig: {
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: 4,
          maxParticipants: 12,
          wheelMode: 'strictRandom',
          winnerCount: 1,
          allowSeries: false,
        },
      });
      renderDialog({ reuse: { slug: 'old', title: 'Soirée du 31 octobre' } });

      expect(
        await screen.findByRole('button', { name: 'Règles : comme « Soirée du 31 octobre »' })
      ).toBeInTheDocument();
    });

    it('highlights the night being redone, not the last night hosted', async () => {
      const user = userEvent.setup();
      routeApi({ pastNights: [PAST_NIGHT], reusedConfig: { maxParticipants: 6 } });
      renderDialog({ reuse: { slug: 'old', title: 'Soirée du 31 octobre' } });

      await screen.findByRole('button', { name: 'Règles : comme « Soirée du 31 octobre »' });
      const rules = await openRules(user);

      expect(
        within(rules).getByRole('button', { name: /comme « soirée du 31 octobre »/i })
      ).toHaveAttribute('aria-pressed', 'true');
      expect(
        await within(rules).findByRole('button', { name: /comme « ciné-club du mercredi »/i })
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('moves the highlight to the last night hosted once it is picked', async () => {
      const user = userEvent.setup();
      routeApi({ pastNights: [PAST_NIGHT], reusedConfig: { maxParticipants: 6 } });
      renderDialog({ reuse: { slug: 'old', title: 'Soirée du 31 octobre' } });

      await screen.findByRole('button', { name: 'Règles : comme « Soirée du 31 octobre »' });
      const rules = await openRules(user);
      await user.click(
        await within(rules).findByRole('button', { name: /comme « ciné-club du mercredi »/i })
      );

      await waitFor(() =>
        expect(
          within(rules).getByRole('button', { name: /comme « ciné-club du mercredi »/i })
        ).toHaveAttribute('aria-pressed', 'true')
      );
      expect(
        within(rules).getByRole('button', { name: /comme « soirée du 31 octobre »/i })
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('steps a limit down from unlimited to the usual cap and sends it', async () => {
      const user = userEvent.setup();
      renderDialog();

      const rules = await openRules(user);
      const row = within(rules).getByLabelText('Films par personne').closest('div')!;
      await user.click(within(row).getByRole('button', { name: 'Diminuer' }));
      await user.click(within(rules).getByRole('radio', { name: 'Au hasard' }));
      await user.click(within(rules).getByRole('button', { name: 'Terminé' }));

      expect(screen.getByRole('button', { name: 'Règles : personnalisées' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() =>
        expect(configBody()).toMatchObject({
          maxProposalsPerParticipant: 3,
          wheelMode: 'strictRandom',
        })
      );
    });

    it('refuses an out-of-range limit and shows it in the rules', async () => {
      const user = userEvent.setup();
      renderDialog();

      const rules = await openRules(user);
      fireEvent.change(within(rules).getByLabelText('Films par personne'), {
        target: { value: '99' },
      });
      await user.click(within(rules).getByRole('button', { name: 'Terminé' }));
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      const reopened = await screen.findByRole('dialog', { name: 'Règles de la soirée' });
      expect(within(reopened).getByText(/entre 1 et 15/)).toBeInTheDocument();
      expect(createBodies()).toHaveLength(0);
    });

    it('saves changed rules as a template under a suggested name', async () => {
      const user = userEvent.setup();
      renderDialog();

      const rules = await openRules(user);
      expect(within(rules).queryByRole('button', { name: 'Enregistrer comme modèle' })).toBeNull();
      await user.click(within(rules).getByRole('switch', { name: /séries tv/i }));
      await user.click(within(rules).getByRole('button', { name: 'Enregistrer comme modèle' }));

      expect(within(rules).getByRole('textbox', { name: 'Nom du modèle' })).toHaveValue('Modèle 1');
      await user.click(within(rules).getByRole('button', { name: 'Valider' }));
      await waitFor(() =>
        expect(mockFetchApi).toHaveBeenCalledWith(
          '/users/me/event-templates',
          expect.objectContaining({ method: 'POST' })
        )
      );
    });

    it('brings the rules back to the defaults', async () => {
      const user = userEvent.setup();
      routeApi({ templates: [HORROR_TEMPLATE] });
      renderDialog();

      const rules = await openRules(user);
      await user.click(await within(rules).findByRole('button', { name: 'Soirée horreur' }));
      await user.click(within(rules).getByRole('button', { name: 'Par défaut' }));
      await user.click(within(rules).getByRole('button', { name: 'Terminé' }));

      expect(screen.getByRole('button', { name: 'Règles : par défaut' })).toBeInTheDocument();
    });
  });

  describe('invitation', () => {
    async function createNight(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      return screen.findByRole('heading', { name: 'Soirée créée' });
    }

    it('hands over the link to send once the night is created', async () => {
      const user = userEvent.setup();
      renderDialog();

      await createNight(user);

      expect(screen.getByText('« Soirée du jeudi 12 novembre » est prête')).toBeInTheDocument();
      expect(within(dialog()).getByText(`${globalThis.location.host}/e/abc`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copier' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Calendrier' })).toBeInTheDocument();
    });

    it('opens the night', async () => {
      const user = userEvent.setup();
      renderDialog();

      await createNight(user);
      await user.click(screen.getByRole('button', { name: 'Ouvrir la soirée' }));

      expect(screen.getByTestId('location')).toHaveTextContent('/e/abc');
      expect(onClose).toHaveBeenCalled();
    });

    it('opens the night ready to propose its first movie', async () => {
      const user = userEvent.setup();
      renderDialog();

      await createNight(user);
      await user.click(screen.getByRole('button', { name: 'Proposer un film' }));

      expect(screen.getByTestId('location')).toHaveTextContent('/e/abc');
      expect(screen.getByTestId('location')).toHaveTextContent('"openPropose":true');
    });

    it('says when the rules could not be saved', async () => {
      const user = userEvent.setup();
      routeApi({ config: () => Promise.reject(new Error('Réglages refusés')) });
      renderDialog();

      await createNight(user);

      const warning = screen.getByRole('status');
      expect(warning).toHaveTextContent(/ses options n’ont pas été enregistrées/);
      expect(warning.tagName).toBe('OUTPUT');
    });
  });
});
