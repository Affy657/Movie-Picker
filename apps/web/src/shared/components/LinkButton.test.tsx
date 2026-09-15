import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkButton from '@/shared/components/LinkButton';
import styles from '@/shared/components/LinkButton.module.css';

describe('LinkButton', () => {
  it('is a button of type button, small by default', async () => {
    const onClick = vi.fn();
    render(<LinkButton onClick={onClick}>Tout afficher</LinkButton>);

    const button = screen.getByRole('button', { name: 'Tout afficher' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass(styles.root!, styles.sm!);

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('takes the md size and an extra class', () => {
    render(
      <LinkButton size="md" className="extra">
        Voir plus
      </LinkButton>
    );

    expect(screen.getByRole('button', { name: 'Voir plus' })).toHaveClass(styles.md!, 'extra');
  });

  it('stays disableable', async () => {
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
