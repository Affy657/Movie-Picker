import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toggle from '@/shared/components/Toggle';

describe('Toggle', () => {
  it('is a named switch that reflects its state', () => {
    const { rerender } = render(
      <Toggle checked={false} onChange={vi.fn()} ariaLabel="Mode sombre" />
    );

    const toggle = screen.getByRole('switch', { name: 'Mode sombre' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('type', 'button');

    rerender(<Toggle checked onChange={vi.fn()} ariaLabel="Mode sombre" />);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('can be named by an external element rather than by aria-label', () => {
    render(
      <>
        <span id="notif-label">Notifications</span>
        <Toggle
          checked={false}
          onChange={vi.fn()}
          ariaLabelledBy="notif-label"
          ariaLabel="ignoré"
        />
      </>
    );

    const toggle = screen.getByRole('switch', { name: 'Notifications' });
    expect(toggle).not.toHaveAttribute('aria-label');
  });

  it('triggers onChange on click and with the keyboard, not when disabled', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle checked={false} onChange={onChange} ariaLabel="x" />);

    const toggle = screen.getByRole('switch');
    await userEvent.click(toggle);
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(<Toggle checked onChange={onChange} ariaLabel="x" />);
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(false);

    rerender(<Toggle checked={false} onChange={onChange} ariaLabel="x" disabled />);
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
