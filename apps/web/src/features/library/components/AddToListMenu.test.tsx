import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import { buildUserProfile } from '@/test-utils/userProfile';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import {
  authMeGuestHandler,
  createListsHandlers,
  TEST_API_V1,
  type MockList,
} from '@/mocks/handlers';
import AddToListMenu from './AddToListMenu';

const dune = {
  tmdbId: 693134,
  mediaType: 'movie' as const,
  title: 'Dune : deuxième partie',
  year: '2024',
  posterPath: null,
};

const scream = { ...dune, tmdbId: 4232, title: 'Scream' };

const LISTS: MockList[] = [
  { id: 'l1', name: 'Halloween', items: [scream] },
  { id: 'l2', name: 'Science-fiction', items: [dune, scream] },
  { id: 'l3', name: 'Ghibli' },
];

function renderMenu() {
  return render(
    <AppTestProviders>
      <AddToListMenu item={dune} />
    </AppTestProviders>
  );
}

describe('AddToListMenu', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.unstubAllGlobals();
  });
  afterAll(() => server.close());

  it('names the lists the film is already in', async () => {
    server.use(authMeGuestHandler, ...createListsHandlers(LISTS));

    renderMenu();

    expect(await screen.findByRole('button', { name: /dans 1 liste/i })).toBeInTheDocument();
  });

  it('checks a list to add the film and unchecks one to take it out, at once', async () => {
    server.use(authMeGuestHandler, ...createListsHandlers(LISTS));
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /dans 1 liste/i }));
    const menu = screen.getByRole('menu', { name: 'Ajouter à une liste' });
    const halloween = within(menu).getByRole('menuitemcheckbox', { name: /halloween/i });
    expect(halloween).toHaveAttribute('aria-checked', 'false');
    expect(halloween).toHaveTextContent('1 film');
    expect(
      within(menu).getByRole('menuitemcheckbox', { name: /science-fiction/i })
    ).toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('menuitemcheckbox', { name: /ghibli/i })).toHaveTextContent(
      'Vide'
    );

    await user.click(halloween);

    await waitFor(() => expect(halloween).toHaveAttribute('aria-checked', 'true'));
    expect(await screen.findByRole('button', { name: /dans 2 listes/i })).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(within(menu).getByRole('menuitemcheckbox', { name: /science-fiction/i }));
    expect(await screen.findByRole('button', { name: /dans 1 liste/i })).toBeInTheDocument();
  });

  it('keeps the rows in name order while lists are checked, so none moves under the pointer', async () => {
    server.use(authMeGuestHandler, ...createListsHandlers(LISTS));
    const user = userEvent.setup();
    renderMenu();
    const rowNames = () =>
      within(screen.getByRole('menu', { name: 'Ajouter à une liste' }))
        .getAllByRole('menuitemcheckbox')
        .map((row) => row.textContent);

    await user.click(await screen.findByRole('button', { name: /dans 1 liste/i }));
    expect(rowNames()).toEqual(['GhibliVide', 'Halloween1 film', 'Science-fiction2 films']);

    await user.click(screen.getByRole('menuitemcheckbox', { name: /ghibli/i }));

    expect(await screen.findByRole('button', { name: /dans 2 listes/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(rowNames()).toEqual(['Ghibli1 film', 'Halloween1 film', 'Science-fiction2 films'])
    );
  });

  it('includes the lists I joined, and says whose they are or who shares mine', async () => {
    const alice = { userId: 'u1', handle: 'alice', displayName: 'Alice', avatarId: null };
    const lea = { userId: 'u2', handle: 'lea', displayName: 'Léa Moreau', avatarId: null };
    const tom = { userId: 'u3', handle: 'tom', displayName: 'Tom', avatarId: null };
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        apiJson<'UserProfileResponse'>(
          buildUserProfile({
            userId: 'u1',
            displayName: 'Alice',
            emailMasked: 'a***@test.local',
            uiTheme: 'system',
            accentColor: 'default',
          })
        )
      ),
      ...createListsHandlers([
        { ...LISTS[0]!, memberCount: 3, memberPreview: [alice, lea, tom] },
        {
          id: 'l4',
          name: 'Ciné du dimanche',
          items: [scream, dune],
          role: 'member',
          owner: lea,
          memberCount: 2,
          memberPreview: [lea, alice],
        },
        LISTS[2]!,
      ])
    );
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /dans 1 liste/i }));
    const menu = screen.getByRole('menu', { name: 'Ajouter à une liste' });

    expect(
      within(menu).getByRole('menuitemcheckbox', { name: /ciné du dimanche/i })
    ).toHaveTextContent('2 films, liste de Léa');
    expect(within(menu).getByRole('menuitemcheckbox', { name: /halloween/i })).toHaveTextContent(
      '1 film, avec Léa et Tom'
    );
    expect(within(menu).getByRole('menuitemcheckbox', { name: /ghibli/i })).toHaveTextContent(
      /^GhibliVide$/
    );
  });

  it('creates a new list with the film in it', async () => {
    server.use(authMeGuestHandler, ...createListsHandlers(LISTS));
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /dans 1 liste/i }));
    const newList = screen.getByRole('menuitem', { name: 'Nouvelle liste' });
    expect(newList).toHaveAttribute('aria-haspopup', 'dialog');
    await user.click(newList);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(await screen.findByText('Dune : deuxième partie y sera ajouté.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Nom de la liste' }), 'Villeneuve');
    await user.click(screen.getByRole('button', { name: 'Créer et ajouter' }));

    expect(await screen.findByRole('button', { name: /dans 2 listes/i })).toBeInTheDocument();
  });

  it('refuses a new list name already taken, from the lists the menu already read', async () => {
    let allListsReads = 0;
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/lists`, ({ request }) => {
        if (!new URL(request.url).searchParams.has('tmdbId')) allListsReads += 1;
      }),
      ...createListsHandlers(LISTS)
    );
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /dans 1 liste/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Nouvelle liste' }));
    await user.type(await screen.findByRole('textbox', { name: 'Nom de la liste' }), 'ghibli');

    expect(
      screen.getByText('Vous avez déjà une liste nommée « ghibli ». Choisissez un autre nom.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer et ajouter' })).toBeDisabled();
    expect(allListsReads).toBe(0);
  });

  it('invites to create a first list when there is none', async () => {
    server.use(authMeGuestHandler, ...createListsHandlers());
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /ajouter à une liste/i }));

    expect(
      screen.getByText('Rangez vos films par thème, par envie ou par occasion.')
    ).toBeInTheDocument();
    const createFirst = screen.getByRole('menuitem', { name: 'Créer une liste' });
    expect(createFirst).toHaveAttribute('aria-haspopup', 'dialog');
    await user.click(createFirst);
    expect(await screen.findByRole('button', { name: 'Créer et ajouter' })).toBeInTheDocument();
  });

  it('says the lists are loading to assistive technologies', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/lists`, async () => {
        await gate;
        return undefined;
      }),
      ...createListsHandlers(LISTS)
    );
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /ajouter à une liste/i }));
    const menu = screen.getByRole('menu', { name: 'Ajouter à une liste' });

    expect(within(menu).getByRole('status')).toHaveTextContent('Chargement de vos listes…');
    release();
    expect(
      await within(menu).findByRole('menuitemcheckbox', { name: /halloween/i })
    ).toBeInTheDocument();
  });

  it('offers to try again when the lists could not be loaded', async () => {
    let failures = 1;
    server.use(
      authMeGuestHandler,
      http.get(`${TEST_API_V1}/lists`, () => {
        if (failures-- <= 0) return undefined;
        return apiErrorJson(503, 'internal_error');
      }),
      ...createListsHandlers(LISTS)
    );
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /ajouter à une liste/i }));
    const menu = screen.getByRole('menu', { name: 'Ajouter à une liste' });
    expect(await within(menu).findByText('Impossible de charger vos listes.')).toBeInTheDocument();

    await user.click(within(menu).getByRole('button', { name: 'Réessayer' }));

    expect(
      await within(menu).findByRole('menuitemcheckbox', { name: /halloween/i })
    ).toBeInTheDocument();
  });

  it('on a phone, lays the lists in a sheet closed by Terminé', async () => {
    stubMatchMedia(true);
    server.use(authMeGuestHandler, ...createListsHandlers(LISTS));
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole('button', { name: /dans 1 liste/i }));
    const sheet = await screen.findByRole('dialog', { name: 'Ajouter à une liste' });
    expect(within(sheet).getByRole('menuitem', { name: 'Nouvelle liste' })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
    await user.click(within(sheet).getByRole('menuitemcheckbox', { name: /ghibli/i }));
    expect(await screen.findByRole('button', { name: /dans 2 listes/i })).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Terminé' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Ajouter à une liste' })).toBeNull()
    );
  });
});
