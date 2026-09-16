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

  it('opens the panel when clicking the trigger and shows the items', async () => {
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
  it('renders on its own, without trigger nor opening logic', () => {
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
  it('shows the provided icon and marks the selected and danger variants', () => {
    render(
      <MenuPanel label="Actions">
        <MenuItem icon={<span data-testid="icon" />} selected>
          Sélectionné
        </MenuItem>
        <MenuItem tone="danger">Retirer</MenuItem>
      </MenuPanel>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sélectionné' }).className).toMatch(/itemSelected/);
    expect(screen.getByRole('menuitem', { name: 'Retirer' }).className).toMatch(/itemDanger/);
  });

  it('renders a disabled item as a disabled button, even with an href', () => {
    render(
      <MenuPanel label="Actions">
        <MenuItem href="/somewhere" disabled>
          Indisponible
        </MenuItem>
      </MenuPanel>
    );
    const item = screen.getByRole('menuitem', { name: 'Indisponible' });
    expect(item.tagName).toBe('BUTTON');
    expect(item).toBeDisabled();
  });
});

describe('MenuLabel', () => {
  it('shows its heading', () => {
    render(<MenuLabel>Trier par</MenuLabel>);
    expect(screen.getByText('Trier par')).toBeInTheDocument();
  });
});

describe('MenuSeparator', () => {
  it('renders as a separator', () => {
    render(<MenuSeparator />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
