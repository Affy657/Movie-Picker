import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActiveFilterChips from './ActiveFilterChips';

describe('ActiveFilterChips', () => {
  it('ne rend rien sans pastilles', () => {
    const { container } = render(
      <ActiveFilterChips chips={[]} groupAriaLabel="Filtres" removeAriaLabel="Retirer" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('retire une pastille et peut tout effacer', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    render(
      <ActiveFilterChips
        chips={[{ key: 'g-1', label: 'Action', onRemove }]}
        groupAriaLabel="Filtres actifs"
        removeAriaLabel="Retirer le filtre"
        clearAllLabel="Tout effacer"
        onClearAll={onClearAll}
      />
    );

    expect(screen.getByText('Action')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retirer le filtre' }));
    expect(onRemove).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Tout effacer' }));
    expect(onClearAll).toHaveBeenCalled();
  });
});
