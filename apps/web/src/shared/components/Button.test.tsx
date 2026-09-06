import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button, { buttonClass } from '@/shared/components/Button';

describe('Button', () => {
  it('est de type button par défaut et déclenche onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Envoyer</Button>);

    const button = screen.getByRole('button', { name: 'Envoyer' });
    expect(button.getAttribute('type')).toBe('button');

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('traduit variante et taille en classes du design system', () => {
    render(
      <Button variant="primary" size="sm" className="extra">
        Valider
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Valider' });
    expect(button.className.split(' ').sort()).toEqual(['btn', 'btn-primary', 'btn-sm', 'extra']);
  });

  it('expose la même composition de classes aux liens via buttonClass', () => {
    expect(buttonClass()).toBe('btn');
    expect(buttonClass({ variant: 'danger' })).toBe('btn btn-danger');
    expect(buttonClass({ variant: 'ghost', size: 'sm' })).toBe('btn btn-ghost btn-sm');
  });

  it('reste désactivable', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Supprimer
      </Button>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
