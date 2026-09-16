import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconButton from '@/shared/components/IconButton';
import styles from '@/shared/components/IconButton.module.css';
import spinnerStyles from '@/shared/components/Spinner.module.css';

describe('IconButton', () => {
  it('carries its label in aria-label and title, without rendering it visible', () => {
    render(
      <IconButton label="Fermer">
        <svg aria-hidden />
      </IconButton>
    );

    const button = screen.getByRole('button', { name: 'Fermer' });
    expect(button).toHaveAttribute('title', 'Fermer');
    expect(button).toHaveAttribute('type', 'button');
    expect(screen.queryByText('Fermer')).toBeNull();
  });

  it('peut retirer le title tout en gardant le nom accessible', () => {
    render(
      <IconButton label="Partager" showTitle={false}>
        <svg aria-hidden />
      </IconButton>
    );

    expect(screen.getByRole('button', { name: 'Partager' })).not.toHaveAttribute('title');
  });

  it('turns size, tone and enlarged tap area into classes', () => {
    render(
      <IconButton label="Supprimer" size="lg" tone="danger">
        <svg aria-hidden />
      </IconButton>
    );

    const button = screen.getByRole('button', { name: 'Supprimer' });
    expect(button).toHaveClass(styles.root!, styles.lg!, styles.danger!, styles.expandedHitArea!);
  });

  it('while loading, replaces the icon with the spinner and disables itself', async () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Envoyer" loading onClick={onClick}>
        <svg data-testid="icon" aria-hidden />
      </IconButton>
    );

    const button = screen.getByRole('button', { name: 'Envoyer' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByTestId('icon')).toBeNull();
    expect(button.querySelector(`.${spinnerStyles.spinner}`)).not.toBeNull();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
