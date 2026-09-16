import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button, { buttonClass } from '@/shared/components/Button';
import styles from '@/shared/components/Button.module.css';
import spinnerStyles from '@/shared/components/Spinner.module.css';

describe('Button', () => {
  it('is of type button by default and triggers onClick', async () => {
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

  it('exposes the same class composition to links through buttonClass', () => {
    expect(buttonClass()).toBe(styles.btn);
    expect(buttonClass({ tone: 'danger' })).toBe(`${styles.btn} ${styles.danger}`);
    expect(buttonClass({ variant: 'ghost', size: 'lg' })).toBe(
      `${styles.btn} ${styles.ghost} ${styles.lg}`
    );
  });

  it('stays disableable', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Supprimer
      </Button>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('while loading, disables itself, announces itself busy and keeps its label', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Enregistrement…
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Enregistrement…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector(`.${spinnerStyles.spinner}`)).not.toBeNull();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hors chargement, ne porte ni aria-busy ni spinner', () => {
    render(<Button>Enregistrer</Button>);

    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button.querySelector(`.${spinnerStyles.spinner}`)).toBeNull();
  });
});
