import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import Menu, { MenuItem, MenuLabel, MenuPanel, MenuSeparator } from './Menu';

describe('Menu', () => {
  it("n'affiche pas le panneau tant qu'il n'est pas ouvert", () => {
    render(
      <Menu triggerLabel="Options" panelAriaLabel="Options">
        {() => <MenuItem>Un choix</MenuItem>}
      </Menu>
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the panel when clicking the trigger and shows the items', async () => {
    const user = userEvent.setup();
    render(
      <Menu triggerLabel="Options" panelAriaLabel="Options">
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
      <Menu triggerLabel="Options" panelAriaLabel="Options">
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
        <Menu triggerLabel="Options" panelAriaLabel="Options">
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
      <MenuPanel ariaLabel="Actions">
        <MenuItem>Un choix</MenuItem>
      </MenuPanel>
    );
    expect(screen.getByRole('menu', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Un choix' })).toBeInTheDocument();
  });

  it('moves focus between enabled items with the arrows, Home and End, wrapping around', async () => {
    const user = userEvent.setup();
    render(
      <MenuPanel ariaLabel="Actions">
        <MenuItem>Premier</MenuItem>
        <MenuItem disabled>Grisé</MenuItem>
        <MenuItem>Deuxième</MenuItem>
        <MenuItem>Dernier</MenuItem>
      </MenuPanel>
    );
    const first = screen.getByRole('menuitem', { name: 'Premier' });
    const second = screen.getByRole('menuitem', { name: 'Deuxième' });
    const last = screen.getByRole('menuitem', { name: 'Dernier' });

    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(second).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(first).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(last).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(first).toHaveFocus();
    await user.keyboard('{End}');
    expect(last).toHaveFocus();
    await user.keyboard('{Home}');
    expect(first).toHaveFocus();
  });

  it('enters from the panel itself: ArrowDown on the first item, ArrowUp on the last', async () => {
    const user = userEvent.setup();
    render(
      <MenuPanel ariaLabel="Actions">
        <MenuItem>Premier</MenuItem>
        <MenuItem>Dernier</MenuItem>
      </MenuPanel>
    );
    const panel = screen.getByRole('menu');

    panel.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Dernier' })).toHaveFocus();

    panel.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Premier' })).toHaveFocus();
  });

  it('is anchored under its trigger unless told otherwise', () => {
    const { rerender } = render(<MenuPanel ariaLabel="Actions">x</MenuPanel>);
    expect(screen.getByRole('menu').className).toMatch(/anchored/);

    rerender(
      <MenuPanel ariaLabel="Actions" anchored={false}>
        x
      </MenuPanel>
    );
    expect(screen.getByRole('menu').className).not.toMatch(/anchored/);
  });
});

describe('MenuItem', () => {
  it('shows the provided icon and marks the selected and danger variants', () => {
    render(
      <MenuPanel ariaLabel="Actions">
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

  it('takes an accessible name and a title that differ from its visible text', () => {
    render(
      <MenuPanel ariaLabel="Actions">
        <MenuItem ariaLabel="Retirer Alien" title="Vous êtes hôte">
          Retirer
        </MenuItem>
      </MenuPanel>
    );
    const item = screen.getByRole('menuitem', { name: 'Retirer Alien' });
    expect(item).toHaveAttribute('title', 'Vous êtes hôte');
    expect(item).toHaveTextContent('Retirer');
  });

  it('nudges a text label without descenders like small capitals', () => {
    render(
      <MenuPanel ariaLabel="Actions">
        <MenuItem>Retirer</MenuItem>
        <MenuItem>Partager</MenuItem>
      </MenuPanel>
    );
    expect(screen.getByText('Retirer').className).toMatch(/itemLabelCaps/);
    expect(screen.getByText('Partager').className).not.toMatch(/itemLabelCaps/);
  });

  it('renders a disabled item as a disabled button, even with an href', () => {
    render(
      <MenuPanel ariaLabel="Actions">
        <MenuItem href="/somewhere" disabled>
          Indisponible
        </MenuItem>
      </MenuPanel>
    );
    const item = screen.getByRole('menuitem', { name: 'Indisponible' });
    expect(item.tagName).toBe('BUTTON');
    expect(item).toBeDisabled();
  });

  it('renders an in-app route as a router link', () => {
    render(
      <MemoryRouter>
        <MenuPanel ariaLabel="Actions">
          <MenuItem to="/compte">Mon compte</MenuItem>
        </MenuPanel>
      </MemoryRouter>
    );
    const item = screen.getByRole('menuitem', { name: 'Mon compte' });
    expect(item.tagName).toBe('A');
    expect(item).toHaveAttribute('href', '/compte');
    expect(item).not.toHaveAttribute('target');
  });

  it('opens an external href in a new tab without leaking the opener', () => {
    render(
      <MenuPanel ariaLabel="Actions">
        <MenuItem href="https://calendar.google.com" external>
          Google Agenda
        </MenuItem>
      </MenuPanel>
    );
    const item = screen.getByRole('menuitem', { name: 'Google Agenda' });
    expect(item).toHaveAttribute('target', '_blank');
    expect(item).toHaveAttribute('rel', 'noopener noreferrer');
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
