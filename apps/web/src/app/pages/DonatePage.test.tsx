import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import DonatePage from '@/app/pages/DonatePage';
import { KOFI_URL } from '@/shared/donations/kofi';

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <DonatePage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('DonatePage', () => {
  it('affiche le titre et le CTA Ko-fi en nouvel onglet', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: /soutenir movie picker/i, level: 1 })
    ).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: /faire un don sur ko-fi/i });
    expect(cta).toHaveAttribute('href', KOFI_URL);
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('indique explicitement l’absence d’avantage fonctionnel', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: /rien à débloquer/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText(/pas de version payante/i)).toBeInTheDocument();
  });

  it('renvoie vers l’accueil', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /retour à movie picker/i })).toHaveAttribute(
      'href',
      '/'
    );
  });
});
