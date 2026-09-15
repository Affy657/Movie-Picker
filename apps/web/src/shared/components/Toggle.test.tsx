import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toggle from '@/shared/components/Toggle';

describe('Toggle', () => {
  it('est un interrupteur nommé qui reflète son état', () => {
    const { rerender } = render(<Toggle checked={false} onChange={vi.fn()} label="Mode sombre" />);

    const toggle = screen.getByRole('switch', { name: 'Mode sombre' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('type', 'button');

    rerender(<Toggle checked onChange={vi.fn()} label="Mode sombre" />);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('peut être nommé par un élément externe plutôt que par aria-label', () => {
    render(
      <>
        <span id="notif-label">Notifications</span>
        <Toggle checked={false} onChange={vi.fn()} labelledBy="notif-label" label="ignoré" />
      </>
    );

    const toggle = screen.getByRole('switch', { name: 'Notifications' });
    expect(toggle).not.toHaveAttribute('aria-label');
  });

  it('déclenche onChange au clic et au clavier, pas quand il est désactivé', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle checked={false} onChange={onChange} label="x" />);

    const toggle = screen.getByRole('switch');
    await userEvent.click(toggle);
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledTimes(2);

    rerender(<Toggle checked={false} onChange={onChange} label="x" disabled />);
    await userEvent.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
