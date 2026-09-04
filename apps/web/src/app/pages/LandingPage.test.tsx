import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import LandingPage from '@/app/pages/LandingPage';
import { APP_DOCUMENT_TITLE } from '@/shared/hooks/useDocumentTitle';

function renderLanding() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('LandingPage', () => {
  afterEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
  });

  it('affiche le titre et les CTA d’authentification (login + inscription)', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { name: /choisissez le film de la soirée/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^se connecter$/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(screen.queryByRole('link', { name: /créer une soirée/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /lancez la soirée/i, level: 3 })
    ).toBeInTheDocument();
    expect(document.title).toBe(APP_DOCUMENT_TITLE);
  });

  it('affiche la version anglaise quand la locale est en', () => {
    localStorage.setItem('moviepicker-locale', 'en');
    renderLanding();
    expect(
      screen.getByRole('heading', { name: /choose tonight.s film/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^log in$/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /^create an account$/i })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(screen.getByRole('heading', { name: /start the night/i, level: 3 })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /the wheel decides/i, level: 3 })
    ).toBeInTheDocument();
  });
});
