import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ShareDialog, { displayUrl, type ShareQrImage } from '@/shared/components/ShareDialog';
import buttonStyles from '@/shared/components/Button.module.css';
import { LocaleProvider } from '@/shared/i18n';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import { downloadBlob } from '@/shared/utils/downloadBlob';
import { stubMatchMedia } from '@/test-utils/matchMedia';

const track = vi.fn();
vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track }),
}));

vi.mock('@/shared/utils/copyTextToClipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/shared/utils/downloadBlob', () => ({
  downloadBlob: vi.fn(() => true),
}));

function renderDialog(ui: ReactElement) {
  return render(
    <LocaleProvider>
      <ConsentProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ConsentProvider>
    </LocaleProvider>
  );
}

const readyImage = (): ShareQrImage => ({
  status: 'ready',
  blob: new Blob(['png'], { type: 'image/png' }),
  retry: vi.fn(),
});

const baseProps = {
  open: true,
  onClose: vi.fn(),
  title: 'Partager la soirée',
  url: 'https://www.movie-picker.fr/e/qoU5jcDVXC',
  qrTitle: 'QR code de la soirée',
  card: { name: 'Soirée du vendredi', detail: 'Jeudi 26 nov. à 20:30' },
  imageFileName: 'movie-picker-qr-qoU5jcDVXC.png',
  analyticsSurface: 'event' as const,
};

