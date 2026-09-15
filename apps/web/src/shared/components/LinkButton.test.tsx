import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkButton from '@/shared/components/LinkButton';
import styles from '@/shared/components/LinkButton.module.css';

describe('LinkButton', () => {
  it('est un bouton de type button, petit par défaut', async () => {
    const onClick = vi.fn();
    render(<LinkButton onClick={onClick}>Tout afficher</LinkButton>);

    const button = screen.getByRole('button', { name: 'Tout afficher' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass(styles.root!, styles.sm!);

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('prend la taille md et une classe supplémentaire', () => {
    render(
      <LinkButton size="md" className="extra">
        Voir plus
      </LinkButton>
    );

    expect(screen.getByRole('button', { name: 'Voir plus' })).toHaveClass(styles.md!, 'extra');
  });

  it('reste désactivable', async () => {
    const onClick = vi.fn();
    render(
      <LinkButton disabled onClick={onClick}>
        Annuler
      </LinkButton>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
