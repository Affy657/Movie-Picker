import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ServerErrorPage from '@/shared/components/ServerErrorPage';
import { LocaleProvider } from '@/shared/i18n';

function renderPage(element: React.ReactElement) {
  return render(
    <LocaleProvider>
      <MemoryRouter>{element}</MemoryRouter>
    </LocaleProvider>
  );
}

describe('ServerErrorPage', () => {
  it('affiche le code 500, le message de l’erreur et le lien vers l’accueil', () => {
    renderPage(<ServerErrorPage error={new Error('base injoignable')} />);

    expect(screen.getByText('Erreur 500')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('base injoignable');
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
    expect(document.title).toContain('Movie Picker');
  });

  it('offers Retry when a callback is provided', async () => {
    const onRetry = vi.fn();
    renderPage(<ServerErrorPage onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('without an error, falls back to the generic message', () => {
    renderPage(<ServerErrorPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Une erreur inattendue s’est produite.');
  });
});
