import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToggleRow from './ToggleRow';

describe('ToggleRow', () => {
  it('labels the switch by its title and shows the description', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ToggleRow
        title="Autoriser les séries"
        description="Les participants peuvent proposer des séries"
        checked={false}
        onChange={onChange}
      />
    );
    const toggle = screen.getByRole('switch', { name: 'Autoriser les séries' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Les participants peuvent proposer des séries')).toBeInTheDocument();
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('passes disabled through to the switch', () => {
    render(<ToggleRow title="Récurrence" checked onChange={vi.fn()} disabled />);
    expect(screen.getByRole('switch', { name: 'Récurrence' })).toBeDisabled();
  });
});
