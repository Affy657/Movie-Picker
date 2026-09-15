import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button, { buttonClass } from '@/shared/components/Button';
import styles from '@/shared/components/Button.module.css';

describe('Button', () => {
  it('est de type button par défaut et déclenche onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Envoyer</Button>);

    const button = screen.getByRole('button', { name: 'Envoyer' });
    expect(button.getAttribute('type')).toBe('button');

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('traduit variante, ton et taille en classes du design system', () => {
    render(
      <Button variant="primary" size="sm" className="extra">
        Valider
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Valider' });
    expect(button.className.split(' ').sort()).toEqual(
      [styles.btn, styles.primary, styles.sm, 'extra'].sort()
    );
  });

  it('expose la même composition de classes aux liens via buttonClass', () => {
    expect(buttonClass()).toBe(styles.btn);
    expect(buttonClass({ tone: 'danger' })).toBe(`${styles.btn} ${styles.danger}`);
    expect(buttonClass({ variant: 'ghost', size: 'lg' })).toBe(
      `${styles.btn} ${styles.ghost} ${styles.lg}`
    );
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

  it('en chargement, se désactive, s’annonce occupé et garde son libellé', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Enregistrement…
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Enregistrement…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector(`.${styles.spinner}`)).not.toBeNull();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hors chargement, ne porte ni aria-busy ni spinner', () => {
    render(<Button>Enregistrer</Button>);

    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button.querySelector(`.${styles.spinner}`)).toBeNull();
  });
});
