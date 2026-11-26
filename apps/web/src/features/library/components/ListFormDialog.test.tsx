import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiErrorJson, apiJson } from '@/mocks/apiJson';
import {
  listDetailOf,
  listSummaryOf,
  authMeGuestHandler,
  createListsHandlers,
  createSavedListsHandlers,
  TEST_API_V1,
} from '@/mocks/handlers';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { buildUserProfile } from '@/test-utils/userProfile';
import modalStyles from '@/shared/components/Modal.module.css';
import ListFormDialog from './ListFormDialog';

const dune = {
  tmdbId: 693134,
  mediaType: 'movie' as const,
  title: 'Dune : deuxième partie',
  year: '2024',
  posterPath: null,
};

function renderDialog(props: Partial<ComponentProps<typeof ListFormDialog>> = {}) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <AppTestProviders>
      <MemoryRouter>
        <ListFormDialog mode="create" onClose={onClose} onSaved={onSaved} {...props} />
      </MemoryRouter>
    </AppTestProviders>
  );
  return { onSaved, onClose };
}

const nameField = () => screen.getByRole('textbox', { name: 'Nom de la liste' });

describe('ListFormDialog', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('creates a list from its name and description once the name is filled in', async () => {
    let body: unknown = null;
    server.use(
      authMeGuestHandler,
      http.post(`${TEST_API_V1}/lists`, async ({ request }) => {
        body = await request.json();
        return apiJson<'MovieListSummaryResponse'>(listSummaryOf({ id: 'l9', name: 'Halloween' }), {
          status: 201,
        });
      }),
      ...createListsHandlers()
    );
    const user = userEvent.setup();
    const { onSaved } = renderDialog();

    expect(screen.getByRole('heading', { name: 'Nouvelle liste' })).toBeInTheDocument();
    const create = screen.getByRole('button', { name: 'Créer la liste' });
    expect(create).toBeDisabled();
    expect(nameField()).toHaveAttribute('placeholder', 'Ex. Marathon d’Halloween');
    expect(nameField()).toHaveAttribute('maxLength', '60');

    await user.type(nameField(), '   ');
    expect(create).toBeDisabled();

    await user.type(nameField(), 'Halloween ');
    const description = screen.getByRole('textbox', { name: /description/i });
    expect(description).toHaveAttribute('maxLength', '300');
    expect(screen.getByText('facultatif')).toBeInTheDocument();
    await user.type(description, 'La nuit du 31');
    await user.click(create);

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'l9' }))
    );
    expect(body).toEqual({ name: 'Halloween', description: 'La nuit du 31', isPublic: false });
  });

  it('creates a private list by default, and says what each visibility changes', async () => {
    server.use(authMeGuestHandler, ...createListsHandlers());
    const user = userEvent.setup();
    renderDialog();

    const visibility = screen.getByRole('radiogroup', { name: 'Visibilité' });
    expect(within(visibility).getByRole('radio', { name: 'Privée' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(visibility).toHaveAccessibleDescription(
      'Vous seul la voyez, et les membres si vous en invitez.'
    );

    await user.click(within(visibility).getByRole('radio', { name: 'Publique' }));

    expect(within(visibility).getByRole('radio', { name: 'Publique' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(visibility).toHaveAccessibleDescription(
      'Visible sur votre profil, chacun peut l’enregistrer ou la copier.'
    );
  });

  it('says a public list waits for a public profile, links to the setting, and still allows it', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        apiJson<'UserProfileResponse'>(buildUserProfile({ isProfilePublic: false }))
      ),
      ...createListsHandlers()
    );
    const user = userEvent.setup();
    renderDialog();

    const visibility = screen.getByRole('radiogroup', { name: 'Visibilité' });
    const publicOption = within(visibility).getByRole('radio', { name: 'Publique' });
    await user.click(publicOption);

    expect(publicOption).toHaveAttribute('aria-checked', 'true');
    expect(publicOption).toBeEnabled();
    await waitFor(() =>
      expect(visibility).toHaveAccessibleDescription(
        'Votre profil est privé : la liste ne sera visible qu’une fois votre profil rendu public. Rendre mon profil public'
      )
    );
    expect(screen.getByRole('link', { name: 'Rendre mon profil public' })).toHaveAttribute(
      'href',
      '/settings/profil'
    );
  });

  it('creates a public list when Publique is chosen', async () => {
    let body: unknown = null;
    server.use(
      authMeGuestHandler,
      http.post(`${TEST_API_V1}/lists`, async ({ request }) => {
        body = await request.json();
        return apiJson<'MovieListSummaryResponse'>(
          listSummaryOf({ id: 'l9', name: 'Ciné coréen' }),
          { status: 201 }
        );
      }),
      ...createListsHandlers()
    );
    const user = userEvent.setup();
    const { onSaved } = renderDialog();

    await user.type(nameField(), 'Ciné coréen');
    await user.click(screen.getByRole('radio', { name: 'Publique' }));
    await user.click(screen.getByRole('button', { name: 'Créer la liste' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(body).toEqual({ name: 'Ciné coréen', isPublic: true });
  });

  it('refuses a name already taken by another list or by À voir, case, accents and spaces aside', async () => {
    server.use(authMeGuestHandler, ...createListsHandlers([{ id: 'l1', name: 'Halloween' }]));
    const user = userEvent.setup();
    renderDialog();

    await user.type(nameField(), ' halloween');

    expect(
      await screen.findByText(
        'Vous avez déjà une liste nommée « halloween ». Choisissez un autre nom.'
      )
    ).toBeInTheDocument();
    expect(nameField()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Créer la liste' })).toBeDisabled();

    await user.clear(nameField());
    await user.type(nameField(), 'A VOIR');
    expect(screen.getByRole('button', { name: 'Créer la liste' })).toBeDisabled();
  });

  it('lets a list bear the name of a list someone else created and shares with me', async () => {
    server.use(
      authMeGuestHandler,
      ...createListsHandlers([
        {
          id: 'l1',
          name: 'Halloween',
          role: 'member',
          owner: { userId: 'u2', handle: 'lea', displayName: 'Léa', avatarId: null },
        },
      ])
    );
    const user = userEvent.setup();
    renderDialog();

    await user.type(nameField(), 'Halloween');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Créer la liste' })).toBeEnabled()
    );
    expect(screen.queryByText(/vous avez déjà une liste nommée/i)).toBeNull();
  });

  it('keeps the button disabled after the API finds the name taken, until the name changes', async () => {
    server.use(
      authMeGuestHandler,
      http.post(`${TEST_API_V1}/lists`, () =>
        apiErrorJson(409, 'list_name_taken', { name: 'Ghibli' })
      ),
      ...createListsHandlers()
    );
    const user = userEvent.setup();
    renderDialog();

    await user.type(nameField(), 'Ghibli');
    await user.click(screen.getByRole('button', { name: 'Créer la liste' }));

    expect(
      await screen.findByText(
        'Vous avez déjà une liste nommée « Ghibli ». Choisissez un autre nom.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la liste' })).toBeDisabled();

    await user.type(nameField(), ' 2');
    expect(screen.getByRole('button', { name: 'Créer la liste' })).toBeEnabled();
  });

  it('says when the account already holds fifty lists', async () => {
    server.use(
      authMeGuestHandler,
      http.post(`${TEST_API_V1}/lists`, () => apiErrorJson(409, 'list_limit_reached', { max: 50 })),
      ...createListsHandlers()
    );
    const user = userEvent.setup();
    const { onSaved } = renderDialog();

    await user.type(nameField(), 'Ghibli');
    await user.click(screen.getByRole('button', { name: 'Créer la liste' }));

    expect(
      await screen.findByText('Vous avez déjà 50 listes. Supprimez-en une pour en créer une autre.')
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('edits the name and description of a list, which may keep its own name', async () => {
    let body: unknown = null;
    server.use(
      authMeGuestHandler,
      http.patch(`${TEST_API_V1}/lists/l1`, async ({ request }) => {
        body = await request.json();
        return apiJson<'MovieListSummaryResponse'>(listSummaryOf({ id: 'l1', name: 'HALLOWEEN' }));
      }),
      ...createListsHandlers([{ id: 'l1', name: 'Halloween', description: 'La nuit du 31' }])
    );
    const user = userEvent.setup();
    const { onSaved } = renderDialog({
      mode: 'edit',
      list: { id: 'l1', name: 'Halloween', description: 'La nuit du 31', isPublic: false },
    });

    expect(screen.getByRole('heading', { name: 'Modifier la liste' })).toBeInTheDocument();
    expect(nameField()).toHaveValue('Halloween');
    expect(screen.getByRole('textbox', { name: /description/i })).toHaveValue('La nuit du 31');

    await user.clear(nameField());
    await user.type(nameField(), 'HALLOWEEN');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(body).toEqual({ name: 'HALLOWEEN', description: 'La nuit du 31', isPublic: false });
  });

  it('shows the current visibility of the list being edited and saves a change of it', async () => {
    let body: unknown = null;
    server.use(
      authMeGuestHandler,
      http.patch(`${TEST_API_V1}/lists/l1`, async ({ request }) => {
        body = await request.json();
        return apiJson<'MovieListSummaryResponse'>(listSummaryOf({ id: 'l1', name: 'Halloween' }));
      }),
      ...createListsHandlers([{ id: 'l1', name: 'Halloween', isPublic: true }])
    );
    const user = userEvent.setup();
    const { onSaved } = renderDialog({
      mode: 'edit',
      list: { id: 'l1', name: 'Halloween', description: null, isPublic: true },
    });

    expect(screen.getByRole('radio', { name: 'Publique' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Privée' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(body).toEqual({ name: 'Halloween', description: null, isPublic: false });
  });

  it('creates a list with the film of the page already in it', async () => {
    let body: unknown = null;
    server.use(
      authMeGuestHandler,
      http.post(`${TEST_API_V1}/lists`, async ({ request }) => {
        body = await request.json();
        return apiJson<'MovieListSummaryResponse'>(
          listSummaryOf({ id: 'l9', name: 'Denis Villeneuve' }),
          { status: 201 }
        );
      }),
      ...createListsHandlers()
    );
    const user = userEvent.setup();
    const { onSaved } = renderDialog({ mode: 'createAndAdd', item: dune });

    expect(screen.getByRole('heading', { name: 'Nouvelle liste' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /description/i })).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Visibilité' })).toBeNull();
    expect(screen.getByText('Dune : deuxième partie y sera ajouté.')).toBeInTheDocument();

    await user.type(nameField(), 'Denis Villeneuve');
    await user.click(screen.getByRole('button', { name: 'Créer et ajouter' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(body).toEqual({ name: 'Denis Villeneuve', firstItem: dune });
  });

  describe('copy of a saved list', () => {
    const HARRY_POTTER = {
      id: 's1',
      sourceType: 'tmdbCollection' as const,
      sourceId: '1241',
      name: 'Harry Potter',
    };
    const copyOfSaga = {
      savedListId: 's1',
      name: 'Harry Potter',
      sourceType: 'tmdbCollection',
    } as const;
    const copyCreate = () => screen.getByRole('button', { name: 'Créer la copie' });

    it('copies a saga into a new list named after it, and says the copy no longer follows the saga', async () => {
      let body: unknown = null;
      server.use(
        authMeGuestHandler,
        http.post(`${TEST_API_V1}/saved-lists/s1/copy`, async ({ request }) => {
          body = await request.clone().json();
        }),
        ...createSavedListsHandlers([HARRY_POTTER]),
        ...createListsHandlers()
      );
      const user = userEvent.setup();
      const { onSaved } = renderDialog({ mode: 'copy', copyOf: copyOfSaga });

      expect(
        screen.getByRole('heading', { name: 'Copier dans une nouvelle liste' })
      ).toBeInTheDocument();
      expect(nameField()).toHaveValue('Harry Potter');
      expect(nameField()).toHaveAccessibleDescription(
        'Une liste à vous, que vous pouvez modifier. Elle ne suit plus la saga : un film ajouté à la saga n’y arrivera pas.'
      );
      expect(screen.queryByRole('textbox', { name: /description/i })).toBeNull();
      expect(screen.queryByRole('radiogroup', { name: 'Visibilité' })).toBeNull();

      await user.click(copyCreate());

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'copy1' }))
      );
      expect(body).toEqual({ name: 'Harry Potter' });
    });

    it('copies the public list of a member, which the copy no longer follows', async () => {
      let body: unknown = null;
      server.use(
        authMeGuestHandler,
        http.post(`${TEST_API_V1}/users/lea/lists/l7/copy`, async ({ request }) => {
          body = await request.json();
          return apiJson<'MovieListResponse'>(listDetailOf({ id: 'l9', name: 'Ciné coréen' }), {
            status: 201,
          });
        }),
        ...createListsHandlers()
      );
      const user = userEvent.setup();
      const { onSaved } = renderDialog({
        mode: 'copy',
        copyOf: {
          publicList: { handle: 'lea', listId: 'l7' },
          name: 'Ciné coréen',
          sourceType: 'memberList',
        },
      });

      expect(nameField()).toHaveAccessibleDescription(
        'Une liste à vous, que vous pouvez modifier. Elle ne suit plus la liste d’origine : un film qui y est ajouté n’arrivera pas dans la copie.'
      );
      await user.click(copyCreate());

      await waitFor(() =>
        expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'l9' }))
      );
      expect(body).toEqual({ name: 'Ciné coréen' });
    });

    it('speaks of the selection when the copy comes from Explorer', () => {
      server.use(authMeGuestHandler, ...createListsHandlers());
      renderDialog({
        mode: 'copy',
        copyOf: { savedListId: 's2', name: 'Frissons', sourceType: 'explorerTheme' },
      });

      expect(nameField()).toHaveAccessibleDescription(
        'Une liste à vous, que vous pouvez modifier. Elle ne suit plus la sélection : un film ajouté à la sélection n’y arrivera pas.'
      );
    });

    it('asks for another name when a created list already bears the name of the saga', async () => {
      server.use(authMeGuestHandler, ...createListsHandlers([{ id: 'l1', name: 'Harry Potter' }]));
      const user = userEvent.setup();
      renderDialog({ mode: 'copy', copyOf: copyOfSaga });

      expect(
        await screen.findByText(
          'Vous avez déjà une liste nommée « Harry Potter ». Choisissez un autre nom.'
        )
      ).toBeInTheDocument();
      expect(copyCreate()).toBeDisabled();

      await user.type(nameField(), ' 2');
      expect(copyCreate()).toBeEnabled();
    });

    it('keeps the copy button disabled when the API finds the name taken', async () => {
      server.use(
        authMeGuestHandler,
        http.post(`${TEST_API_V1}/saved-lists/s1/copy`, () =>
          apiErrorJson(409, 'list_name_taken', { name: 'Harry Potter' })
        ),
        ...createListsHandlers()
      );
      const user = userEvent.setup();
      renderDialog({ mode: 'copy', copyOf: copyOfSaga });

      await user.click(copyCreate());

      expect(
        await screen.findByText(
          'Vous avez déjà une liste nommée « Harry Potter ». Choisissez un autre nom.'
        )
      ).toBeInTheDocument();
      expect(copyCreate()).toBeDisabled();
    });

    it('says when the account already holds fifty lists', async () => {
      server.use(
        authMeGuestHandler,
        http.post(`${TEST_API_V1}/saved-lists/s1/copy`, () =>
          apiErrorJson(409, 'list_limit_reached', { max: 50 })
        ),
        ...createListsHandlers()
      );
      const user = userEvent.setup();
      const { onSaved } = renderDialog({ mode: 'copy', copyOf: copyOfSaga });

      await user.click(copyCreate());

      expect(
        await screen.findByText(
          'Vous avez déjà 50 listes. Supprimez-en une pour en créer une autre.'
        )
      ).toBeInTheDocument();
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  it('closes on Annuler', async () => {
    server.use(authMeGuestHandler, ...createListsHandlers());
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('lays Annuler then the submit button in the shared dialog actions row', () => {
    server.use(authMeGuestHandler, ...createListsHandlers());
    renderDialog();

    const cancel = screen.getByRole('button', { name: 'Annuler' });
    const submit = screen.getByRole('button', { name: 'Créer la liste' });
    expect(cancel.parentElement).toHaveClass(modalStyles.actions!);
    expect(submit.parentElement).toBe(cancel.parentElement);
    expect(cancel.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
