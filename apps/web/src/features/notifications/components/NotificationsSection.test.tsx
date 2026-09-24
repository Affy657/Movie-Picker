import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NotificationsSection from '@/features/notifications/components/NotificationsSection';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import {
  isIosRuntime,
  isStandaloneRuntime,
  usePwaInstallClick,
} from '@/shared/hooks/usePwaInstall';
import {
  fetchNotificationPreferences,
  patchNotificationPreferences,
  type NotificationPreferences,
} from '@/features/notifications/api/notificationsApi';

vi.mock('@/shared/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/notifications/hooks/usePushNotifications', () => ({
  usePushNotifications: vi.fn(),
}));

vi.mock('@/features/notifications/api/notificationsApi', () => ({
  fetchNotificationPreferences: vi.fn(),
  patchNotificationPreferences: vi.fn(),
}));

vi.mock('@/shared/hooks/usePwaInstall', () => ({
  usePwaInstallClick: vi.fn(),
  isIosRuntime: vi.fn(() => false),
  isStandaloneRuntime: vi.fn(() => false),
}));

vi.mock('@/shared/components/InstallPwaDialog', () => ({
  default: ({ mode }: { mode: string }) => <div role="dialog">guide:{mode}</div>,
}));

const mockUsePush = vi.mocked(usePushNotifications);
const mockInstallClick = vi.mocked(usePwaInstallClick);
const installState = (overrides: Partial<ReturnType<typeof usePwaInstallClick>> = {}) => ({
  shouldShow: true,
  mode: 'ios' as const,
  guideOpen: false,
  guideMode: 'ios' as const,
  onClick: vi.fn().mockResolvedValue(undefined),
  closeGuide: vi.fn(),
  ...overrides,
});
const mockFetchPrefs = vi.mocked(fetchNotificationPreferences);
const mockPatchPrefs = vi.mocked(patchNotificationPreferences);

const pushState = (overrides: Partial<ReturnType<typeof usePushNotifications>> = {}) => ({
  supported: true,
  permission: 'granted' as const,
  subscribed: false,
  loading: false,
  error: null,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  ...overrides,
});

