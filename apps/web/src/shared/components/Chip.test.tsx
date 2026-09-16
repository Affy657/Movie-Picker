import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chip from '@/shared/components/Chip';

describe('Chip', () => {
  it('renders a non-interactive element by default', () => {
    render(<Chip testId="c">Comédie</Chip>);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('c').textContent).toBe('Comédie');
  });

  it('devient un bouton pressable quand onClick est fourni', async () => {
    const onClick = vi.fn();
    render(
      <Chip onClick={onClick} selected={false}>
        Comédie
      </Chip>
    );

    const chip = screen.getByRole('button', { name: 'Comédie' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');

    await userEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('un bouton sans selected est une action, pas un interrupteur', () => {
    render(<Chip onClick={vi.fn()}>Inviter</Chip>);
    expect(screen.getByRole('button', { name: 'Inviter' })).not.toHaveAttribute('aria-pressed');
  });

  it('selected pose le style plein et aria-pressed en une seule prop', () => {
    render(
      <Chip onClick={vi.fn()} selected>
        Comédie
      </Chip>
    );
    const chip = screen.getByRole('button', { name: 'Comédie' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip.className).toMatch(/selected/);
  });

  it('expose un bouton de retrait distinct sans imbriquer deux boutons', async () => {
    const onRemove = vi.fn();
    const onClick = vi.fn();
    render(
      <Chip onClick={onClick} onRemove={onRemove} removeLabel="Retirer Comédie" testId="c">
        Comédie
      </Chip>
    );

    expect(screen.getByTestId('c').tagName).toBe('SPAN');

    await userEvent.click(screen.getByRole('button', { name: 'Retirer Comédie' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
