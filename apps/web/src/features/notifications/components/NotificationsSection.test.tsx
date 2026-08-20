import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NotificationsSection from '@/features/notifications/components/NotificationsSection';
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
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

const mockUsePush = vi.mocked(usePushNotifications);
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
    { type: 'eventdeleted', enabled: true },
    { type: 'eventreminder1h', enabled: true },
    { type: 'eventreminder24h', enabled: true },
    { type: 'eventinvitation', enabled: true },
    { type: 'newfollower', enabled: true },
    { type: 'eventpending', enabled: true },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('NotificationsSection', () => {
  it('shows the unsupported hint when push is unavailable', () => {
    mockUsePush.mockReturnValue(pushState({ supported: false, permission: 'unsupported' }));

    render(<NotificationsSection />);

    expect(screen.getByText('notifications.unsupported')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('loads and renders the 9 preference toggles even when not subscribed to push', async () => {
    mockUsePush.mockReturnValue(pushState({ subscribed: false }));
    mockFetchPrefs.mockResolvedValue(allPrefs);

    render(<NotificationsSection />);

    await waitFor(() => expect(mockFetchPrefs).toHaveBeenCalledOnce());
    expect(
      await screen.findByRole('switch', { name: 'notifications.prefParticipantJoined' })
    ).toBeInTheDocument();
    // 1 master push toggle + 9 per-type toggles
    expect(screen.getAllByRole('switch')).toHaveLength(10);
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
