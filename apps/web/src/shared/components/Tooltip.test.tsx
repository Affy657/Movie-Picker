import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tooltip from '@/shared/components/Tooltip';

function renderTooltip(props?: Partial<Parameters<typeof Tooltip>[0]>) {
  return render(
    <Tooltip label="Notifications" {...props}>
      <button type="button">Cloche</button>
    </Tooltip>
  );
}

describe('Tooltip', () => {
  it('rend la bulle masquée par défaut', () => {
    renderTooltip();
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'hidden');
  });

  it('révèle la bulle au focus clavier puis la masque au blur', () => {
    renderTooltip();
    const button = screen.getByRole('button');

    fireEvent.focus(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'visible');

    fireEvent.blur(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'hidden');
  });

  it('révèle la bulle au survol puis la masque quand le pointeur sort', async () => {
    const user = userEvent.setup();
    renderTooltip({ delayMs: 0 });
    const button = screen.getByRole('button');

    await user.hover(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'visible');

    await user.unhover(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'hidden');
  });

  it('masque la bulle visible quand on presse Échap', () => {
    renderTooltip();
    const button = screen.getByRole('button');

    fireEvent.focus(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'visible');

    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'hidden');
  });

  it('ne rend aucune bulle quand disabled est vrai', () => {
    renderTooltip({ disabled: true });
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('applique la position demandée via data-placement', () => {
    renderTooltip({ placement: 'bottom' });
    expect(screen.getByText('Notifications')).toHaveAttribute('data-placement', 'bottom');
  });
});
