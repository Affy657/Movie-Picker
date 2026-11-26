import { createRef } from 'react';
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

  it('leaves the heading unfocusable and the description silent by default', () => {
    render(
      <MemoryRouter>
        <FormPageShell
          title="Connexion"
          description="Bon retour."
          back={{ to: '/', label: 'Accueil' }}
        >
          <p>Formulaire</p>
        </FormPageShell>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hands its heading to a page that moves focus there, and announces a description that changes', () => {
    const titleRef = createRef<HTMLHeadingElement>();
    const shell = (description: string) => (
      <MemoryRouter>
        <FormPageShell
          title="Confirmation"
          description={description}
          back={{ to: '/', label: 'Accueil' }}
          titleRef={titleRef}
          announceDescription
        >
          <p>Action</p>
        </FormPageShell>
      </MemoryRouter>
    );
    const { rerender } = render(shell('Un instant.'));
    const status = screen.getByRole('status');

    titleRef.current?.focus();
    rerender(shell('Adresse confirmée.'));

    expect(screen.getByRole('heading', { level: 1, name: 'Confirmation' })).toHaveFocus();
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Adresse confirmée.');
  });
});
