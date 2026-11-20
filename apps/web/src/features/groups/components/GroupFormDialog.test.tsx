import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { apiErrorJson } from '@/mocks/apiJson';
import { authMeGuestHandler, createGroupsHandlers, TEST_API_V1 } from '@/mocks/handlers';
import GroupFormDialog from './GroupFormDialog';

function renderDialog(props: Partial<ComponentProps<typeof GroupFormDialog>> = {}) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <AppTestProviders>
      <MemoryRouter>
        <GroupFormDialog onClose={onClose} onSaved={onSaved} {...props} />
      </MemoryRouter>
    </AppTestProviders>
  );
  return { onSaved, onClose };
}

const nameField = () => screen.getByRole('textbox', { name: 'Nom' });

describe('GroupFormDialog', () => {
  const server = setupServer(authMeGuestHandler);

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('creates a group from its name, once a name is filled in', async () => {
    server.use(...createGroupsHandlers());
    const user = userEvent.setup();
    const { onSaved } = renderDialog();

    expect(screen.getByRole('heading', { name: 'Nouveau groupe' })).toBeInTheDocument();
    expect(
      screen.getByText('Les amis avec qui vous faites vos soirées. Vous les invitez juste après.')
    ).toBeInTheDocument();
    expect(nameField()).toHaveAttribute('maxLength', '40');
    const create = screen.getByRole('button', { name: 'Créer le groupe' });
    expect(create).toBeDisabled();

    await user.type(nameField(), '   ');
    expect(create).toBeDisabled();
    await user.type(nameField(), 'Les jeudis ciné ');
    await user.click(create);

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'g1', name: 'Les jeudis ciné' })
      )
    );
  });

  it('renames a group, starting from its current name', async () => {
    server.use(...createGroupsHandlers([{ id: 'g1', name: 'Famille' }]));
    const user = userEvent.setup();
    const { onSaved } = renderDialog({ group: { id: 'g1', name: 'Famille' } });

    expect(screen.getByRole('heading', { name: 'Renommer le groupe' })).toBeInTheDocument();
    expect(nameField()).toHaveValue('Famille');
    expect(
      screen.queryByText('Les amis avec qui vous faites vos soirées. Vous les invitez juste après.')
    ).toBeNull();

    await user.clear(nameField());
    await user.type(nameField(), 'La famille');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ name: 'La famille' }))
    );
  });

  it('says why the group could not be created and keeps the dialog open', async () => {
    server.use(
      http.post(`${TEST_API_V1}/groups`, () =>
        apiErrorJson(409, 'group_limit_reached', { max: 10 })
      )
    );
    const user = userEvent.setup();
    const { onSaved } = renderDialog();

    await user.type(nameField(), 'Famille');
    await user.click(screen.getByRole('button', { name: 'Créer le groupe' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Vous avez déjà créé 10 groupes. Supprimez-en un pour en créer un autre.'
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('closes on Annuler', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onClose).toHaveBeenCalled();
  });
});
