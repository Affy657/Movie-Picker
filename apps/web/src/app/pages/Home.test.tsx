import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import Home from '@/app/pages/Home';
import { APP_DOCUMENT_TITLE } from '@/shared/hooks/useDocumentTitle';

describe('Home', () => {
  it('affiche le titre et le lien créer une soirée', () => {
    render(
      <AppTestProviders>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AppTestProviders>
    );
    expect(screen.getByRole('heading', { name: /movie picker/i })).toBeInTheDocument();
    expect(screen.getByText(/choisissez le film de la soirée/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /créer une soirée/i })).toHaveAttribute('href', '/new');
    expect(document.title).toBe(APP_DOCUMENT_TITLE);
  });
});
