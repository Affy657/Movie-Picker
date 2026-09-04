import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareDialog from '@/shared/components/ShareDialog';
import { LocaleProvider } from '@/shared/i18n';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';

const track = vi.fn();
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track }),
}));

vi.mock('@/shared/utils/copyTextToClipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(false),
}));

function renderDialog(ui: ReactElement) {
  return render(
    <LocaleProvider>
      <ConsentProvider>{ui}</ConsentProvider>
    </LocaleProvider>
  );
}

const baseProps = {
  open: true,
  onClose: vi.fn(),
  title: 'Partager la soirée',
  url: 'https://moviepicker.app/e/abc',
  qrHint: "Ouvrez l'appareil photo pour rejoindre la soirée sur mobile.",
  fileSlug: 'abc',
  preview: { name: 'Soirée ciné', meta: ['Samedi 6 septembre', '4 participants'] },
  surface: 'event' as const,
};

describe('ShareDialog', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    track.mockReset();
    vi.mocked(copyTextToClipboard).mockReset();
    vi.mocked(copyTextToClipboard).mockResolvedValue(false);
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.stubGlobal('navigator', { share: undefined, clipboard: undefined } as unknown as Navigator);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('affiche l’aperçu, le QR code, le lien et une seule commande de copie', () => {
    renderDialog(<ShareDialog {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Partager la soirée' })).toBeInTheDocument();
    expect(screen.getByText('Soirée ciné')).toBeInTheDocument();
    expect(screen.getByText('Samedi 6 septembre')).toBeInTheDocument();
    expect(screen.getByText(baseProps.url)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /copier le lien/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^télécharger$/i })).toBeInTheDocument();
  });

  it('sans partage natif, la copie du lien est l’action primaire', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} />);

    const copyBtn = screen.getByRole('button', { name: /copier le lien/i });
    expect(copyBtn).toHaveClass('btn-primary');
    await user.click(copyBtn);

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledWith(baseProps.url);
      expect(screen.getByRole('button', { name: /lien copié/i })).toBeInTheDocument();
    });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('link_shared', { method: 'clipboard', surface: 'event' });
  });

  it('lit le SVG du QR code au clic sur Télécharger', async () => {
    const user = userEvent.setup();
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    renderDialog(<ShareDialog {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /^télécharger$/i }));

    expect(createObjectURLSpy).toHaveBeenCalled();
    const blobArg = createObjectURLSpy.mock.calls[0]?.[0] as Blob;
    expect(blobArg.type).toContain('svg');
  });

  it("n'affiche pas d'onglets quand aucun onglet supplémentaire n'est fourni", () => {
    renderDialog(<ShareDialog {...baseProps} />);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('bascule vers l’onglet supplémentaire fourni et respecte l’onglet initial', async () => {
    const user = userEvent.setup();
    renderDialog(
      <ShareDialog
        {...baseProps}
        initialTab="friends"
        extraTab={{ id: 'friends', label: 'Amis', content: <p>Contenu amis</p> }}
      />
    );

    expect(screen.getByText('Contenu amis')).toBeInTheDocument();
    expect(screen.queryByText(baseProps.url)).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Lien et QR' }));
    expect(screen.getByText(baseProps.url)).toBeInTheDocument();
    expect(screen.queryByText('Contenu amis')).not.toBeInTheDocument();
  });

  it('propose le partage natif en action primaire quand disponible, avec un libellé de téléchargement distinct', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: undefined } as unknown as Navigator);
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} shareText="Viens à ma soirée !" />);

    expect(screen.getByRole('button', { name: /enregistrer le qr/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^partager$/i }));

    expect(share).toHaveBeenCalledWith({
      title: baseProps.title,
      url: baseProps.url,
      text: 'Viens à ma soirée !',
    });
    expect(track).toHaveBeenCalledWith('link_shared', { method: 'native', surface: 'event' });
  });

  it('ignore silencieusement une annulation du partage natif', async () => {
    const abortError = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const share = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal('navigator', { share, clipboard: undefined } as unknown as Navigator);
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /^partager$/i }));

    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(track).not.toHaveBeenCalled();
  });

  it('replie sur la copie du lien si le partage natif échoue pour une autre raison', async () => {
    const share = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    vi.stubGlobal('navigator', { share, clipboard: undefined } as unknown as Navigator);
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /^partager$/i }));

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledWith(baseProps.url);
      expect(screen.getByRole('button', { name: /lien copié/i })).toBeInTheDocument();
    });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('link_shared', { method: 'clipboard', surface: 'event' });
  });

  it('ne trace pas link_shared quand la copie échoue réellement', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(false);
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /copier le lien/i }));

    await waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledWith(baseProps.url));
    expect(track).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /lien copié/i })).not.toBeInTheDocument();
  });

  it('appelle onClose au clic sur la croix', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog(<ShareDialog {...baseProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('affiche l’avatar dans l’aperçu quand aucune icône n’est fournie', () => {
    renderDialog(
      <ShareDialog
        {...baseProps}
        surface="profile"
        preview={{ avatarId: null, name: 'Alice', meta: ['@alice', 'Membre depuis mars 2024'] }}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Membre depuis mars 2024')).toBeInTheDocument();
  });
});