const allPrefs: NotificationPreferences = {
  preferences: [
    { type: 'participantjoined', enabled: true },
    { type: 'movieadded', enabled: false },
    { type: 'moviepicked', enabled: true },
    { type: 'moviepickedmanually', enabled: true },
    { type: 'eventdeleted', enabled: true },
    { type: 'eventdatechanged', enabled: true },
    { type: 'eventreminder1h', enabled: true },
    { type: 'eventreminder24h', enabled: true },
    { type: 'eventinvitation', enabled: true },
    { type: 'newfollower', enabled: true },
    { type: 'eventpending', enabled: true },
    { type: 'letterboxdreconciliationpending', enabled: true },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockInstallClick.mockReturnValue(installState());
  mockFetchPrefs.mockResolvedValue(allPrefs);
  vi.mocked(isIosRuntime).mockReturnValue(false);
  vi.mocked(isStandaloneRuntime).mockReturnValue(false);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('NotificationsSection', () => {
  it('shows the unsupported hint instead of the push toggle when push is unavailable', () => {
    mockUsePush.mockReturnValue(pushState({ supported: false, permission: 'unsupported' }));

    render(<NotificationsSection />);

    expect(screen.getByText('notifications.unsupported')).toBeInTheDocument();
    expect(
      screen.queryByRole('switch', { name: 'notifications.enableButton' })
    ).not.toBeInTheDocument();
  });

  it('still loads and renders the preference toggles when push is unavailable', async () => {
    mockUsePush.mockReturnValue(pushState({ supported: false, permission: 'unsupported' }));

    render(<NotificationsSection />);

    expect(
      await screen.findByRole('switch', { name: 'notifications.prefNewFollower' })
    ).toBeInTheDocument();
    expect(mockFetchPrefs).toHaveBeenCalled();
    expect(screen.getAllByRole('switch')).toHaveLength(12);
  });

  it('on an iPhone in Safari, points to the home screen and opens the install guide', async () => {
    mockUsePush.mockReturnValue(pushState({ supported: false, permission: 'unsupported' }));
    vi.mocked(isIosRuntime).mockReturnValue(true);
    const install = installState();
    mockInstallClick.mockReturnValue(install);
    const user = userEvent.setup();

    render(<NotificationsSection />);

    expect(screen.getByText('notifications.unsupportedIos')).toBeInTheDocument();
    expect(screen.queryByText('notifications.unsupported')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'pwaInstall.trigger' }));
    expect(install.onClick).toHaveBeenCalledTimes(1);
    expect(mockInstallClick).toHaveBeenCalledWith('notifications');
  });

  it('on an iPhone in Safari, shows the guide once it is open', () => {
    mockUsePush.mockReturnValue(pushState({ supported: false, permission: 'unsupported' }));
    vi.mocked(isIosRuntime).mockReturnValue(true);
    mockInstallClick.mockReturnValue(installState({ guideOpen: true }));

    render(<NotificationsSection />);

    expect(screen.getByRole('dialog')).toHaveTextContent('guide:ios');
  });

  it('keeps the generic hint in the app installed on an iPhone that cannot push', () => {
    mockUsePush.mockReturnValue(pushState({ supported: false, permission: 'unsupported' }));
    vi.mocked(isIosRuntime).mockReturnValue(true);
    vi.mocked(isStandaloneRuntime).mockReturnValue(true);

    render(<NotificationsSection />);

    expect(screen.getByText('notifications.unsupported')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'pwaInstall.trigger' })).not.toBeInTheDocument();
  });

  it('loads and renders the 12 preference toggles even when not subscribed to push', async () => {
    mockUsePush.mockReturnValue(pushState({ subscribed: false }));
    mockFetchPrefs.mockResolvedValue(allPrefs);

    render(<NotificationsSection />);

    await waitFor(() => expect(mockFetchPrefs).toHaveBeenCalledOnce());
    expect(
      await screen.findByRole('switch', { name: 'notifications.prefParticipantJoined' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(13);
  });

  it('shows the push error message', () => {
    mockUsePush.mockReturnValue(pushState({ error: 'boom' }));
    mockFetchPrefs.mockResolvedValue(allPrefs);

    render(<NotificationsSection />);

    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('disables the master toggle and shows a hint when permission is denied', () => {
    mockUsePush.mockReturnValue(pushState({ permission: 'denied' }));
    mockFetchPrefs.mockResolvedValue(allPrefs);

    render(<NotificationsSection />);

    expect(screen.getByText('notifications.permissionDenied')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'notifications.enableButton' })).toBeDisabled();
  });

  it('reflects movieadded as disabled by default in the fetched preferences', async () => {
    mockUsePush.mockReturnValue(pushState({ subscribed: false }));
    mockFetchPrefs.mockResolvedValue(allPrefs);

    render(<NotificationsSection />);

    const toggle = await screen.findByRole('switch', { name: 'notifications.prefMovieAdded' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('shows a muted bell when push is off and a bell when subscribed', () => {
    mockUsePush.mockReturnValue(pushState({ subscribed: false }));
    mockFetchPrefs.mockResolvedValue(allPrefs);

    const { rerender } = render(<NotificationsSection />);
    expect(document.querySelector('.lucide-bell-off')).toBeTruthy();

    mockUsePush.mockReturnValue(pushState({ subscribed: true }));
    rerender(<NotificationsSection />);
    expect(document.querySelector('.lucide-bell-off')).toBeNull();
  });

  it('patches a preference when its toggle is clicked', async () => {
    mockUsePush.mockReturnValue(pushState({ subscribed: true }));
    mockFetchPrefs.mockResolvedValue(allPrefs);
    mockPatchPrefs.mockResolvedValue({
      preferences: allPrefs.preferences.map((p) =>
        p.type === 'participantjoined' ? { ...p, enabled: false } : p
      ),
    });

    render(<NotificationsSection />);

    const toggle = await screen.findByRole('switch', {
      name: 'notifications.prefParticipantJoined',
    });
    await userEvent.click(toggle);

    expect(mockPatchPrefs).toHaveBeenCalledWith([{ type: 'participantjoined', enabled: false }]);
  });
});
