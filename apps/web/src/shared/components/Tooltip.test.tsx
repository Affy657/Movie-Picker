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
  it('renders the bubble hidden by default', () => {
    renderTooltip();
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'hidden');
  });

  it('reveals the bubble on keyboard focus then hides it on blur', () => {
    renderTooltip();
    const button = screen.getByRole('button');

    fireEvent.focus(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'visible');

    fireEvent.blur(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'hidden');
  });

  it('reveals the bubble on hover then hides it when the pointer leaves', async () => {
    const user = userEvent.setup();
    renderTooltip({ delayMs: 0 });
    const button = screen.getByRole('button');

    await user.hover(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'visible');

    await user.unhover(button);
    expect(screen.getByText('Notifications')).toHaveAttribute('data-state', 'hidden');
  });

  it('hides the visible bubble when Escape is pressed', () => {
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

  it('applies the requested placement through data-placement', () => {
    renderTooltip({ placement: 'bottom' });
    expect(screen.getByText('Notifications')).toHaveAttribute('data-placement', 'bottom');
  });
});
