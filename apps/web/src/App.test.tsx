import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppTestProviders } from './test-utils/queryWrapper';
import { AppRoutes } from './App';

describe('App (routes)', () => {
  it('route / affiche l’accueil', () => {
    render(
      <AppTestProviders>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </AppTestProviders>
    );
    expect(screen.getByRole('heading', { name: /movie picker/i })).toBeInTheDocument();
  });

  it('route /new depuis l’accueil exige une connexion', async () => {
    const user = userEvent.setup();
    render(
      <AppTestProviders>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </AppTestProviders>
    );
    await user.click(screen.getByRole('link', { name: /créer une soirée/i }));
    expect(await screen.findByRole('heading', { name: /^connexion$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /créer un compte/i })).toHaveAttribute(
      'href',
      '/inscription?returnTo=%2Fnew'
    );
  });

  it('route /mes-soirees redirige vers la connexion sans session', async () => {
    render(
      <AppTestProviders>
        <MemoryRouter initialEntries={['/mes-soirees']}>
          <AppRoutes />
        </MemoryRouter>
      </AppTestProviders>
    );
    expect(await screen.findByRole('heading', { name: /^connexion$/i })).toBeInTheDocument();
  });
});
