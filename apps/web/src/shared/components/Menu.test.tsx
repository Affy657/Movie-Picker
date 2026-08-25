import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Menu, { MenuItem, MenuLabel, MenuPanel, MenuSeparator } from './Menu';

describe('Menu', () => {
  it("n'affiche pas le panneau tant qu'il n'est pas ouvert", () => {
    render(
      <Menu triggerLabel="Options" panelLabel="Options">
        {() => <MenuItem>Un choix</MenuItem>}
      </Menu>
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ouvre le panneau au clic sur le déclencheur et affiche les items', async () => {
    const user = userEvent.setup();
    render(
      <Menu triggerLabel="Options" panelLabel="Options">
        {() => <MenuItem>Un choix</MenuItem>}
      </Menu>
    );

    await user.click(screen.getByRole('button', { name: 'Options' }));

    expect(screen.getByRole('menu', { name: 'Options' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Un choix' })).toBeInTheDocument();
  });

  it('ferme le panneau quand un item appelle close()', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <Menu triggerLabel="Options" panelLabel="Options">
        {(close) => (
          <MenuItem
            onClick={() => {
              onSelect();
              close();
            }}
          >
            Un choix
          </MenuItem>
        )}
      </Menu>
    );

    await user.click(screen.getByRole('button', { name: 'Options' }));
    await user.click(screen.getByRole('menuitem', { name: 'Un choix' }));

    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ferme le panneau au clic en dehors', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Menu triggerLabel="Options" panelLabel="Options">
          {() => <MenuItem>Un choix</MenuItem>}
        </Menu>
        <button type="button">Ailleurs</button>
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ailleurs' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('MenuPanel', () => {
  it('se rend seule, sans déclencheur ni logique d’ouverture', () => {
    render(
      <MenuPanel label="Actions">
        <MenuItem>Un choix</MenuItem>
      </MenuPanel>
    );
    expect(screen.getByRole('menu', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Un choix' })).toBeInTheDocument();
  });
});

describe('MenuItem', () => {
  it('affiche l’icône fournie et marque les variantes selected et danger', () => {
    render(
      <MenuPanel label="Actions">
        <MenuItem icon={<span data-testid="icon" />} selected>
          Sélectionné
        </MenuItem>
        <MenuItem danger>Retirer</MenuItem>
      </MenuPanel>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sélectionné' }).className).toMatch(/itemSelected/);
    expect(screen.getByRole('menuitem', { name: 'Retirer' }).className).toMatch(/itemDanger/);
  });
});

describe('MenuLabel', () => {
  it('affiche son intitulé', () => {
    render(<MenuLabel>Trier par</MenuLabel>);
    expect(screen.getByText('Trier par')).toBeInTheDocument();
  });
});

describe('MenuSeparator', () => {
  it('se rend comme un séparateur', () => {
    render(<MenuSeparator />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
