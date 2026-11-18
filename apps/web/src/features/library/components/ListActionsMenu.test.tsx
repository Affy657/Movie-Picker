import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { MenuItem } from '@/shared/components/Menu';
import { LocaleProvider } from '@/shared/i18n';
import ListActionsMenu from './ListActionsMenu';

function renderMenu(onRename = vi.fn()) {
  render(
    <LocaleProvider>
      <MemoryRouter initialEntries={['/listes/l1']}>
        <ListActionsMenu>
          {(pick) => (
            <>
              <MenuItem onClick={pick(onRename)}>Renommer</MenuItem>
              <MenuItem to="/films/collection/1241" onClick={pick()}>
                Voir la saga
              </MenuItem>
            </>
          )}
        </ListActionsMenu>
        <Routes>
          <Route path="/listes/l1" element={<p>La liste</p>} />
          <Route path="/films/collection/1241" element={<p>La saga</p>} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>
  );
  return onRename;
}

describe('ListActionsMenu', () => {
  it('closes before running the picked action and gives the focus back to its trigger', async () => {
    const user = userEvent.setup();
    const onRename = renderMenu();

    await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Renommer' }));

    expect(onRename).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'Actions de la liste' })).toHaveFocus();
  });

  it('closes when one of its links is followed', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Actions de la liste' }));
    await user.click(screen.getByRole('menuitem', { name: 'Voir la saga' }));

    expect(await screen.findByText('La saga')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