describe('ShareDialog', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    stubMatchMedia(false);
    track.mockReset();
    vi.mocked(copyTextToClipboard).mockReset();
    vi.mocked(copyTextToClipboard).mockResolvedValue(false);
    vi.mocked(downloadBlob).mockClear();
    vi.stubGlobal('navigator', { share: undefined, clipboard: undefined } as unknown as Navigator);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('shows the QR code, the link without its protocol and the two link actions, without tabs', () => {
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} />);

    expect(screen.getByRole('heading', { name: 'Partager la soirée' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR code de la soirée' })).toBeInTheDocument();
    expect(screen.getByText('movie-picker.fr/e/qoU5jcDVXC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copier le lien' })).toHaveClass(
      buttonStyles.primary!
    );
    expect(screen.getByRole('button', { name: 'Enregistrer le QR' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('copies the link, says so on the button and counts the share once', async () => {
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} />);

    await user.click(screen.getByRole('button', { name: 'Copier le lien' }));

    await waitFor(() => {
      expect(copyTextToClipboard).toHaveBeenCalledWith(baseProps.url);
      expect(screen.getByRole('button', { name: /lien copié/i })).toBeInTheDocument();
    });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('link_shared', { method: 'clipboard', surface: 'event' });
  });

  it('does not count a copy that really failed', async () => {
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} />);

    await user.click(screen.getByRole('button', { name: 'Copier le lien' }));

    await waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledWith(baseProps.url));
    expect(track).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /lien copié/i })).not.toBeInTheDocument();
  });

  it('keeps the copy first on a computer even when the browser can share', () => {
    vi.stubGlobal('navigator', { share: vi.fn(), clipboard: undefined } as unknown as Navigator);
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} />);

    expect(screen.getByRole('button', { name: 'Copier le lien' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Partager' })).not.toBeInTheDocument();
  });

  it('offers the phone share first and moves the copy into the link field on a phone', async () => {
    stubMatchMedia(true);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: undefined } as unknown as Navigator);
    const user = userEvent.setup();
    renderDialog(
      <ShareDialog {...baseProps} qrImage={readyImage()} shareText="Viens à ma soirée !" />
    );

    expect(screen.getByRole('button', { name: 'Copier le lien' })).not.toHaveClass(
      buttonStyles.primary!
    );
    await user.click(screen.getByRole('button', { name: 'Partager' }));

    expect(share).toHaveBeenCalledWith({
      title: baseProps.title,
      url: baseProps.url,
      text: 'Viens à ma soirée !',
    });
    expect(track).toHaveBeenCalledWith('link_shared', { method: 'native', surface: 'event' });
  });

  it('ignores a dismissed phone share and copies the link when the share fails', async () => {
    stubMatchMedia(true);
    const abortError = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const share = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockRejectedValueOnce(new Error('NotAllowedError'));
    vi.stubGlobal('navigator', { share, clipboard: undefined } as unknown as Navigator);
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} />);

    await user.click(screen.getByRole('button', { name: 'Partager' }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(track).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Partager' }));
    await waitFor(() => expect(copyTextToClipboard).toHaveBeenCalledWith(baseProps.url));
    expect(track).toHaveBeenCalledWith('link_shared', { method: 'clipboard', surface: 'event' });
  });

  it('saves the image of the QR code under its file name', async () => {
    const user = userEvent.setup();
    const image = readyImage();
    renderDialog(<ShareDialog {...baseProps} qrImage={image} />);

    await user.click(screen.getByRole('button', { name: 'Enregistrer le QR' }));

    expect(downloadBlob).toHaveBeenCalledWith(image.blob, baseProps.imageFileName);
  });

  it('waits for the image before saving it, and draws it again after a failure', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const { rerender } = renderDialog(
      <ShareDialog {...baseProps} qrImage={{ status: 'pending', blob: null, retry }} />
    );
    expect(screen.getByRole('button', { name: 'Enregistrer le QR' })).toBeDisabled();

    rerender(
      <LocaleProvider>
        <ConsentProvider>
          <MemoryRouter>
            <ShareDialog {...baseProps} qrImage={{ status: 'error', blob: null, retry }} />
          </MemoryRouter>
        </ConsentProvider>
      </LocaleProvider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('L’image n’a pas pu être préparée.');
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('says the enlarged view could not prepare the image, and retries from its button', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    renderDialog(<ShareDialog {...baseProps} qrImage={{ status: 'error', blob: null, retry }} />);

    await user.click(screen.getByRole('button', { name: 'Agrandir le QR code' }));
    const dialog = screen.getByRole('dialog', { name: 'QR code' });

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'L’image n’a pas pu être préparée.'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Réessayer' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('moves the focus into a sub-view and gives it back to the button that opened it', async () => {
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} />);

    await user.click(screen.getByRole('button', { name: 'Agrandir le QR code' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retour' })).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Retour' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Agrandir le QR code' })).toHaveFocus()
    );
  });

  it('comes back from a sub-view with Escape instead of closing the window', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Agrandir le QR code' }));
    const back = await screen.findByRole('button', { name: 'Retour' });
    const kept = fireEvent.keyDown(back, { key: 'Escape' });

    expect(kept).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Partager la soirée' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Agrandir le QR code' })).toHaveFocus()
    );
  });

  it('leaves Escape to the window on the main view', () => {
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} />);

    const kept = fireEvent.keyDown(screen.getByRole('button', { name: 'Copier le lien' }), {
      key: 'Escape',
    });

    expect(kept).toBe(true);
  });

  it('goes back to the main view as soon as it closes', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    const { rerender } = renderDialog(
      <ShareDialog {...baseProps} qrImage={readyImage()} onViewChange={onViewChange} />
    );
    await user.click(screen.getByRole('button', { name: 'Agrandir le QR code' }));
    expect(onViewChange).toHaveBeenLastCalledWith('qr');

    rerender(
      <LocaleProvider>
        <ConsentProvider>
          <MemoryRouter>
            <ShareDialog
              {...baseProps}
              open={false}
              qrImage={readyImage()}
              onViewChange={onViewChange}
            />
          </MemoryRouter>
        </ConsentProvider>
      </LocaleProvider>
    );

    expect(onViewChange).toHaveBeenLastCalledWith('main');
  });

  it('enlarges the QR code in the same window, then comes back', async () => {
    const user = userEvent.setup();
    const image = readyImage();
    renderDialog(<ShareDialog {...baseProps} qrImage={image} />);

    await user.click(screen.getByRole('button', { name: 'Agrandir le QR code' }));

    const dialog = screen.getByRole('dialog', { name: 'QR code' });
    expect(within(dialog).getByText('Soirée du vendredi')).toBeInTheDocument();
    expect(within(dialog).getByText('Jeudi 26 nov. à 20:30')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer l’image' }));
    expect(downloadBlob).toHaveBeenCalledWith(image.blob, baseProps.imageFileName);

    await user.click(within(dialog).getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('dialog', { name: 'Partager la soirée' })).toBeInTheDocument();
  });

  it('shows the enlarged QR code full screen on a phone, above the sheet', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} />);

    await user.click(screen.getByRole('button', { name: 'Agrandir le QR code' }));

    const full = screen.getByRole('dialog', { name: 'QR code' });
    expect(within(full).getByRole('button', { name: 'Enregistrer l’image' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Partager la soirée' })).toBeInTheDocument();

    await user.click(within(full).getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog', { name: 'QR code' })).not.toBeInTheDocument();
  });

  it('opens the extra view from its button, with its own title and footer', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    renderDialog(
      <ShareDialog
        {...baseProps}
        title="Partager le recap"
        qrImage={readyImage()}
        onViewChange={onViewChange}
        extraView={{
          triggerLabel: 'Story',
          triggerIcon: null,
          title: 'Story',
          body: <p>Aperçu de la story</p>,
          footer: <button type="button">Télécharger l’image</button>,
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Story' }));

    const dialog = screen.getByRole('dialog', { name: 'Story' });
    expect(within(dialog).getByText('Aperçu de la story')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Télécharger l’image' })).toBeInTheDocument();
    expect(onViewChange).toHaveBeenLastCalledWith('extra');
  });

  it('puts what the caller adds under the link, and a person above it', () => {
    renderDialog(
      <ShareDialog
        {...baseProps}
        title="Partager ce profil"
        qrImage={readyImage()}
        identity={{ avatarId: null, name: 'Adrien', detail: '@adrien' }}
      >
        <p>Inviter des amis</p>
      </ShareDialog>
    );

    expect(screen.getByText('Adrien')).toBeInTheDocument();
    expect(screen.getByText('@adrien')).toBeInTheDocument();
    expect(screen.getByText('Inviter des amis')).toBeInTheDocument();
  });

  it('closes from its cross', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog(<ShareDialog {...baseProps} qrImage={readyImage()} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('displayUrl', () => {
  it('drops the protocol and the www of a link', () => {
    expect(displayUrl('https://www.movie-picker.fr/u/adrien')).toBe('movie-picker.fr/u/adrien');
    expect(displayUrl('http://localhost:5273/e/abc')).toBe('localhost:5273/e/abc');
  });
});
