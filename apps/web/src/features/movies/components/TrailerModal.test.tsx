import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import TrailerModal from './TrailerModal';

function wrap(ui: ReactNode) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

const YT_URL = 'https://www.youtube.com/watch?v=abc123';

describe('TrailerModal', () => {
  it('affiche le titre et le lecteur quand open + URL valide', () => {
    wrap(<TrailerModal open movieTitle="Inception" trailerUrl={YT_URL} onClose={vi.fn()} />);
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeInTheDocument();
  });

  it('ne rend pas le contenu si trailerUrl est null', () => {
    wrap(<TrailerModal open movieTitle="Inception" trailerUrl={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
  });

  it('appelle onClose au clic sur le bouton de fermeture', () => {
    const onClose = vi.fn();
    wrap(<TrailerModal open movieTitle="Dune" trailerUrl={YT_URL} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
