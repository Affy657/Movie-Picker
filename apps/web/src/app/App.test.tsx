import { Suspense } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { AppRoutes } from '@/app/App';

function renderRoutes(initialEntries: string[]) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={initialEntries}>
        <Suspense fallback={<p>Loading…</p>}>
          <AppRoutes />
        </Suspense>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('App (routes)', () => {
  it('route / affiche l\u2019accueil', async () => {
    renderRoutes(['/']);
    expect(await screen.findByRole('heading', { name: /movie picker/i })).toBeInTheDocument();
  });

  it('route /new depuis l\u2019accueil exige une connexion', async () => {
    const user = userEvent.setup();
    renderRoutes(['/']);
    await user.click(await screen.findByRole('link', { name: /cr\u00e9er une soir\u00e9e/i }));
    expect(await screen.findByRole('heading', { name: /^connexion$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cr\u00e9er un compte/i })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fnew'
    );
  });

  it('route /my-events accessible sans compte (liste invité)', async () => {
    renderRoutes(['/my-events']);
    expect(
      await screen.findByText(/Aucune soirée enregistrée sur cet appareil/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Mes soirées$/i })).toBeInTheDocument();
  });
});
