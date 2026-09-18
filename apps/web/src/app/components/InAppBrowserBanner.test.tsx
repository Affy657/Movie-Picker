import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import InAppBrowserBanner, {
  IN_APP_BANNER_DISMISSAL_TTL_MS,
  IN_APP_BANNER_DISMISSED_KEY,
} from '@/app/components/InAppBrowserBanner';
import { LocaleProvider } from '@/shared/i18n';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';
import { isStandaloneRuntime } from '@/shared/hooks/usePwaInstall';

vi.mock('@/shared/utils/copyTextToClipboard', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/shared/hooks/usePwaInstall', () => ({
  isStandaloneRuntime: vi.fn(() => false),
}));

const SNAPCHAT_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.71.0.34';
const INSTAGRAM_ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 302.0.0.23.114';
const SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IOS_HOME_SCREEN_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

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
    localStorage.clear();
    localStorage.setItem('moviepicker-locale', 'fr');
    vi.mocked(copyTextToClipboard).mockResolvedValue(true);
    vi.mocked(isStandaloneRuntime).mockReturnValue(false);
  });

  afterEach(() => {
    restoreUserAgent?.();
    restoreUserAgent = null;
  });

  it('renders nothing in a regular system browser', () => {
    restoreUserAgent = stubUserAgent(SAFARI_UA);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the banner when a known in-app browser is detected', () => {
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

  it('renders nothing in the app installed on an iPhone home screen', () => {
    restoreUserAgent = stubUserAgent(IOS_HOME_SCREEN_UA);
    vi.mocked(isStandaloneRuntime).mockReturnValue(true);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
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

  it('closing hides the banner and keeps it away on the next visits', async () => {
    restoreUserAgent = stubUserAgent(SNAPCHAT_UA);
    const user = userEvent.setup();
    const { container, unmount } = renderBanner();

    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(container).toBeEmptyDOMElement();
    expect(Number(localStorage.getItem(IN_APP_BANNER_DISMISSED_KEY))).toBeGreaterThan(0);

    unmount();
    const next = renderBanner('/');
    expect(next.container).toBeEmptyDOMElement();
  });

  it('comes back once the dismissal is older than its time to live', () => {
    restoreUserAgent = stubUserAgent(SNAPCHAT_UA);
    localStorage.setItem(
      IN_APP_BANNER_DISMISSED_KEY,
      String(Date.now() - IN_APP_BANNER_DISMISSAL_TTL_MS - 1)
    );
    renderBanner();
    expect(
      screen.getByText('Vous êtes dans le navigateur intégré de cette application')
    ).toBeInTheDocument();
  });

  it('ignores a corrupted dismissal', () => {
    restoreUserAgent = stubUserAgent(SNAPCHAT_UA);
    localStorage.setItem(IN_APP_BANNER_DISMISSED_KEY, 'yesterday');
    renderBanner();
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
  });

  it('opening the system browser remembers the dismissal but leaves the banner in place', async () => {
    restoreUserAgent = stubUserAgent(SNAPCHAT_UA);
    const user = userEvent.setup();
    renderBanner();

    const link = screen.getByRole('link', { name: 'Ouvrir dans le navigateur' });
    link.addEventListener('click', (event) => event.preventDefault());
    await user.click(link);

    expect(Number(localStorage.getItem(IN_APP_BANNER_DISMISSED_KEY))).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
  });
});
