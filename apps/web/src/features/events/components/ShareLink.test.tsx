import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareLink from '@/features/events/components/ShareLink';
import { LocaleProvider } from '@/shared/i18n';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';

function renderShareLink(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

vi.mock('@/shared/utils/copyTextToClipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(false),
}));

describe('ShareLink', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    vi.mocked(copyTextToClipboard).mockReset();
    vi.mocked(copyTextToClipboard).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le bouton Partager sans exposer l’URL dans la page', () => {
    const url = 'https://example.com/e/abc';
    renderShareLink(<ShareLink url={url} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^partager$/i })).toBeInTheDocument();
    expect(screen.queryByText(url)).not.toBeInTheDocument();
  });

  it('après Partager, copie le lien et affiche une confirmation', async () => {
    vi.stubGlobal('navigator', { share: undefined } as unknown as Navigator);
    try {
      vi.mocked(copyTextToClipboard).mockResolvedValue(true);
      const user = userEvent.setup();
      const url = 'https://example.com/e/xyz';
      renderShareLink(<ShareLink url={url} />);
      await user.click(screen.getByRole('button', { name: /^partager$/i }));
      await waitFor(() => {
        expect(copyTextToClipboard).toHaveBeenCalledWith(url);
        expect(screen.getByRole('button', { name: /lien copié/i })).toBeInTheDocument();
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('avec showQr, ouvre la modale QR au clic et permet de la fermer', async () => {
    const user = userEvent.setup();
    const url = 'https://example.com/e/abc';
    const { container } = renderShareLink(<ShareLink url={url} showQr />);
    const qrBtn = screen.getByRole('button', { name: /afficher le qr code/i });
    expect(qrBtn).toHaveAttribute('aria-haspopup', 'dialog');

    const dialog = container.querySelector('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog?.hasAttribute('open')).toBe(false);

    await user.click(qrBtn);

    await waitFor(() => {
      expect(dialog?.hasAttribute('open')).toBe(true);
    });
    expect(
      screen.getByRole('heading', { name: /qr code — lien vers la soirée/i })
    ).toBeInTheDocument();
    expect(screen.getByTitle(/qr code — lien vers la soirée/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /fermer le qr code/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(dialog?.hasAttribute('open')).toBe(false);
    });
  });
});
