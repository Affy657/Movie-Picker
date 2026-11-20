import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

const DIRECTIONS = new Set(['Croissant', 'Décroissant']);

export async function openSortMenu(user: UserEvent, current: string | RegExp) {
  await user.click(await screen.findByRole('button', { name: current }));
  return screen.getByRole('menu', { name: /trier par/i });
}

export function sortChoices(menu: HTMLElement): string[] {
  return within(menu)
    .getAllByRole('menuitemradio')
    .map((item) => item.textContent ?? '')
    .filter((name) => !DIRECTIONS.has(name));
}

export async function pickSort(user: UserEvent, current: string | RegExp, choice: string) {
  const menu = await openSortMenu(user, current);
  await user.click(within(menu).getByRole('menuitemradio', { name: choice }));
}
