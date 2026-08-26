import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import InAppBrowserBanner from '@/app/components/InAppBrowserBanner';
import { LocaleProvider } from '@/shared/i18n';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';

vi.mock('@/shared/utils/copyTextToClipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(true),
}));

const SNAPCHAT_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.71.0.34';
const INSTAGRAM_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 302.0.0.23.114';
const SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function stubUserAgent(userAgent: string) {
  const original = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent });
  return () => {
    if (original) Object.defineProperty(navigator, 'userAgent', original);
  };
}

function renderBanner(path = '/e/soiree') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocaleProvider>
        <InAppBrowserBanner />
      </LocaleProvider>
    </MemoryRouter>
  );
}

describe('InAppBrowserBanner', () => {
  let restoreUserAgent: (() => void) | null = null;

  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
  });

  afterEach(() => {
    restoreUserAgent?.();
    restoreUserAgent = null;
  });

  it("n'affiche rien dans un navigateur système classique", () => {
    restoreUserAgent = stubUserAgent(SAFARI_UA);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('affiche le bandeau quand un navigateur intégré connu est détecté', () => {
    restoreUserAgent = stubUserAgent(SNAPCHAT_UA);
    renderBanner();
    expect(
      screen.getByText('Vous êtes dans le navigateur intégré de cette application')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ouvrir dans le navigateur' }).getAttribute('href')
    ).toMatch(/^x-safari-https?:\/\//);
    expect(screen.getByRole('button', { name: 'Copier le lien' })).toBeInTheDocument();
  });

  it('ouvre Chrome via intent depuis un WebView Android', () => {
    restoreUserAgent = stubUserAgent(INSTAGRAM_ANDROID_UA);
    renderBanner('/e/soiree?join=1');
    expect(
      screen.getByRole('link', { name: 'Ouvrir dans le navigateur' }).getAttribute('href')
    ).toMatch(/^intent:\/\/.+#Intent;scheme=https?;package=com\.android\.chrome;/);
  });

  it('copie l’URL courante', async () => {
    restoreUserAgent = stubUserAgent(SNAPCHAT_UA);
    const user = userEvent.setup();
    renderBanner('/e/soiree?join=1');

    await user.click(screen.getByRole('button', { name: 'Copier le lien' }));

    expect(copyTextToClipboard).toHaveBeenCalledWith(`${window.location.origin}/e/soiree?join=1`);
    expect(await screen.findByRole('button', { name: 'Lien copié' })).toBeInTheDocument();
  });

  it('masque le bandeau après fermeture', async () => {
    restoreUserAgent = stubUserAgent(SNAPCHAT_UA);
    const user = userEvent.setup();
    const { container } = renderBanner();

    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(container).toBeEmptyDOMElement();
  });
});
