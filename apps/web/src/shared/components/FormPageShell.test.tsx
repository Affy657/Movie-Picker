import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import FormPageShell from '@/shared/components/FormPageShell';

describe('FormPageShell', () => {
  it('leads back, then titles and describes the form it holds', () => {
    render(
      <MemoryRouter>
        <FormPageShell
          title="Nouvelle soirée"
          description="Invitez vos amis."
          back={{ to: '/my-events', label: 'Mes soirées' }}
        >
          <form aria-label="Création" />
        </FormPageShell>
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Mes soirées' })).toHaveAttribute('href', '/my-events');
    expect(screen.getByRole('heading', { level: 1, name: 'Nouvelle soirée' })).toBeInTheDocument();
    expect(screen.getByText('Invitez vos amis.')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Création' })).toBeInTheDocument();
  });

  it('omits the description when there is none', () => {
    const { container } = render(
      <MemoryRouter>
        <FormPageShell title="Connexion" back={{ to: '/', label: 'Accueil' }}>
          <p>Formulaire</p>
        </FormPageShell>
      </MemoryRouter>
    );

    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});
