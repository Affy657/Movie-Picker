import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InAppBrowserBanner from '@/app/components/InAppBrowserBanner';
import { LocaleProvider } from '@/shared/i18n';

const SNAPCHAT_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/12.71.0.34';
const SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function stubUserAgent(userAgent: string) {
  const original = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent });
  return () => {
    if (original) Object.defineProperty(navigator, 'userAgent', original);
  };
}

function renderBanner() {
  return render(
    <LocaleProvider>
      <InAppBrowserBanner />
    </LocaleProvider>
  );
}

describe('InAppBrowserBanner', () => {
  let restoreUserAgent: (() => void) | null = null;

  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
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
  });

  it('masque le bandeau après fermeture', async () => {
    restoreUserAgent = stubUserAgent(SNAPCHAT_UA);
    const user = userEvent.setup();
    const { container } = renderBanner();

    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(container).toBeEmptyDOMElement();
  });
});
