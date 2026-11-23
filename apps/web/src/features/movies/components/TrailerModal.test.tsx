import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import titleBarStyles from '@/shared/components/DialogTitleBar.module.css';
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

  it('titles the trailer with the shared title bar, light on the dark media surface', () => {
    wrap(<TrailerModal open movieTitle="Inception" trailerUrl={YT_URL} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Inception' });
    expect(dialog).toHaveClass('on-dark');
    expect(screen.getByRole('heading', { name: 'Inception' })).toHaveClass(titleBarStyles.title!);
  });

  it('ne rend pas le contenu si trailerUrl est null', () => {
    wrap(<TrailerModal open movieTitle="Inception" trailerUrl={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Inception')).not.toBeInTheDocument();
  });

  it('appelle onClose au clic sur le bouton de fermeture', () => {
    const onClose = vi.fn();
    wrap(<TrailerModal open movieTitle="Dune" trailerUrl={YT_URL} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('offers a way out right after the player, since the player keeps Escape for itself', () => {
    const onClose = vi.fn();
    wrap(<TrailerModal open movieTitle="Dune" trailerUrl={YT_URL} onClose={onClose} />);

    const player = document.querySelector('iframe');
    const close = screen.getByRole('button', { name: 'Fermer la bande-annonce' });
    expect(player?.compareDocumentPosition(close)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
