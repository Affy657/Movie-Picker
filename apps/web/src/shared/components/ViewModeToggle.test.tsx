import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewModeToggle from '@/shared/components/ViewModeToggle';
import { LocaleProvider } from '@/shared/i18n';

function renderToggle(value: 'grid' | 'list', onChange = vi.fn()) {
  render(
    <LocaleProvider>
      <ViewModeToggle value={value} onChange={onChange} />
    </LocaleProvider>
  );
  return onChange;
}

describe('ViewModeToggle', () => {
  it('is a toolbar where only the current mode is pressed', () => {
    renderToggle('grid');

    expect(screen.getByRole('toolbar', { name: 'Mode d’affichage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Affichage grille' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Affichage liste' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('remonte le mode choisi', async () => {
    const onChange = renderToggle('grid');

    await userEvent.click(screen.getByRole('button', { name: 'Affichage liste' }));
    expect(onChange).toHaveBeenCalledWith('list');

    await userEvent.click(screen.getByRole('button', { name: 'Affichage grille' }));
    expect(onChange).toHaveBeenCalledWith('grid');
  });
});
