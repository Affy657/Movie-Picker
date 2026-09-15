import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorState from '@/shared/components/ErrorState';

describe('ErrorState', () => {
  it('rend une page principale avec le code, le titre h1, le message et les actions', () => {
    render(
      <ErrorState
        icon={<svg data-testid="icon" />}
        code="Erreur 404"
        title="Page introuvable"
        message="Cette adresse ne mène nulle part."
        actions={<a href="/">Accueil</a>}
      />
    );

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByText('Erreur 404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument();
    expect(screen.getByText('Cette adresse ne mène nulle part.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
  });

  it('annonce le message au lecteur d’écran avec le rôle demandé', () => {
    render(
      <ErrorState
        icon={<svg />}
        title="Erreur"
        message="Le serveur ne répond pas."
        messageRole="alert"
        actions={null}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Le serveur ne répond pas.');
  });
});
