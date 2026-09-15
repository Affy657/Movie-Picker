import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '@/shared/components/EmptyState';
import styles from '@/shared/components/EmptyState.module.css';

describe('EmptyState', () => {
  it('rend l’icône décorative, le message et les actions', () => {
    render(
      <EmptyState
        icon={<svg data-testid="icon" />}
        message="Aucun film pour le moment."
        actions={<button type="button">Ajouter</button>}
      />
    );

    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Aucun film pour le moment.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('le titre prend la balise demandée, un paragraphe par défaut', () => {
    const { rerender } = render(
      <EmptyState icon={<svg />} title="Rien ici" message="…" titleTag="h2" />
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Rien ici' })).toBeInTheDocument();

    rerender(<EmptyState icon={<svg />} title="Rien ici" message="…" />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('Rien ici').tagName).toBe('P');
  });

  it('la variante compacte ajoute sa classe sans en retirer aucune', () => {
    const { container } = render(
      <EmptyState icon={<svg />} message="…" compact className="extra" />
    );

    expect(container.firstElementChild).toHaveClass(styles.root!, styles.compact!, 'extra');
  });
});
