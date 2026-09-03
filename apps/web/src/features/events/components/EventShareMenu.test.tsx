import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventShareMenu from '@/features/events/components/EventShareMenu';
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

function renderMenu(ui: ReactElement) {
  return render(
    <LocaleProvider>
      <ConsentProvider>{ui}</ConsentProvider>
    </LocaleProvider>
  );
}

const props = {
  url: 'https://moviepicker.app/e/abc',
  title: 'Soirée ciné',
  eventTime: '19:00',
  eventDate: '15 juin 2026',
};

describe('EventShareMenu', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    track.mockReset();
    vi.mocked(copyTextToClipboard).mockReset();
    vi.mocked(copyTextToClipboard).mockResolvedValue(false);
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('garde le menu fermé au départ et n’expose pas l’URL dans la page', () => {
    renderMenu(<EventShareMenu {...props} />);
    const trigger = screen.getByRole('button', { name: /inviter/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^partager$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(props.url)).not.toBeInTheDocument();
  });

  it('ouvre le menu avec le partage et le QR', async () => {
    const user = userEvent.setup();
    renderMenu(<EventShareMenu {...props} />);
    await user.click(screen.getByRole('button', { name: /inviter/i }));

    expect(screen.getByRole('button', { name: /^partager$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /afficher le qr code/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /google calendar/i })).not.toBeInTheDocument();
  });

  it('n’affiche « Inviter des amis » que si un gestionnaire est fourni', async () => {
    const user = userEvent.setup();
    const onInviteFriends = vi.fn();
    const { unmount } = renderMenu(<EventShareMenu {...props} />);
    await user.click(screen.getByRole('button', { name: /inviter/i }));
    expect(screen.queryByRole('button', { name: /inviter des amis/i })).not.toBeInTheDocument();
    unmount();

    renderMenu(<EventShareMenu {...props} onInviteFriends={onInviteFriends} />);
    await user.click(screen.getByRole('button', { name: /^inviter$/i }));
    await user.click(screen.getByRole('button', { name: /inviter des amis/i }));
    expect(onInviteFriends).toHaveBeenCalledTimes(1);
  });

  it('copie le lien et affiche une confirmation quand le partage natif est absent', async () => {
    vi.stubGlobal('navigator', { share: undefined, clipboard: undefined } as unknown as Navigator);
    try {
      vi.mocked(copyTextToClipboard).mockResolvedValue(true);
      const user = userEvent.setup();
      renderMenu(<EventShareMenu {...props} />);
      await user.click(screen.getByRole('button', { name: /inviter/i }));
      await user.click(screen.getByRole('button', { name: /^partager$/i }));

      await waitFor(() => {
        expect(copyTextToClipboard).toHaveBeenCalledWith(props.url);
        expect(screen.getByRole('button', { name: /lien copié/i })).toBeInTheDocument();
      });
      expect(track).toHaveBeenCalledWith('link_shared', { method: 'clipboard' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('ouvre puis ferme la modale QR', async () => {
    const user = userEvent.setup();
    const { container } = renderMenu(<EventShareMenu {...props} />);
    await user.click(screen.getByRole('button', { name: /inviter/i }));

    const dialog = container.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(false);

    await user.click(screen.getByRole('button', { name: /afficher le qr code/i }));
    await waitFor(() => expect(dialog?.hasAttribute('open')).toBe(true));
    expect(
      screen.getByRole('heading', { name: /qr code — lien vers la soirée/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fermer le qr code/i }));
    await waitFor(() => expect(dialog?.hasAttribute('open')).toBe(false));
  });
});
