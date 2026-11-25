import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
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
const mockIsMobile = vi.fn(() => false);
vi.mock('@/shared/hooks/useIsMobile', () => ({ useIsMobile: () => mockIsMobile() }));

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
  anonymousProposals: false,
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

const THURSDAY_GROUP = {
  id: 'g1',
  name: 'Les jeudis ciné',
  role: 'member',
  ownerId: 'u2',
  ownerDisplayName: 'Léa',
  memberCount: 6,
  memberPreview: [],
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
};

const FAMILY_GROUP = { ...THURSDAY_GROUP, id: 'g2', name: 'Famille', memberCount: 4 };

type Routes = {
  groups?: unknown[];
  templates?: unknown[];
  pastNights?: unknown[];
  create?: () => Promise<unknown>;
  config?: () => Promise<unknown>;
  reusedConfig?: unknown;
};

function routeApi({
  groups = [],
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
    if (path === '/groups') return Promise.resolve({ groups, invitations: [], nextNights: [] });
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

let goTo: (path: string) => void = () => undefined;

function NavigatorProbe() {
  const navigate = useNavigate();
  goTo = (path) => {
    void navigate(path);
  };
  return null;
}

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
                  <NavigatorProbe />
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

function whenTrigger() {
  return screen.getByRole('button', { name: /^date et heure/i });
}

async function chooseWhen(
  user: ReturnType<typeof userEvent.setup>,
  { day, time }: { day?: string; time?: string }
) {
  await user.click(whenTrigger());
  const panel = screen.getByRole('group', { name: 'Date et heure' });
  if (day) await user.click(within(panel).getByRole('button', { name: day }));
  if (time) await user.click(within(panel).getByRole('button', { name: time }));
  else await user.click(whenTrigger());
}

describe('CreateEventDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T09:00:00Z'));
    mockFetchApi.mockReset();
    mockTrack.mockReset();
    mockIsMobile.mockReturnValue(false);
    onClose.mockReset();
    routeApi();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('draft', () => {
    it('gives the draft back after a refresh', async () => {
      const user = userEvent.setup();
      const first = renderDialog();
      await user.clear(screen.getByLabelText('Nom'));
      await user.type(screen.getByLabelText('Nom'), 'Soirée frissons');
      await chooseWhen(user, { day: 'samedi 14 novembre 2026', time: '21:00' });
      first.unmount();

      renderDialog();

      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée frissons');
      expect(whenTrigger()).toHaveTextContent('Samedi 14 novembre, 21:00');
    });

    it('forgets the draft once the host closes the window', async () => {
      const user = userEvent.setup();
      const first = renderDialog();
      await user.clear(screen.getByLabelText('Nom'));
      await user.type(screen.getByLabelText('Nom'), 'Soirée frissons');
      pressEscape(formDialog());
      expect(onClose).toHaveBeenCalled();
      first.unmount();

      renderDialog();

      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du jeudi 12 novembre');
    });

    it('forgets the draft once the night is created', async () => {
      const user = userEvent.setup();
      const first = renderDialog();
      await user.clear(screen.getByLabelText('Nom'));
      await user.type(screen.getByLabelText('Nom'), 'Soirée frissons');
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await screen.findByRole('dialog', { name: 'Soirée créée' });
      first.unmount();

      renderDialog();

      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du jeudi 12 novembre');
    });
  });

  describe('date bounds', () => {
    afterEach(() => {
      sessionStorage.removeItem('mp.create-event-draft');
    });

    it('blocks a start that would end the night at once', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(whenTrigger());
      const panel = screen.getByRole('group', { name: 'Date et heure' });
      await user.click(within(panel).getByRole('button', { name: 'jeudi 5 novembre 2026' }));
      const typed = within(panel).getByRole('textbox', { name: 'Heure' });
      await user.clear(typed);
      await user.type(typed, '07:00{Enter}');

      expect(
        screen.getByText('Cette date est trop ancienne : la soirée serait aussitôt terminée.')
      ).toBeInTheDocument();
      expect(whenTrigger()).toHaveAccessibleDescription(/trop ancienne/);
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      expect(createBodies()).toEqual([]);
    });

    it('offers the last days of the week just after midnight in Paris', async () => {
      vi.setSystemTime(new Date('2026-11-24T23:45:00Z'));
      const user = userEvent.setup();
      renderDialog();

      await user.click(whenTrigger());
      const panel = screen.getByRole('group', { name: 'Date et heure' });

      expect(within(panel).getByText('Novembre 2026')).toBeInTheDocument();
      expect(
        within(panel).getByRole('button', { name: 'dimanche 22 novembre 2026' })
      ).toBeEnabled();
    });

    it('keeps the calendar between the last start still open and two years ahead', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(whenTrigger());
      const panel = screen.getByRole('group', { name: 'Date et heure' });
      expect(
        within(panel).getByRole('button', { name: 'mercredi 4 novembre 2026' })
      ).toBeDisabled();
      expect(within(panel).getByRole('button', { name: 'jeudi 5 novembre 2026' })).toBeEnabled();
      const next = within(panel).getByRole('button', { name: 'Mois suivant' });
      for (let month = 0; month < 24; month += 1) await user.click(next);

      expect(next).toBeDisabled();
      expect(
        within(panel).getByRole('button', { name: 'dimanche 12 novembre 2028' })
      ).toBeEnabled();
      expect(within(panel).getByRole('button', { name: 'lundi 13 novembre 2028' })).toBeDisabled();
    });
  });

  describe('when', () => {
    it('opens on tonight at 20:00, with a name that follows the date', () => {
      renderDialog();

      expect(screen.getByRole('heading', { name: 'Nouvelle soirée' })).toBeInTheDocument();
      expect(whenTrigger()).toHaveTextContent('Jeudi 12 novembre, 20:00');
      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du jeudi 12 novembre');
    });

    it('renames the night after the date while the name is untouched', async () => {
      const user = userEvent.setup();
      renderDialog();

      await chooseWhen(user, { day: 'vendredi 13 novembre 2026' });

      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du vendredi 13 novembre');
    });

    it('keeps a name typed by the host when the date changes', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.clear(screen.getByLabelText('Nom'));
      await user.type(screen.getByLabelText('Nom'), 'Soirée frissons');
      await chooseWhen(user, { day: 'samedi 14 novembre 2026' });

      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée frissons');
    });

    it('opens on the next half hour once 20:00 is past', () => {
      vi.setSystemTime(new Date('2026-11-12T20:20:00Z'));
      renderDialog();

      expect(whenTrigger()).toHaveTextContent('Jeudi 12 novembre, 21:30');
    });

    it('opens on tomorrow at midnight right at 23:30 in Paris', () => {
      vi.setSystemTime(new Date('2026-11-12T22:30:05Z'));
      renderDialog();

      expect(whenTrigger()).toHaveTextContent('Vendredi 13 novembre, 00:00');
      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée du vendredi 13 novembre');
    });

    it('takes a time typed by hand', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(whenTrigger());
      const typed = screen.getByRole('textbox', { name: 'Heure' });
      await user.clear(typed);
      await user.type(typed, '21h15{Enter}');
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() => expect(createBodies()[0]).toMatchObject({ time: '21:15' }));
    });

    it('warns about a start already past but still open without blocking the creation', async () => {
      const user = userEvent.setup();
      renderDialog();

      await chooseWhen(user, { day: 'dimanche 8 novembre 2026', time: '20:00' });

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

    it('opens the other moods on « Autre », ready to type a free theme', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Autre' }));

      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Thème' })).toHaveFocus();
    });

    it('shows a free theme in place of « Autre » and sends it', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Autre' }));
      await user.type(screen.getByRole('textbox', { name: 'Thème' }), 'Nanars');

      expect(screen.getByRole('button', { name: 'Nanars', expanded: true })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() => expect(configBody().theme).toBe('Nanars'));
    });

    it('picks one of the other moods and closes the panel', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Autre' }));
      await user.click(screen.getByRole('button', { name: /action/i }));

      expect(screen.queryByRole('textbox', { name: 'Thème' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i, expanded: false })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() => expect(configBody().theme).toBe('🎬 Action'));
    });
  });

  describe('group', () => {
    it('offers the viewer groups and sends the chosen one with the night', async () => {
      const user = userEvent.setup();
      routeApi({ groups: [THURSDAY_GROUP, FAMILY_GROUP] });
      renderDialog();

      await user.click(await screen.findByRole('button', { name: 'Les jeudis ciné' }));

      expect(screen.getByText('5 membres prévenus')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() => expect(createBodies()[0]).toMatchObject({ groupId: 'g1' }));
    });

    it('starts on the group the dialog was opened for, and lets it go', async () => {
      const user = userEvent.setup();
      routeApi({ groups: [THURSDAY_GROUP, FAMILY_GROUP] });
      renderDialog({ groupId: 'g2' });

      expect(
        await screen.findByRole('button', { name: 'Famille', pressed: true })
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Aucun' }));
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() => expect(createBodies()[0]?.groupId).toBeNull());
    });

    it('keeps the group the dialog was opened for while the groups are still loading', async () => {
      const user = userEvent.setup();
      routeApi({ groups: [THURSDAY_GROUP] });
      const routed = mockFetchApi.getMockImplementation();
      mockFetchApi.mockImplementation((path: unknown, init?: { method?: string }) =>
        path === '/groups' ? new Promise(() => {}) : routed?.(path, init)
      );
      renderDialog({ groupId: 'g1' });

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() => expect(createBodies()[0]).toMatchObject({ groupId: 'g1' }));
    });

    it('says nothing about groups to someone without one', async () => {
      const user = userEvent.setup();
      routeApi();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      await waitFor(() => expect(createBodies()).toHaveLength(1));
      expect(screen.queryByRole('heading', { name: /Groupe/ })).not.toBeInTheDocument();
      expect(createBodies()[0]?.groupId).toBeNull();
    });

    it('tells the host the group already sees the night, and keeps the link for someone else', async () => {
      const user = userEvent.setup();
      routeApi({ groups: [THURSDAY_GROUP] });
      renderDialog({ groupId: 'g1' });

      await screen.findByRole('button', { name: 'Les jeudis ciné', pressed: true });
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await screen.findByRole('heading', { name: 'Soirée créée' });

      expect(screen.getByText('Les 5 autres membres la voient déjà')).toBeInTheDocument();
      expect(
        screen.getByText('Quelqu’un d’extérieur au groupe ? Envoyez-lui le lien.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copier' })).toBeInTheDocument();
    });
  });

  describe('page change', () => {
    it('closes the form when the page changes behind it', async () => {
      renderDialog();
      expect(formDialog()).toBeInTheDocument();

      act(() => goTo('/explorer'));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('stays open while the night is created and until its link is handed over', async () => {
      const user = userEvent.setup();
      const finish = holdCreation();
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      act(() => goTo('/explorer'));
      expect(onClose).not.toHaveBeenCalled();

      await act(async () => finish());
      expect(await screen.findByRole('dialog', { name: 'Soirée créée' })).toBeInTheDocument();
      act(() => goTo('/mes-soirees'));
      expect(onClose).not.toHaveBeenCalled();
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
        anonymousProposals: false,
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
    it('shows every starting point and every rule beside the night', async () => {
      routeApi({ templates: [HORROR_TEMPLATE], pastNights: [PAST_NIGHT] });
      renderDialog();

      await waitFor(() => expect(mockFetchApi).toHaveBeenCalledWith('/events/mine?scope=finished'));

      expect(screen.getByRole('heading', { name: 'Règles' })).toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: /comme « ciné-club du mercredi »/i })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Par défaut' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByRole('button', { name: 'Soirée horreur' })).toBeInTheDocument();
      expect(screen.getByLabelText('Participants')).toHaveAttribute('placeholder', 'Sans limite');
      expect(screen.getByLabelText('Films par personne')).toHaveValue(null);
      expect(screen.getByLabelText('Votes par personne')).toHaveValue(null);
      expect(screen.getByLabelText('Films gagnants')).toHaveValue(1);
      expect(screen.getByRole('radio', { name: 'Selon les votes' })).toBeChecked();
      expect(screen.getByRole('switch', { name: /séries tv/i })).not.toBeChecked();
    });

    it('opens the rules in their own sheet on a phone, without losing anything', async () => {
      const user = userEvent.setup();
      mockIsMobile.mockReturnValue(true);
      renderDialog();

      await user.clear(screen.getByLabelText('Nom'));
      await user.type(screen.getByLabelText('Nom'), 'Soirée frissons');
      expect(screen.queryByLabelText('Films par personne')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Règles Par défaut' }));
      const rules = await screen.findByRole('dialog', { name: 'Règles' });
      expect(within(rules).getByLabelText('Films par personne')).toBeInTheDocument();
      await user.click(within(rules).getByRole('button', { name: 'Terminé' }));

      expect(screen.queryByRole('dialog', { name: 'Règles' })).not.toBeInTheDocument();
      expect(screen.getByLabelText('Nom')).toHaveValue('Soirée frissons');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('applies a template to the theme and the rules', async () => {
      const user = userEvent.setup();
      routeApi({ templates: [HORROR_TEMPLATE] });
      renderDialog();

      await user.click(await screen.findByRole('button', { name: 'Soirée horreur' }));

      expect(screen.getByLabelText('Films par personne')).toHaveValue(4);
      expect(screen.getByRole('button', { name: 'Soirée horreur' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() =>
        expect(configBody()).toMatchObject({
          theme: '🎃 Halloween',
          maxProposalsPerParticipant: 4,
          maxParticipants: 12,
          wheelMode: 'strictRandom',
          allowSeries: true,
          anonymousProposals: false,
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
          anonymousProposals: false,
        },
      });
      renderDialog();

      await user.click(
        await screen.findByRole('button', { name: /comme « ciné-club du mercredi »/i })
      );
      await waitFor(() => expect(screen.getByLabelText('Participants')).toHaveValue(8));

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
          anonymousProposals: false,
        },
      });
      renderDialog({ reuse: { slug: 'old', title: 'Soirée du 31 octobre' } });

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /comme « soirée du 31 octobre »/i })
        ).toHaveAttribute('aria-pressed', 'true')
      );
      expect(screen.getByLabelText('Participants')).toHaveValue(12);
    });

    it('highlights the night being redone, not the last night hosted', async () => {
      routeApi({ pastNights: [PAST_NIGHT], reusedConfig: { maxParticipants: 6 } });
      renderDialog({ reuse: { slug: 'old', title: 'Soirée du 31 octobre' } });

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /comme « soirée du 31 octobre »/i })
        ).toHaveAttribute('aria-pressed', 'true')
      );
      expect(
        await screen.findByRole('button', { name: /comme « ciné-club du mercredi »/i })
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('moves the highlight to the last night hosted once it is picked', async () => {
      const user = userEvent.setup();
      routeApi({ pastNights: [PAST_NIGHT], reusedConfig: { maxParticipants: 6 } });
      renderDialog({ reuse: { slug: 'old', title: 'Soirée du 31 octobre' } });

      await user.click(
        await screen.findByRole('button', { name: /comme « ciné-club du mercredi »/i })
      );

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /comme « ciné-club du mercredi »/i })
        ).toHaveAttribute('aria-pressed', 'true')
      );
      expect(
        screen.getByRole('button', { name: /comme « soirée du 31 octobre »/i })
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('steps a limit down from unlimited to the usual cap and sends it', async () => {
      const user = userEvent.setup();
      renderDialog();

      const row = screen.getByLabelText('Films par personne').closest('div')!;
      await user.click(within(row).getByRole('button', { name: 'Diminuer' }));
      await user.click(screen.getByRole('radio', { name: 'Au hasard' }));
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));
      await waitFor(() =>
        expect(configBody()).toMatchObject({
          maxProposalsPerParticipant: 3,
          wheelMode: 'strictRandom',
        })
      );
    });

    it('refuses an out-of-range limit, shows it beside the rule and takes the focus there', async () => {
      const user = userEvent.setup();
      renderDialog();

      fireEvent.change(screen.getByLabelText('Films par personne'), { target: { value: '99' } });
      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      expect(screen.getByText(/entre 1 et 15/)).toBeInTheDocument();
      expect(screen.getByLabelText('Films par personne')).toHaveFocus();
      expect(createBodies()).toHaveLength(0);
    });

    it('opens the rules sheet on a phone when a rule is wrong', async () => {
      const user = userEvent.setup();
      mockIsMobile.mockReturnValue(true);
      sessionStorage.setItem(
        'mp.create-event-draft',
        JSON.stringify({
          typedTitle: null,
          date: '2026-11-12',
          time: '20:00',
          groupId: null,
          fields: { proposalLimitEnabled: true, maxProposals: '99' },
        })
      );
      renderDialog();

      await user.click(screen.getByRole('button', { name: 'Créer la soirée' }));

      const rules = await screen.findByRole('dialog', { name: 'Règles' });
      expect(within(rules).getByText(/entre 1 et 15/)).toBeInTheDocument();
      expect(createBodies()).toHaveLength(0);
      sessionStorage.removeItem('mp.create-event-draft');
    });

    it('saves changed rules as a template under a suggested name', async () => {
      const user = userEvent.setup();
      renderDialog();

      expect(screen.queryByRole('button', { name: 'Enregistrer comme modèle' })).toBeNull();
      await user.click(screen.getByRole('switch', { name: /séries tv/i }));
      await user.click(screen.getByRole('button', { name: 'Enregistrer comme modèle' }));

      expect(screen.getByRole('textbox', { name: 'Nom du modèle' })).toHaveValue('Modèle 1');
      await user.click(screen.getByRole('button', { name: 'Valider' }));
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

      await user.click(await screen.findByRole('button', { name: 'Soirée horreur' }));
      await user.click(screen.getByRole('button', { name: 'Par défaut' }));

      expect(screen.getByRole('button', { name: 'Par défaut' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByLabelText('Films par personne')).toHaveValue(null);
    });

    it('manages the saved templates from the rules', async () => {
      const user = userEvent.setup();
      routeApi({ templates: [HORROR_TEMPLATE] });
      renderDialog();

      await user.click(await screen.findByRole('button', { name: 'Gérer' }));

      expect(
        screen.getByRole('button', { name: 'Renommer le modèle « Soirée horreur »' })
      ).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: 'Ajouter au calendrier' })).toBeInTheDocument();
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
