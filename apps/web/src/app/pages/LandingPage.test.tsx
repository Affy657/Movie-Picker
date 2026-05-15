import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import LandingPage from '@/app/pages/LandingPage';
import { APP_DOCUMENT_TITLE } from '@/shared/hooks/useDocumentTitle';

describe('LandingPage', () => {
  it('affiche le titre et les CTA d’authentification (login + inscription)', () => {
    render(
      <AppTestProviders>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </AppTestProviders>
    );
    expect(
      screen.getByRole('heading', { name: /choisissez le film de la soirée/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^se connecter$/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
      'href',
      '/register'
    );
    expect(screen.queryByRole('link', { name: /créer une soirée/i })).not.toBeInTheDocument();
    expect(document.title).toBe(APP_DOCUMENT_TITLE);
  });
});
