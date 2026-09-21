import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MovedOriginBanner from '@/app/components/MovedOriginBanner';
import { LocaleProvider } from '@/shared/i18n';
import { usePwaInstallClick } from '@/shared/hooks/usePwaInstall';
import { shouldOfferSystemBrowser } from '@/app/components/InAppBrowserBanner';
import { MOVED_ORIGIN_NOTICE_KEY } from '@/shared/pwa/movedOrigin';

vi.mock('@/shared/hooks/usePwaInstall', () => ({
  usePwaInstallClick: vi.fn(),
}));

vi.mock('@/app/components/InAppBrowserBanner', () => ({
  shouldOfferSystemBrowser: vi.fn(() => false),
}));

vi.mock('@/shared/components/InstallPwaDialog', () => ({
  default: ({ mode }: { mode: string }) => <div role="dialog">guide:{mode}</div>,
}));

const mockInstallClick = vi.mocked(usePwaInstallClick);
const installState = (overrides: Partial<ReturnType<typeof usePwaInstallClick>> = {}) => ({
  shouldShow: true,
  mode: 'native' as const,
  guideOpen: false,
  guideMode: 'generic' as const,
  onClick: vi.fn().mockResolvedValue(undefined),
  closeGuide: vi.fn(),
  ...overrides,
});

function renderBanner() {
  return render(
    <LocaleProvider>
      <MovedOriginBanner />
    </LocaleProvider>
  );
}

describe('MovedOriginBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('moviepicker-locale', 'fr');
    mockInstallClick.mockReturnValue(installState());
    vi.mocked(shouldOfferSystemBrowser).mockReturnValue(false);
  });

  it('renders nothing when no arrival from the old address was recorded', () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the notice with the install action once an arrival was recorded', async () => {
    localStorage.setItem(MOVED_ORIGIN_NOTICE_KEY, 'pending');
    const state = installState();
    mockInstallClick.mockReturnValue(state);
    renderBanner();

    expect(screen.getByText('Movie Picker a changé d’adresse')).toBeInTheDocument();
    expect(mockInstallClick).toHaveBeenCalledWith('moved_origin');
    await userEvent.click(screen.getByRole('button', { name: 'Installer l’app' }));
    expect(state.onClick).toHaveBeenCalledTimes(1);
  });

  it('opens the install guide when the hook asks for it', () => {
    localStorage.setItem(MOVED_ORIGIN_NOTICE_KEY, 'pending');
    mockInstallClick.mockReturnValue(
      installState({ mode: 'ios', guideOpen: true, guideMode: 'ios' })
    );
    renderBanner();

    expect(screen.getByRole('dialog')).toHaveTextContent('guide:ios');
    expect(screen.getByRole('button', { name: 'Installer l’app' })).toHaveAttribute(
      'aria-haspopup',
      'dialog'
    );
  });

  it('dismisses for good, from the button as from the cross', async () => {
    localStorage.setItem(MOVED_ORIGIN_NOTICE_KEY, 'pending');
    const { container, unmount } = renderBanner();

    await userEvent.click(screen.getByRole('button', { name: 'Compris' }));
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem(MOVED_ORIGIN_NOTICE_KEY)).toBe('dismissed');
    unmount();

    localStorage.setItem(MOVED_ORIGIN_NOTICE_KEY, 'pending');
    renderBanner();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(localStorage.getItem(MOVED_ORIGIN_NOTICE_KEY)).toBe('dismissed');
  });

  it('stays quiet and marks the notice done when the app is already installed', () => {
    localStorage.setItem(MOVED_ORIGIN_NOTICE_KEY, 'pending');
    mockInstallClick.mockReturnValue(installState({ shouldShow: false, mode: null }));
    const { container } = renderBanner();

    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem(MOVED_ORIGIN_NOTICE_KEY)).toBe('dismissed');
  });

  it('yields to the in-app browser notice', () => {
    localStorage.setItem(MOVED_ORIGIN_NOTICE_KEY, 'pending');
    vi.mocked(shouldOfferSystemBrowser).mockReturnValue(true);
    const { container } = renderBanner();

    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem(MOVED_ORIGIN_NOTICE_KEY)).toBe('pending');
  });
});
