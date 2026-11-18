import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '@/shared/i18n';
import EventCardMenu from './EventCardMenu';

function renderMenu(props: Partial<Parameters<typeof EventCardMenu>[0]> = {}) {
  render(
    <LocaleProvider>
      <EventCardMenu title="Ciné-club du mardi" {...props} />
    </LocaleProvider>
  );
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Options pour Ciné-club du mardi' }));
  return screen.getByRole('menu', { name: 'Options pour Ciné-club du mardi' });
}

const itemsAndSeparators = (menu: HTMLElement) =>
  Array.from(menu.children).map((child) => (child.tagName === 'HR' ? '---' : child.textContent));

describe('EventCardMenu', () => {
  it('puts the deletion last, behind a separator, and says it asks for a confirmation', async () => {
    renderMenu({ onReuse: vi.fn(), onDelete: vi.fn() });

    const menu = await openMenu();

    expect(itemsAndSeparators(menu)).toEqual([
      'Refaire cette soirée',
      '---',
      'Supprimer la soirée',
    ]);
    expect(within(menu).getByRole('menuitem', { name: 'Supprimer la soirée' })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
    expect(
      within(menu).getByRole('menuitem', { name: 'Refaire cette soirée' })
    ).not.toHaveAttribute('aria-haspopup');
  });

  it('draws no separator when the only action is leaving, which asks for a confirmation', async () => {
    renderMenu({ onRemove: vi.fn() });

    const menu = await openMenu();

    expect(itemsAndSeparators(menu)).toEqual(['Quitter la soirée']);
    expect(within(menu).getByRole('menuitem', { name: 'Quitter la soirée' })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
  });
});
