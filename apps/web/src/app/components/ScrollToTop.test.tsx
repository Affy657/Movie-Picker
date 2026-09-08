import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import ScrollToTop from '@/app/components/ScrollToTop';

const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

function renderApp(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ScrollToTop />
      <Link to="/">Explorer</Link>
      <Link to="/watchlist">Ma liste</Link>
      <Link to="/watchlist?tri=note">Trier</Link>
      <Link to="/#faq">Ancre</Link>
      <Routes>
        <Route path="/" element={<h1>Accueil</h1>} />
        <Route path="/watchlist" element={<h1>Ma liste</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ScrollToTop', () => {
  beforeEach(() => {
    scrollTo.mockClear();
  });

  it('ne défile pas au premier rendu', () => {
    renderApp();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('remonte en haut après une navigation vers une autre route', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: 'Ma liste' }));
    expect(await screen.findByRole('heading', { name: 'Ma liste' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('remonte en haut quand le lien pointe vers la route déjà affichée', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: 'Explorer' }));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('ne défile pas quand seuls les paramètres de la page courante changent', async () => {
    const user = userEvent.setup();
    renderApp('/watchlist');
    scrollTo.mockClear();
    await user.click(screen.getByRole('link', { name: 'Trier' }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('laisse le navigateur gérer une navigation vers une ancre', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('link', { name: 'Ancre' }));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
